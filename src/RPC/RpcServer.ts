import { JsonRpc, RpcResponse, RpcRequest } from './JsonRpc'

import { DsModule } from '../Core'
import { SourcedMessage, TargetedMessage } from '../Utilities/Targets'

/**
 * Exposes a class instance over RPC.
 *
 * Will accept messages from multiple sources, and will make sure to send the response to the correct target.
 */
export class RpcServer<SrcType = any> extends DsModule<
    SourcedMessage<RpcRequest, SrcType>,
    TargetedMessage<RpcResponse, SrcType>
> {
    public rpc = new JsonRpc()

    receive(message: SourcedMessage<RpcRequest, SrcType>) {
        this.rpc.receive(message.message, message.source).then(res => {
            this.send({ target: message.source, message: res })
        })
    }

    sendEvent(serviceName: string, target: SrcType, event: string, params: any[]) {
        return this.send({ target, message: { serviceName, event, params } })
    }
}
