#!/bin/bash
set -e

echo "=== ESG Sale API Setup ==="

# Copy Caddyfile
echo "Copying Caddyfile..."
sudo cp /home/binhvuong/projects/ESGsale/api/config/Caddyfile /etc/caddy/Caddyfile

# Copy systemd service
echo "Copying systemd service..."
sudo cp /home/binhvuong/projects/ESGsale/api/config/esgsale-api.service /etc/systemd/system/

# Reload systemd
echo "Reloading systemd..."
sudo systemctl daemon-reload

# Enable and start API service
echo "Starting esgsale-api service..."
sudo systemctl enable esgsale-api
sudo systemctl start esgsale-api

# Reload Caddy
echo "Reloading Caddy..."
sudo systemctl reload caddy

# Test
echo ""
echo "=== Testing ==="
sleep 2
curl -s http://localhost:3007/api/health

echo ""
echo "=== Done! ==="
