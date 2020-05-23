FROM node:lts

WORKDIR /iot
COPY . /iot

RUN npm install

EXPOSE 8081

CMD [ "node", "src/server.js" ]
