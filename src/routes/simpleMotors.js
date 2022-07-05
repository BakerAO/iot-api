const router = require('express').Router()
const moment = require('moment')
const pool = require('../dbConnection')
const { verifyToken, deleteQuery } = require('../helper')

router.get('/simple_motors', verifyToken, (req, res) => {
  pool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
    const getDevices = `
      SELECT *
      FROM devices
      WHERE type = 'simple_motor'
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
          const getSimpleMotors = `
            SELECT
              battery,
              valve_status,
              datetime,
              latitude,
              longitude
            FROM simple_motors
            WHERE device_id = ${device.id}
            ORDER BY datetime DESC
          `
          connection.query(getSimpleMotors, (error, records, flowFields) => {
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
  pool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
    const date = moment().format('YYYY-MM-DD HH:mm:ss')
    const insertQuery = `
      INSERT INTO simple_motors (
        device_id,
        datetime,
        battery,
        latitude,
        longitude,
        altitude,
        satellites,
        hdop,
        valve_status
      )
      VALUES (
        ${parseInt(body.device_id)},
        '${date}',
        ${parseFloat(body.battery) || 0},
        ${parseFloat(body.latitude)},
        ${parseFloat(body.longitude)},
        ${parseFloat(body.altitude)},
        ${parseInt(body.satellites)},
        ${parseFloat(body.hdop)},
        '${String(body.valve_status)}'
      )
    `
    connection.query(insertQuery, (err, rows, fields) => {
      if (err) res.status(500).send(err)
      else {
        const deviceRecords = `
          SELECT datetime
          FROM simple_motors
          WHERE device_id = ${body.device_id}
          ORDER BY datetime DESC
          LIMIT 100
        `
        connection.query(deviceRecords, async (err, rows, fields) => {
          if (err) res.status(500).send(err)
          else {
            const deleteDevices = deleteQuery('simple_motors', rows, body.device_id)
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

module.exports = {
  router,
  insert
}
