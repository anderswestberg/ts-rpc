import { SocketIoServer, Converter, RpcServer, TryCatch } from '../../src/index'
import express from 'express'
import { createServer } from 'http'

export class TestRpc {
    constructor(public base: number) {        
    }
    add(a: number, b: number) {
        return this.base + a + b
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

    server.listen(3000, () => {
        console.log('Server listening on port 3000');
    });

    for (;;) {
        await new Promise(res => setTimeout(res, 5000))
    }
}

main()
