import AWS from 'aws-sdk'

// AWS.config = new AWS.Config()

// AWS.config.accessKeyId = process.env.AWS_ACCESS_KEY_ID
// AWS.config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
// AWS.config.region = process.env.AWS_REGION

AWS.config.getCredentials(err => {
  if (err) console.log(err)
  else console.log('success')
})
