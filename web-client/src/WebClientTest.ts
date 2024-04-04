import EventEmitter from 'events'
import { SocketIoTransport, JsonParser, RpcClient, JsonStringifier } from '../../src/index-web'

export const dsNodesTest = async () => {

    const ev: EventEmitter | undefined = undefined
    // Create a WebSocket client which connects to the server
    // For use in broser, use BrowserWebSocketTransport instead
    let transport = new SocketIoTransport([])
    transport.open('http://localhost:3000')

    // Parse each incoming message
    let parser = new JsonParser([transport])

    // Send each parsed message to a RPC client
    let rpcClient = new RpcClient([parser])

    // Serialize each outgoing message
    let stringifier = new JsonStringifier([rpcClient])
    stringifier.pipe(transport)

    // Create a JavaScript proxy object which allows us to call the RPC functions. The service name should match the exposed object on the server ("MyRpc").
    let client = rpcClient.api('MyRpc')

    return { client }
}
