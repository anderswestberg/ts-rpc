import { GenericModule } from "../Core.js"
import { RpcServer } from "../RPC/RpcServer.js"
import { JsonParser, JsonStringifierToUint8Array, MsgPackDecoder, MsgPackEncoder } from "./Converters.js"
import { Switch } from "./Switch.js"

export class RpcServerConnection {
    parser?: JsonParser
    rpcServer?: RpcServer
    stringifier?: JsonStringifierToUint8Array<object>
    readyFlag = false
    switch?: Switch
    constructor(public name: string, public transports: GenericModule[]) {
        this.init()
    }
    addTarget(target: string, transport: GenericModule) {
        this.switch?.setTarget(transport)
    }
    async init() {
        //this.parser = new JsonParser(this.transports)
        this.parser = new MsgPackDecoder(this.transports)
        this.rpcServer = new RpcServer(this.name, [this.parser])
        //this.stringifier = new JsonStringifierToUint8Array([this.rpcServer])
        this.stringifier = new MsgPackEncoder([this.rpcServer])
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
