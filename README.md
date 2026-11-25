# Electricity Bill Prediction — Energy Intelligence

A Flask application using the supplied trained regression artifact and CSV dataset. The frontend is a dark, editorial energy-research experience inspired by the supplied reference screenshots.

## Requirements
- Python 3.10–3.12 recommended
- pip

## Run locally (Windows PowerShell)
```powershell
cd path\to\Electricity_Bill_Prediction
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```
Open http://127.0.0.1:5000

If PowerShell blocks activation, run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## API
- `GET /api/health` — service and model status
- `GET /api/meta` — saved model metadata, input features and dataset statistics
- `GET /api/analytics` — aggregates calculated from the supplied CSV
- `POST /api/predict` — model inference

Example JSON:
```json
{
  "MonthlyHours": 515,
  "TariffRate": 8.4,
  "AirConditioner": 1,
  "Refrigerator": 22,
  "Fan": 14,
  "Television": 12,
  "Monitor": 2,
  "MotorPump": 0
}
```

## Model notes
The uploaded joblib file is a dictionary containing `model`, `scaler`, `features`, and `model_name`. The saved estimator is a degree-2 PolynomialFeatures + LinearRegression pipeline; the StandardScaler is stored separately. The API preserves the stored feature order and applies the scaler before calling the model.

The notebook reports R² = 1.0000, MAE = 0.00 and RMSE = 0.00 for its selected polynomial model. These are notebook-reported evaluation values, not a guarantee of performance on new households. The source notebook's comparison/test split and any potential target relationships should be reviewed before using this as a billing authority.

## Data and input boundaries
The prediction form uses the eight numeric model features only. Validation bounds are derived from the min/max values in the supplied CSV. The app does not invent city/company inputs because they are not part of the saved model's feature list. The analytics page uses actual CSV aggregates.

## Important
This is an educational prediction tool, not an official utility bill calculator. Actual bills can include fixed charges, taxes, slabs, subsidies, and local rules not represented in the model.
