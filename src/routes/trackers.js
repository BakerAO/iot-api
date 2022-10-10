import { Router as ExRouter } from 'express'
import moment from 'moment'
import { mysqlPool } from '../dataSources/index.js'
import { verifyToken, deleteQuery } from '../helper.js'

const router = new ExRouter()

router.get('/trackers', verifyToken, (req, res) => {
  mysqlPool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
    const getDevices = `
      SELECT *
      FROM devices
      WHERE type = 'tracker'
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
          const getTrackerData = `
            SELECT battery, latitude, longitude, altitude, satellites, hdop, datetime
            FROM trackers
            WHERE device_id = ${device.id}
            ORDER BY datetime DESC
          `
          connection.query(getTrackerData, (error, records, trackerFields) => {
            if (error) res.status(500)
            else device.records = records
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
    const insertQuery = `
      INSERT INTO trackers (
        device_id,
        datetime,
        battery,
        latitude,
        longitude,
        altitude,
        satellites,
        hdop
      )
      VALUES (
        ${parseInt(body.device_id)},
        '${date}',
        ${parseFloat(body.battery) || 0},
        ${parseFloat(body.latitude)},
        ${parseFloat(body.longitude)},
        ${parseFloat(body.altitude)},
        ${parseInt(body.satellites)},
        ${parseFloat(body.hdop)}
      )
    `
    connection.query(insertQuery, (err, rows, fields) => {
      if (err) res.status(500).send(err)
      else {
        const deviceRecords = `
          SELECT datetime
          FROM trackers
          WHERE device_id = ${body.device_id}
          ORDER BY datetime DESC
          LIMIT 100
        `
        connection.query(deviceRecords, async (err, rows, fields) => {
          if (err) res.status(500).send(err)
          else {
            const deleteDevices = deleteQuery('trackers', rows, body.device_id)
            connection.query(deleteDevices, (err, rows, fields) => {
              if (err) res.status(500).send(err)
              else res.sendStatus(200)
            })
          }
        })
      }
    })
    connection.release()
  })
}

export default { router, insert }
