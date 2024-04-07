import * as SocketIoClient from 'socket.io-client'

import { IDsModule, DsModule_Emitter } from '../Core'

type MsgType = string | Buffer | ArrayBuffer | Buffer[]

export class SocketIoTransport extends DsModule_Emitter<MsgType, MsgType> {
    private socket: SocketIoClient.Socket
    connected = false

    constructor(sources?: IDsModule<unknown, MsgType>[]) {
        super(sources)
    }
    public open(address: string) {
        this.socket = SocketIoClient.io(address)
        this.socket.on('message', async (ev) => {
            await this.send(ev.data)
        })
        this.socket.on('connect', () => {
            this.connected = true
        })
        this.socket.on('disconnect', () => {
            this.connected = false
        })
    }
    async receive(message: MsgType) {
        this.socket.emit('message', message)
        console.log(message)
    }
}
