import * as SocketIo from 'socket.io'
import { createServer as createHttpServer, Server as HttpServer } from 'http'
import { createServer as createHttpsServer, Server as HttpsServer } from 'https'
import { GenericModule, IGenericModule } from '../Core.js'

export class SocketIoServer extends GenericModule<string | Uint8Array, unknown, string | Uint8Array, unknown> {
    closed = false
    io: SocketIo.Server
    constructor(name: string, public server?: HttpServer | HttpsServer, port?: number, https?: boolean, sources?: IGenericModule[]) {
        super(name, sources)
        if (!server)
            this.server = https ? createHttpsServer() : createHttpServer()
        this.io = new SocketIo.Server(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        })
        this.io.on('connection', (socket) => {
            this.emit('connection', socket)
            socket.on('message', async messageArray => {
                const message = new Uint8Array(messageArray)
                const [header, payload] = this.extractHeader(message)
                if (header && this.targetExists(header.target))
                    await this.send(payload, header.source, header.target)
            })
        })
        if (this.server)
            this.server.listen(port)
        else
            this.server = server
        this.readyFlag = true
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async receive(message: string | Uint8Array, source: string, target: string) {
        this.io.emit('message', this.prependHeader(source, target, message))
    }
    async close() {
        if (this.closed) {
            return
        }
        this.closed = true
        this.emit('close')
        await new Promise(res => setTimeout(res, 1000))
        this.io.close()
    }
    isTransport() {
        return true
    }
}
