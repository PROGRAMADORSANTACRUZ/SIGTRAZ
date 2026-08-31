# SIGTRAZ - Guía de Deployment en Dokploy

## 📋 Requisitos Previos

- **Dokploy** instalado y corriendo en el servidor
- **Docker** y **Docker Compose** en el servidor host
- **SSH access** sin contraseña (SSH keys configuradas)
- **Git** (opcional, para clonar el repositorio)
- **PostgreSQL 16** (se ejecutará en contenedor)
- Dominio: `sigtraz.grupo-santacruz.com` apuntando al servidor

## 🚀 Pasos de Deployment

### 1. Preparar el Servidor

```bash
# Conectarse al servidor
ssh dokploy@<server-ip>

# Verificar instalación de Docker
docker --version
docker-compose --version

# Crear directorio para SIGTRAZ
mkdir -p ~/sigtraz
cd ~/sigtraz
```

### 2. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo a producción
cp .env.example .env.production

# Editar con tus valores
nano .env.production
```

**Variables importantes a cambiar:**

```env
# Cambiar contraseña de base de datos
DB_PASSWORD=tu-password-seguro

# JWT Secret - IMPORTANTE: Usar una cadena aleatoria fuerte
JWT_SECRET=tu-clave-secreta-jwt-super-fuerte-aleatorio

# Si es diferente del dominio por defecto
CORS_ORIGIN=https://sigtraz.grupo-santacruz.com
VITE_API_URL=https://sigtraz.grupo-santacruz.com/api
```

### 3. Ejecutar el Deploy

#### Opción A: Script automático (Recomendado)

```bash
# Dar permisos de ejecución
chmod +x deploy.sh

# Ejecutar el deploy
./deploy.sh <server-ip> dokploy sigtraz

# Ejemplo:
./deploy.sh 192.168.1.100 dokploy sigtraz
```

#### Opción B: Deploy manual

```bash
# En el servidor
cd ~/sigtraz

# Construir imágenes
docker-compose build --no-cache

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### 4. Verificar Deployment

```bash
# Ver estado de contenedores
docker-compose ps

# Ver logs del backend
docker-compose logs backend

# Ver logs del frontend
docker-compose logs frontend

# Probar API
curl https://sigtraz.grupo-santacruz.com/api/health

# Probar aplicación web
curl https://sigtraz.grupo-santacruz.com
```

## 🐳 Estructura Docker

### Componentes

| Servicio   | Puerto | Descripción                      |
|-----------|--------|----------------------------------|
| **db**     | 5432   | PostgreSQL 16 Database          |
| **backend**| 4000   | Express API Server              |
| **frontend**| 3000   | Nginx + React/Vite Frontend     |

### Dockerfile.frontend
- Multistage build (optimized)
- Build: Node 20
- Production: Nginx Alpine
- Sirve la aplicación React compilada

### Dockerfile.backend
- Multistage build (optimized)
- Build: Node 20 + TypeScript
- Production: Node 20 Alpine
- Conecta a PostgreSQL

## 📦 Docker Compose Features

- **Networks**: Aislamiento de red
- **Health checks**: Monitoreo automático
- **Volumes**: Persistencia de datos (db_data)
- **Labels**: Configuración de Dokploy
- **Restart policy**: Auto-reinicio en fallos

## 🔒 Seguridad

### SSL/TLS con Dokploy

Si Dokploy tiene integración con Traefik/LetsEncrypt:

```yaml
# Los labels ya están configurados para:
# - Auto-redirección HTTP→HTTPS
# - Certificado HTTPS automático
# - Path rewriting (/api)
```

### Cambiar Secretos en Producción

```bash
# SSH al servidor
ssh dokploy@<server-ip>

# Editar .env.production
nano /home/dokploy/sigtraz/.env.production

# Reiniciar contenedores
cd /home/dokploy/sigtraz
docker-compose down
docker-compose up -d
```

## 📊 Monitoreo y Mantenimiento

### Ver logs en tiempo real

```bash
# Backend
docker-compose logs -f backend

# Frontend
docker-compose logs -f frontend

# Database
docker-compose logs -f db

# Todo
docker-compose logs -f
```

### Backups de Base de Datos

```bash
# Crear backup
docker-compose exec db pg_dump -U sigtraz sigtraz > backup.sql

# Restaurar backup
docker-compose exec -T db psql -U sigtraz sigtraz < backup.sql
```

### Detener y Reiniciar

```bash
# Detener todos los servicios
docker-compose down

# Reiniciar todos los servicios
docker-compose up -d

# Reiniciar un servicio específico
docker-compose restart backend
```

## 🐛 Troubleshooting

### El API no responde

```bash
# Ver logs del backend
docker-compose logs backend

# Verificar conexión a BD
docker-compose exec backend npm run db:init

# Reiniciar el backend
docker-compose restart backend
```

### Frontend en blanco

```bash
# Ver logs del frontend
docker-compose logs frontend

# Verificar CORS en .env.production
# Debe estar configurado correctamente

# Reiniciar frontend
docker-compose restart frontend
```

### Problemas de base de datos

```bash
# Ver logs de PostgreSQL
docker-compose logs db

# Conectarse a la BD
docker-compose exec db psql -U sigtraz -d sigtraz

# Reiniciar BD (cuidado, se perderán datos sin backup)
docker-compose down
docker volume rm sigtraz_db_data
docker-compose up -d db
```

## 🔄 Actualizar la Aplicación

```bash
# 1. Descargar cambios
cd ~/sigtraz
git pull

# 2. Reconstruir imágenes
docker-compose build --no-cache

# 3. Reiniciar servicios
docker-compose up -d

# 4. Ver logs para confirmar
docker-compose logs -f
```

## 📝 Logs y Diagnostics

### Archivo de configuración Dokploy

Si Dokploy requiere configuración adicional:

```bash
# Dokploy típicamente está en:
/home/dokploy/.dokploy/

# Ver configuración
cat /home/dokploy/.dokploy/config.json
```

### Variables de Entorno para Dokploy

Los labels del docker-compose.yml ya están configurados:

```yaml
labels:
  - "dokploy.managed=true"
  - "traefik.enable=true"
  - "traefik.http.routers.sigtraz.rule=Host(`sigtraz.grupo-santacruz.com`)"
```

## 🎯 Próximos Pasos

1. **Dominio DNS**: Apuntar `sigtraz.grupo-santacruz.com` al IP del servidor
2. **SSL/TLS**: Verificar configuración de certificados en Dokploy
3. **Base de Datos**: Ejecutar migraciones iniciales si es necesario
4. **Admin User**: Crear usuario administrador:
   ```bash
   docker-compose exec backend npm run crear:admin
   ```
5. **Backups**: Configurar backups automáticos de la base de datos
6. **Monitoreo**: Configurar alertas en Dokploy

## 📞 Soporte

Para problemas de deployment, revisar:
- Logs de Docker Compose
- Configuración de variables de entorno
- Conectividad de red y puertos
- Documentación de Dokploy
