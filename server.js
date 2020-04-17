const express = require('express')
const app = express()
const routes = require('./routes')
const port = 8081

app.use(express.static(__dirname, { dotfiles: 'allow' } ))
app.use(express.json())

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "https://innov8.host")
  // res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
next()
})

app.use('/', routes)

app.listen(port, () => console.log('Listening on port: ', port))
