import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_PATH = "/app/model/final_lr_model.joblib"

model = None
shap_explainer = None
shap_method = None

# Feature order must match training data column order exactly.
FEATURE_NAMES = [
    "duration_labour_min",
    "hiv_status_num",
    "parity_num",
    "booked_unbooked",
    "delivery_method_clean_FORCEPS",
    "delivery_method_clean_LSCS",
]


def _get_final_estimator():
    if hasattr(model, "steps") and len(model.steps) > 0:
        return model.steps[-1][1]
    return model


def _features_frame(values: np.ndarray | list[list[float]]) -> pd.DataFrame:
    array = np.asarray(values, dtype=float)
    return pd.DataFrame(array, columns=FEATURE_NAMES)


def _request_to_frame(request: "PredictRequest") -> pd.DataFrame:
    return _features_frame([[
        request.duration_labour_min,
        request.hiv_status_num,
        request.parity_num,
        request.booked_unbooked,
        request.delivery_method_clean_FORCEPS,
        request.delivery_method_clean_LSCS,
    ]])


def _transform_features(features: pd.DataFrame | np.ndarray) -> np.ndarray:
    if hasattr(model, "steps") and len(model.steps) > 1:
        return model[:-1].transform(features)
    return np.asarray(features)


def _supports_linear_coefficients(estimator) -> bool:
    try:
        _ = estimator.coef_
        _ = estimator.intercept_
        return True
    except Exception:
        return False


def _predict_severe_pph_probability(features: pd.DataFrame | np.ndarray) -> float:
    features_frame = features if isinstance(features, pd.DataFrame) else _features_frame(features)
    probabilities = np.asarray(model.predict_proba(features_frame))
    return float(probabilities[0][-1])


def _generic_explanation_fallback(features: np.ndarray) -> tuple[dict, float, str]:
    baseline = np.zeros_like(features)
    base_value = _predict_severe_pph_probability(baseline)
    full_probability = _predict_severe_pph_probability(features)
    deltas = []

    for index in range(features.shape[1]):
        perturbed = features.copy()
        perturbed[0, index] = baseline[0, index]
        delta = full_probability - _predict_severe_pph_probability(perturbed)
        deltas.append(float(delta))

    total_delta = sum(deltas)
    if abs(total_delta) > 1e-9:
        scale = (full_probability - base_value) / total_delta
        deltas = [delta * scale for delta in deltas]

    contributions = {name: float(delta) for name, delta in zip(FEATURE_NAMES, deltas)}
    return contributions, float(base_value), "perturbation_fallback"


def _approximate_probability_interval(probability: float, n_samples: int, n_draws: int) -> tuple[float, float]:
    alpha = max(probability * n_samples, 1e-3) + 1.0
    beta = max((1.0 - probability) * n_samples, 1e-3) + 1.0
    rng = np.random.default_rng(seed=42)
    draws = rng.beta(alpha, beta, size=n_draws)
    ci_low = float(np.percentile(draws, 2.5))
    ci_high = float(np.percentile(draws, 97.5))
    return ci_low, ci_high


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, shap_explainer, shap_method
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            logger.info(f"Model loaded successfully from {MODEL_PATH}")
            try:
                import shap
                estimator = _get_final_estimator()
                background_raw = _features_frame(np.zeros((1, len(FEATURE_NAMES))))
                if _supports_linear_coefficients(estimator):
                    background = _transform_features(background_raw)
                    shap_explainer = shap.LinearExplainer(estimator, background)
                    shap_method = "shap_linear"
                    logger.info("SHAP LinearExplainer initialised successfully")
                else:
                    shap_explainer = shap.KernelExplainer(
                        lambda values: model.predict_proba(_features_frame(values))[:, 1],
                        background_raw.to_numpy(),
                    )
                    shap_method = "shap_kernel"
                    logger.info("SHAP KernelExplainer initialised successfully")
            except ImportError:
                logger.warning("shap library not installed — SHAP explanations will use coefficient fallback")
                shap_explainer = None
                shap_method = None
            except Exception as e:
                logger.warning(f"SHAP explainer init failed: {e} — will use coefficient fallback")
                shap_explainer = None
                shap_method = None
        except Exception as e:
            logger.error(f"Failed to load model from {MODEL_PATH}: {e}")
            model = None
            shap_method = None
    else:
        logger.warning(
            f"Model file not found at {MODEL_PATH}. "
            "Place the model file there before making predictions."
        )
    yield
    model = None
    shap_explainer = None
    shap_method = None


