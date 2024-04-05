import { RpcClientConnection } from '../../src/RpcClientConnection'
import { SocketIoTransport, JsonParser, RpcClient, JsonStringifier, IManageRpc } from '../../src/index'
import { ITestRpc } from '../nodejs-server/ITestRpc'

const main = async () => {

    const client = new RpcClientConnection('http://localhost:3000')

    let remoteProxy = await client.createProxyToRemote('testRpc2: TestRpc', 'http://localhost:3001', 10000)
    let proxy1 = client.api(remoteProxy) as ITestRpc
    let n = 0
    proxy1.add(1000, n++)
    while (true) {
        //proxy1.add(1000, n++)
        await new Promise(res => setTimeout(res, 10000))
    }

    let proxy2 = client.api('testRpc') as ITestRpc
    proxy2.on('hejsan', (...args: any[]) => {
        console.log('Event hejsan: ' + args)
    })
    proxy2.on('svejsan', (...args: any[]) => {
        console.log('Event svejsan: ' + args)
    })

    let proxy = client.api('MyRpc') as any
    let newInstance = await client.manageRpc.createRpcInstance('TestRpc', 77)
    let newInstanceRpc = client.api(newInstance) as ITestRpc
    let sum = await newInstanceRpc.add(5, 6)

    let remote = await client.manageRpc.createRpcInstance('TestRpc', 77)
    for (; ;) {
        // Should output Hello World!
        let response = proxy.Hello('World!')
        console.log('Hello ' + response)
        response = await proxy2.add(1, 2)
        console.log('Add ' + response)
        await new Promise(res => setTimeout(res, 5000))
    }
}

main()