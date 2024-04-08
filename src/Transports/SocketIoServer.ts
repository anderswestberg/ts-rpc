import * as SocketIo from 'socket.io'
import { createServer as createHttpServer, Server as HttpServer} from 'http'
import { createServer as createHttpsServer, Server as HttpsServer} from 'https'
import { GenericModule, IGenericModule } from '../Core'

export class SocketIoServer extends GenericModule<unknown, unknown , unknown, unknown> {
    closed = false
    io: SocketIo.Server
    server: HttpServer | HttpsServer
    constructor(server?: HttpServer | HttpsServer, port?: number, https?: boolean, sources?: IGenericModule<unknown, unknown , unknown, unknown>[]) {
        super(undefined, sources)
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
                await this.send(data)
            })
        })
        if (this.server)
            this.server.listen(port)
        else
            this.server = server
    }
    async receive(message: unknown) {
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
