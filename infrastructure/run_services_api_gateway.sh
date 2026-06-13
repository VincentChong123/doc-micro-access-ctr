#!/bin/bash

# Create the custom network if it doesn't exist so containers can resolve each other by name
echo "Creating network 'ringisho-net'..."
docker network create ringisho-net 2>/dev/null || true

# Get the absolute path of the infrastructure folder
INFRA_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$INFRA_DIR/.." && pwd)

echo "-----------------------------------"
echo "1. Starting MinIO..."
echo "-----------------------------------"
cd "$INFRA_DIR"
./run_minio.sh

echo "-----------------------------------"
echo "2. Building & Starting AI Service..."
echo "-----------------------------------"
cd "$ROOT_DIR/services/ai_service"
./run_docker_ai_service.sh 8080

echo "-----------------------------------"
echo "3. Building & Starting Document Service..."
echo "-----------------------------------"
cd "$ROOT_DIR/services/document_service"
./run_docker_document_service.sh 4000

echo "-----------------------------------"
echo "4. Building & Starting API Gateway..."
echo "-----------------------------------"
cd "$ROOT_DIR/gateway/api_gateway"
./run_api_gateway.sh "$1" "$2"

echo "-----------------------------------"
echo "✅ All scripts have been triggered!"
echo "-----------------------------------"
