export type RpcErrorResponse = {
    id: number
    clientId: number
    error: { code: 'MethodNotFound' } | { code: 'Exception'; exception: any }
}

export type RpcSuccessfulResponse = {
    id: number
    clientId: number
    result: any
}

export type RpcEventMessage = {
    event: string
    params: any[]
    serviceName: string
}

export type RpcResponse = RpcErrorResponse | RpcSuccessfulResponse | RpcEventMessage

export type RpcRequest = {
    id: number
    clientId: number
    method: string
    params: any[]
    serviceName: string
    additionalParameter?: any
}

export class JsonRpc {
    private exposedMethodsMap = new Map<string, Function>()

    /**
     * Expose all the methods of a class instance.
     * @param instance The instance to expose - all the methods on this instance will be exposed.
     * @param serviceName A unique name for this service - the client must use the same name.
     * @param prototypeSteps The number of steps up the prototype chain to iterate when exposing the methods.
     * Set to 0 to only expose the instance's own methods.
     * Set to-1 to iterate the entire prototype chain. If a prototype named "Object" is encountered the iteration will stop, and that prototype will not be included.
     * Defaults to 0.
     */
    exposeClassInstance(instance: any, serviceName: string, prototypeSteps: number = 0) {
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
                this.exposedMethodsMap.set(serviceName + '.' + f, instance[f].bind(instance))
            }
        }
    }

    /**
     * Expose all the functions in an object.
     */
    exposeObject(obj: any, serviceName: string) {
        let props = Object.getOwnPropertyNames(obj)
        for (let f of props) {
            if (f !== 'constructor' && typeof obj[f] === 'function') {
                this.exposedMethodsMap.set(serviceName + '.' + f, obj[f])
            }
        }
    }

    expose(serviceName: string, methodName: string, method: Function) {
        this.exposedMethodsMap.set(serviceName + '.' + methodName, method)
    }

    async receive(req: RpcRequest, source?: any): Promise<RpcResponse> {
        let handler = this.exposedMethodsMap.get(req.serviceName + '.' + req.method)
        if (!handler) {
            return {
                id: req.id,
                clientId: req.clientId,
                error: {
                    code: 'MethodNotFound'
                }
            }
        }

        let params = [...req.params]

        // Add the additional parameters. We check how many parameters the handler
        // takes and supply these parameters outside the function parameters.
        // The function would have to use arguments[] to access these parameters.
        if (req.additionalParameter !== undefined) {
            params[handler.length] = req.additionalParameter
        }
        if (source !== undefined) {
            params[handler.length + 1] = source
        }

        try {
            var result = await handler(...params)
        } catch (e) {
            return {
                id: req.id,
                clientId: req.clientId,
                error: {
                    code: 'Exception',
                    exception: e
                }
            }
        }

        return { id: req.id, clientId: req.clientId, result }
    }
}
