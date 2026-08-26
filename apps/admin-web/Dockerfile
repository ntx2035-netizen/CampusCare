FROM node:22-alpine AS build
WORKDIR /workspace
COPY package*.json ./
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN npm install --workspace @campuscare/admin-web --include-workspace-root
COPY apps/admin-web apps/admin-web
RUN npm run build -w @campuscare/admin-web

FROM nginx:1.28-alpine
COPY apps/admin-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/admin-web/dist /usr/share/nginx/html
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -q -O - http://127.0.0.1/healthz || exit 1

