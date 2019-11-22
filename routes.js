const router = require('express').Router()
const jwt = require('jsonwebtoken')
const mysql = require('mysql')
const bcrypt = require('bcryptjs')
const moment = require('moment')
require('dotenv').config()
const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: 'iot',
    // ssl: {
    //     ca: fs.readFileSync(__dirname + '/ca.crt')
    // }
})

function verifyToken(req, res, next) {
  const authToken = req.headers.auth_token
  if (!authToken) return res.status(403)
  jwt.verify(authToken, process.env.TOKEN_SECRET, (err, authData) => {
    if (err) res.status(400).send('Invalid Token')
    else {
      req.verified_id = authData.user.user_id
      next()
    }
  })
}

router.get('/', (req, res) => {
	res.send('Hi')
})


router.post('/register', async (req, res) => {
  const emailExists = `
  SELECT *
  FROM users
  WHERE user_email = '${req.body.user_email}'
  `
  connection.query(emailExists, async (err, rows, fields) => {
    if (err) {
      res.status(500).send(err)
    } else if (rows.length > 0) {
      res.status(200).send('emailExists')
    } else {
      const salt = await bcrypt.genSalt(10)
      const hashPassword = await bcrypt.hash(req.body.user_password, salt, 11)
      const date = new Date()
      const insertUser = `
        INSERT INTO users (user_email, user_password, user_created)
        VALUES ('${req.body.user_email}', '${hashPassword}', '${date}')
      `
      connection.query(insertUser, (err, rows, fields) => {
        if (err) {
          console.log(err)
          res.status(500).send(err)
        } else {
          res.sendStatus(200)
        }
      })
    }
  })
})

router.post('/login', (req, res) => {
  const getUserEmail = `
    SELECT * FROM users
    WHERE user_email = '${req.body.user_email}'
  `
  connection.query(getUserEmail, async (err, rows, fields) => {
    if (err) {
      res.status(400).send(err)
    } else {
      const validPassword = await bcrypt.compare(req.body.user_password, rows[0].user_password)
      if (!validPassword) {
        res.send('You failed')
      } else {
        const user = {
          user_id: rows[0].user_id,
          user_email: rows[0].user_email
        }
        jwt.sign({ user: user }, process.env.TOKEN_SECRET, { expiresIn: '7 days' }, (err, token) => {
          res.json({ token: token })
        })
      }
    }
  })
})

router.get('/thermometers', verifyToken, (req, res) => {
  const getDevices = `
    SELECT *
    FROM devices
    WHERE device_type = 'thermometer'
    AND user_id = ${req.verified_id}
  `
  connection.query(getDevices, (err, rows, fields) => {
    if (err) res.status(500)
    else {
      let devices = []
      for (let i = 0; i < rows.length; i++) {
        let device = {}
        device.device_id = rows[i].device_id
        device.device_alias = rows[i].device_alias
        const getTemperatures = `
          SELECT *
          FROM thermometers
          WHERE device_id = ${device.device_id}
        `
        connection.query(getTemperatures, (tempErr, tempRows, tempFields) => {
          if (tempErr) res.status(500)
          else {
            const temperatures = []
            for (let j = 0; j < tempRows.length; j++) {
              temperatures.push(tempRows[j])
            }
            device.temperatures = temperatures
          }
          devices.push(device)
          if (i === rows.length - 1) res.json(devices)
        })
      }
    }
  })
})

router.post('/devices/thermometers', (req, res) => {
  const date = moment().format('YYYY-MM-DD HH:mm:ss')
  const insertThermometers = `
    INSERT INTO thermometers (
      device_id, degrees_celsius, humidity_percent, date_time
    )
    VALUES (
      ${parseInt(req.body.deviceId)},
      ${parseFloat(req.body.temperature)},
      ${parseFloat(req.body.humidity)},
      '${date}'
    )
  `
  connection.query(insertThermometers, (err, rows, fields) => {
    if (err) res.status(500).send(err)
    else {
      const deviceRecords = `
        SELECT date_time
        FROM thermometers
        WHERE device_id = ${req.body.deviceId}
        ORDER BY date_time DESC
        LIMIT 10
      `
      connection.query(deviceRecords, async (err, rows, fields) => {
        if (err) res.status(500).send(err)
        else {
          let dateTimes = ''
          for (let i = 0; i < rows.length; i++) {
            dateTimes += '\'' + moment(rows[i].date_time).format('YYYY-MM-DD HH:mm:ss') + '\','
          }
          if (dateTimes.length > 0) dateTimes = dateTimes.substring(0, dateTimes.length - 1)
          const deleteDevices = `
            DELETE FROM thermometers
            WHERE device_id = ${req.body.deviceId}
            AND date_time NOT IN (${dateTimes})
          `
          connection.query(deleteDevices, (err, rows, fields) => {
            if (err) res.status(500).send(err)
            else res.sendStatus(200)
          })
        }
      })
    }
  })
})

module.exports = router
