import { SocketIoServer, Converter, RpcServer, TryCatch } from '../../src/index'
import express from 'express'
import { createServer } from 'http'
import { ITestRpc } from './ITestRpc'
import EventEmitter from 'events'

const port = process.argv[2] || 3000

export class TestRpc extends EventEmitter implements ITestRpc {
    constructor(public base: number = 0) {        
        super()
    }
    async add(a: number, b: number) {
        console.log(`TestRpc.add ${a} ${b} base: ${this.base}`)
        return this.base + a + b
    }
    triggerEvent() {
        this.emit('hejsan', 1, 2, 3, 4)
    }
}

const main = async () => {

    const app = express()
    const server = createServer(app)
    const socketIoServer = new SocketIoServer([], server)
    const testRpc = new TestRpc(10)

    // Parse each incoming message using
    const parser = new Converter([socketIoServer], message => {
        return { source: message.source, message: JSON.parse(message.message.toString()) }
    })

    // Send each parsed message to an RPC server
    const rpcServer = new RpcServer([parser])

    // Serialize each outgoing message using JSON.stringify
    const stringifier = new Converter([rpcServer], message => {
        return { target: message.target, message: JSON.stringify(message.message) }
    })

    // Try to send the message back. If we fail (probably the client disconnected), do nothing.
    const tryCatch = new TryCatch([stringifier])
    tryCatch.pipe(socketIoServer)

    // Expose a function
    rpcServer.manageRpc.exposeObject({
        Hello: () => {
            return 'World!'
        }
    }, 'MyRpc')

    rpcServer.manageRpc.exposeClassInstance(testRpc, 'testRpc')
    rpcServer.manageRpc.exposeClass(TestRpc)

    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });

    for (;;) {
        await new Promise(res => setTimeout(res, 5000))
        testRpc.emit('hejsan',  1, 2, 5)
        testRpc.emit('svejsan',  Math.PI)
    }
}

main()
