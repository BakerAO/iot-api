const router = require('express').Router();
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const privateKey = 'secretKey';
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

function extractToken(req, res, next) {
    const bearerHeader = req.headers['Authorization'];
    if (typeof bearerHeader !== undefined) {
        const bearer = bearerHeader.split(' ');
        const token = bearer[1];
        req.token = token;
        next();
    } else {
        res.sendStatus(403);
    }
}

// Routes
router.get('/', (req, res) => {
	res.send('Hi');
});

router.get("/temperatures", extractToken, (req, res) => {
    jwt.verify(req.token, );
    //  const query = `SELECT * FROM temperatures`;
    //  connection.query(query, (err, rows, fields) => {
    //     res.json(rows)
    // });
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
    const user = {
        user_id: 111,
        user_email: req.body.user_email
    };

    jwt.sign({ user: user }, privateKey, (err, token) => {
        res.json({ token: token });
    });

    // const query = `
    //     SELECT * FROM users
    //     WHERE user_email = '${req.body.user_email}'
    // `;

    // connection.query(query, async (err, rows, fields) => {
    //     if (err) {
    //         res.status(400).send(err);
    //     } else {
    //         const validPassword = await bcrypt.compare(req.body.user_password, rows[0].user_password);
    //         console.log(validPassword)
    //         if (!validPassword) {
    //             res.send('You failed')
    //         } else {
    //             res.send('Nice')
    //         }
    //     }
    // });
});

module.exports = router;
