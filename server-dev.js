const express = require('express');
const mysql = require('mysql');
require('dotenv').config();

const app = express();

app.get("/", (req, res) => {
	res.send("Hi");
});

app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
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

app.listen(80, () => {
   console.log('Dev Started');
});
