const router = require('express').Router()
const jwt = require('jsonwebtoken')
const moment = require('moment')
const mqttClient = require('../mqttClient')
const db = require('../dbConnection')

function sanitize(text) {
  return text.replace(/[^a-zA-Z0-9 ]/g, '')
}

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

router.get('/devices', verifyToken, (req, res) => {
  const getDevices = `
    SELECT *
    FROM devices
    WHERE user_id = ${req.verified_id}
  `
  db.query(getDevices, (err, rows, fields) => {
    if (err) res.status(500)
    else {
      let devices = []
      for (let i = 0; i < rows.length; i++) {
        let device = {}
        device.id = rows[i].id
        device.alias = rows[i].alias
        device.type = rows[i].type
        devices.push(device)
        if (i === rows.length - 1) res.json(devices)
      }
    }
  })
})

router.get('/devices/types', verifyToken, (req, res) => {
  res.send(['thermometer', 'water_flow', 'magnet', 'tracker'])
})

router.post('/devices/register', verifyToken, (req, res) => {
  const deviceQuery = `
    SELECT id
    FROM devices
    WHERE id = ${parseInt(req.body.id)}
  `
  db.query(deviceQuery, (err, rows, fields) => {
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
      db.query(insertQuery, (err, rows, fields) => {
        if (err) res.status(400).send(err)
        else res.sendStatus(200)
      })
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
  } else if (req.body.latitude !== undefined) {
    insertTracker(req.body, res)
  } else {
    res.sendStatus(402)
  }
})

router.get('/thermometers', verifyToken, (req, res) => {
  const getDevices = `
    SELECT *
    FROM devices
    WHERE type = 'thermometer'
    AND user_id = ${req.verified_id}
  `
  db.query(getDevices, (err, rows, fields) => {
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
        db.query(getTemperatures, (tempErr, tempRows, tempFields) => {
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
  db.query(getDevices, (err, rows, fields) => {
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
        db.query(getMagnets, (error, records, magFields) => {
          if (error) res.status(500)
          else device.statuses = records
          devices.push(device)
          if (i === rows.length - 1) res.json(devices)
        })
      }
    }
  })
})

router.get('/trackers', verifyToken, (req, res) => {
  const getDevices = `
    SELECT *
    FROM devices
    WHERE type = 'tracker'
    AND user_id = ${req.verified_id}
  `
  db.query(getDevices, (err, rows, fields) => {
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
        db.query(getTrackerData, (error, records, trackerFields) => {
          if (error) res.status(500)
          else device.records = records
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
  db.query(getDevices, (err, rows, fields) => {
    if (err) res.status(500)
    else {
      let devices = []
      for (let i = 0; i < rows.length; i++) {
        let device = {}
        device.id = rows[i].id
        device.alias = rows[i].alias
        const getWaterFlow = `
          SELECT
            battery,
            flow_rate,
            total_output,
            valve_status,
            datetime,
            latitude,
            longitude
          FROM water_flow
          WHERE device_id = ${device.id}
          ORDER BY datetime DESC
        `
        db.query(getWaterFlow, (error, records, flowFields) => {
          if (error) res.status(500)
          else device.records = records
          devices.push(device)
          if (i === rows.length - 1) res.json(devices)
        })
      }
    }
  })
})

router.post('/water_flow/shut_off', verifyToken, (req, res) => {
  const getDevice = `
    SELECT *
    FROM devices
    WHERE type = 'water_flow'
    AND user_id = ${req.verified_id}
    AND id = ${req.body.device_id}
  `
  db.query(getDevice, (err, rows, fields) => {
    if (err) res.status(500)
    else {
      if (rows.length < 1) {
        res.status(402).send('No device found')
      } else {
        const getLatestStatus = `
          SELECT flow_rate, total_output, valve_status, datetime
          FROM water_flow
          WHERE device_id = ${rows[0].id}
          ORDER BY datetime DESC
        `
        db.query(getLatestStatus, (error, records, recFields) => {
          if (error) res.status(500)
          else {
            if (records.length && records[0].valve_status === 'open') {
              const topic = `${req.verified_id}/water_flow`
              const message = `${req.body.device_id}-SHUT_OFF`
              mqttClient.publish(topic, message)
              res.status(200).send(`${topic}, ${message} sent to broker`)
            }
          }
        })
      }
    }
  })
})

router.post('/water_flow/open', verifyToken, (req, res) => {
  const getDevice = `
    SELECT *
    FROM devices
    WHERE type = 'water_flow'
    AND user_id = ${req.verified_id}
    AND id = ${req.body.device_id}
  `
  db.query(getDevice, (err, rows, fields) => {
    if (err) res.status(500)
    else {
      if (rows.length < 1) {
        res.status(402).send('No device found')
      } else {
        const getLatestStatus = `
          SELECT flow_rate, total_output, valve_status, datetime
          FROM water_flow
          WHERE device_id = ${rows[0].id}
          ORDER BY datetime DESC
        `
        db.query(getLatestStatus, (error, records, recFields) => {
          if (error) res.status(500)
          else {
            if (records.length && records[0].valve_status === 'closed') {
              const topic = `${req.verified_id}/water_flow`
              const message = `${req.body.device_id}-OPEN`
              mqttClient.publish(topic, message)
              res.status(200).send(`${topic}, ${message} sent to broker`)
            }
          }
        })
      }
    }
  })
})

function insertThermometer(body, res) {
  const date = moment().format('YYYY-MM-DD HH:mm:ss')
  const insertQuery = `
    INSERT INTO thermometers (
      device_id,
      battery,
      temperature,
      humidity,
      datetime
    )
    VALUES (
      ${parseInt(body.device_id)},
      ${parseFloat(body.battery) || 0},
      ${parseFloat(body.temperature)},
      ${parseFloat(body.humidity)},
      '${date}'
    )
  `
  db.query(insertQuery, (err, rows, fields) => {
    if (err) res.status(500).send(err)
    else {
      const deviceRecords = `
        SELECT datetime
        FROM thermometers
        WHERE device_id = ${body.device_id}
        ORDER BY datetime DESC
        LIMIT 100
      `
      db.query(deviceRecords, async (err, rows, fields) => {
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
          db.query(deleteDevices, (err, rows, fields) => {
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
  const checkStatus = `
    SELECT status, datetime
    FROM magnets
    WHERE device_id = ${body.device_id}
    ORDER BY datetime DESC
    LIMIT 1
  `
  db.query(checkStatus, (err, rows, fields) => {
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
          battery,
          status,
          datetime
        )
        VALUES (
          ${parseInt(body.device_id)},
          ${parseFloat(body.battery) || 0},
          ${parseInt(body.magnet)},
          '${date}'
        )
      `
      db.query(insertQuery, (err, rows, fields) => {
        if (err) res.status(500).send(err)
        else {
          const deviceRecords = `
            SELECT datetime
            FROM magnets
            WHERE device_id = ${body.device_id}
            ORDER BY datetime DESC
            LIMIT 100
          `
          db.query(deviceRecords, async (err, rows, fields) => {
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
              db.query(deleteDevices, (err, rows, fields) => {
                if (err) res.status(500).send(err)
                else res.sendStatus(200)
              })
            }
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
      battery,
      flow_rate,
      total_output,
      valve_status,
      datetime,
      latitude,
      longitude,
      altitude,
      satellites,
      hdop
    )
    VALUES (
      ${parseInt(body.device_id)},
      ${parseFloat(body.battery) || 0},
      ${parseFloat(body.flow_rate) || 0},
      ${parseFloat(body.total_output) || 0},
      '${String(body.valve_status)}',
      '${date}',
      ${parseFloat(body.latitude)},
      ${parseFloat(body.longitude)},
      ${parseFloat(body.altitude)},
      ${parseInt(body.satellites)},
      ${parseFloat(body.hdop)}
    )
  `
  db.query(insertQuery, (err, rows, fields) => {
    if (err) res.status(500).send(err)
    else {
      const deviceRecords = `
        SELECT datetime
        FROM water_flow
        WHERE device_id = ${body.device_id}
        ORDER BY datetime DESC
        LIMIT 100
      `
      db.query(deviceRecords, async (err, rows, fields) => {
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
          db.query(deleteDevices, (err, rows, fields) => {
            if (err) res.status(500).send(err)
            else res.sendStatus(200)
          })
        }
      })
    }
  })
}

function insertTracker(body, res) {
  const date = moment().format('YYYY-MM-DD HH:mm:ss')
  const insertQuery = `
    INSERT INTO trackers (
      device_id,
      battery,
      latitude,
      longitude,
      altitude,
      satellites,
      hdop,
      datetime
    )
    VALUES (
      ${parseInt(body.device_id)},
      ${parseFloat(body.battery) || 0},
      ${parseFloat(body.latitude)},
      ${parseFloat(body.longitude)},
      ${parseFloat(body.altitude)},
      ${parseInt(body.satellites)},
      ${parseFloat(body.hdop)},
      '${date}'
    )
  `
  db.query(insertQuery, (err, rows, fields) => {
    if (err) res.status(500).send(err)
    else {
      const deviceRecords = `
        SELECT datetime
        FROM trackers
        WHERE device_id = ${body.device_id}
        ORDER BY datetime DESC
        LIMIT 100
      `
      db.query(deviceRecords, async (err, rows, fields) => {
        if (err) res.status(500).send(err)
        else {
          let dateTimes = ''
          for (let i = 0; i < rows.length; i++) {
            dateTimes += '\'' + moment(rows[i].datetime).format('YYYY-MM-DD HH:mm:ss') + '\','
          }
          if (dateTimes.length > 0) dateTimes = dateTimes.substring(0, dateTimes.length - 1)
          const deleteDevices = `
            DELETE FROM trackers
            WHERE device_id = ${body.device_id}
            AND datetime NOT IN (${dateTimes})
          `
          db.query(deleteDevices, (err, rows, fields) => {
            if (err) res.status(500).send(err)
            else res.sendStatus(200)
          })
        }
      })
    }
  })
}

module.exports = router
