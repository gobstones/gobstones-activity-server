# Esta etapa instala dependencias de desarrollo y compila
FROM node:14.17-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=development
COPY . .
RUN npm run build

# Esta etapa copia lo generado por la anterior y agrega las dependencias de producción
FROM node:14.17-alpine AS production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production
COPY . .
COPY --from=build /usr/src/app/dist ./dist

CMD ["npm", "run", "start:prod"]
