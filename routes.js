const router = require('express').Router();
const jwt = require('jsonwebtoken');
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

function verifyToken(req, res, next) {
    const authToken = req.headers.auth_token;
    if (!authToken) return res.status(403);
    jwt.verify(authToken, process.env.TOKEN_SECRET, (err, authData) => {
        if (err) res.status(400).send('Invalid Token');
        else {
            req.verified_id = authData.user.user_id;
            next();
        }
    });
}

// Routes
router.get('/', (req, res) => {
	res.send('Hi');
});

router.get("/temperatures", verifyToken, (req, res) => {
    const query = `SELECT * FROM temperatures`;
    connection.query(query, (err, rows, fields) => {
        if (err) res.status(500);
        else res.json(rows)
    });
    console.log(req.verified_id)
});

router.post('/register', async (req, res) => {
    const emailExists = `
        SELECT *
        FROM users
        WHERE user_email = '${req.body.user_email}'
    `;
    connection.query(emailExists, async (err, rows, fields) => {
        if (err) {
            console.log(err);
            res.status(500).send(err);
        } else if (rows.length > 0) {
            res.status(200).send('emailExists');
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashPassword = await bcrypt.hash(req.body.user_password, salt);
            const date = Date.now();
            const insertUser = `
                INSERT INTO users (user_email, user_password, user_created)
                VALUES ('${req.body.user_email}', '${hashPassword}', '${date}');
            `;
            connection.query(insertUser, (err, rows, fields) => {
                if (err) {
                    console.log(err);
                    res.status(500).send(err);
                } else {
                    res.sendStatus(200);
                }
            });
        }
    });
});

router.post('/login', (req, res) => {
    const user = {
        user_id: 111,
        user_email: req.body.user_email
    };

    jwt.sign({ user: user }, process.env.TOKEN_SECRET, { expiresIn: '7 days' }, (err, token) => {
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
