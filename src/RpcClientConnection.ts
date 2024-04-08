import { GenericModule, IManageRpc, JsonParser, JsonStringifier, RpcClient } from "."

export class RpcClientConnection {
    parser: JsonParser
    rpcClient: RpcClient
    stringifier: JsonStringifier<object>
    manageRpc: IManageRpc
    readyFlag = false
    constructor(public transport: GenericModule, public target?: string | string[]) {
        this.init()
    }
    async init() {
        this.parser = new JsonParser([this.transport])
        this.rpcClient = new RpcClient('', [this.parser], this.target)
        this.stringifier = new JsonStringifier([this.rpcClient])
        this.stringifier.pipe(this.transport)
        this.manageRpc = this.rpcClient.api('manageRpc')as IManageRpc
        this.readyFlag = true
    }
    async ready() {
        while (!this.transport.readyFlag || !this.readyFlag)
            await new Promise(res => setTimeout(res, 10))
    }
    async api<T>(name: string, target?: string) {
        await this.ready()
        return {
            proxy: this.rpcClient.api(name, target) as T
        }
    }
}
