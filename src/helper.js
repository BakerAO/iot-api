const jwt = require('jsonwebtoken')
const moment = require('moment')

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

module.exports = {
  sanitize,
  verifyToken,
  deleteQuery
}
