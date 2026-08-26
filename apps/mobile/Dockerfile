FROM node:22-alpine AS build
WORKDIR /workspace
COPY package*.json ./
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN npm install --workspace @campuscare/mobile --include-workspace-root
COPY apps/mobile apps/mobile
ARG EXPO_PUBLIC_API_URL=/api
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
RUN npm run build:web -w @campuscare/mobile

FROM nginx:1.28-alpine
COPY apps/mobile/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/mobile/dist /usr/share/nginx/html
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -q -O - http://127.0.0.1/healthz || exit 1

