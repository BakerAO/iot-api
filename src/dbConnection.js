const mysql = require('mysql')

const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: 'iot',
  connectionLimit: 100
})

module.exports = mysqlPool
