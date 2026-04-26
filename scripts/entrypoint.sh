#!/bin/sh
set -e

echo "▶ Running database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "▶ Starting Dockit..."
exec node server.js
