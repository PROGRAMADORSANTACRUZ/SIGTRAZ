# ============================================================
# SIGTRAZ - Dockerfile de producción para Dokploy
# Compila frontend (Vite/React) + backend (Express/Node)
# en un solo contenedor.  Nginx sirve el SPA en :80 y
# hace proxy de /api → backend en :4000.
# ============================================================

# ---- Etapa 1: Build del Frontend ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app

ARG VITE_API_URL=https://sigtraz.grupo-santacruz.com/api
ARG VITE_PUBLIC_URL=https://sigtraz.grupo-santacruz.com
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_URL=$VITE_PUBLIC_URL

COPY package*.json ./
RUN npm install

# Copia todo el frontend (src, public, config files) — .dockerignore excluye server/ y node_modules
COPY . .
RUN mkdir -p ./public
RUN npm run build

# ---- Etapa 2: Build del Backend ----
FROM node:20-alpine AS backend-builder
WORKDIR /app

COPY server/package*.json ./
RUN npm install

COPY server/tsconfig.json ./
COPY server/src ./src

RUN npm run build

# ---- Etapa 3: Imagen de producción ----
FROM node:20-alpine
RUN apk add --no-cache nginx dumb-init

# ── Frontend: archivos estáticos servidos por Nginx ──
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# ── Backend: runtime Node ──
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY --from=backend-builder /app/dist ./dist

# ── Script de inicio ──
COPY docker-start.sh /docker-start.sh
RUN chmod +x /docker-start.sh

EXPOSE 80

ENTRYPOINT ["/usr/sbin/dumb-init", "--"]
CMD ["/docker-start.sh"]
