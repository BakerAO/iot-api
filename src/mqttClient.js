const brokerAddress = process.env.MQTT_BROKER
const mqtt = require('mqtt')
const client = mqtt.connect(`mqtt://${brokerAddress}`)

client.on('connect', () => {
  client.subscribe('api')
  client.publish('api', 'hello from API')
})

client.on('message', (topic, message) => {
  console.log('Message: ', topic.toString(), message.toString())
})

module.exports = client
