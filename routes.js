const router = require('express').Router();
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
require('dotenv').config();
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

router.get('/', (req, res) => {
	res.send('Hi');
});

router.get("/temperatures", (req, res) => {
     const query = `SELECT * FROM temperatures`;
     connection.query(query, (err, rows, fields) => {
        res.json(rows)
    });
});

router.post('/register', async (req, res) => {
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(req.body.user_password, salt);
    const date = Date.now();
    const query = `
        INSERT INTO users (user_email, user_password, user_created)
        VALUES ('${req.body.user_email}', '${hashPassword}', '${date}');
    `;
    connection.query(query, (err, rows, fields) => {
        if (err) {
            console.log(err);
            res.status(400).send(err);
        } else {
            res.sendStatus(200);
        }
    });
});

router.post('/login', (req, res) => {
    const query = `SELECT * FROM users
        WHERE user_email = '${req.body.user_email}'
    `;
    const userEmail = connection.query(query, (err) => {
        if (err) {
            res.status(400).send(err);
        } else {
            return
        }
    })
});

module.exports = router;
