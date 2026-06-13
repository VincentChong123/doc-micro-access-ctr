#!/bin/bash

# 1. Build the Docker image for Document Service:
docker build -t gcp-document-service:latest .

# 2. Run the container locally
# Note: We pass the MinIO environment variables similar to how docker-compose did.
# If you have MinIO running locally in docker-compose, you can add `--network ringisho-net so it can resolve the "minio" hostname.
PORT_NUM=${1:-4000}
docker run -d -p $PORT_NUM:$PORT_NUM \
    --name document_service \
    --network ringisho-net \
    -e MINIO_ENDPOINT=minio \
    -e MINIO_PORT=9000 \
    -e MINIO_ACCESS_KEY=admin \
    -e MINIO_SECRET_KEY=password \
    gcp-document-service:latest
