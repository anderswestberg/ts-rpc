import { RpcClientConnection } from '../../src/RpcClientConnection'
import { ITestRpc } from '../nodejs-server/ITestRpc'

const main = async () => {

    const client = new RpcClientConnection('http://localhost:3000')
    const proxy2 = client.api('testRpc') as ITestRpc
/*
    let remoteProxy = await client.createProxyToRemote('testRpc2: TestRpc', 'http://localhost:3001', 10000)
    let proxy1 = client.api(remoteProxy) as ITestRpc
    let n = 0
    proxy1.add(1000, n++)
    while (true) {
        //proxy1.add(1000, n++)
        await new Promise(res => setTimeout(res, 10000))
    }
    const r = await proxy2.add(2, 3)
    console.log(r)

    proxy2.on('hejsan', (...args: unknown[]) => {
        console.log('Event hejsan: ' + args)
    })
    proxy2.on('svejsan', (...args: unknown[]) => {
        console.log('Event svejsan: ' + args)
    })
*/

    const proxy = client.api('MyRpc') as { Hello: (arg) => Promise<string> }
    /*
    let newInstance = await client.manageRpc.createRpcInstance('TestRpc', 77)
    let newInstanceRpc = client.api(newInstance) as ITestRpc
    let sum = await newInstanceRpc.add(5, 6)   
    let remote = await client.manageRpc.createRpcInstance('TestRpc', 77)
    */
    for (; ;) {
        // Should output Hello World!
        const response = await proxy.Hello('World!')
        console.log('Hello ' + response)
        const answer = await proxy2.add(1, 2)
        console.log('Add ' + answer)
        await new Promise(res => setTimeout(res, 5000))
    }
}

main()