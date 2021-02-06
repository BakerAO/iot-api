const router = require('express').Router()
const accountRoutes = require('./account')
const deviceRoutes = require('./devices')

router.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h4>hi</h4>
      </body>
    </html>
  `)
})

router.use(accountRoutes)

router.use(deviceRoutes)

module.exports = router
