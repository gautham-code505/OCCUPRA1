import os
import sys

# Ensure backend directory is in sys.path
backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

import joblib
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from app.ml.data_preparation import generate_synthetic_training_dataset, prepare_train_test_data
from app.ml.feature_engineering import TARGET_COLUMNS
from app.ml.train import MODEL_FILE


def evaluate_trained_model(model_path: str = MODEL_FILE):
    """
    Evaluates an existing saved model against a fresh holdout evaluation dataset.
    """
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}. Train the model first using train.py.")

    print(f"Loading model from {model_path}...")
    model = joblib.load(model_path)

    print("Generating fresh holdout dataset (3,000 samples)...")
    df = generate_synthetic_training_dataset(num_samples=3000)
    _, X_val, _, y_val = prepare_train_test_data(df, test_size=0.5)

    y_pred = model.predict(X_val)

    evaluation_report = {}
    print("\n========== MODEL EVALUATION REPORT ==========")
    for i, col in enumerate(TARGET_COLUMNS):
        mae = mean_absolute_error(y_val[:, i], y_pred[:, i])
        rmse = root_mean_squared_error(y_val[:, i], y_pred[:, i])
        r2 = r2_score(y_val[:, i], y_pred[:, i])
        evaluation_report[col] = {
            "MAE": round(float(mae), 3),
            "RMSE": round(float(rmse), 3),
            "R2": round(float(r2), 4),
        }
        print(f"Horizon {col:<12} | MAE: {mae:>6.2f} seats | RMSE: {rmse:>6.2f} | R²: {r2:>7.4f}")
    print("=============================================\n")
    return evaluation_report


if __name__ == "__main__":
    evaluate_trained_model()
