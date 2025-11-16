# Node.js 20 Alpine tabanlı hafif imaj kullan
FROM node:20-alpine

# Çalışma dizinini ayarla
WORKDIR /app

# package*.json dosyalarını kopyala
COPY package*.json package-lock.json* ./

# Native modüller için derleme araçları
RUN apk add --no-cache python3 make g++

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

# 3000 portunu aç
EXPOSE 3000

# Health check ekle
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}")"

# Sunucuyu başlat
CMD ["node", "server.js"]