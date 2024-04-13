// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const proxyHello = (await client.api<{ Hello: (arg: string) => string }>('MyRpc')).proxy

    await proxy.on('hejsan', (...args: unknown[]) => {
        console.log('Event hejsan: ' + args)
    })

    const newInstance = await client.manageRpc.createRpcInstance('TestRpc', undefined, 1000)
    const newInstanceRpc = (await client.api(newInstance)).proxy as ITestRpc
    const sum = await newInstanceRpc.add(5, 6)   
    console.log('Sum: ' + sum)
    for (; ;) {
        // Should output Hello World!
        const response = await proxyHello.Hello('Hello')
        console.log('Response: ' + response)
        try {
            const answer = await proxy.add(1000, 2000)
            console.log('proxy3 Add ' + answer)
            await new Promise(res => setTimeout(res, 10))
        } catch (e) {
            console.log('Exception: ', e)
        }
    }
}

main()