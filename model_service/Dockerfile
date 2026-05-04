FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=120 --retries=5 -r requirements.txt

COPY . .

RUN mkdir -p /app/model

RUN curl -fsSL -o /app/model/final_lr_model.joblib \
    https://github.com/Nysonn/mediflow/releases/download/v1.0.1/final_lr_model.joblib

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]