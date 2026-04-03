#!/bin/sh
# MinIO initialisation script — runs once on first startup via the minio-init
# Docker Compose service. Creates audio/image buckets, sets anonymous download
# access, and configures CORS so browsers can fetch audio cross-origin
# (required for Howler.js crossOrigin="anonymous" mode).
set -e

# Register local alias
mc alias set local http://minio:9000 minioadmin minioadmin

# Create buckets (idempotent)
mc mb --ignore-existing local/nawhas-audio
mc mb --ignore-existing local/nawhas-images

# Allow anonymous GET/HEAD so public URLs work without presigned tokens
mc anonymous set download local/nawhas-audio
mc anonymous set download local/nawhas-images

echo "MinIO init complete: buckets created, anonymous access enabled."
echo "CORS is handled at the server level via MINIO_API_CORS_ALLOW_ORIGIN (set in docker-compose.yml)."
