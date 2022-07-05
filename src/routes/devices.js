const router = require('express').Router()
const jwt = require('jsonwebtoken')
const moment = require('moment')
const mqttClient = require('../mqttClient')
const pool = require('../dbConnection')

function sanitize(text) {
  return text.replace(/[^a-zA-Z0-9_ ]/g, '')
}

function verifyToken(req, res, next) {
  const authToken = req.headers.auth_token
  if (!authToken) return res.status(403)
  jwt.verify(authToken, process.env.BCRYPT_SECRET, (err, authData) => {
    if (err) res.status(400).send('Invalid Token')
    else {
      req.verified_id = authData.user.id
      next()
    }
  })
}

router.get('/devices', verifyToken, (req, res) => {
  pool.getConnection((conErr, connection) => {
    if (conErr) {
      connection.release()
      throw conErr;
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
  pool.getConnection((conErr, connection) => {
    if (conErr) {
      connection.release()
      throw conErr;
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
  if (req.body.type === 'simple_motor') {
    insertSimpleMotor(req.body, res)
  } else if (req.body.flow_rate !== undefined) {
    insertFlow(req.body, res)
  } else if (req.body.temperature !== undefined) {
    insertThermometer(req.body, res)
  } else if (req.body.magnet !== undefined) {
    insertMagnet(req.body, res)
  } else if (req.body.latitude !== undefined) {
    insertTracker(req.body, res)
  } else {
    res.sendStatus(402)
  }
})

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

router.get('/thermometers', verifyToken, (req, res) => {
  pool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
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
    connection.release()
  })
})

router.get('/magnets', verifyToken, (req, res) => {
  pool.getConnection((err1, connection) => {
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

router.get('/trackers', verifyToken, (req, res) => {
  pool.getConnection((err1, connection) => {
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

router.get('/water_flow', verifyToken, (req, res) => {
  pool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
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
          connection.query(getWaterFlow, (error, records, flowFields) => {
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

router.post('/water_flow/shut_off', verifyToken, (req, res) => {
  pool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
    const getDevice = `
      SELECT *
      FROM devices
      WHERE type = 'water_flow'
      AND user_id = ${req.verified_id}
      AND id = ${req.body.device_id}
    `
    connection.query(getDevice, (err, rows, fields) => {
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
          connection.query(getLatestStatus, (error, records, recFields) => {
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
    connection.release()
  })
})

router.post('/water_flow/open', verifyToken, (req, res) => {
  pool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
    const getDevice = `
      SELECT *
      FROM devices
      WHERE type = 'water_flow'
      AND user_id = ${req.verified_id}
      AND id = ${req.body.device_id}
    `
    connection.query(getDevice, (err, rows, fields) => {
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
          connection.query(getLatestStatus, (error, records, recFields) => {
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
    connection.release()
  })
})

function insertSimpleMotor(body, res) {
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

function insertThermometer(body, res) {
  pool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
    const date = moment().format('YYYY-MM-DD HH:mm:ss')
    const insertQuery = `
      INSERT INTO thermometers (
        device_id,
        datetime,
        battery,
        temperature,
        humidity
      )
      VALUES (
        ${parseInt(body.device_id)},
        '${date}',
        ${parseFloat(body.battery) || 0},
        ${parseFloat(body.temperature)},
        ${parseFloat(body.humidity)}
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
            const deleteDevices = deleteQuery('thermometers', rows, body.device_id)
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

function insertMagnet(body, res) {
  pool.getConnection((err1, connection) => {
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

function insertFlow(body, res) {
  pool.getConnection((err1, connection) => {
    if (err1) {
      connection.release()
      throw err1;
    }
    const date = moment().format('YYYY-MM-DD HH:mm:ss')
    const insertQuery = `
      INSERT INTO water_flow (
        device_id,
        datetime,
        battery,
        flow_rate,
        total_output,
        valve_status,
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
        ${parseFloat(body.flow_rate) || 0},
        ${parseFloat(body.total_output) || 0},
        '${String(body.valve_status)}',
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
          FROM water_flow
          WHERE device_id = ${body.device_id}
          ORDER BY datetime DESC
          LIMIT 100
        `
        connection.query(deviceRecords, async (err, rows, fields) => {
          if (err) res.status(500).send(err)
          else {
            const deleteDevices = deleteQuery('water_flow', rows, body.device_id)
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

function insertTracker(body, res) {
  pool.getConnection((err1, connection) => {
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

function deleteQuery(table, rows, device_id) {
  let dateTimes = ''
  for (let i = 0; i < rows.length; i++) {
    dateTimes += '\'' + moment(rows[i].datetime).format('YYYY-MM-DD HH:mm:ss') + '\','
  }
  if (dateTimes.length > 0) dateTimes = dateTimes.substring(0, dateTimes.length - 1)
  return `
    DELETE FROM ${table}
    WHERE device_id = ${device_id}
    AND datetime NOT IN (${dateTimes})
  `
}

module.exports = router
