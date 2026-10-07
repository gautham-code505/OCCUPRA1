import os
import sys

# Ensure backend directory is in sys.path
backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

import joblib
import logging
import numpy as np
from xgboost import XGBRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from app.ml.data_preparation import generate_synthetic_training_dataset, prepare_train_test_data
from app.ml.feature_engineering import TARGET_COLUMNS

logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
MODEL_FILE = os.path.join(MODEL_DIR, "xgboost_crowd_model.joblib")


def train_crowd_model(samples: int = 12000, save_path: str = MODEL_FILE):
    """
    Trains the multi-target XGBoost crowd prediction model across 4 horizons
    (30m, 1h, 2h, 4h) and calculates MAE, RMSE, and R2 metrics.
    """
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    print("Generating campus occupancy training dataset...")
    df = generate_synthetic_training_dataset(num_samples=samples)

    print("Splitting train and test sets...")
    X_train, X_test, y_train, y_test = prepare_train_test_data(df)

    print(f"Training XGBoost Regressor on {len(X_train)} samples...")
    base_regressor = XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        n_jobs=-1
    )
    model = MultiOutputRegressor(base_regressor)
    model.fit(X_train, y_train)

    print("Evaluating model performance on test set...")
    y_pred = model.predict(X_test)

    metrics = {}
    for i, col in enumerate(TARGET_COLUMNS):
        mae = mean_absolute_error(y_test[:, i], y_pred[:, i])
        rmse = root_mean_squared_error(y_test[:, i], y_pred[:, i])
        r2 = r2_score(y_test[:, i], y_pred[:, i])
        metrics[col] = {"MAE": round(float(mae), 3), "RMSE": round(float(rmse), 3), "R2": round(float(r2), 4)}
        print(f"[{col}] -> MAE: {mae:.2f} seats | RMSE: {rmse:.2f} | R²: {r2:.4f}")

    joblib.dump(model, save_path)
    print(f"Model successfully saved to: {save_path}")
    return model, metrics


if __name__ == "__main__":
    train_crowd_model()
