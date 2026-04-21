import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_PATH = "/app/model/final_lr_model.joblib"

model = None
shap_explainer = None

# Feature order must match training data column order exactly.
FEATURE_NAMES = [
    "duration_labour_min",
    "hiv_status_num",
    "parity_num",
    "booked_unbooked",
    "delivery_method_clean_LSCS",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, shap_explainer
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            logger.info(f"Model loaded successfully from {MODEL_PATH}")
            # Initialise SHAP LinearExplainer for the Logistic Regression model.
            # shap.LinearExplainer is the correct explainer type for sklearn LR models.
            try:
                import shap
                # Background data: use zero vector as the reference point for a LR model.
                background = np.zeros((1, len(FEATURE_NAMES)))
                shap_explainer = shap.LinearExplainer(model, background)
                logger.info("SHAP LinearExplainer initialised successfully")
            except ImportError:
                logger.warning("shap library not installed — SHAP explanations will use coefficient fallback")
                shap_explainer = None
            except Exception as e:
                logger.warning(f"SHAP explainer init failed: {e} — will use coefficient fallback")
                shap_explainer = None
        except Exception as e:
            logger.error(f"Failed to load model from {MODEL_PATH}: {e}")
            model = None
    else:
        logger.warning(
            f"Model file not found at {MODEL_PATH}. "
            "Place the model file there before making predictions."
        )
    yield
    model = None
    shap_explainer = None


app = FastAPI(title="MediFlow Model Service", lifespan=lifespan)


class PredictRequest(BaseModel):
    duration_labour_min: float
    hiv_status_num: float
    parity_num: int
    booked_unbooked: int
    delivery_method_clean_LSCS: int


class PredictResponse(BaseModel):
    prediction: int
    probability_no_pph: float
    probability_severe_pph: float
    risk_level: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "model_service"}


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    if model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Model is not loaded. Ensure the model file exists at "
                f"{MODEL_PATH} and restart the service."
            ),
        )

    features = np.array([[
        request.duration_labour_min,
        request.hiv_status_num,
        request.parity_num,
        request.booked_unbooked,
        request.delivery_method_clean_LSCS,
    ]])

    try:
        prediction = int(model.predict(features)[0])
        probabilities = model.predict_proba(features)[0]
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

    probability_no_pph = float(probabilities[0])
    probability_severe_pph = float(probabilities[1])
    risk_level = "HIGH" if prediction == 1 else "LOW"

    return PredictResponse(
        prediction=prediction,
        probability_no_pph=probability_no_pph,
        probability_severe_pph=probability_severe_pph,
        risk_level=risk_level,
    )


# ── /explain endpoint ─────────────────────────────────────────────────────────

class ExplainResponse(BaseModel):
    shap_values: dict
    base_value: float
    method: str  # "shap_linear" or "coefficient_fallback"
    computed_at: str


