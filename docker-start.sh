#!/bin/sh
# Inicia el backend en segundo plano y luego Nginx en primer plano
node /app/dist/index.js &
nginx -g "daemon off;"
