const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');
const mysql = require('mysql');
require('dotenv').config();

const privateKey = fs.readFileSync('/etc/letsencrypt/live/api.innov8.host/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/api.innov8.host/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/api.innov8.host/chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

app.get("/", (req, res) => {
	res.send("Hi");
});

// app.use(express.static(__dirname, { dotfiles: 'allow' } ));
//app.use(function(req, res, next) {
  //  res.header("Access-Control-Allow-Origin", "innov8.host");
   // res.header("Access-Control-Allow-Headers", "*");
   // next();
//});

//app.get("/temperatures", (req, res) => {
  //  const connection = mysql.createConnection({
    //    host: process.env.MYSQL_HOST,
      //  port: process.env.MYSQL_PORT,
       // user: process.env.MYSQL_USER,
       // password: process.env.MYSQL_PASSWORD,
       // database: 'iot',
        // ssl: {
        //     ca: fs.readFileSync(__dirname + '/ca.crt')
        // }
   // });

    //const query = `SELECT * FROM temperatures`;
    //connection.query(query, (err, rows, fields) => {
      //  res.json(rows)
   // });
//});

const server = https.createServer(credentials, app);

server.listen(443, () => {
	console.log('Started');
});
var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80);
