import { io, Socket } from 'socket.io-client'
import { GenericModule, IGenericModule } from '../Core'

export class SocketIoTransport extends GenericModule<string | Buffer, unknown, string | Buffer, unknown> {
    socket: Socket
    connected = false

    constructor(url?: string, name?: string, sources?: IGenericModule[]) {
        super(name, sources)
        this.open(url)
    }

    protected async open(address?: string) {
        this.socket = io(address)
        this.socket.on('message', async (message) => {
            try {
                const [header, payload] = this.extractHeader(message)
                if (header && this.targetExists(header.target))
                    await this.send(payload, header.source, header.target)
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
    async receive(message: string | Buffer, source: string, target: string) {
        if (!this.connected)
            await new Promise(res => setTimeout(res, 1000))
        this.socket.emit('message', this.prependHeader(source, target, message))
    }
}
