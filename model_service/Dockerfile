FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=120 --retries=5 -r requirements.txt

COPY . .

# Install curl and download the model file during build
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && mkdir -p /app/model \
    && curl -L -o /app/model/final_lr_model.joblib \
    "https://github.com/Nysonn/mediflow/releases/download/v1.0.0/final_lr_model.joblib" \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]