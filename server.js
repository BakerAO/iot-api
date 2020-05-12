const express = require('express')
const socket = require('socket.io')
const routes = require('./routes')

const app = express()
app.use(express.static(__dirname, { dotfiles: 'allow' } ))
app.use(express.json())
app.use(function(req, res, next) {
  // res.header("Access-Control-Allow-Origin", "https://innov8.host")
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
})
app.use('/', routes)
const server = app.listen(8081, () => console.log('Listening on port: 8081'))

const io = socket(server)
io.on('connection', connection => {
  console.log(connection.id)
  connection.on('iot', data => {
    console.log('server: ', data)
    io.emit('iot', data)
  })
})
