from pathlib import Path
import warnings
import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request

warnings.filterwarnings("ignore", category=UserWarning)
BASE = Path(__file__).resolve().parent
MODEL_PATH = BASE / "models" / "electricity_bill_regression.pkl"
DATA_PATH = BASE / "dataset" / "electricity_bill_dataset.csv"

app = Flask(__name__)
artifact = joblib.load(MODEL_PATH)
model = artifact["model"]
scaler = artifact["scaler"]
FEATURES = artifact["features"]
df = pd.read_csv(DATA_PATH)

# Dataset-derived boundaries are used as gentle guardrails, not as model retraining.
RANGES = {
    feature: {"min": float(df[feature].min()), "max": float(df[feature].max()),
              "median": float(df[feature].median())}
    for feature in FEATURES
}

@app.get("/")
def home():
    return render_template("index.html")

@app.get("/api/meta")
def metadata():
    return jsonify({
        "model_name": artifact.get("model_name", "Saved regression model"),
        "algorithm": "Polynomial Regression (degree 2) + Linear Regression",
        "target": "ElectricityBill",
        "currency": "INR",
        "features": FEATURES,
        "ranges": RANGES,
        "dataset": {
            "records": int(len(df)),
            "cities": int(df["City"].nunique()),
            "companies": int(df["Company"].nunique()),
            "average_bill": round(float(df["ElectricityBill"].mean()), 2),
            "min_bill": round(float(df["ElectricityBill"].min()), 2),
            "max_bill": round(float(df["ElectricityBill"].max()), 2),
            "average_hours": round(float(df["MonthlyHours"].mean()), 1),
            "average_tariff": round(float(df["TariffRate"].mean()), 2),
        }
    })

@app.get("/api/analytics")
def analytics():
    bill_bins = pd.cut(df["ElectricityBill"], bins=10)
    bill_distribution = df.assign(_bin=bill_bins).groupby("_bin", observed=False).size()
    monthly = df.groupby("Month")["ElectricityBill"].mean().reindex(range(1,13), fill_value=0)
    scatter = df.sample(min(500, len(df)), random_state=42)[["MonthlyHours","ElectricityBill","TariffRate"]]
    corr_cols = FEATURES + ["ElectricityBill"]
    corr = df[corr_cols].corr(numeric_only=True).round(3)
    return jsonify({
        "bill_distribution": [{"range": str(k), "count": int(v)} for k,v in bill_distribution.items()],
        "monthly_average": [{"month": int(k), "bill": round(float(v),2)} for k,v in monthly.items()],
        "usage_scatter": [{"hours": float(r.MonthlyHours), "bill": float(r.ElectricityBill),
                           "tariff": float(r.TariffRate)} for r in scatter.itertuples()],
        "correlation": {"labels": corr.columns.tolist(), "values": corr.values.tolist()},
        "cities": df["City"].value_counts().head(8).to_dict()
    })

@app.post("/api/predict")
def predict():
    payload = request.get_json(silent=True) or {}
    try:
        missing = [f for f in FEATURES if f not in payload or payload[f] in (None, "")]
        if missing:
            return jsonify({"error": "Missing required inputs.", "fields": missing}), 400
        values = {}
        for feature in FEATURES:
            value = float(payload[feature])
            if not np.isfinite(value):
                raise ValueError(f"{feature} must be a finite number.")
            low, high = RANGES[feature]["min"], RANGES[feature]["max"]
            if value < low or value > high:
                raise ValueError(f"{feature} must be between {low:g} and {high:g} based on the supplied dataset.")
            values[feature] = value
        row = pd.DataFrame([[values[f] for f in FEATURES]], columns=FEATURES)
        scaled = scaler.transform(row)
        result = float(np.asarray(model.predict(scaled)).reshape(-1)[0])
        if not np.isfinite(result):
            raise ValueError("The model returned a non-finite result.")
        return jsonify({
            "predicted_bill": round(result, 2),
            "currency": "INR",
            "target": "ElectricityBill",
            "input_summary": values,
            "model_name": artifact.get("model_name", "Saved model")
        })
    except (TypeError, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        app.logger.exception("Prediction failed")
        return jsonify({"error": "Prediction could not be completed. Check the server log."}), 500

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "model_loaded": True, "records": int(len(df))})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