@app.post("/explain", response_model=ExplainResponse)
def explain(request: PredictRequest):
    """
    Compute SHAP feature contribution values for a single patient prediction.

    Uses shap.LinearExplainer (correct for Logistic Regression models).
    Falls back to normalised LR coefficients × feature values if shap is unavailable.

    Reference: Lundberg & Lee (2017), "A Unified Approach to Interpreting Model Predictions"
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded.")

    features = np.array([[
        request.duration_labour_min,
        request.hiv_status_num,
        request.parity_num,
        request.booked_unbooked,
        request.delivery_method_clean_LSCS,
    ]])

    if shap_explainer is not None:
        try:
            # shap_values shape for binary LR: (n_samples, n_features) for class 1 (severe PPH)
            sv = shap_explainer.shap_values(features)
            # For binary classification, shap returns values for class 1
            if isinstance(sv, list):
                sv_row = sv[1][0]  # class 1 (severe PPH), first (only) sample
            else:
                sv_row = sv[0]
            shap_dict = {name: float(val) for name, val in zip(FEATURE_NAMES, sv_row)}
            base_value = float(shap_explainer.expected_value[1] if isinstance(shap_explainer.expected_value, (list, np.ndarray)) else shap_explainer.expected_value)
            method = "shap_linear"
        except Exception as e:
            logger.warning(f"SHAP computation failed: {e} — using coefficient fallback")
            shap_dict, base_value = _coefficient_fallback(features)
            method = "coefficient_fallback"
    else:
        shap_dict, base_value = _coefficient_fallback(features)
        method = "coefficient_fallback"

    return ExplainResponse(
        shap_values=shap_dict,
        base_value=base_value,
        method=method,
        computed_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


def _coefficient_fallback(features: np.ndarray) -> tuple[dict, float]:
    """
    Permutation-importance fallback when shap is unavailable.
    Returns coefficient × feature_value contributions (normalised to sum to net log-odds).
    """
    coefs = model.coef_[0]
    intercept = float(model.intercept_[0])
    row = features[0]
    contributions = {name: float(coefs[i] * row[i]) for i, name in enumerate(FEATURE_NAMES)}
    return contributions, intercept


# ── /confidence endpoint ──────────────────────────────────────────────────────

class ConfidenceResponse(BaseModel):
    risk: float
    ci_low: float
    ci_high: float
    severity_tier: str
    n_bootstrap: int
    computed_at: str


def _get_severity_tier(probability: float) -> str:
    """Derive severity tier from predicted probability using agreed thresholds."""
    if probability > 0.66:
        return "Severe"
    if probability >= 0.33:
        return "Moderate"
    return "Mild"


@app.post("/confidence", response_model=ConfidenceResponse)
def confidence(request: PredictRequest):
    """
    Bootstrap confidence interval for the predicted severe PPH probability.

    Method: re-sample the training-data coefficient distribution by adding
    Gaussian noise scaled to the inverse of training set size (approximate
    bootstrap for a fitted LR model). 100 iterations, report 2.5th–97.5th
    percentile as the 95% CI.

    This is a pragmatic approximation — a full bootstrap would require the
    original training data, which is not stored at runtime.

    Reference: Efron & Tibshirani (1993), "An Introduction to the Bootstrap"
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded.")

    features = np.array([[
        request.duration_labour_min,
        request.hiv_status_num,
        request.parity_num,
        request.booked_unbooked,
        request.delivery_method_clean_LSCS,
    ]])

    try:
        base_prob = float(model.predict_proba(features)[0][1])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

    # Bootstrap: perturb model coefficients with noise scaled to 1/sqrt(N_train)
    # Training N ≈ 156 (223 × 0.70 stratified split per the academic report)
    N_BOOTSTRAP = 100
    N_TRAIN_APPROX = 156
    noise_scale = 1.0 / np.sqrt(N_TRAIN_APPROX)

    rng = np.random.default_rng(seed=42)
    bootstrap_probs = []

    coefs_orig = model.coef_.copy()
    intercept_orig = model.intercept_.copy()

    for _ in range(N_BOOTSTRAP):
        noise_coef = rng.normal(0, noise_scale, coefs_orig.shape)
        noise_int = rng.normal(0, noise_scale, intercept_orig.shape)
        log_odds = (coefs_orig + noise_coef) @ features.T + (intercept_orig + noise_int)
        prob = float(1.0 / (1.0 + np.exp(-log_odds[0][0])))
        bootstrap_probs.append(prob)

    ci_low = float(np.percentile(bootstrap_probs, 2.5))
    ci_high = float(np.percentile(bootstrap_probs, 97.5))

    return ConfidenceResponse(
        risk=round(base_prob, 4),
        ci_low=round(ci_low, 4),
        ci_high=round(ci_high, 4),
        severity_tier=_get_severity_tier(base_prob),
        n_bootstrap=N_BOOTSTRAP,
        computed_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
