# Use official Python 3.12 slim image for a lightweight footprint
FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create the working directory
WORKDIR /app

# Copy the requirements file first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Default port, overridden by $PORT env var (like in GCP Cloud Run)
ENV PORT=8080
EXPOSE $PORT

# Run Uvicorn pointing to main.py
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
