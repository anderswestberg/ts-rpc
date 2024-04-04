import { WebSocketServer, Converter, RpcServer, TryCatch } from '../../src/index'

const main = async () => {

    // Create a server which listents on 0.0.0.0:3000
    const server = new WebSocketServer([], { wsOptions: { host: 'localhost', port: 3000 } })

    // Parse each incoming message using
    const parser = new Converter([server], message => {
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
    tryCatch.pipe(server)

    // Expose a function
    rpcServer.manageRpc.exposeObject({
        Hello: () => {
            return 'World!'
        }
    } , 'MyRpc')

    for (;;) {
        await new Promise(res => setTimeout(res, 5000))
    }
}

main()
