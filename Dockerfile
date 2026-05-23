# Multi-stage build for frontend and backend

# Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json frontend/
COPY frontend/ .
RUN npm ci --prefix ./frontend && npm run build --prefix ./frontend

# Install backend dependencies
FROM node:18-alpine AS backend-deps
WORKDIR /app
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --production

# Production image
FROM node:18-alpine AS production
WORKDIR /app
# copy backend source
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend ./backend
# copy frontend dist into /app/frontend/dist so backend can serve it
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist
# ensure uploads directory exists
RUN mkdir -p /app/backend/uploads
# Install pm2 runtime
RUN npm install -g pm2@5.3.0
# expose port
EXPOSE 5000
# copy pm2 ecosystem
COPY ecosystem.config.js ./
WORKDIR /app/backend
CMD ["pm2-runtime", "../ecosystem.config.js"]
