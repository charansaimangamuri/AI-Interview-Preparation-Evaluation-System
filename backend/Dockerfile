FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (needed for PyMuPDF, audio processing, etc.)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose standard port
EXPOSE 7860 8000

# Command to run the application dynamically supporting $PORT (HF Spaces: 7860, Render: $PORT, default: 8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
