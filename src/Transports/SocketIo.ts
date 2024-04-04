import * as SocketIoClient from 'socket.io-client'

import { IDsModule, DsModule_Emitter } from '../Core'

type MsgType = string | Buffer | ArrayBuffer | Buffer[]

export class SocketIoTransport extends DsModule_Emitter<MsgType, MsgType> {
    private socket: SocketIoClient.Socket

    constructor(sources?: IDsModule<any, MsgType>[]) {
        super(sources)
    }
    public open(address: string) {
        this.socket = SocketIoClient.io(address)
        this.socket.on('message', (ev) => {
            this.send(ev.data)
        })
    }
    receive(message: MsgType) {
        this.socket.emit('message', message)
        console.log(message)
    }
}
