const express = require('express');
const server = express();
const mysql = require('mysql');
require('dotenv').config();

server.get("/temperatures", (req, res) => {
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

server.listen(3003, () => {
    console.log("Started")
});
