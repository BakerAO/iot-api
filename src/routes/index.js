import { Router as ExRouter } from 'express'
import accountRoutes from './account.js'
import deviceRoutes from './devices.js'
import scheduleRoutes from './schedule.js'

const router = new ExRouter()

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

router.use(scheduleRoutes)

export default router
