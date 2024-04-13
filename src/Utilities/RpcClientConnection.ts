import { GenericModule } from "../Core"
import { IManageRpc } from "../RPC/Rpc"
import { RpcClient } from "../RPC/RpcClient"
import { JsonParser, JsonStringifier, JsonStringifierToBuffer } from "./Converters"

export class RpcClientConnection {
    parser: JsonParser
    rpcClient: RpcClient
    stringifier: JsonStringifierToBuffer<object>
    manageRpc: IManageRpc
    readyFlag = false
    constructor(public name: string, public transport: GenericModule, public defaultTarget?: string) {
        this.init()
    }
    async init() {
        this.parser = new JsonParser([this.transport])
        this.rpcClient = new RpcClient(this.name, [this.parser], this.defaultTarget)
        this.stringifier = new JsonStringifierToBuffer([this.rpcClient])
        this.stringifier.pipe(this.transport)
        this.readyFlag = true
        this.manageRpc = (await this.api('manageRpc')).proxy as IManageRpc
    }
    async ready() {
        while (!this.transport.readyFlag || !this.readyFlag)
            await new Promise(res => setTimeout(res, 10))
    }
    async api<T>(name: string, target?: string) {
        await this.ready()
        return {
            proxy: this.rpcClient.api(name, target ? target : this.defaultTarget) as T
        }
    }
}
