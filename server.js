const http = require('http');
const https = require('https');
const express = require('express');
const fs = require('fs');
const mysql = require('mysql');
require('dotenv').config();

const credentials = {
	key: fs.readFileSync('/etc/letsencrypt/live/api.innov8.host/privkey.pem', 'utf8'),
	cert: fs.readFileSync('/etc/letsencrypt/live/api.innov8.host/cert.pem', 'utf8'),
	ca: fs.readFileSync('/etc/letsencrypt/live/api.innov8.host/chain.pem', 'utf8')
};

const app = express();

app.get("/", (req, res) => {
	res.send("Hi");
});

app.use(express.static(__dirname, { dotfiles: 'allow' } ));

app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "https://innov8.host");
   res.header("Access-Control-Allow-Headers", "*");
   next();
});

app.get("/temperatures", (req, res) => {
   const connection = mysql.createConnection({
       host: process.env.MYSQL_HOST,
       port: process.env.MYSQL_PORT,
       user: process.env.MYSQL_USER,
       password: process.env.MYSQL_PASSWORD,
       database: 'iot',
        // ssl: {
        //     ca: fs.readFileSync(__dirname + '/ca.crt')
        // }
   });

    const query = `SELECT * FROM temperatures`;
    connection.query(query, (err, rows, fields) => {
       res.json(rows)
   });
});

http.createServer((req, res) => {
    res.writeHead(301, { "Location": "https://" + req.headers.host + req.url });
    res.end();
}).listen(80);

https.createServer(credentials, app).listen(443, () => {
	console.log('Started');
});
