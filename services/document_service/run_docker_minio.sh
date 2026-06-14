docker run -d --name minio \
    -p 9000:9000 -p 9001:9001 \
    -e "MINIO_ROOT_USER=admin" \
    -e "MINIO_ROOT_PASSWORD=password" \
    -v /home/vin/01-prj/doc-micro-access-ctr/minio-data:/data \
    quay.io/minio/minio server /data --console-address ":9001"