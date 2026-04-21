"""
Population Statistics Generator — MediFlow
Run once from the project root: python generate_population_stats.py
Outputs: frontend/public/population_stats.json

This script computes per-feature, per-severity-tier descriptive statistics
from cleaned_data_zimbabwe.csv. The JSON is loaded at runtime by the frontend
to power the Patient vs. Population Distribution charts.

NOTE: The CSV is NEVER read at runtime — only this pre-computed JSON is used.
"""

import pandas as pd
import numpy as np
import json
from datetime import datetime, timezone

CSV_PATH = "cleaned_data_zimbabwe.csv"
OUTPUT_PATH = "frontend/public/population_stats.json"

# Severity tier derived from est_blood_loss_ml:
#   Mild:     500–999 ml
#   Moderate: 1000–1499 ml
#   Severe:   >= 1500 ml
def get_severity(blood_loss):
    if blood_loss < 1000:
        return "Mild"
    elif blood_loss < 1500:
        return "Moderate"
    else:
        return "Severe"

df = pd.read_csv(CSV_PATH)
df["severity_tier"] = df["est_blood_loss_ml"].apply(get_severity)

# The two continuous model features we have population data for
continuous_features = ["duration_labour_min", "parity_num"]

tiers = ["Mild", "Moderate", "Severe"]

def compute_stats(series):
    s = series.dropna()
    return {
        "mean":  round(float(s.mean()), 2),
        "std":   round(float(s.std()), 2),
        "p5":    round(float(s.quantile(0.05)), 2),
        "p25":   round(float(s.quantile(0.25)), 2),
        "p50":   round(float(s.quantile(0.50)), 2),
        "p75":   round(float(s.quantile(0.75)), 2),
        "p95":   round(float(s.quantile(0.95)), 2),
        "min":   round(float(s.min()), 2),
        "max":   round(float(s.max()), 2),
        "n":     int(len(s)),
    }

output = {
    "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "n_records": int(len(df)),
    "severity_tiers": {
        "Mild":     {"n": int((df["severity_tier"] == "Mild").sum()),     "blood_loss_range": "500–999 ml"},
        "Moderate": {"n": int((df["severity_tier"] == "Moderate").sum()), "blood_loss_range": "1000–1499 ml"},
        "Severe":   {"n": int((df["severity_tier"] == "Severe").sum()),   "blood_loss_range": ">=1500 ml"},
    },
    "features": {},
    # Population medians used by counterfactual grid search
    "population_medians": {},
}

for feature in continuous_features:
    output["features"][feature] = {}
    output["features"][feature]["overall"] = compute_stats(df[feature])
    for tier in tiers:
        subset = df[df["severity_tier"] == tier]
        output["features"][feature][tier] = compute_stats(subset[feature])
    # Median for counterfactual reference
    output["population_medians"][feature] = round(float(df[feature].median()), 2)

# Categorical distributions (for subgroup charts)
output["categorical"] = {
    "delivery_method": {},
    "booking_status": {},
    "hiv_status": {},
}

for method, label in [("NVD", "NVD"), ("LSCS", "LSCS"), ("FORCEPS", "Forceps")]:
    subset = df[df["delivery_method_clean"] == method]
    output["categorical"]["delivery_method"][label] = {
        "n": int(len(subset)),
        "severe_pph_n": int((subset["severity_tier"] == "Severe").sum()),
        "severe_pph_pct": round(float((subset["severity_tier"] == "Severe").mean() * 100), 1) if len(subset) > 0 else 0,
    }

for status, label in [(0, "HIV Negative"), (1, "HIV Positive")]:
    subset = df[df["hiv_status_num"] == status]
    output["categorical"]["hiv_status"][label] = {
        "n": int(len(subset)),
        "severe_pph_n": int((subset["severity_tier"] == "Severe").sum()),
        "severe_pph_pct": round(float((subset["severity_tier"] == "Severe").mean() * 100), 1) if len(subset) > 0 else 0,
    }

for status, label in [("booked", "Booked"), ("unbooked", "Unbooked")]:
    subset = df[df["booked"] == status]
    output["categorical"]["booking_status"][label] = {
        "n": int(len(subset)),
        "severe_pph_n": int((subset["severity_tier"] == "Severe").sum()),
        "severe_pph_pct": round(float((subset["severity_tier"] == "Severe").mean() * 100), 1) if len(subset) > 0 else 0,
    }

with open(OUTPUT_PATH, "w") as f:
    json.dump(output, f, indent=2)

print(f"Done. Written to {OUTPUT_PATH}")
print(f"Records: {output['n_records']}")
print(f"Severity distribution: {output['severity_tiers']}")
print(f"Population medians: {output['population_medians']}")
