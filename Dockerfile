# Esta etapa instala dependencias de desarrollo y compila
FROM node:14.17-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=development
COPY . .
RUN npm run build

# Esta etapa copia lo generado por la anterior y agrega las dependencias de producción
FROM node:14.17-alpine AS production
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production
COPY . .
COPY --from=build /usr/src/app/dist ./dist

ARG PORT=3000
ENV PORT=$PORT
EXPOSE $PORT
CMD ["npm", "run", "start:prod"]
