FROM node:lts

WORKDIR /iot
COPY . /iot

RUN npm install

EXPOSE 80 443

CMD [ "node", "server-dev.js" ]
