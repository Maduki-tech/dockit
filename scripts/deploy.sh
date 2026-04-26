#!/bin/bash
# Deploy script — run this on your VPS to update Dockit.
# Usage: bash scripts/deploy.sh
set -e

echo "═══════════════════════════════════════"
echo "  Deploying Dockit"
echo "═══════════════════════════════════════"

# Pull the latest code from the repo
echo ""
echo "▶ Pulling latest code..."
git pull

# Build new Docker image
echo ""
echo "▶ Building Docker image..."
docker compose build

# Start (or restart) all services
echo ""
echo "▶ Starting services..."
docker compose up -d

# Migrations run automatically inside the app container on startup.
# Tail the logs briefly so you can see if migrations succeeded.
echo ""
echo "▶ Waiting for app to start..."
sleep 5
docker compose logs --tail=30 app

echo ""
echo "✓ Deploy complete."
echo "  Check status: docker compose ps"
echo "  View logs:    docker compose logs -f app"
