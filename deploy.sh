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
  sigtraz-sigtraz-ha6c4w