app = FastAPI(title="MediFlow Model Service", lifespan=lifespan)


class PredictRequest(BaseModel):
    duration_labour_min: float
    hiv_status_num: float
    parity_num: int
    booked_unbooked: int
    delivery_method_clean_FORCEPS: int
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

    features = _request_to_frame(request)

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

    features = _request_to_frame(request)
    features_array = features.to_numpy()

    if shap_explainer is not None:
        try:
            if shap_method == "shap_linear":
                features_for_shap = _transform_features(features)
                sv = shap_explainer.shap_values(features_for_shap)
                if isinstance(sv, list):
                    sv_row = sv[1][0]
                else:
                    sv_row = sv[0]
                expected_value = shap_explainer.expected_value
                if isinstance(expected_value, (list, np.ndarray)):
                    base_value = float(np.asarray(expected_value).reshape(-1)[-1])
                else:
                    base_value = float(expected_value)
                method = "shap_linear"
            else:
                sv = shap_explainer.shap_values(features_array, nsamples=100)
                if isinstance(sv, list):
                    sv_row = np.asarray(sv[-1])[0]
                else:
                    sv_row = np.asarray(sv)[0]
                expected_value = shap_explainer.expected_value
                if isinstance(expected_value, (list, np.ndarray)):
                    base_value = float(np.asarray(expected_value).reshape(-1)[-1])
                else:
                    base_value = float(expected_value)
                method = "shap_kernel"
            shap_dict = {name: float(val) for name, val in zip(FEATURE_NAMES, sv_row)}
        except Exception as e:
            logger.warning(f"SHAP computation failed: {e} — using coefficient fallback")
            shap_dict, base_value, method = _coefficient_fallback(features_array)
    else:
        shap_dict, base_value, method = _coefficient_fallback(features_array)

    return ExplainResponse(
        shap_values=shap_dict,
        base_value=base_value,
        method=method,
        computed_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


def _coefficient_fallback(features: np.ndarray) -> tuple[dict, float, str]:
    """
    Fallback explanation for environments where SHAP is unavailable or fails.
    """
    lr = _get_final_estimator()
    if not _supports_linear_coefficients(lr):
        return _generic_explanation_fallback(features)

    coefs = lr.coef_[0]
    intercept = float(lr.intercept_[0])
    row = _transform_features(features)[0]
    contributions = {name: float(coefs[i] * row[i]) for i, name in enumerate(FEATURE_NAMES)}
    return contributions, intercept, "coefficient_fallback"


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

    features = _request_to_frame(request)

    try:
        base_prob = float(model.predict_proba(features)[0][1])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

    # Training N ≈ 156 (223 × 0.70 stratified split per the academic report)
    N_BOOTSTRAP = 100
    N_TRAIN_APPROX = 156
    estimator = _get_final_estimator()

    if _supports_linear_coefficients(estimator):
        noise_scale = 1.0 / np.sqrt(N_TRAIN_APPROX)
        rng = np.random.default_rng(seed=42)
        bootstrap_probs = []
        coefs_orig = estimator.coef_.copy()
        intercept_orig = estimator.intercept_.copy()
        features_transformed = _transform_features(features)

        for _ in range(N_BOOTSTRAP):
            noise_coef = rng.normal(0, noise_scale, coefs_orig.shape)
            noise_int = rng.normal(0, noise_scale, intercept_orig.shape)
            log_odds = (coefs_orig + noise_coef) @ features_transformed.T + (intercept_orig + noise_int)
            prob = float(1.0 / (1.0 + np.exp(-log_odds[0][0])))
            bootstrap_probs.append(prob)

        ci_low = float(np.percentile(bootstrap_probs, 2.5))
        ci_high = float(np.percentile(bootstrap_probs, 97.5))
    else:
        ci_low, ci_high = _approximate_probability_interval(base_prob, N_TRAIN_APPROX, N_BOOTSTRAP * 10)

    return ConfidenceResponse(
        risk=round(base_prob, 4),
        ci_low=round(ci_low, 4),
        ci_high=round(ci_high, 4),
        severity_tier=_get_severity_tier(base_prob),
        n_bootstrap=N_BOOTSTRAP,
        computed_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
