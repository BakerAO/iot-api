import AWS from 'aws-sdk'

// const params = {
//   TableName: 'iot-schedules',
//   Key: {
//     pk: 'C#cl92vxzls0000qiltawe3eap3',
//     sk: 'TEST#123'
//   }
// }
// const ddbClient = new AWS.DynamoDB.DocumentClient()
// const result = await ddbClient.get(params).promise()
// console.log(result)

AWS.config.getCredentials(err => {
  if (err) console.log(err)
  else console.log('success')
})

const ddbClient = new AWS.DynamoDB.DocumentClient()

export default ddbClient
