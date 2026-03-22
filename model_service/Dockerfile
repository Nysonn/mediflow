FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Download the model file during build
RUN mkdir -p /app/model && \
    wget -O /app/model/final_lr_model.joblib \
    "https://github.com/Nysonn/mediflow/releases/download/v1.0.0/final_lr_model.joblib"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
