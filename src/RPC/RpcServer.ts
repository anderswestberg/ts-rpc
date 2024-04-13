import { MessageModule, Message, MessageType, Payload, GenericModule } from '../Core'
import { v4 as uuidv4 } from 'uuid'
import { IManageRpc } from './Rpc'
import EventEmitter from 'events'
import { RpcClientConnection } from '../Utilities/RpcClientConnection'

export type RpcErrorCode = 'ClassNotFound' | 'MethodNotFound' | 'Exception'

export enum RpcResponseType { success = 'SUCCESS', error = 'ERROR', event = 'EVENT' }

export interface RpcResponse extends Payload {
    type: RpcResponseType
}

export interface RpcErrorPayload extends RpcResponse {
    code: RpcErrorCode,
    exception?: unknown
}
export interface RpcSuccessPayload extends RpcResponse {
    id: string
    result: unknown
}
export interface RpcEventPayload extends RpcResponse {
    event: string
    params: unknown[]
}

export enum RpcRequestType { CallInstanceMethod = 'POST', SomeOtherMessage = 'OTHER' }

export interface RpcRequest {
    type: RpcRequestType
}

export interface RpcCallInstanceMethodPayload extends RpcRequest {
    id: string
    source?: string
    target?: string
    path: string
    method: string
    params: unknown[]
}

export interface RpcCreateInstancePayload extends RpcRequest {
    id: string
    source?: string
    target?: string
    className: string
    params: unknown[]
}

class EventProxy {
    constructor(public rpcServer: RpcServer, public instance: object, public event: string, public target: string) {
    }
    on(...args: unknown[]) {
        this.rpcServer.sendEvent(this.target, this.event, args)
    }
}

const isRpcCallInstanceMethodPayload = (payload: RpcRequest): payload is RpcCallInstanceMethodPayload => {
    return (payload.type === RpcRequestType.CallInstanceMethod)
}

export class RpcServer extends MessageModule<Message<RpcRequest>, RpcRequest, Message<RpcResponse>, RpcResponse> {
    manageRpc = new ManageRpc()
    eventProxies: EventProxy[] = []

    constructor(name?: string, sources?: GenericModule<unknown, unknown, Message, RpcRequest>[]) {
        super(name, sources)
    }

    async receive(message: Message<RpcRequest>, target: string) {
        if (isRpcCallInstanceMethodPayload(message.payload)) {
            const map = this.manageRpc.getNameSpaceMethodMap(message.payload.path)
            const handler = map.get(message.payload.method)
            if (!handler) {
                const inst = this.manageRpc.exposedNameSpaceInstances[message.payload.path]
                if (message.payload.method === 'on' && inst instanceof EventEmitter) {
                    const eventProxy = new EventProxy(this, inst, message.payload.params[0] as string, message.payload.source)
                    this.eventProxies.push(eventProxy)
                        ; (inst as EventEmitter).on(message.payload.params[0] as string, eventProxy.on.bind(eventProxy))
                    this.sendPayload({ type: RpcResponseType.event, result: 'ok' } as RpcSuccessPayload, MessageType.ResponseMessage, message.source)
                } else
                    this.sendPayload({ type: RpcResponseType.error, code: 'MethodNotFound' } as RpcErrorPayload, MessageType.ErrorMessage, message.source)
                return
            }

            const params = [...message.payload.params]

            if (message.source !== undefined) {
                params.push(message.source)
            }
            let result
            try {
                result = await handler(...params)
                this.sendPayload({ type: RpcResponseType.success, id: message.payload.id, result } as RpcSuccessPayload, MessageType.ResponseMessage, message.source)
            } catch (e) {
                this.sendPayload({ type: RpcResponseType.error, code: 'Exception', exception: e } as RpcErrorPayload, MessageType.ErrorMessage, message.source)
            }
        }
    }

    async sendEvent(target: string, event: string, params: unknown[]) {
        return await this.sendPayload({ event, params } as RpcEventPayload, MessageType.EventMessage)
    }
}

const parseDeclaration = (declaration: string) => {
    let typeName = declaration
    let instanceName = ''
    if (declaration.indexOf(':') > 0) {
        typeName = (declaration.split(':')[1]).trim()
        instanceName = (declaration.split(':')[0]).trim()
    }
    return [instanceName, typeName]
}

export const createInstance = (className: string, ...args: unknown[]): object => {
    // Get a reference to the class constructor function using the global object
    const ClassConstructor = (global as unknown)[className]

    // Check if the constructor exists
    if (typeof ClassConstructor === 'function') {
        // Create an instance of the class with the provided arguments
        return new ClassConstructor(...args)
    } else {
        throw new Error(`Class '${className}' not found`)
    }
}

export class ManageRpc implements IManageRpc {
    exposedNameSpaceMethodMaps: { [nameSpace: string]: Map<string, (...args: unknown[]) => void> } = {}
    exposedNameSpaceInstances: { [nameSpace: string]: object } = {}
    exposedClasses: { [className: string]: new (...args: unknown[]) => unknown } = {}
    createdInstances = new Map<string, object>()
    rpcClientConnections: { [url: string]: RpcClientConnection } = {}
    constructor() {
        this.exposeClassInstance(this, ManageRpc.name.charAt(0).toLowerCase() + ManageRpc.name.slice(1))
    }
    getNameSpaceMethodMap(name: string) {
        let result = this.exposedNameSpaceMethodMaps[name]
        if (!result) {
            result = new Map<string, () => void>()
            this.exposedNameSpaceMethodMaps[name] = result
        }
        return result
    }

    exposeClassInstance(instance: object, name: string, prototypeSteps: number = 0) {
        this.exposedNameSpaceInstances[name] = instance
        // Iterate upwards to find all the methods within the prototype chain.
        let props = Object.getOwnPropertyNames(instance.constructor.prototype)
        let parent = Object.getPrototypeOf(instance.constructor.prototype)
        let prototypeCounter = 0
        while ((prototypeSteps < 0 || prototypeCounter <= prototypeSteps) && parent && parent.constructor.name !== 'Object') {
            const parentProps = Object.getOwnPropertyNames(parent)
            props = props.concat(parentProps)
            parent = Object.getPrototypeOf(parent)
            prototypeCounter++
        }
        // All methods was found.
        const map = this.getNameSpaceMethodMap(name)
        for (const f of props) {
            if (f !== 'constructor' && typeof instance[f] === 'function') {
                map.set(f, instance[f].bind(instance))
            }
        }
    }

    exposeClass<T>(constructor: new (...args: unknown[]) => T, aliasName?: string) {
        let name = constructor.name
        if (aliasName)
            name = aliasName
        this.exposedClasses[name] = constructor
    }

    exposeObject(obj: object, name: string) {
        this.exposedNameSpaceInstances[name] = obj
        const props = Object.getOwnPropertyNames(obj)
        for (const f of props) {
            if (f !== 'constructor' && typeof obj[f] === 'function') {
                const map = this.getNameSpaceMethodMap(name)
                map.set(f, obj[f])
            }
        }
    }

    expose(methodName: string, method: () => void) {
        const map = this.getNameSpaceMethodMap(methodName)
        map.set(methodName, method)
    }
    async createRpcInstance(className: string, instanceName: string, ...args: unknown[]) {
        let result: string
        const con = this.exposedClasses[className]
        if (con) {
            const id = instanceName ? instanceName : uuidv4()
            const instance = new con(...args)
            this.createdInstances[id] = instance
            this.exposeClassInstance(instance as object, id)
            result = id
        }
        return result
    }
}