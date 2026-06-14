#!/bin/bash
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./run_gcp_api_gateway.sh <AI_SERVICE_URL> <DOC_SERVICE_URL>"
  echo "Example: ./run_gcp_api_gateway.sh https://ai-service-123.run.app https://doc-service-123.run.app"
  exit 1
fi

gcloud run deploy api-gateway \
  --source ./ \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars AI_SERVICE_URL="$1",DOC_SERVICE_URL="$2"
