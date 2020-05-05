const router = require('express').Router()
const jwt = require('jsonwebtoken')
const mysql = require('mysql')
const bcrypt = require('bcrypt')
const moment = require('moment')
require('dotenv').config()
const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: 'iot'
})

function verifyToken(req, res, next) {
  const authToken = req.headers.auth_token
  if (!authToken) return res.status(403)
  jwt.verify(authToken, process.env.TOKEN_SECRET, (err, authData) => {
    if (err) res.status(400).send('Invalid Token')
    else {
      req.verified_id = authData.user.id
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
    WHERE email = '${req.body.email}'
  `
  connection.query(emailExists, async (err, rows, fields) => {
    if (err) res.status(500).send(err)
    else if (rows.length > 0) res.status(200).send('emailExists')
    else {
      bcrypt.genSalt(10, async function (err, salt) {
        bcrypt.hash(req.body.password, salt, function (err, hash) {
          const date = moment().format('YYYY-MM-DD HH:mm:ss')
          const insertUser = `
            INSERT INTO users (email, password, created)
            VALUES ('${req.body.email}', '${hash}', '${date}')
          `
          connection.query(insertUser, (err, rows, fields) => {
            if (err) res.status(500).send(err)
            else res.sendStatus(200)
          })
        })
      })
    }
  })
})

router.post('/login', (req, res) => {
  const getUserEmail = `
    SELECT *
    FROM users
    WHERE email = '${req.body.email}'
  `
  connection.query(getUserEmail, async (err, rows, fields) => {
    if (err) res.status(400).send(err)
    else {
      const validPassword = await bcrypt.compare(req.body.password, rows[0].password)
      if (!validPassword) res.sendStatus(401)
      else {
        const user = {
          id: rows[0].id,
          email: rows[0].email
        }
        jwt.sign(
          { user: user },
          process.env.TOKEN_SECRET,
          { expiresIn: '7 days' },
          (err, token) => {
            res.json({ token: token })
          }
        )
      }
    }
  })
})

router.get('/devices', verifyToken, (req, res) => {
  const getDevices = `
    SELECT *
    FROM devices
    AND user_id = ${req.verified_id}
  `
  connection.query(getDevices, (err, rows, fields) => {
    if (err) res.status(500)
    else {
      let devices = []
      for (let i = 0; i < rows.length; i++) {
        let device = {}
        device.id = rows[i].id
        device.alias = rows[i].alias
        device.type = rows[i].type
        devices.push(device)
      }
      res.json(devices)
    }
  })
})

router.get('/thermometers', verifyToken, (req, res) => {
  const getDevices = `
    SELECT *
    FROM devices
    WHERE type = 'thermometer'
    AND user_id = ${req.verified_id}
  `
  connection.query(getDevices, (err, rows, fields) => {
    if (err) res.status(500)
    else {
      let devices = []
      for (let i = 0; i < rows.length; i++) {
        let device = {}
        device.id = rows[i].id
        device.alias = rows[i].alias
        const getTemperatures = `
          SELECT *
          FROM thermometers
          WHERE device_id = ${device.id}
          ORDER BY datetime DESC
          LIMIT 10
        `
        connection.query(getTemperatures, (tempErr, tempRows, tempFields) => {
          if (tempErr) res.status(500)
          else device.temperatures = tempRows
          devices.push(device)
          if (i === rows.length - 1) res.json(devices)
        })
      }
    }
  })
})

router.get('/magnets', verifyToken, (req, res) => {
  const getDevices = `
    SELECT *
    FROM devices
    WHERE type = 'magnet'
    AND user_id = ${req.verified_id}
  `
  connection.query(getDevices, (err, rows, fields) => {
    if (err) res.status(500)
    else {
      let devices = []
      for (let i = 0; i < rows.length; i++) {
        let device = {}
        device.id = rows[i].id
        device.alias = rows[i].alias
        const getMagnets = `
          SELECT status, datetime
          FROM magnets
          WHERE device_id = ${device.id}
          AND datetime BETWEEN DATE_SUB(NOW(), INTERVAL 1 DAY) AND NOW()
          ORDER BY datetime DESC
        `
        connection.query(getMagnets, (error, records, magFields) => {
          if (error) res.status(500)
          else device.statuses = records
          devices.push(device)
          if (i === rows.length - 1) res.json(devices)
        })
      }
    }
  })
})

router.get('/water_flow', verifyToken, (req, res) => {
  const getDevices = `
    SELECT *
    FROM devices
    WHERE type = 'water_flow'
    AND user_id = ${req.verified_id}
  `
  connection.query(getDevices, (err, rows, fields) => {
    if (err) res.status(500)
    else {
      let devices = []
      for (let i = 0; i < rows.length; i++) {
        let device = {}
        device.id = rows[i].id
        device.alias = rows[i].alias
        const getWaterFlow = `
          SELECT flow_rate, total_output, datetime
          FROM water_flow
          WHERE device_id = ${device.id}
          AND datetime BETWEEN DATE_SUB(NOW(), INTERVAL 1 DAY) AND NOW()
          ORDER BY datetime DESC
        `
        connection.query(getWaterFlow, (error, records, magFields) => {
          if (error) res.status(500)
          else device.records = records
          devices.push(device)
          if (i === rows.length - 1) res.json(devices)
        })
      }
    }
  })
})

router.post('/devices', (req, res) => {
  if (req.body.temperature !== undefined) {
    insertThermometer(req.body, res)
  } else if (req.body.magnet !== undefined) {
    insertMagnet(req.body, res)
  } else if (req.body.flow_rate !== undefined) {
    insertFlow(req.body, res)
  } else {
    res.sendStatus(402)
  }
})

function insertThermometer(body, res) {
  const date = moment().format('YYYY-MM-DD HH:mm:ss')
  const insertQuery = `
    INSERT INTO thermometers (
      device_id,
      temperature,
      humidity,
      datetime
    )
    VALUES (
      ${parseInt(body.device_id)},
      ${parseFloat(body.temperature)},
      ${parseFloat(body.humidity)},
      '${date}'
    )
  `
  connection.query(insertQuery, (err, rows, fields) => {
    if (err) res.status(500).send(err)
    else {
      const deviceRecords = `
        SELECT datetime
        FROM thermometers
        WHERE device_id = ${body.device_id}
        ORDER BY datetime DESC
        LIMIT 100
      `
      connection.query(deviceRecords, async (err, rows, fields) => {
        if (err) res.status(500).send(err)
        else {
          let dateTimes = ''
          for (let i = 0; i < rows.length; i++) {
            dateTimes += '\'' + moment(rows[i].datetime).format('YYYY-MM-DD HH:mm:ss') + '\','
          }
          if (dateTimes.length > 0) dateTimes = dateTimes.substring(0, dateTimes.length - 1)
          const deleteDevices = `
            DELETE FROM thermometers
            WHERE device_id = ${body.device_id}
            AND datetime NOT IN (${dateTimes})
          `
          connection.query(deleteDevices, (err, rows, fields) => {
            if (err) res.status(500).send(err)
            else res.sendStatus(200)
          })
        }
      })
    }
  })
}

function insertMagnet(body, res) {
  const date = moment().format('YYYY-MM-DD HH:mm:ss')
  const insertQuery = `
    INSERT INTO magnets (
      device_id,
      status,
      datetime
    )
    VALUES (
      ${parseInt(body.device_id)},
      ${parseInt(body.magnet)},
      '${date}'
    )
  `
  connection.query(insertQuery, (err, rows, fields) => {
    if (err) res.status(500).send(err)
    else {
      const deviceRecords = `
        SELECT datetime
        FROM magnets
        WHERE device_id = ${body.device_id}
        ORDER BY datetime DESC
        LIMIT 100
      `
      connection.query(deviceRecords, async (err, rows, fields) => {
        if (err) res.status(500).send(err)
        else {
          let dateTimes = ''
          for (let i = 0; i < rows.length; i++) {
            dateTimes += '\'' + moment(rows[i].datetime).format('YYYY-MM-DD HH:mm:ss') + '\','
          }
          if (dateTimes.length > 0) dateTimes = dateTimes.substring(0, dateTimes.length - 1)
          const deleteDevices = `
            DELETE FROM magnets
            WHERE device_id = ${body.device_id}
            AND datetime NOT IN (${dateTimes})
          `
          connection.query(deleteDevices, (err, rows, fields) => {
            if (err) res.status(500).send(err)
            else res.sendStatus(200)
          })
        }
      })
    }
  })
}

function insertFlow(body, res) {
  const date = moment().format('YYYY-MM-DD HH:mm:ss')
  const insertQuery = `
    INSERT INTO water_flow (
      device_id,
      flow_rate,
      total_output,
      datetime
    )
    VALUES (
      ${parseInt(body.device_id)},
      ${parseFloat(body.flow_rate)},
      ${parseFloat(body.total_output)},
      '${date}'
    )
  `
  connection.query(insertQuery, (err, rows, fields) => {
    if (err) res.status(500).send(err)
    else {
      const deviceRecords = `
        SELECT datetime
        FROM water_flow
        WHERE device_id = ${body.device_id}
        ORDER BY datetime DESC
        LIMIT 100
      `
      connection.query(deviceRecords, async (err, rows, fields) => {
        if (err) res.status(500).send(err)
        else {
          let dateTimes = ''
          for (let i = 0; i < rows.length; i++) {
            dateTimes += '\'' + moment(rows[i].datetime).format('YYYY-MM-DD HH:mm:ss') + '\','
          }
          if (dateTimes.length > 0) dateTimes = dateTimes.substring(0, dateTimes.length - 1)
          const deleteDevices = `
            DELETE FROM water_flow
            WHERE device_id = ${body.device_id}
            AND datetime NOT IN (${dateTimes})
          `
          connection.query(deleteDevices, (err, rows, fields) => {
            if (err) res.status(500).send(err)
            else res.sendStatus(200)
          })
        }
      })
    }
  })
}

module.exports = router
