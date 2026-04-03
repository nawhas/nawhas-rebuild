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

# CORS policy — required for browser audio streaming.
# Howler.js sets crossOrigin="anonymous" on the HTMLAudioElement, causing the
# browser to enforce Same-Origin Policy. Without CORS headers, MinIO returns
# the audio bytes but the browser refuses to hand them to the JS context.
cat > /tmp/cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type", "Accept-Ranges", "Content-Range"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

mc cors set local/nawhas-audio /tmp/cors.json
mc cors set local/nawhas-images /tmp/cors.json

echo "MinIO init complete: buckets created, anonymous access enabled, CORS configured."
