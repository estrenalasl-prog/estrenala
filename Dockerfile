# --- deps ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build ---
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- run ---
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
# Los archivos entran ya con dueño `node`, y su carpeta de caché se crea aquí: el
# proceso arranca sin privilegios y Next quiere escribir en .next/cache en
# caliente. Sin esto salta «EACCES: permission denied, mkdir '/app/.next/cache'»
# como unhandledRejection (visto en producción el 2026-07-27).
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
RUN mkdir -p .next/cache && chown node:node .next/cache
USER node
EXPOSE 3000

# Cuándo está listo para recibir tráfico.
#
# Sin esto el contenedor se da por vivo en cuanto arranca `node server.js`, que
# es ANTES de que Next escuche: durante esa ventana Traefik ya le manda visitas y
# todas se van con un 5xx. Search Console avisó de ello el 2026-09-07 («Error de
# servidor (5xx)», 1 página) después de los seis despliegues del día 2 y 3.
#
# Va contra `/api/health` y NO contra `/api/salud`, y la diferencia importa:
# salud viaja a Postgres y responde 503 si no contesta, así que un hipo de la
# base de datos marcaría el contenedor como enfermo y Docker lo reiniciaría —
# llevándose por delante también las webs de los clientes que sí se estaban
# sirviendo. Reiniciar no arregla una base de datos caída. El porqué de que sean
# dos endpoints está escrito en app/api/health/route.ts.
#
# `/api/health` sale del middleware antes de mirar el Host, así que contesta
# igual llamándolo por 127.0.0.1 y no hace falta fingir la cabecera.
#
# Se usa node y no curl o wget porque node es lo único que la imagen garantiza.
HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=3 \
  CMD ["node", "-e", "require('http').get({host:'127.0.0.1',port:process.env.PORT||3000,path:'/api/health'},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]

CMD ["node", "server.js"]
