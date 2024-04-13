import { GenericModule } from "../Core"
import { RpcServer } from "../RPC/RpcServer"
import { JsonParser, JsonStringifier } from "./Converters"
import { Switch } from "./Switch"
import { TryCatch } from "./TryCatch"

export class RpcServerConnection {
    parser: JsonParser
    rpcServer: RpcServer
    stringifier: JsonStringifier<object>
    readyFlag = false
    switch: Switch
    constructor(public name: string, public transport: GenericModule) {
        this.init()
    }
    async init() {
        this.parser = new JsonParser([this.transport])
        this.switch = new Switch([this.parser])
        this.rpcServer = new RpcServer(this.name, [])
        this.switch.setTarget(this.rpcServer)
        this.stringifier = new JsonStringifier([this.rpcServer])
        const tryCatch = new TryCatch([this.stringifier])
        tryCatch.pipe(this.transport)
        this.readyFlag = true
    }
    async ready() {
        while (!this.transport.readyFlag || !this.readyFlag)
            await new Promise(res => setTimeout(res, 10))
    }
}
