#!/bin/bash

# ============================================================
# SIGTRAZ Deploy Script for Dokploy
# Sistema de Gestión de Trazabilidad
# Domain: sigtraz.grupo-santacruz.com
#
# Usage: ./deploy.sh [server-ip] [server-user] [dokploy-project-name]
# Example: ./deploy.sh 192.168.1.100 dokploy sigtraz
# ============================================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"
SERVER_IP="${1:-localhost}"
SERVER_USER="${2:-dokploy}"
DOKPLOY_PROJECT="${3:-sigtraz}"
DOCKER_REGISTRY="${4:-}"
REMOTE_DOCKER_DIR="/home/${SERVER_USER}/sigtraz"
DEPLOYMENT_DATE=$(date +"%Y-%m-%d_%H-%M-%S")
DOMAIN="sigtraz.grupo-santacruz.com"

# Environment file
ENV_FILE="${PROJECT_DIR}/.env.production"
ENV_EXAMPLE_FILE="${PROJECT_DIR}/.env.example"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}SIGTRAZ Deployment to Dokploy${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Server: ${SERVER_IP}${NC}"
echo -e "${YELLOW}User: ${SERVER_USER}${NC}"
echo -e "${YELLOW}Project: ${DOKPLOY_PROJECT}${NC}"
echo ""

# Validate environment
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Missing .env.production file${NC}"
    echo -e "${YELLOW}Creating from template...${NC}"
    
    if [ -f "$ENV_EXAMPLE_FILE" ]; then
        cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
        echo -e "${YELLOW}Created .env.production from .env.example${NC}"
        echo -e "${YELLOW}Please edit .env.production with production values and try again${NC}"
    else
        cat > "$ENV_FILE" << 'EOF'
# Database Configuration
DB_USER=sigtraz
DB_PASSWORD=sigtraz123
DB_DATABASE=sigtraz
DB_PORT=5432

# Backend Configuration
PORT=4000
API_PORT=4000
NODE_ENV=production

# Frontend Configuration
WEB_PORT=3000
VITE_API_URL=https://sigtraz.grupo-santacruz.com/api

# Security
JWT_SECRET=change-this-secret-in-production-use-strong-random-string
JWT_EXPIRES_IN=8h
SEED_PASSWORD=sigtraz123

# CORS
CORS_ORIGIN=https://sigtraz.grupo-santacruz.com

# Container Registry (optional)
# REGISTRY_URL=registry.example.com
# REGISTRY_USER=username
# REGISTRY_PASSWORD=password
EOF
        echo -e "${YELLOW}Created .env.production template${NC}"
        echo -e "${YELLOW}Please edit .env.production with production values and try again${NC}"
    fi
    exit 1
fi

# Load environment
source "$ENV_FILE"

# Validate required variables
REQUIRED_VARS=("DB_USER" "DB_PASSWORD" "DB_DATABASE" "JWT_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: Required variable $var is not set in .env.production${NC}"
        exit 1
    fi
done

# Validate connection to server
echo -e "${YELLOW}Validating connection to server...${NC}"
if ! ssh -o ConnectTimeout=5 "${SERVER_USER}@${SERVER_IP}" "echo 'SSH connection OK'" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to ${SERVER_USER}@${SERVER_IP}${NC}"
    echo -e "${YELLOW}Please ensure:${NC}"
    echo -e "${YELLOW}  1. Server is reachable at ${SERVER_IP}${NC}"
    echo -e "${YELLOW}  2. User '${SERVER_USER}' exists on the server${NC}"
    echo -e "${YELLOW}  3. SSH key is configured for passwordless access${NC}"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection successful${NC}"

# Check if Dokploy is running on server
echo -e "${YELLOW}Checking Dokploy installation...${NC}"
if ssh "${SERVER_USER}@${SERVER_IP}" "docker ps --format '{{.Names}}' | grep -q dokploy" 2>/dev/null; then
    echo -e "${GREEN}✓ Dokploy is running${NC}"
else
    echo -e "${YELLOW}⚠ Dokploy might not be running or Docker is not configured${NC}"
fi

# Create remote directory
echo -e "${YELLOW}Creating remote deployment directory...${NC}"
ssh "${SERVER_USER}@${SERVER_IP}" "mkdir -p ${REMOTE_DOCKER_DIR}"

# Create backup of existing deployment
echo -e "${YELLOW}Creating backup of existing deployment...${NC}"
ssh "${SERVER_USER}@${SERVER_IP}" << EOF
    if [ -d "${REMOTE_DOCKER_DIR}/docker-compose.yml" ] || [ -f "${REMOTE_DOCKER_DIR}/docker-compose.yml" ]; then
        mkdir -p ${REMOTE_DOCKER_DIR}/backups
        cp -r ${REMOTE_DOCKER_DIR} ${REMOTE_DOCKER_DIR}/backups/backup_${DEPLOYMENT_DATE} 2>/dev/null || true
        echo "Backup created"
    fi
EOF

# Copy Docker files to server
echo -e "${YELLOW}Uploading Docker configuration files...${NC}"
scp -q \
    "${PROJECT_DIR}/docker-compose.yml" \
    "${PROJECT_DIR}/Dockerfile.frontend" \
    "${PROJECT_DIR}/Dockerfile.backend" \
    "${PROJECT_DIR}/nginx.conf" \
    "${PROJECT_DIR}/.env.production" \
    "${SERVER_USER}@${SERVER_IP}:${REMOTE_DOCKER_DIR}/"

echo -e "${GREEN}✓ Files uploaded${NC}"

# Copy entire project to server (excluding node_modules and dist)
echo -e "${YELLOW}Uploading project files...${NC}"
rsync -av --delete \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    --exclude=.DS_Store \
    --exclude=.env \
    --exclude=.env.local \
    --exclude=.env.*.local \
    --exclude=backups \
    "${PROJECT_DIR}/" \
    "${SERVER_USER}@${SERVER_IP}:${REMOTE_DOCKER_DIR}/"

echo -e "${GREEN}✓ Project files uploaded${NC}"

# Deploy with Docker Compose on server
echo -e "${YELLOW}Deploying containers...${NC}"
ssh "${SERVER_USER}@${SERVER_IP}" << EOF
    cd ${REMOTE_DOCKER_DIR}
    
    # Stop existing containers
    echo "Stopping existing containers..."
    docker-compose down || true
    
    # Build and start containers
    echo "Building Docker images..."
    docker-compose build --no-cache
    
    echo "Starting containers..."
    docker-compose up -d
    
    echo "Waiting for services to be healthy..."
    sleep 10
    
    # Check container status
    echo "Container status:"
    docker-compose ps
    
    # Show logs
    echo "Recent logs:"
    docker-compose logs --tail=20
EOF

echo -e "${GREEN}✓ Deployment completed${NC}"

# Post-deployment validation
echo -e "${YELLOW}Validating deployment...${NC}"
ssh "${SERVER_USER}@${SERVER_IP}" << EOF
    cd ${REMOTE_DOCKER_DIR}
    
    echo "Checking database connectivity..."
    docker-compose exec -T db pg_isready -U ${DB_USER} || echo "⚠ Database check failed"
    
    echo "Checking API health..."
    curl -s http://localhost:4000/api/health > /dev/null && echo "✓ API is responding" || echo "⚠ API health check failed"
    
    echo "Checking Frontend..."
    curl -s http://localhost:3000 > /dev/null && echo "✓ Frontend is responding" || echo "⚠ Frontend health check failed"
EOF

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Application: SIGTRAZ${NC}"
echo -e "${GREEN}✓ Server: ${SERVER_IP}${NC}"
echo -e "${GREEN}✓ URL: https://sigtraz.grupo-santacruz.com${NC}"
echo -e "${GREEN}✓ API: https://sigtraz.grupo-santacruz.com/api${NC}"
echo -e "${GREEN}✓ Deployment Date: ${DEPLOYMENT_DATE}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${YELLOW}1. Configure your domain DNS to point to ${SERVER_IP}${NC}"
echo -e "${YELLOW}2. Verify SSL/TLS configuration in Dokploy${NC}"
echo -e "${YELLOW}3. Monitor application logs: ssh ${SERVER_USER}@${SERVER_IP} 'cd ${REMOTE_DOCKER_DIR} && docker-compose logs -f'${NC}"
echo -e "${YELLOW}4. Perform database migrations if needed${NC}"
echo ""
echo -e "${GREEN}Deployment successful!${NC}"
