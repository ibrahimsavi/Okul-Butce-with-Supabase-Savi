# Node.js 18 Alpine tabanlı hafif imaj kullan
FROM node:18-alpine

# Çalışma dizinini ayarla
WORKDIR /usr/src/app

# package*.json dosyalarını kopyala
COPY package*.json ./

# Native modüller (better-sqlite3) için derleme araçları
RUN apk add --no-cache python3 make g++

# Bağımlılıkları yükle (yalnızca production)
RUN npm ci --omit=dev

# Uygulama kodunu kopyala
COPY . .

# Veri klasörü oluştur
RUN mkdir -p data

# 3000 portunu aç
EXPOSE 3000

# Sunucuyu başlat
CMD ["node", "server.js"]