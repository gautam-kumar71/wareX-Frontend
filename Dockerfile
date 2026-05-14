FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

COPY --from=build /app/dist/warex-frontend/browser/ ./
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY docker/runtime-config.template.js /opt/warex/runtime-config.template.js

RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80
