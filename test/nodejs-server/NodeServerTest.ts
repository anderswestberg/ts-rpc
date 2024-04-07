import { SocketIoServer, Converter, RpcServer, TryCatch, SwitchSource, SocketIoTransport } from '../../src/index'
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

    //const server = createServer()
    const socketIoServer = new SocketIoServer(undefined, 3000, false, [])
    const testRpc = new TestRpc(10)

    // Parse each incoming message using
    const parser = new Converter([socketIoServer], message => {
        return JSON.parse(message as string)
    })

    const switch1 = new SwitchSource([parser])
    if (port === 3000) {
        const socketIoClient2 = new SocketIoTransport() // Skapa senare !!!!!!!!!!!!!!!!!!
        socketIoClient2.open('http://localhost:3001')
        switch1.setTarget('hejsan', socketIoClient2)
    }

    // Send each parsed message to an RPC server
    const rpcServer = new RpcServer([])
    switch1.setTarget(undefined, rpcServer)

    // Serialize each outgoing message using JSON.stringify
    const stringifier = new Converter([rpcServer], message => {
        return JSON.stringify(message)
    })
    rpcServer.pipe(stringifier)

    // Try to send the message back. If we fail (probably the client disconnected), do nothing.
    const tryCatch = new TryCatch([])
    stringifier.pipe(tryCatch)
    tryCatch.pipe(socketIoServer)

    // Expose a function
    rpcServer.manageRpc.exposeObject({
        Hello: () => {
            return 'World!'
        }
    }, 'MyRpc')

    rpcServer.manageRpc.exposeClassInstance(testRpc, 'testRpc')
    rpcServer.manageRpc.exposeClass(TestRpc)

    /*
    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
    */

    for (;;) {
        await new Promise(res => setTimeout(res, 5000))
        testRpc.emit('hejsan',  1, 2, 5)
        testRpc.emit('svejsan',  Math.PI)
    }
}

main()
