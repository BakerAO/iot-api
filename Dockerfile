FROM node:lts

WORKDIR /myNewDir
COPY . /myNewDir
COPY /etc/letsencrypt/live/api.innov8.host/privkey.pem /etc/letsencrypt/live/api.innov8.host/privkey.pem
COPY /etc/letsencrypt/live/api.innov8.host/cert.pem /etc/letsencrypt/live/api.innov8.host/cert.pem
COPY /etc/letsencrypt/live/api.innov8.host/chain.pem /etc/letsencrypt/live/api.innov8.host/chain.pem

RUN npm install

EXPOSE 80 443

CMD [ "node", "server.js" ]
