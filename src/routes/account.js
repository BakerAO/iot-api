import { Router as ExRouter } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import moment from 'moment'
import { mysqlPool } from '../dataSources/index.js'
import { verifyToken } from '../helper.js'

const router = new ExRouter()

function validateEmail(email) {
  let re = /\S+@\S+\.\S+/
  return re.test(email)
}

router.get('/account/verify_token', verifyToken, async (req, res) => {
  res.sendStatus(200)
})

router.post('/account/login', (req, res) => {
  if (!validateEmail(req.body.email)) res.sendStatus(401)
  else {
    const getUserEmail = `
      SELECT *
      FROM users
      WHERE email = '${req.body.email}'
    `
    mysqlPool.query(getUserEmail, async (err, rows, fields) => {
      if (err) res.status(400).send(err)
      else {
        const validPassword = await bcrypt.compare(req.body.password, rows[0].password)
        if (!validPassword) res.sendStatus(401)
        else {
          const user = {
            id: rows[0].id,
            email: rows[0].email
          }
          jwt.sign(
            { user: user },
            process.env.BCRYPT_SECRET,
            { expiresIn: '7 days' },
            (err, token) => {
              res.json({ token: token })
            }
          )
        }
      }
    })
  }
})

router.post('/account/register', async (req, res) => {
  const emailExists = `
    SELECT *
    FROM users
    WHERE email = '${req.body.email}'
  `
  mysqlPool.query(emailExists, async (err, rows, fields) => {
    if (err) res.status(500).send(err)
    else if (rows.length > 0) res.status(200).send('emailExists')
    else {
      bcrypt.genSalt(10, async function (err, salt) {
        bcrypt.hash(req.body.password, salt, function (err, hash) {
          const date = moment().format('YYYY-MM-DD HH:mm:ss')
          const insertUser = `
            INSERT INTO users (email, password, created)
            VALUES ('${req.body.email}', '${hash}', '${date}')
          `
          mysqlPool.query(insertUser, (err, rows, fields) => {
            if (err) res.status(500).send(err)
            else res.sendStatus(200)
          })
        })
      })
    }
  })
})

router.post('/account/password', verifyToken, async (req, res) => {
  const userQuery = `
    SELECT password
    FROM users
    WHERE id = '${req.verified_id}'
  `
  mysqlPool.query(userQuery, async (err, rows, fields) => {
    if (err) res.status(400).send(err)
    else {
      const validPassword = await bcrypt.compare(req.body.oldPassword, rows[0].password)
      if (!validPassword) res.status(401).send('Current password is incorrect')
      else {
        bcrypt.genSalt(10, async function (err, salt) {
          bcrypt.hash(req.body.newPassword, salt, function (err, hash) {
            const updateQuery = `
              UPDATE users
              SET password = '${hash}'
              WHERE id = ${req.verified_id}
            `
            mysqlPool.query(updateQuery, (err, rows, fields) => {
              if (err) res.status(500).send(err)
              else res.sendStatus(200)
            })
          })
        })
      }
    }
  })
})

export default router
