import { DsModule } from '../Core'
import { SourcedMessage, TargetedMessage } from '../Utilities/Targets'

export type RpcErrorResponse = {
    id: any
    error: { code: 'MethodNotFound' } | { code: 'Exception'; exception: any }
}

export type RpcSuccessfulResponse = {
    id: any
    result: any
}

export type RpcEventMessage = {
    event: string
    params: any[]
}

export type RpcResponse = RpcErrorResponse | RpcSuccessfulResponse | RpcEventMessage

export type RpcRequest = {
    id: any
    method: string
    params: any[]
    additionalParameter?: any
}

/**
 * Exposes functions over RPC.
 */
export class RpcServer<SrcType = any> extends DsModule<SourcedMessage<RpcRequest, SrcType>, TargetedMessage<RpcResponse, SrcType>> {
    exposedMethodsMap = new Map<string, Function>()

    /**
     * Expose the methods of a class instance.
     * @param instance The instance to expose.
     * @param prototypeSteps The number of steps up the prototype chain to iterate when exposing the methods.
     * If a prototype named "Object" is encountered the iteration will stop, and that prototype will not be included.
     * Set to 0 to only expose the instance's own methods.
     * Set to-1 to iterate the entire prototype chain.
     * Defaults to 0.
     */
    exposeClassInstance(instance: any, prototypeSteps: number = 0) {
        // Iterate upwards to find all the methods within the prototype chain.
        let props = Object.getOwnPropertyNames(instance.constructor.prototype)
        let parent = Object.getPrototypeOf(instance.constructor.prototype)
        let prototypeCounter = 0
        while ((prototypeSteps < 0 || prototypeSteps > prototypeCounter) && parent && parent.constructor.name !== 'Object') {
            let parentProps = Object.getOwnPropertyNames(parent)
            props = props.concat(parentProps)
            parent = Object.getPrototypeOf(parent)
        }
        // All methods was found.
        for (let f of props) {
            if (f !== 'constructor' && typeof instance[f] === 'function') {
                this.exposedMethodsMap.set(f, instance[f].bind(instance))
            }
        }
    }

    /**
     * Expose all the functions in an object.
     */
    exposeObject(obj: any) {
        let props = Object.getOwnPropertyNames(obj)
        for (let f of props) {
            if (f !== 'constructor' && typeof obj[f] === 'function') {
                this.exposedMethodsMap.set(f, obj[f])
            }
        }
    }

    expose(methodName: string, method: Function) {
        this.exposedMethodsMap.set(methodName, method)
    }

    async receive(message: SourcedMessage<RpcRequest, SrcType>) {
        let handler = this.exposedMethodsMap.get(message.message.method)
        if (!handler) {
            this.send({
                target: message.source,
                message: {
                    id: message.message.id,
                    error: {
                        code: 'MethodNotFound'
                    }
                }
            })
            return
        }

        let params = [...message.message.params]

        // Add the additional parameters. We check how many parameters the handler
        // takes and supply these parameters outside the function parameters.
        // The function would have to use arguments[] to access these parameters.
        if (message.message.additionalParameter !== undefined) {
            params[handler.length] = message.message.additionalParameter
        }
        if (message.source !== undefined) {
            params[handler.length + 1] = message.source
        }

        try {
            var result = await handler(...params)
        } catch (e) {
            this.send({
                target: message.source,
                message: {
                    id: message.message.id,
                    error: {
                        code: 'Exception',
                        exception: e
                    }
                }
            })
            return
        }

        this.send({ target: message.source, message: { id: message.message.id, result } })
    }

    /**
     * Emit an event to clients.
     */
    sendEvent(target: SrcType, event: string, params: any[]) {
        return this.send({ target, message: { event, params } })
    }
}
