import os
import logging
from contextlib import asynccontextmanager

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_PATH = "/app/model/final_lr_model.joblib"

model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            logger.info(f"Model loaded successfully from {MODEL_PATH}")
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
