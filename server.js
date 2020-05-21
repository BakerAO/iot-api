const express = require('express')
const socketio = require('socket.io')
const routes = require('./routes')
const mqttClient = require('./mqttClient')

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
const server = app.listen(8081, () =>  {
  console.log('Server Started: http://localhost:8081')
})

const io = socketio(server)
let sessions = []

io.on('connect', session => {
  sessions.push(session.id)

  session.on('toServer', data => {
    console.log(data)
  })

  session.on('fromServer', data => {
    console.log(data)
  })

  session.on('disconnect', () => {
    sessions = sessions.filter(s => s !== session.id)
  })
})

app.get('/sockets', (req, res) => {
  res.send('Sockets page')
})

app.post('/mqtt/test', (req, res) => {
  mqttClient.sendMessage(req.body.message)
  res.status(200).send(`${req.body.message} sent to broker`)
})


// function checkToken(token) {
//   // if (token) return true
//   return true
// }

// io.of((name, query, next) => {
//   next(null, checkToken(query.token))
// }).on('connect', session => {
//   sessions.push(session.id)

//   session.on('toServer', data => {
//     console.log('data: ', data)
//   })

//   session.on('disconnect', () => {
//     sessions = sessions.filter(s => s !== session.id)
//   })
// })

