#!/bin/bash

# ============================================================
# SIGTRAZ Deploy Labels Script for Dokploy/Traefik
# Sistema de Gestión de Trazabilidad
# Domain: sigtraz.grupo-santacruz.com
#
# Este script configura los labels de Traefik necesarios
# para que Dokploy enrute el tráfico correctamente.
#
# Usage: ./deploy-labels.sh [service-name]
# Example: ./deploy-labels.sh sigtraz-sigtraz-abc123
# ============================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICE_NAME="${1:-sigtraz-sigtraz-abc123}"
DOMAIN="sigtraz.grupo-santacruz.com"
TRAEFIK_NETWORK="dokploy-network"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SIGTRAZ - Configurando Labels Traefik${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Service: ${SERVICE_NAME}${NC}"
echo -e "${BLUE}Domain: ${DOMAIN}${NC}"
echo ""

# Aplicar labels de Traefik al servicio
echo -e "${YELLOW}Configurando labels de Traefik...${NC}"

docker service update \
  --label-add 'traefik.enable=true' \
  --label-add "traefik.http.routers.sigtraz.rule=Host(\`${DOMAIN}\`)" \
  --label-add 'traefik.http.routers.sigtraz.entrypoints=websecure' \
  --label-add 'traefik.http.routers.sigtraz.tls=true' \
  --label-add 'traefik.http.routers.sigtraz.tls.certresolver=letsencrypt' \
  --label-add 'traefik.http.routers.sigtraz.service=sigtraz' \
  --label-add 'traefik.http.services.sigtraz.loadbalancer.server.port=80' \
  --label-add "traefik.http.routers.sigtraz-web.rule=Host(\`${DOMAIN}\`)" \
  --label-add 'traefik.http.routers.sigtraz-web.entrypoints=web' \
  --label-add 'traefik.http.routers.sigtraz-web.middlewares=sigtraz-redirect-https' \
  --label-add 'traefik.http.middlewares.sigtraz-redirect-https.redirectscheme.scheme=https' \
  --label-add 'traefik.http.middlewares.sigtraz-redirect-https.redirectscheme.permanent=true' \
  --label-add 'traefik.http.routers.sigtraz-api.rule=Host(`'${DOMAIN}'`) && PathPrefix(`/api`)' \
  --label-add 'traefik.http.routers.sigtraz-api.entrypoints=websecure' \
  --label-add 'traefik.http.routers.sigtraz-api.tls=true' \
  --label-add 'traefik.http.routers.sigtraz-api.service=sigtraz-api' \
  --label-add 'traefik.http.services.sigtraz-api.loadbalancer.server.port=4000' \
  --label-add "traefik.docker.network=${TRAEFIK_NETWORK}" \
  "${SERVICE_NAME}" 2>/dev/null || {
    echo -e "${RED}Error: No se pudo actualizar el servicio ${SERVICE_NAME}${NC}"
    echo -e "${YELLOW}Verifica que el servicio existe en Docker Swarm${NC}"
    exit 1
  }

echo -e "${GREEN}✓ Labels de Traefik configurados correctamente${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Configuración Completada${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Dominio: ${DOMAIN}${NC}"
echo -e "${GREEN}Certificado SSL: Automático (LetsEncrypt)${NC}"
echo -e "${GREEN}Redirección HTTP→HTTPS: Habilitada${NC}"
echo -e "${GREEN}API: ${DOMAIN}/api${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "${YELLOW}1. Verifica que los contenedores están corriendo: docker ps${NC}"
echo -e "${YELLOW}2. Espera a que Traefik genere los certificados SSL${NC}"
echo -e "${YELLOW}3. Accede a: https://${DOMAIN}${NC}"
echo ""
