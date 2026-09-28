FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY web ./web
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8766 DB_FILE=/app/data/restaurant.sqlite
EXPOSE 8766
CMD ["node", "server/server.js"]
