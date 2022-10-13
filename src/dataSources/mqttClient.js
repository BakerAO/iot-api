import mqtt from 'mqtt'

const brokerAddress = process.env.MQTT_BROKER
const client = mqtt.connect(`mqtt://${brokerAddress}`)

client.on('connect', () => {
  client.subscribe('api')
  client.publish('api', 'hello from API')
})

client.on('message', (topic, message) => {
  console.log('Broker Message: ', topic.toString(), message.toString())
})

export default client
