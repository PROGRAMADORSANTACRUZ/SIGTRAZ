#!/bin/bash

# ============================================================
# SIGTRAZ Deploy Labels Script for Dokploy/Traefik
# Sistema de Gestión de Trazabilidad
# Domain: sigtraz.grupo-santacruz.com
#
# Usage: ./deploy-labels.sh [service-name]
# Example: ./deploy-labels.sh sigtraz-sigtraz-abc123
# ============================================================

SERVICE_NAME="${1}"

if [ -z "$SERVICE_NAME" ]; then
    echo "Error: Service name is required"
    echo "Usage: $0 [service-name]"
    echo "Example: $0 sigtraz-sigtraz-abc123"
    exit 1
fi

docker service update \
  --label-add 'traefik.enable=true' \
  --label-add 'traefik.http.routers.sigtraz.rule=Host(`sigtraz.grupo-santacruz.com`)' \
  --label-add 'traefik.http.routers.sigtraz.entrypoints=websecure' \
  --label-add 'traefik.http.routers.sigtraz.tls=true' \
  --label-add 'traefik.http.routers.sigtraz.tls.certresolver=letsencrypt' \
  --label-add 'traefik.http.routers.sigtraz.service=sigtraz' \
  --label-add 'traefik.http.services.sigtraz.loadbalancer.server.port=80' \
  --label-add 'traefik.http.routers.sigtraz-web.rule=Host(`sigtraz.grupo-santacruz.com`)' \
  --label-add 'traefik.http.routers.sigtraz-web.entrypoints=web' \
  --label-add 'traefik.http.routers.sigtraz-web.middlewares=sigtraz-redirect-https' \
  --label-add 'traefik.http.middlewares.sigtraz-redirect-https.redirectscheme.scheme=https' \
  --label-add 'traefik.http.middlewares.sigtraz-redirect-https.redirectscheme.permanent=true' \
  --label-add 'traefik.docker.network=dokploy-network' \
  "$SERVICE_NAME"
