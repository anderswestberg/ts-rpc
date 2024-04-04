import * as SocketIo from 'socket.io'
import type { Server } from 'http'

import { DsModule_Emitter, IDsModule } from '../Core'
import { TargetNotFoundError, TargetedMessage, SourcedMessage } from '../Utilities/Targets'

type InputType = TargetedMessage<string | Buffer | ArrayBuffer | Buffer[], SocketIo.Socket>
type OutputType = SourcedMessage<string | Buffer | ArrayBuffer | Buffer[], SocketIo.Socket>

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
                this.send({ source: socket, message: data })
            })
        })
    }
    async receive(message: TargetedMessage<string | Buffer | ArrayBuffer | Buffer[], SocketIo.Socket>) {
        message.target.emit('message', { data: message.message })
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
