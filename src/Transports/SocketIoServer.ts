import * as SocketIo from 'socket.io'
import type { Server } from 'http'

import { DsModule_Emitter, IDsModule } from '../Core'

type InputType = any
type OutputType = any

export class SocketIoServer extends DsModule_Emitter<InputType, OutputType> {
    private closed = false
    io: SocketIo.Server
    constructor(sources?: IDsModule<any, InputType>[], server?: Server) {
        super(sources)
        this.io = new SocketIo.Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.io.on('connection', (socket) => {
            this.emit('connection', socket)
            socket.on('message', data => {
                this.send(data)
            })
        })
    }
    async receive(message: any) {
        this.emit('message', { data: message })
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
