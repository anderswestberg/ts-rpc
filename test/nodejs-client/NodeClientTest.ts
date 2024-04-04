import { SocketIoTransport, JsonParser, RpcClient, JsonStringifier, IManageRpc } from '../../src/index'
import { ITestRpc } from '../nodejs-server/ITestRpc'

const main = async () => {

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

    let client2 = rpcClient.api('testRpc') as ITestRpc
    client2.on('hejsan', (...args: any[]) => {
        console.log('Event hejsan: ' + args)
    })
    client2.on('svejsan', (...args: any[]) => {
        console.log('Event svejsan: ' + args)
    })

    let client = rpcClient.api('MyRpc')

    let manageRpc = rpcClient.api('manageRpc')as IManageRpc
    let newInstance = await manageRpc.createRpcInstance('TestRpc', 77)
    let newInstanceRpc = rpcClient.api(newInstance) as ITestRpc
    let sum = await newInstanceRpc.add(5, 6)

    let remote = await manageRpc.createRpcInstance('TestRpc', 77)
    for (;;) {
        // Should output Hello World!
        let response = await client.Hello('World!')
        console.log('Hello ' + response)
        response = await client2.add(1, 2)
        console.log('Add ' + response)
        await new Promise(res => setTimeout(res, 5000))
    }
}

main()