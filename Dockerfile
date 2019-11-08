FROM node:lts

RUN mkdir -p /var/app
WORKDIR /var/app
COPY . /var/app

RUN npm install

EXPOSE 80

CMD [ "node", "server-dev.js" ]
