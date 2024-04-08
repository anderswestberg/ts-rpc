import { SocketIoTransport } from '../../src'
import { RpcClientConnection } from '../../src/RpcClientConnection'
import { MqttTransport } from '../../src/Transports/Mqtt'
import { ITestRpc } from '../nodejs-server/ITestRpc'

const main = async () => {
    //const transport = new SocketIoTransport('http://localhost:3000', 'NodeClientTest')
    const transport = new MqttTransport(false, 'mqtt://localhost:1883', 'rpcServer1')
    const client = new RpcClientConnection(transport)
    await client.transport.ready()
    //const proxy2 = (await client.api<ITestRpc>('testRpc')).proxy
    const proxy3 = (await client.api<ITestRpc>('testRpc', 'rpcServer2')).proxy
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

    //const proxy = (await client.api<{ Hello: (arg) => Promise<string> }>('MyRpc')).proxy
    /*
    let newInstance = await client.manageRpc.createRpcInstance('TestRpc', 77)
    let newInstanceRpc = client.api(newInstance) as ITestRpc
    let sum = await newInstanceRpc.add(5, 6)   
    let remote = await client.manageRpc.createRpcInstance('TestRpc', 77)
    */
    for (; ;) {
        // Should output Hello World!
        //const response = await proxy.Hello('World!')
        //console.log('Hello ' + response)
        //let answer = await proxy2.add(1, 2)
        //console.log('Add ' + answer)
        try {
            let answer = await proxy3.add(1000, 2000)
            console.log('proxy3 Add ' + answer)
            await new Promise(res => setTimeout(res, 10))
        } catch (e) {
            console.log('Exception: ', e)
        }
    }
}

main()