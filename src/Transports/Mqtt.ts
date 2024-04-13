import * as mqtt from 'mqtt'

import { GenericModule, IGenericModule } from '../Core'

export class MqttTransport extends GenericModule<string | Buffer, unknown, string | Buffer, unknown> {
    client: mqtt.MqttClient
    connected = false

    constructor(public server: boolean, url: string, public mqttName: string, name?: string, sources?: IGenericModule<unknown, unknown, string, unknown>[]) {
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
            const [header, payload] = this.extractHeader(message)
            if (header && this.targetExists(header.target))
                await this.send(payload, header.source, header.target)
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
    async receive(message: string | Buffer, source: string, target: string) {
        this.client.publish(this.topicName(target), this.prependHeader(source, target, message))
    }
    isTransport() {
        return true
    }
}
