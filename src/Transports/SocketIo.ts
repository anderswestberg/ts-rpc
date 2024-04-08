import * as SocketIoClient from 'socket.io-client'

import { GenericModule, IGenericModule, MessageModule } from '../Core'

type MsgType = string | Buffer | ArrayBuffer | Buffer[]

export class SocketIoTransport extends GenericModule {
    socket: SocketIoClient.Socket
    connected = false

    constructor(name?: string, sources?: IGenericModule[]) {
        super(name, sources)
    }
    public open(address: string) {
        this.socket = SocketIoClient.io(address)
        this.socket.on('message', (ev) => {
            this.send(ev.data).then(res => {
                console.log(res)
            }).catch(reason => {
                
            })
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
