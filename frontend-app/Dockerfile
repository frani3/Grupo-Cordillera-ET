## ── Stage 1: Test ──────────────────────────────────────────────────────────
FROM node:18-alpine AS test
WORKDIR /app

# Instala TODAS las dependencias (incluyendo devDependencies para Jest)
COPY package*.json ./
RUN npm install

COPY src ./src

# Ejecutar tests con cobertura
RUN npm test

## ── Stage 2: Producción ────────────────────────────────────────────────────
FROM node:18-alpine AS production
WORKDIR /app

# Solo dependencias de producción
COPY package*.json ./
RUN npm install --production

COPY src ./src

ENV PORT=3000
ENV NODE_ENV=production
ENV BFF_URL=http://bff-service:8080

EXPOSE ${PORT}

CMD ["npm", "start"]
