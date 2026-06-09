#!/bin/bash

# Navigate to the directory where this script is located, then go up to src
cd "$(dirname "$0")/.." || exit

# Download MinIO binary if it doesn't exist
if [ ! -f "minio" ]; then
    echo "Downloading MinIO server binary..."
    wget https://dl.min.io/server/minio/release/linux-amd64/minio
    chmod +x minio
fi

# Create the local data directory for S3 emulation
mkdir -p ./minio-data

echo "Starting MinIO Server..."
echo "S3 API Endpoint: http://localhost:9000"
echo "MinIO Console (Browser UI): http://localhost:9001"
echo "Default Credentials -> Access Key: admin | Secret Key: password"

# Start the MinIO server
MINIO_ROOT_USER=admin \
MINIO_ROOT_PASSWORD=password \
./minio server ./minio-data --console-address ":9001"
