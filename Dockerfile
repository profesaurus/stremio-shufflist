FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY dist ./dist
COPY src/web ./dist/web

EXPOSE 7000

CMD ["node", "dist/addon.js"]
