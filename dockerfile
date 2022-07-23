FROM node:16

WORKDIR /api
COPY . /api

RUN npm install

EXPOSE 8081

CMD ["sh", "-c", "node -r dotenv/config src/server.js"]
