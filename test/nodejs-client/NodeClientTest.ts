import { SocketIoTransport } from '../../src'
import { RpcClientConnection } from '../../src/Utilities/RpcClientConnection'
import { MqttTransport } from '../../src/Transports/Mqtt'
import { ITestRpc } from '../nodejs-server/ITestRpc'

const main = async () => {
    const name = 'rpcClient1'
    //const transport = new SocketIoTransport('http://localhost:3000')
    const transport = new MqttTransport(false, 'mqtt://localhost:1883', name)
    const client = new RpcClientConnection(name, transport, 'rpcServer1')
    await client.transport.ready()
    const proxy = (await client.api<ITestRpc>('testRpc')).proxy

    let res = await proxy.on('hejsan', (...args: unknown[]) => {
        console.log('Event hejsan: ' + args)
    })

    for (; ;) {
        await new Promise(res => setTimeout(res, 1000))
    }
    let newInstance = await client.manageRpc.createRpcInstance('TestRpc', undefined, 1000)
    let newInstanceRpc = (await client.api(newInstance)).proxy as ITestRpc
    let sum = await newInstanceRpc.add(5, 6)   
    let remote = await client.manageRpc.createRpcInstance('TestRpc', 'myInstance', 77)
    for (; ;) {
        // Should output Hello World!
        //const response = await proxy.Hello('World!')
        //console.log('Hello ' + response)
        //let answer = await proxy2.add(1, 2)
        //console.log('Add ' + answer)
        try {
            let answer = await proxy.add(1000, 2000)
            console.log('proxy3 Add ' + answer)
            await new Promise(res => setTimeout(res, 1000))
        } catch (e) {
            console.log('Exception: ', e)
        }
    }
}

main()