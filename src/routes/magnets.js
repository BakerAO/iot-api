import { Router as ExRouter } from 'express'
import moment from 'moment'
import { mysqlPool } from '../dataSources/index.js'
import { verifyToken } from '../helper.js'

const router = new ExRouter()

router.get('/magnets', verifyToken, (req, res) => {
  mysqlPool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
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
            SELECT battery, status, datetime
            FROM magnets
            WHERE device_id = ${device.id}
            ORDER BY datetime DESC
            LIMIT 20
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
    connection.release()
  })
})

function insert(body, res) {
  mysqlPool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
    const date = moment().format('YYYY-MM-DD HH:mm:ss')
    const checkStatus = `
      SELECT status, datetime
      FROM magnets
      WHERE device_id = ${body.device_id}
      ORDER BY datetime DESC
      LIMIT 1
    `
    connection.query(checkStatus, (err, rows, fields) => {
      if (err) res.status(500).send(err)
      else {
        if (rows && rows[0]) {
          if (rows[0].status === body.magnet) {
            res.sendStatus(200)
            return
          }
        }
        const insertQuery = `
          INSERT INTO magnets (
            device_id,
            datetime,
            battery,
            status
          )
          VALUES (
            ${parseInt(body.device_id)},
            '${date}',
            ${parseFloat(body.battery) || 0},
            ${parseInt(body.magnet)}
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
                const deleteDevices = deleteQuery('magnets', rows, body.device_id)
                connection.query(deleteDevices, (err, rows, fields) => {
                  if (err) res.status(500).send(err)
                  else res.sendStatus(200)
                })
              }
            })
          }
        })
      }
    })
    connection.release()
  })
}

export default { router, insert }
