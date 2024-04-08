import { MqttTransport } from '../../src/Transports/Mqtt'
import { SocketIoServer, Converter, RpcServer, TryCatch, Switch, SocketIoTransport, Message, RpcRequest, RpcResponse } from '../../src/index'
import { ITestRpc } from './ITestRpc'
import EventEmitter from 'events'

let port = 3000
if (process.argv[2])
    port = parseInt(process.argv[2])

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

    let name = 'rpcServer1'
    if (port !== 3000)
        name = 'rpcServer2'
    //const transport = new SocketIoServer(undefined, port, false, [], 'NodeTest')
    const transport = new MqttTransport(true, 'mqtt://localhost:1883', name)
    const testRpc = new TestRpc(10)

    // Parse each incoming message using
    const parser = new Converter<string, object>([transport], message => {
        return JSON.parse(message as string)
    })
    const switch1 = new Switch([parser])
    if (port === 3000) {
        const stringifier = new Converter<Message<RpcResponse>, string>([], message => {
            return JSON.stringify(message)
        })
        switch1.setTarget('rpcServer2', stringifier)
        //const socketIoClient2 = new SocketIoTransport('http://localhost:3001', undefined, [stringifier])
        const socketIoClient2 = new MqttTransport(false, 'mqtt://localhost:1883', 'rpcServer2', [stringifier])
        await socketIoClient2.ready()
        socketIoClient2.pipe(transport)
    }

    
    // Send each parsed message to an RPC server
    const rpcServer = new RpcServer('rpcServer1', [])
    switch1.setTarget(name, rpcServer)

    // Serialize each outgoing message using JSON.stringify
    const stringifier = new Converter<Message<RpcResponse>, string>([rpcServer], message => {
        return JSON.stringify(message)
    })

    // Try to send the message back. If we fail (probably the client disconnected), do nothing.
    const tryCatch = new TryCatch([stringifier])
    tryCatch.pipe(transport)

    // Expose a function
    rpcServer.manageRpc.exposeObject({
        Hello: (arg: string) => {
            console.log(arg)
            return arg + ' World!'
        }
    }, 'MyRpc')

    rpcServer.manageRpc.exposeClassInstance(testRpc, 'testRpc')
    rpcServer.manageRpc.exposeClass(TestRpc)

    /*
    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });    */

    for (; ;) {
        await new Promise(res => setTimeout(res, 5000))
        testRpc.emit('hejsan', 1, 2, 5)
        testRpc.emit('svejsan', Math.PI)
    }
}

main()
