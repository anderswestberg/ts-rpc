import * as SocketIoClient from 'socket.io-client'

import { GenericModule, IGenericModule, MessageModule } from '../Core'

type MsgType = string | Buffer | ArrayBuffer | Buffer[]

export class SocketIoTransport extends GenericModule {
    socket: SocketIoClient.Socket
    connected = false

    constructor(url: string, name?: string, sources?: IGenericModule[]) {
        super(name, sources)
        this.open(url)
    }

    protected async open(address: string) {
        this.socket = SocketIoClient.io(address)
        this.socket.on('message', async (ev) => {
            try {
                await this.send(ev.data)
            } catch (e) {
                console.log('Exception: ', e)
            }
        })
        this.socket.on('connect', () => {
            this.connected = true
        })
        this.socket.on('disconnect', () => {
            this.connected = false
        })
        this.readyFlag = true
    }
    async receive(message: MsgType) {
        this.socket.emit('message', message)
    }
}
