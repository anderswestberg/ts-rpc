// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SocketIoTransport } from '../../src/index.js'
import { RpcClientConnection } from '../../src/Utilities/RpcClientConnection.js'
import { MqttTransport } from '../../src/Transports/Mqtt.js'
import { ITestRpc } from '../nodejs-server/ITestRpc.js'

const main = async () => {
    const name = 'rpcClient1'
    //const transport = new SocketIoTransport('http://localhost:3000')
    const transport = new MqttTransport(false, 'mqtt://localhost:1883', name)
    const client = new RpcClientConnection(name, transport, 'rpcServer1')
    await client.transport.ready()
    const proxy = (await client.api<ITestRpc>('testRpc')).proxy
    const proxyHello = (await client.api<{ hello: (arg: string) => string }>('MyRpc')).proxy

    await proxy.on('hejsan', (...args: unknown[]) => {
        console.log('Event hejsan: ' + args)
    })

    const newInstance = await client.manageRpc.createRpcInstance('TestRpc', undefined, 1000)
    const newInstanceRpc = (await client.api(newInstance)).proxy as ITestRpc
    const sum = await newInstanceRpc.add(5, 6)   
    console.log('Sum: ' + sum)
    for (; ;) {
        // Should output Hello World!
        const response = await proxyHello.hello('Hello')
        console.log('Response: ' + response)
        try {
            const answer = await proxy.add(1000, 2000)
            console.log('proxy3 Add ' + answer)
            const b = new Uint8Array(50)
            b[0] = 33
            const buf = await proxy.extendBuffer(b)
            console.log(buf)
            await new Promise(res => setTimeout(res, 1000))
        } catch (e) {
            console.log('Exception: ', e)
        }
    }
}

main()