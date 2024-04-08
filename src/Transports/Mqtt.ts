import * as mqtt from 'mqtt'

import { GenericModule, IGenericModule } from '../Core'

type MsgType = string | Buffer

export class MqttTransport extends GenericModule<MsgType, unknown, MsgType, unknown> {
    client: mqtt.MqttClient
    connected = false

    constructor(public server: boolean, url: string, name?: string, sources?: IGenericModule<unknown, unknown, MsgType, unknown>[]) {
        super(name, sources)
        this.open(url)
    }
    async open(address: string) {
        this.client = mqtt.connect(address)
        this.client.on('message', async (topic, message) => {
            if (topic === (this.name + (this.server ? '_server' : '_client')))
                await this.send(message.toString('utf-8'))
        })
        this.client.on('connect', () => {
            this.connected = true
            this.client.subscribe(this.name + (this.server ? '_server' : '_client'))
        })
        this.client.on('close', () => {
            this.connected = false
        })
        this.readyFlag = true
    }
    async receive(message: MsgType) {
        this.client.publish(this.name + (this.server ? '_client' : '_server'), message)
    }
}
