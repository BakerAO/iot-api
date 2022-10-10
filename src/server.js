import express from 'express'
import routes from './routes/index.js'

const app = express()
// app.use(express.static(__dirname, { dotfiles: 'allow' } ))
app.use(express.json())
app.use(function(req, res, next) {
  // res.header("Access-Control-Allow-Origin", "https://tidoba.com")
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
})
app.use('/', routes)
app.listen(8081, () =>  {
  console.log('Server Started: http://localhost:8081')
})
