import * as SocketIo from 'socket.io'
import { createServer as createHttpServer, Server as HttpServer } from 'http'
import { createServer as createHttpsServer, Server as HttpsServer } from 'https'
import { GenericModule, IGenericModule } from '../Core'

export class SocketIoServer extends GenericModule<unknown, unknown, unknown, unknown> {
    closed = false
    io: SocketIo.Server
    server: HttpServer | HttpsServer
    constructor(server?: HttpServer | HttpsServer, port?: number, https?: boolean, sources?: IGenericModule<unknown, unknown, unknown, unknown>[], name?: string) {
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
            socket.on('message', async data => {
                await this.send(data, undefined)
            })
        })
        if (this.server)
            this.server.listen(port)
        else
            this.server = server
        this.readyFlag = true
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async receive(message: unknown, target: string) {
        this.io.emit('message', { data: message })
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
}
