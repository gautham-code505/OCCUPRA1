"""
Trains the timetable-aware crowd forecaster (one GradientBoostingRegressor per horizon) and
exports the trees to JSON so the Node backend can run inference natively (no Python at runtime).

  python ml/timetable/train.py

Input : ml/timetable/dataset.csv   (from: cd backend && npx tsx scripts/generate-dataset.ts)
Output: backend/src/ml/model.json  (trees + metrics)
        ml/timetable/metrics.json  (comparison: naive vs no-timetable vs timetable-aware)
"""
import json
import os
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DATA = os.path.join(HERE, "dataset.csv")
OUT_MODEL = os.path.join(ROOT, "backend", "src", "ml", "model.json")
OUT_METRICS = os.path.join(HERE, "metrics.json")

HORIZONS = ["30m", "1h", "2h", "4h"]
TYPES = ["ACTIVITY_CENTER", "CANTEEN", "CLASSROOM", "COMPUTER_LAB", "LIBRARY", "RESEARCH_LAB", "SEMINAR_HALL", "STUDY_ROOM"]
BASE = ["hour", "day_of_week", "is_weekend", "capacity", "current_pct", "trend_15m", "baseline_h_pct"] + [f"type_{t}" for t in TYPES]
TIMETABLE = ["tt_now_pct", "tt_h_pct", "tt_peak_window_pct", "released_window_100"]
ALL = BASE + TIMETABLE

df = pd.read_csv(DATA)
days = df["day_index"].max() + 1
test_mask = df["day_index"] >= int(days * 0.8)  # last 20% of days held out (time-based split)
print(f"Rows: {len(df)}  train days: {int(days * 0.8)}  test days: {days - int(days * 0.8)}")


def export_gbm(model: GradientBoostingRegressor) -> dict:
    init = float(np.ravel(model.init_.constant_)[0]) if hasattr(model.init_, "constant_") else float(model.init_.predict(np.zeros((1, model.n_features_in_)))[0])
    trees = []
    for est in model.estimators_[:, 0]:
        t = est.tree_
        trees.append({
            "l": t.children_left.tolist(),
            "r": t.children_right.tolist(),
            "f": t.feature.tolist(),
            "t": [round(float(x), 5) for x in t.threshold],
            "v": [round(float(x), 5) for x in t.value[:, 0, 0]],
        })
    return {"init": init, "lr": model.learning_rate, "trees": trees}


def fit(X, y):
    m = GradientBoostingRegressor(n_estimators=160, max_depth=4, learning_rate=0.08, subsample=0.8, random_state=42)
    m.fit(X, y)
    return m


model_out = {"features": ALL, "horizons": {}, "algorithm": "GradientBoostingRegressor (scikit-learn), exported trees"}
metrics = {"trained_at": datetime.now().isoformat(timespec="seconds"), "rows": int(len(df)), "horizons": {}}

for h in HORIZONS:
    y = df[f"y_{h}"].values
    cols_all = [f"{c}@{h}" for c in ALL]
    cols_base = [f"{c}@{h}" for c in BASE]
    Xa, Xb = df[cols_all].values, df[cols_base].values
    tr, te = ~test_mask.values, test_mask.values

    naive = df[f"current_pct@{h}"].values[te]  # "it will stay as it is now"
    mb = fit(Xb[tr], y[tr])
    ma = fit(Xa[tr], y[tr])
    pb, pa = mb.predict(Xb[te]), ma.predict(Xa[te])

    res = {
        "naive_persistence": {"MAE": round(mean_absolute_error(y[te], naive), 2), "R2": round(r2_score(y[te], naive), 4)},
        "without_timetable": {"MAE": round(mean_absolute_error(y[te], pb), 2), "R2": round(r2_score(y[te], pb), 4)},
        "with_timetable": {"MAE": round(mean_absolute_error(y[te], pa), 2), "R2": round(r2_score(y[te], pa), 4)},
        "test_rows": int(te.sum()),
    }
    imp = sorted(zip(ALL, ma.feature_importances_), key=lambda x: -x[1])[:6]
    res["top_features"] = [{"feature": f, "importance": round(float(v), 3)} for f, v in imp]
    metrics["horizons"][h] = res
    print(f"[{h}] naive MAE {res['naive_persistence']['MAE']:5.2f} | no-timetable {res['without_timetable']['MAE']:5.2f} | timetable-aware {res['with_timetable']['MAE']:5.2f}  (R2 {res['with_timetable']['R2']})")

    exported = export_gbm(ma)
    exported["mae"] = res["with_timetable"]["MAE"]
    exported["r2"] = res["with_timetable"]["R2"]
    exported["baseline_mae"] = res["without_timetable"]["MAE"]
    exported["naive_mae"] = res["naive_persistence"]["MAE"]
    model_out["horizons"][h] = exported

model_out["trained_at"] = metrics["trained_at"]
os.makedirs(os.path.dirname(OUT_MODEL), exist_ok=True)
with open(OUT_MODEL, "w") as f:
    json.dump(model_out, f, separators=(",", ":"))
with open(OUT_METRICS, "w") as f:
    json.dump(metrics, f, indent=2)
print(f"Model -> {OUT_MODEL} ({os.path.getsize(OUT_MODEL) // 1024} KB)")
print(f"Metrics -> {OUT_METRICS}")
