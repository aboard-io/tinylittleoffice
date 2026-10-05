#!/usr/bin/env bash
# Build the site and publish it to an exe.dev VM running nginx on :8000.
# Usage: deploy/deploy.sh [vm-name]   (default: tinyoffice)
set -euo pipefail
cd "$(dirname "$0")/.."
VM="${1:-tinyoffice}"
HOST="$VM.exe.xyz"

npm ci
npm run build

rsync -az --delete dist/ "$HOST:/tmp/tinyoffice-dist/"
scp -q deploy/nginx.conf "$HOST:/tmp/tinyoffice-nginx.conf"
ssh "$HOST" '
  set -e
  sudo mkdir -p /srv/www/tinyoffice
  # Old script and style files stay: a page opened before this deploy may still ask for them.
  sudo rsync -a --delete --exclude=/assets /tmp/tinyoffice-dist/ /srv/www/tinyoffice/
  sudo rsync -a /tmp/tinyoffice-dist/assets/ /srv/www/tinyoffice/assets/
  sudo mv /tmp/tinyoffice-nginx.conf /etc/nginx/sites-available/tinyoffice
  sudo ln -sf /etc/nginx/sites-available/tinyoffice /etc/nginx/sites-enabled/tinyoffice
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl enable --now nginx
  sudo systemctl reload nginx
'
ssh exe.dev share port "$VM" 8000
ssh exe.dev share set-public "$VM"
echo "Live at https://$HOST/"
