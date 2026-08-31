# 🚀 SIGTRAZ - Docker & Dokploy Deployment Files

Todos los archivos necesarios para deployar SIGTRAZ en Dokploy están listos.

## 📦 Archivos Generados

### 1. **Dockerfile.frontend** 
   - Build multistage optimizado para React/Vite
   - Nginx Alpine para producción
   - Cache busting y SPA routing configurado
   - Health checks incluidos

### 2. **Dockerfile.backend**
   - Build multistage para Express API
   - Node.js 20 Alpine
   - Manejo correcto de signals (dumb-init)
   - Health checks incluidos

### 3. **docker-compose.yml**
   - Orquestación completa: PostgreSQL 16 + Backend + Frontend
   - Labels de Dokploy configurados
   - Traefik labels para routing automático
   - Networking seguro entre contenedores
   - Volúmenes para persistencia de datos

### 4. **nginx.conf**
   - Configuración Nginx optimizada
   - SPA routing (try_files)
   - Gzip compression
   - Cache control (static assets + index.html)
   - Health check endpoint

### 5. **deploy.sh**
   - Script bash completamente automatizado
   - Validación de conexión SSH
   - Backup automático de deployment anterior
   - Rsync para sincronización eficiente
   - Post-deployment validation
   - Manejo de errores robusto

### 6. **.env.example** (Actualizado)
   - Todas las variables de entorno necesarias
   - Comentarios explicativos
   - Valores de producción
   - Variables opcionales de registry

### 7. **DEPLOYMENT_GUIDE.md**
   - Guía completa paso a paso
   - Troubleshooting
   - Comandos útiles
   - Monitoreo y mantenimiento

---

## ⚡ Quick Start

### Paso 1: Preparar el servidor
```bash
ssh dokploy@<tu-servidor-ip>
mkdir -p ~/sigtraz
cd ~/sigtraz
```

### Paso 2: Configurar variables de entorno
```bash
cp .env.example .env.production
nano .env.production  # Editar contraseñas y secretos
```

### Paso 3: Ejecutar deployment (desde tu PC)
```bash
chmod +x deploy.sh
./deploy.sh 192.168.1.100 dokploy sigtraz
```

### Paso 4: Verificar
```bash
# Aplicación: https://sigtraz.grupo-santacruz.com
# API: https://sigtraz.grupo-santacruz.com/api
```

---

## 🔒 Variables de Entorno Críticas

Editar en `.env.production` ANTES de deployar:

```env
# Base de Datos
DB_PASSWORD=tu-password-seguro-aqui

# JWT Secret (generar con: openssl rand -base64 32)
JWT_SECRET=tu-clave-secreta-super-fuerte

# CORS (si el dominio es diferente)
CORS_ORIGIN=https://sigtraz.grupo-santacruz.com
VITE_API_URL=https://sigtraz.grupo-santacruz.com/api
```

---

## 📋 Checklist Pre-Deployment

- [ ] Servidor con Docker y Docker Compose instalado
- [ ] SSH sin contraseña (SSH keys configuradas)
- [ ] Dominio `sigtraz.grupo-santacruz.com` apuntando al servidor
- [ ] `.env.production` editado con contraseñas seguras
- [ ] JWT_SECRET es una cadena aleatoria fuerte
- [ ] Dokploy running en el servidor

---

## 🐳 Arquitectura de Contenedores

```
┌─────────────────────────────────────────┐
│  sigtraz-network (Docker Network)       │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────┐  ┌───────────────┐  │
│  │   Frontend    │  │    Backend    │  │
│  │  (Nginx)      │  │  (Express)    │  │
│  │  :80→3000     │  │  :4000        │  │
│  └───┬───────────┘  └───┬───────────┘  │
│      │                   │              │
│      └───────┬───────────┘              │
│              │                          │
│         ┌────▼────┐                    │
│         │   DB    │                    │
│         │(PostgreSQL)                  │
│         │ :5432   │                    │
│         └─────────┘                    │
│                                        │
└────────────────────────────────────────┘
```

---

## 📞 Soporte y Troubleshooting

Ver [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) para:
- Troubleshooting detallado
- Comandos de monitoreo
- Backup y restauración
- Actualización de la aplicación

---

## 🎯 Dominio: sigtraz.grupo-santacruz.com

El docker-compose.yml ya está configurado con:
- ✅ Labels de Traefik para enrutamiento automático
- ✅ SSL/TLS con LetsEncrypt (si Dokploy lo configura)
- ✅ Redirección HTTP → HTTPS
- ✅ Path rewriting para `/api`
- ✅ CORS configurado

Solo necesitas:
1. Apuntar el dominio DNS al servidor
2. Dokploy manejará el resto automáticamente

---

**Generado**: 2026-08-31  
**Versión**: 1.0.0  
**Dominio**: sigtraz.grupo-santacruz.com
