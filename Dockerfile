#multi-stage: primero construimos con Node y luego servimos con nginx.
#asi la imagen final no lleva todo el Node toolchain (mas ligera y segura).

#=== etapa 1: build ===
FROM node:20-alpine AS build

WORKDIR /app

#copiamos solo los manifests primero para cachear la capa de npm install
COPY package.json package-lock.json ./
RUN npm ci

#ahora el resto del codigo y el build de produccion
COPY . .
RUN npm run build

#=== etapa 2: nginx servidor estatico ===
FROM nginx:alpine

#copiamos el bundle compilado al directorio que nginx sirve por defecto
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

#configuracion nginx personalizada para que las rutas de Angular funcionen
#(todas las urls que no existen como archivo deben caer en index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
