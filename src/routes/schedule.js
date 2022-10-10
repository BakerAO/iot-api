import { Router as ExRouter } from 'express'
import { mysqlPool } from '../dataSources/index.js'
import { verifyToken } from '../helper.js'

const router = new ExRouter()

router.get('/schedule/:deviceId', verifyToken, async (req, res) => {
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
      if (err2) res.status(500)
      else if (rows.length === 0) res.status(404)
      else {
        const device = {
          id: rows[0].id,
          alias: rows[0].alias,
          type: rows[0].type
        }

        switch (device.type) {
          case 'simple_motor': {
            const getSchedules = `
              SELECT
                id,
                frequency,
                startTime,
                durationMinutes
              FROM schedules
              WHERE device_id = ?
              LIMIT 100
            `
            const values = [device.id]

            connection.query(getSchedules, values, (err3, rows2, fields) => {
              if (err3) res.status(500)
              else if (rows2.length === 0) res.status(404)
              else {
                device.schedules = rows2
                res.json(device)
              }
            })
            break
          }
          default:
            res.status(404)
        }
      }

      connection.release()
    })
  })
})

router.post('/schedule/:deviceId', verifyToken, (req, res) => {
  mysqlPool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
    const getDevice = `
      SELECT id
      FROM devices
      WHERE user_id = ?
      AND id = ?
    `
    const values = [req.verified_id, req.params.deviceId]

    connection.query(getDevice, values, (err2, rows, fields) => {
      if (err2 || rows.length === 0) res.status(400).send(err2)
      else {
        const insertQuery = `
          INSERT INTO schedules (
            device_id,
            frequency,
            startTime,
            durationMinutes
          ) VALUES (
            ?,
            ?,
            ?,
            ?
          )
        `
        const values = [
          rows[0].id,
          req.body.frequency,
          req.body.startTime,
          req.body.durationMinutes
        ]
        connection.query(insertQuery, values, (err3, rows, fields) => {
          if (err3) res.status(400).send(err3)
          else res.sendStatus(200)
        })
      }
    })
    connection.release()
  })
})

export default router
