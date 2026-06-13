#!/bin/bash
IMAGE_NAME="gcp-api-gateway:latest"
# 1. Build the Docker image for the API Gateway
docker build -t $IMAGE_NAME .

# 2. Run the container locally (replacing docker-compose)
# We map port 3000, inject the service URLs, and mount the docs folder for Swagger.
# Note: If you want this to communicate with your other containers using their names 
# (like "ai_service" and "document_service"), you should append `--network ringisho-net
# assuming that network is still active from docker-compose. Otherwise, you'll need to 
# change the URLs to your local machine's IP address.

PORT_NUM=${1:-3000}
docker run -d -p $PORT_NUM:$PORT_NUM \
  --name api_gateway \
  --network ringisho-net \
  --dns 8.8.8.8 \
  -e AI_SERVICE_URL=${1:-http://ai_service:8080} \
  -e DOC_SERVICE_URL=${2:-http://document_service:4000} \
  -v $(pwd)/../../docs:/usr/src/app/docs:ro \
  $IMAGE_NAME
