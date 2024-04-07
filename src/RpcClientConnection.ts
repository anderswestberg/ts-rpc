import { IManageRpc, JsonParser, JsonStringifier, RpcClient, SocketIoTransport } from "."

export class RpcClientConnection {
    transport: SocketIoTransport
    parser: JsonParser<unknown>
    rpcClient: RpcClient
    stringifier: JsonStringifier<object>
    manageRpc: IManageRpc
    readyFlag = false
    constructor(public url: string = 'http://localhost:3000', public target?: string | string[]) {
        this.init()
    }
    async init() {
        this.transport = new SocketIoTransport([])
        this.transport.open(this.url)
        this.parser = new JsonParser([this.transport])
        this.rpcClient = new RpcClient([this.parser], this.target)
        this.stringifier = new JsonStringifier([this.rpcClient])
        this.stringifier.pipe(this.transport)
        this.manageRpc = this.rpcClient.api('manageRpc')as IManageRpc
        this.readyFlag = true
    }
    async ready(timeout: number) {
        let time = 0
        while (!this.transport.connected || !this.readyFlag) {
            const delay = 10
            await new Promise(res => setTimeout(res, delay))
            time += delay
            if (time > timeout)
                throw('Timeout waiting for connection to remote server ' + this.url)
        }
    }
    async createProxyToRemote(name: string, url: string | string[], ...args: unknown[]) {
        await this.ready(5000)
        const result = await this.manageRpc.createProxyToRemote(name, url, ...args)
        return result
    }
    api(name: string) {
        return this.rpcClient.api(name)
    }
    async getRemoteClientConnection(url: string, name: string) {
        return await this.manageRpc.getRemoteClientConnection(url, name)
    }
}
