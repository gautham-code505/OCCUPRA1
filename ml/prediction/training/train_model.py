"""
CampusPulse AI - ML Prediction Model Trainer
Trains Gradient Boosting Regressors for multi-horizon occupancy forecasting
(+30m, +1h, +2h, +4h) and exports model parameters/metrics.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(CURRENT_DIR, "..", "data", "campus_occupancy_historical.csv")
MODEL_DIR = os.path.join(CURRENT_DIR, "..", "model")

def train_models():
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    if not os.path.exists(DATA_PATH):
        from ..data.generate_dataset import generate_historical_dataset
        df = generate_historical_dataset()
    else:
        df = pd.read_csv(DATA_PATH)
        
    print(f"Loaded {len(df)} records for training.")
    
    # Feature engineering
    feature_cols = [
        "hour",
        "day_of_week",
        "is_weekend",
        "capacity",
        "current_occupancy_percent",
        "entry_rate",
        "exit_rate"
    ]
    
    # One-hot encode resource_type
    type_dummies = pd.get_dummies(df["resource_type"], prefix="type")
    X = pd.concat([df[feature_cols], type_dummies], axis=1)
    
    horizons = {
        "30m": "future_30m_percent",
        "1h": "future_1h_percent",
        "2h": "future_2h_percent",
        "4h": "future_4h_percent",
    }
    
    metrics = {}
    
    for horizon, target_col in horizons.items():
        y = df[target_col]
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.08,
            max_depth=4,
            random_state=42
        )
        model.fit(X_train, y_train)
        
        preds = model.predict(X_test)
        mae = mean_absolute_error(y_test, preds)
        r2 = r2_score(y_test, preds)
        
        metrics[horizon] = {
            "MAE": round(mae, 2),
            "R2": round(r2, 4),
            "sample_test_size": len(y_test)
        }
        
        model_file = os.path.join(MODEL_DIR, f"model_{horizon}.joblib")
        joblib.dump(model, model_file)
        print(f"[OK] Trained Horizon {horizon} | MAE: {mae:.2f}% | R2: {r2:.4f}")
        
    # Save metadata
    meta = {
        "features": list(X.columns),
        "horizons": horizons,
        "metrics": metrics,
        "trained_at": pd.Timestamp.now().isoformat(),
        "algorithm": "GradientBoostingRegressor (scikit-learn)"
    }
    with open(os.path.join(MODEL_DIR, "model_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
        
    print(f"[OK] Training complete. Models and metadata saved to {MODEL_DIR}")
    return metrics

if __name__ == "__main__":
    train_models()
