import { GenericModule } from "../Core.js"
import { IManageRpc } from "../RPC/Rpc.js"
import { RpcClient } from "../RPC/RpcClient.js"
import { JsonParser, JsonStringifierToUint8Array, MsgPackDecoder, MsgPackEncoder } from "./Converters.js"

export class RpcClientConnection {
    parser?: JsonParser
    rpcClient?: RpcClient
    stringifier?: JsonStringifierToUint8Array<object>
    manageRpc?: IManageRpc
    readyFlag = false
    constructor(public name: string, public transport: GenericModule, public defaultTarget?: string) {
        this.init()
    }
    async init() {
        //this.parser = new JsonParser([this.transport])
        this.parser = new MsgPackDecoder([this.transport])
        this.rpcClient = new RpcClient(this.name, [this.parser], this.defaultTarget)
        //this.stringifier = new JsonStringifierToUint8Array([this.rpcClient])
        this.stringifier = new MsgPackEncoder([this.rpcClient])
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
            proxy: this.rpcClient?.api(name, target ? target : this.defaultTarget) as T
        }
    }
}
