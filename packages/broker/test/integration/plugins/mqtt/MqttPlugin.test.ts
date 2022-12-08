import { AsyncMqttClient } from 'async-mqtt'
import mqtt from 'async-mqtt'
import { Queue } from '@streamr/test-utils'
import { Message } from '../../../../src/helpers/PayloadFormat'
import { createMessagingPluginTest } from '../../createMessagingPluginTest'

const MQTT_PORT = 12430

jest.setTimeout(60000)

createMessagingPluginTest('mqtt',
    {
        createClient: async (_action: 'publish' | 'subscribe', _streamId: string, apiKey: string): Promise<AsyncMqttClient> => {
            return mqtt.connectAsync('mqtt://localhost:' + MQTT_PORT, {
                username: '',
                password: apiKey,
            })
        },
        closeClient: async (client: AsyncMqttClient): Promise<void> => {
            await client.end(true)
        },
        publish: async (msg: Message, streamId: string, client: AsyncMqttClient): Promise<void> => {
            await client.publish(streamId, JSON.stringify(msg))
        },
        subscribe: async (messageQueue: Queue<Message>, streamId: string, client: AsyncMqttClient): Promise<void> => {
            client.once('message', (topic: string, message: Buffer) => {
                if (topic === streamId) {
                    messageQueue.push(JSON.parse(message.toString()))
                }
            })
            await client.subscribe(streamId)
        }
    },
    {
        plugin: MQTT_PORT,
        brokerConnectionManager: 40420,
    },
    module
)
