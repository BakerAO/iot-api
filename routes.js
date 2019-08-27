const router = require('express').Router();
const mysql = require('mysql');
require('dotenv').config();

router.get('/', (req, res) => {
	res.send('Hi');
});

router.get("/temperatures", (req, res) => {
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

router.post('/register', (req, res) => {
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

    const query = `
        INSERT INTO users (user_email, user_password, user_created)
        VALUES (${req.body.user_email}, ${req.body.user_password}, ${'date'});
    `;

    connection.query(query, (err, rows, fields) => {
        if (err) {
            console.log(err);
            res.status(400).send(err);
        } else {
            console.log('User created');
            res.sendStatus(200);
        }
    });
});

module.exports = router;
