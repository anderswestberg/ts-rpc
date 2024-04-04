import { WebSocketTransport, JsonParser, RpcClient, JsonStringifier } from '../../src/index'

const main = async () => {

    // Create a WebSocket client which connects to the server
    // For use in broser, use BrowserWebSocketTransport instead
    let transport = new WebSocketTransport([], { address: 'ws://localhost:3000' })

    // Parse each incoming message
    let parser = new JsonParser([transport])

    // Send each parsed message to a RPC client
    let rpcClient = new RpcClient([parser])

    // Serialize each outgoing message
    let stringifier = new JsonStringifier([rpcClient])
    stringifier.pipe(transport)

    // Create a JavaScript proxy object which allows us to call the RPC functions. The service name should match the exposed object on the server ("MyRpc").
    let client = rpcClient.api('MyRpc')

    for (;;) {
        // Should output Hello World!
        const response = await client.Hello()
        console.log('Hello ' + response)
        await new Promise(res => setTimeout(res, 5000))
    }
}

main()