#!/bin/bash
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "⚠️  WARNING: You are deploying without Minio credentials!"
  echo "Usage: ./run_gcp_document_service.sh <MINIO_ENDPOINT> <MINIO_ACCESS_KEY> <MINIO_SECRET_KEY>"
  echo "Continuing with default deployment..."
  
  gcloud run deploy document-service \
    --source ./ \
    --region us-central1 \
    --allow-unauthenticated
else
  gcloud run deploy document-service \
    --source ./ \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars MINIO_ENDPOINT="$1",MINIO_ACCESS_KEY="$2",MINIO_SECRET_KEY="$3"
fi
