const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();
const routes = require('./routes');
const credentials = {
	key: fs.readFileSync('/etc/letsencrypt/live/api.innov8.host/privkey.pem', 'utf8'),
	cert: fs.readFileSync('/etc/letsencrypt/live/api.innov8.host/cert.pem', 'utf8'),
	ca: fs.readFileSync('/etc/letsencrypt/live/api.innov8.host/chain.pem', 'utf8')
};

app.use(express.static(__dirname, { dotfiles: 'allow' } ));

app.use(express.json());

app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "https://innov8.host");
   res.header("Access-Control-Allow-Headers", "*");
   next();
});

app.use('/', routes);

http.createServer((req, res) => {
    res.writeHead(301, { "Location": "https://" + req.headers.host + req.url });
    res.end();
}).listen(80);

https.createServer(credentials, app).listen(443, () => {
	console.log('Started');
});
