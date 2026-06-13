#!/bin/bash

# 1. Pull the official MinIO image (MinIO does not require a Dockerfile build)
docker pull minio/minio

# 2. Run the MinIO container
# We map both the S3 API port (9000) and the Console UI port (9001).
# The volume is mounted to ../minio-data, assuming this script is run from the infrastructure/ folder.
docker run -d \
  --name minio \
  --network ringisho-net \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=admin \
  -e MINIO_ROOT_PASSWORD=password \
  -v $(pwd)/../minio-data:/data \
  minio/minio server /data --console-address ":9001"
