import * as mqtt from 'mqtt'

import { GenericModule, IGenericModule } from '../Core'

type MsgType = string

export class MqttTransport extends GenericModule<MsgType, unknown, MsgType, unknown> {
    client: mqtt.MqttClient
    connected = false

    constructor(public server: boolean, url: string, public mqttName: string, name?: string, sources?: IGenericModule<unknown, unknown, MsgType, unknown>[]) {
        super(name, sources)
        this.open(url)
    }
    topicName(target: string) {
        const result = 'emellio_v0.0/' + target
        return result
    }
    async open(address: string) {
        this.client = mqtt.connect(address)
        this.client.on('message', async (topic, message) => {
            const target = topic.split('/').pop()
            if (this.targetExists(target))
                await this.send(message.toString('utf-8'), target)
        })
        this.client.on('connect', () => {
            this.connected = true
            this.client.subscribe(this.topicName(this.mqttName))
        })
        this.client.on('close', () => {
            this.connected = false
        })
        this.readyFlag = true
    }
    async receive(message: MsgType, target: string) {
        this.client.publish(this.topicName(target), message)
    }
}
