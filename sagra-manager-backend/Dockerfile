FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ vips-dev
RUN npm install -g node-gyp
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]