import { io, Socket } from 'socket.io-client'
import { GenericModule, IGenericModule } from '../Core'

type MsgType = string | ArrayBuffer

export class SocketIoTransport extends GenericModule {
    socket: Socket
    connected = false

    constructor(url?: string, name?: string, sources?: IGenericModule[]) {
        super(name, sources)
        this.open(url)
    }

    protected async open(address?: string) {
        this.socket = io(address)
        this.socket.on('message', async (ev) => {
            try {
                await this.send(ev.data, this.name)
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
    async receive(message: MsgType, target: string) {
        if (!this.connected)
            await new Promise(res => setTimeout(res, 1000))
        this.socket.emit('message', message)
    }
}
