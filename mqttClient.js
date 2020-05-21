const mqtt = require('mqtt')
const client = mqtt.connect('mqtt://broker.innov8.host')

client.on('connect', () => {
  client.subscribe('test')
  client.publish('hello from API')
})

client.on('message', (topic, message) => {
  console.log(message.toString())
})

module.exports = client
