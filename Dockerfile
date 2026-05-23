# Node.js 20 Alpine tabanlı hafif imaj kullan
FROM node:20-alpine

# Çalışma dizinini ayarla
WORKDIR /app

# package*.json dosyalarını kopyala
COPY package*.json package-lock.json* ./

# Native modüller için derleme araçları + curl (healthcheck için)
RUN apk add --no-cache python3 make g++ curl

# Bağımlılıkları yükle (yalnızca production)
RUN npm ci --only=production

# Uygulama kodunu kopyala
COPY . .

# Non-root user oluştur ve sahipliği değiştir
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Non-root user'a geç
USER nodejs

# 9876 portunu aç
EXPOSE 9876

# Health check (curl ile - Coolify uyumlu)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT:-9876}/health || exit 1

# Sunucuyu başlat
CMD ["node", "server.js"]