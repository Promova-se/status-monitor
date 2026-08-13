#!/usr/bin/env bash
# Atualiza o Status na VPS a partir do GitHub.
# Rode na VPS como root:  bash /opt/status/deploy/update.sh
set -e
APP_DIR="/opt/status"

echo ">>> Baixando atualizacoes do GitHub..."
sudo -u status git -C "$APP_DIR" pull

echo ">>> Instalando dependencias e refazendo o build..."
sudo -u status bash -lc "cd $APP_DIR && npm ci --no-audit --no-fund && npx prisma generate && npx prisma db push && npm run build"

echo ">>> Reiniciando servicos..."
systemctl restart status-app status-worker

echo ">>> Atualizacao concluida. Servicos:"
printf "app:    "; systemctl is-active status-app
printf "worker: "; systemctl is-active status-worker
