FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=development
COPY package.json ./
RUN npm install --include=dev --no-audit --no-fund --prefer-offline
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund --prefer-offline
COPY --from=build /app/dist ./dist
COPY server.js ./server.js
EXPOSE 3000
CMD ["node", "server.js"]
