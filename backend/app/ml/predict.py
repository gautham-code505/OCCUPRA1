import os
import joblib
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.ml.feature_engineering import extract_features_from_dict
from app.ml.train import MODEL_FILE, train_crowd_model
from app.services.resource_service import compute_crowd_status

logger = logging.getLogger(__name__)

_loaded_model = None


def get_or_load_model():
    """Lazily loads the trained XGBoost model, training it if not yet present."""
    global _loaded_model
    if _loaded_model is not None:
        return _loaded_model

    if os.path.exists(MODEL_FILE):
        try:
            _loaded_model = joblib.load(MODEL_FILE)
            logger.info("Loaded pre-trained XGBoost crowd prediction model.")
            return _loaded_model
        except Exception as e:
            logger.warning(f"Error loading model from {MODEL_FILE}: {e}")

    # Auto-train initial model if missing
    logger.info("Model file not found. Auto-training initial XGBoost model on startup...")
    try:
        model, _ = train_crowd_model(samples=5000, save_path=MODEL_FILE)
        _loaded_model = model
        return _loaded_model
    except Exception as e:
        logger.error(f"Auto-training failed: {e}")
        return None


def predict_resource_crowd(
    resource: Dict[str, Any],
    sensor_reading: Dict[str, Any],
    now: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Predicts future occupancy for 30m, 1h, 2h, and 4h horizons.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    resource_id = resource.get("resource_id") or resource.get("id")
    capacity = int(resource.get("capacity", 100))
    current_occ = int(sensor_reading.get("current_occupancy", 0))
    current_pct = float(sensor_reading.get("occupancy_percentage", 0.0))

    features = extract_features_from_dict(
        resource=resource,
        sensor_reading=sensor_reading,
        hour=now.hour,
        minute=now.minute,
        day_of_week=now.weekday()
    )

    model = get_or_load_model()
    if model is not None:
        try:
            raw_preds = model.predict(features)[0]
            pred_30m = max(0, min(capacity, int(round(raw_preds[0]))))
            pred_1h = max(0, min(capacity, int(round(raw_preds[1]))))
            pred_2h = max(0, min(capacity, int(round(raw_preds[2]))))
            pred_4h = max(0, min(capacity, int(round(raw_preds[3]))))
        except Exception as e:
            logger.warning(f"Model inference exception: {e}, falling back to trend heuristics.")
            pred_30m = current_occ
            pred_1h = current_occ
            pred_2h = current_occ
            pred_4h = current_occ
    else:
        pred_30m = current_occ
        pred_1h = current_occ
        pred_2h = current_occ
        pred_4h = current_occ

    pct_30m = round((pred_30m / max(capacity, 1)) * 100, 1)
    pct_1h = round((pred_1h / max(capacity, 1)) * 100, 1)
    pct_2h = round((pred_2h / max(capacity, 1)) * 100, 1)
    pct_4h = round((pred_4h / max(capacity, 1)) * 100, 1)

    return {
        "resource_id": resource_id,
        "resource_name": resource.get("name", resource_id),
        "capacity": capacity,
        "current_occupancy": current_occ,
        "current_occupancy_percentage": current_pct,
        "predictions": {
            "30_minutes": pred_30m,
            "1_hour": pred_1h,
            "2_hours": pred_2h,
            "4_hours": pred_4h,
        },
        "predicted_percentages": {
            "30_minutes": pct_30m,
            "1_hour": pct_1h,
            "2_hours": pct_2h,
            "4_hours": pct_4h,
        },
        "predicted_crowd_levels": {
            "30_minutes": compute_crowd_status(pct_30m).value,
            "1_hour": compute_crowd_status(pct_1h).value,
            "2_hours": compute_crowd_status(pct_2h).value,
            "4_hours": compute_crowd_status(pct_4h).value,
        },
        "model_version": "XGBoost-MultiOutput-v1.0",
        "timestamp": now.isoformat()
    }
