const router = require('express').Router()
const moment = require('moment')
const pool = require('../dbConnection')
const { sanitize, verifyToken } = require('../helper')
const simpleMotors = require('./simpleMotors')
const thermometers = require('./thermometers')
const waterFlow = require('./waterFlow')
const magnets = require('./magnets')
const trackers = require('./trackers')

router.get('/devices', verifyToken, (req, res) => {
  pool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
    const getDevices = `
      SELECT *
      FROM devices
      WHERE user_id = ${req.verified_id}
    `
    connection.query(getDevices, (err2, rows, fields) => {
      if (err2) res.status(500)
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
      connection.release()
    })
  })
})

router.get('/devices/types', verifyToken, (req, res) => {
  res.send(['thermometer', 'water_flow', 'magnet', 'tracker', 'simple_motor'])
})

router.post('/devices/register', verifyToken, (req, res) => {
  pool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
    const deviceQuery = `
      SELECT id
      FROM devices
      WHERE id = ${parseInt(req.body.id)}
    `
    connection.query(deviceQuery, (err, rows, fields) => {
      if (err) res.status(400).send(err)
      else if (rows.length > 0) {
        res.status(400).send('Device ID already exists')
      } else {
        const date = moment().format('YYYY-MM-DD HH:mm:ss')
        const insertQuery = `
          INSERT INTO devices (
            id,
            user_id,
            alias,
            type,
            created
          ) VALUES (
            ${parseInt(req.body.id)},
            ${parseInt(req.verified_id)},
            '${sanitize(req.body.alias)}',
            '${sanitize(req.body.type)}',
            '${date}'
          )
        `
        connection.query(insertQuery, (err, rows, fields) => {
          if (err) res.status(400).send(err)
          else res.sendStatus(200)
        })
      }
    })
    connection.release()
  })
})

router.post('/devices', (req, res) => {
  switch (req.body.type) {
    case 'simple_motor':
      simpleMotors.insert(req.body, res)
      break
    case 'water_flow':
      waterFlow.insert(req.body, res)
      break
    case 'thermometer':
      thermometers.insert(req.body, res)
      break
    case 'magnet':
      magnets.insert(req.body, res)
      break
    case 'tracker':
      trackers.insert(req.body, res)
      break
    default:
      res.sendStatus(402)
  }
})

router.use(simpleMotors.router)

router.use(thermometers.router)

router.use(waterFlow.router)

router.use(magnets.router)

router.use(trackers.router)

module.exports = router
