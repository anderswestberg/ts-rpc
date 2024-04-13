import { GenericModule } from "../Core"
import { RpcServer } from "../RPC/RpcServer"
import { JsonParser, JsonStringifier, JsonStringifierToBuffer } from "./Converters"
import { Switch } from "./Switch"
import { TryCatch } from "./TryCatch"

export class RpcServerConnection {
    parser: JsonParser
    rpcServer: RpcServer
    stringifier: JsonStringifierToBuffer<object>
    readyFlag = false
    switch: Switch
    constructor(public name: string, public transports: GenericModule[]) {
        this.init()
    }
    async init() {
        this.parser = new JsonParser(this.transports)
        this.rpcServer = new RpcServer(this.name, [this.parser])
        this.stringifier = new JsonStringifierToBuffer([this.rpcServer])
        this.switch = new Switch([this.stringifier])
        this.switch.setTargets(this.transports)
        this.readyFlag = true
    }
    async ready() {
        const allTransportsReady = () => {
            return this.transports.filter(trp => !trp.readyFlag).length == 0
        }
        while (!allTransportsReady() || !this.readyFlag)
            await new Promise(res => setTimeout(res, 10))
    }
}
