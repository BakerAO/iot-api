import { Router as ExRouter } from 'express'
import moment from 'moment'
import { mysqlPool } from '../dataSources/index.js'
import { sanitize, verifyToken } from '../helper.js'
import simpleMotors from './simpleMotors.js'
import thermometers from './thermometers.js'
import waterFlow from './waterFlow.js'
import magnets from './magnets.js'
import trackers from './trackers.js'

const router = new ExRouter()

router.get('/device/:deviceId', verifyToken, (req, res) => {
  mysqlPool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1
    }
    const getDevice = `
      SELECT
        id,
        alias,
        type
      FROM devices
      WHERE user_id = ?
      AND id = ?
    `
    const values = [req.verified_id, req.params.deviceId]

    connection.query(getDevice, values, (err2, rows, fields) => {
      if (err2) res.sendStatus(500)
      else if (rows.length === 0) res.sendStatus(404)
      else {
        const device = {
          id: rows[0].id,
          alias: rows[0].alias,
          type: rows[0].type
        }

        switch (device.type) {
          case 'simple_motor': {
            const getSimpleMotor = `
              SELECT
                datetime,
                battery,
                altitude,
                hdop,
                latitude,
                longitude,
                satellites,
                valve_status
              FROM simple_motors
              WHERE device_id = ?
              ORDER BY datetime DESC
              LIMIT 10
            `
            const values = [device.id]

            connection.query(getSimpleMotor, values, (err3, rows2, fields) => {
              if (err3) res.sendStatus(500)
              else if (rows2.length === 0) res.sendStatus(404)
              else {
                device.records = rows2
                res.json(device)
              }
            })
            break
          }
          case 'thermometer': {
            const getTemperatures = `
              SELECT
                datetime,
                battery,
                temperature,
                humidity
              FROM thermometers
              WHERE device_id = ?
              ORDER BY datetime DESC
              LIMIT 100
            `
            const values = [device.id]

            connection.query(getTemperatures, values, (err3, rows2, fields) => {
              if (err3) res.sendStatus(500)
              else if (rows2.length === 0) res.sendStatus(404)
              else {
                device.records = rows2
                res.json(device)
              }
            })
            break
          }
          default:
            res.sendStatus(404)
        }
      }

      connection.release()
    })
  })
})

router.get('/devices', verifyToken, (req, res) => {
  mysqlPool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1
    }
    const getDevices = `
      SELECT *
      FROM devices
      WHERE user_id = ${req.verified_id}
    `
    connection.query(getDevices, (err2, rows, fields) => {
      if (err2) res.sendStatus(500)
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
  mysqlPool.getConnection((err1, connection) => {
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

export default router
