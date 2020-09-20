import { DsModule } from '../Core'
import { JsonRpc, RpcRequest, RpcResponse } from './JsonRpc'

export class RpcProvider extends DsModule<RpcRequest, RpcResponse> {
    public rpc = new JsonRpc()
    receive(message: RpcRequest) {
        this.rpc.receive(message).then(res => {
            this.send(res)
        })
    }
    sendEvent(serviceName: string, event: string, params: any[]) {
        return this.send({ serviceName, event, params })
    }
}
