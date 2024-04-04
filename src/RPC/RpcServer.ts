import { randomUUID } from 'crypto'
import { DsModule, IDsModule } from '../Core'
import { SourcedMessage, TargetedMessage } from '../Utilities/Targets'
import { v4 as uuidv4 } from 'uuid'
import { IManageRpc } from './Rpc'

export type RpcErrorCode = 'ClassNotFound' | 'MethodNotFound' | 'Exception'

export type RpcErrorItem = { code: RpcErrorCode, exception?: any }

export type RpcErrorResponse = {
    id: any
    error: RpcErrorItem
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

export enum RequestMessageType { CallInstanceMethod = 'a', SomeOtherMessage = 'b' }

export type RpcRequestCallInstanceMethod = {
    id: any
    type: RequestMessageType.CallInstanceMethod
    instanceName: string
    method: string
    params: any[]
    additionalParameter?: any
}

export type RpcRequestCreateInstance = {
    id: any
    type: RequestMessageType.SomeOtherMessage
    className: string
    params: any[]
}

export type RpcRequests = RpcRequestCallInstanceMethod | RpcRequestCreateInstance

export class RpcServer<SrcType = any> extends DsModule<SourcedMessage<RpcRequestCallInstanceMethod, SrcType>, TargetedMessage<RpcResponse, SrcType>> {
    manageRpc = new ManageRpc()

    constructor(sources?: IDsModule<any, any>[]) {
        super(sources)
    }

    async receive(message: SourcedMessage<RpcRequests, SrcType>) {
        switch (message.message.type) {
            case RequestMessageType.CallInstanceMethod:
                const map = this.manageRpc.getNameSpaceMethodMap(message.message.instanceName)
                let handler = map.get(message.message.method)
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
                break
            case RequestMessageType.SomeOtherMessage:
                break
        }
    }

    sendEvent(target: SrcType, event: string, params: any[]) {
        return this.send({ target, message: { event, params } })
    }
}

export const createInstance = (className: string, ...args: any[]): any => {
    // Get a reference to the class constructor function using the global object
    const ClassConstructor = (global as any)[className];
    
    // Check if the constructor exists
    if (typeof ClassConstructor === 'function') {
        // Create an instance of the class with the provided arguments
        return new ClassConstructor(...args);
    } else {
        throw new Error(`Class '${className}' not found`);
    }
}    

export class ManageRpc implements IManageRpc {
    exposedNameSpaceMethodMaps: { [nameSpace: string]: Map<string, Function> } = {}
    exposedClasses: { [className: string]: new (...args: any[]) => any } = {}
    createdInstances = new Map<string, object>()
    constructor() {
        this.exposeClassInstance(this, ManageRpc.name.charAt(0).toLowerCase() + ManageRpc.name.slice(1))      
    }
    getNameSpaceMethodMap(name: string) {
        let result = this.exposedNameSpaceMethodMaps[name]
        if (!result) {
            result = new Map<string, Function>()
            this.exposedNameSpaceMethodMaps[name] = result
        }
        return result
    }

    exposeClassInstance(instance: any, name: string, prototypeSteps: number = 0) {
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
        const map = this.getNameSpaceMethodMap(name)
        for (let f of props) {
            if (f !== 'constructor' && typeof instance[f] === 'function') {
                map.set(f, instance[f].bind(instance))
            }
        }
    }

    exposeClass<T>(constructor: new (...args: any[]) => T, aliasName?: string) {
        let name = constructor.name
        if (aliasName)
            name = aliasName
        this.exposedClasses[name] = constructor
    }

    exposeObject(obj: any, name: string) {
        let props = Object.getOwnPropertyNames(obj)
        for (let f of props) {
            if (f !== 'constructor' && typeof obj[f] === 'function') {
                const map = this.getNameSpaceMethodMap(name)
                map.set(f, obj[f])
            }
        }
    }

    expose(methodName: string, method: Function) {
        const map = this.getNameSpaceMethodMap(methodName)
        map.set(methodName, method)
    }
    createRpcInstance(className: string, ...args: any[]) {
        let result: string
        const con = this.exposedClasses[className]
        if (con) {
            const guid = uuidv4()
            const instance = new con(...args)
            this.createdInstances[guid] = instance
            this.exposeClassInstance(instance, guid)
            result = guid
        }
        return result
    }
}