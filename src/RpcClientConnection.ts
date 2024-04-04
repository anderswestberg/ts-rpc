import { IManageRpc, JsonParser, JsonStringifier, RpcClient, SocketIoTransport } from "."
import { v4 as uuidv4 } from 'uuid'

export class RpcClientConnection {
    transport: SocketIoTransport
    parser: JsonParser<any>
    rpcClient: RpcClient
    stringifier: JsonStringifier<any>
    apis: { [uuid: string]: any } = {}
    manageRpc: IManageRpc
    constructor(public url: string = 'http://localhost:3000') {
        this.init()
    }
    init() {
        this.transport = new SocketIoTransport([])
        this.transport.open(this.url)
        this.parser = new JsonParser([this.transport])
        this.rpcClient = new RpcClient([this.parser])
        this.stringifier = new JsonStringifier([this.rpcClient])
        this.stringifier.pipe(this.transport)
        this.manageRpc = this.rpcClient.api('manageRpc')as IManageRpc
    }
    api(name: string, url: string | string[] = '') {
        return this.rpcClient.api(name, url)
    }
    async remoteClientConnection(url: string, name: string) {
        return await this.manageRpc.remoteClientConnection(url, name)
    }
}
