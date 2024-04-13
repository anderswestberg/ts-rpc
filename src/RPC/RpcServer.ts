import { MessageModule, Message, MessageType, Payload, GenericModule } from '../Core.js'
import { v4 as uuidv4 } from 'uuid'
import { IManageRpc } from './Rpc.js'
import EventEmitter from 'events'
import { RpcClientConnection } from '../Utilities/RpcClientConnection.js'

export enum RpcMessageType { CallInstanceMethod = 'POST', success = 'SUCCESS', error = 'ERROR', event = 'EVENT' }

export interface RpcMessage extends Payload {
    type: RpcMessageType
}

export interface RpcCallInstanceMethodPayload extends RpcMessage {
    id: string
    path: string
    method: string
    params: unknown[]
}

export type RpcErrorCode = 'ClassNotFound' | 'MethodNotFound' | 'Exception'

export interface RpcErrorPayload extends RpcMessage {
    code: RpcErrorCode,
    exception?: unknown
}
export interface RpcSuccessPayload extends RpcMessage {
    id: string
    result: unknown
}
export interface RpcEventPayload extends RpcMessage {
    event: string
    params: unknown[]
}

class EventProxy {
    constructor(public rpcServer: RpcServer, public instance: object, public event: string, public target: string) {
    }
    on(...args: unknown[]) {
        this.rpcServer.sendEvent(this.target, this.event, args)
    }
}

const isRpcCallInstanceMethodPayload = (payload: RpcMessage): payload is RpcCallInstanceMethodPayload => {
    return (payload.type === RpcMessageType.CallInstanceMethod)
}

export class RpcServer extends MessageModule<Message<RpcMessage>, RpcMessage, Message<RpcMessage>, RpcMessage> {
    manageRpc = new ManageRpc()
    eventProxies = new Map<string, EventProxy>()

    constructor(name?: string, sources?: GenericModule<unknown, unknown, Message, RpcMessage>[]) {
        super(name, sources)
    }

    async receive(message: Message<RpcMessage>, source: string, target: string) {
        this.receivePayload(message.payload, source, target)
    }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async receivePayload(payload: RpcMessage, source: string, target: string) {
        if (isRpcCallInstanceMethodPayload(payload)) {
            const map = this.manageRpc.getNameSpaceMethodMap(payload.path)
            const handler = map.get(payload.method)
            if (!handler) {
                const instanceName = payload.path
                const event = payload.params[0] as string
                const inst = this.manageRpc.exposedNameSpaceInstances[instanceName]
                if (payload.method === 'on' && inst instanceof EventEmitter) {
                    const eventKey = JSON.stringify({ instanceName, event, source })
                    let eventProxy = this.eventProxies.get(eventKey)
                    if (!eventProxy) {
                        eventProxy = new EventProxy(this, inst, event, source)
                        this.eventProxies.set(eventKey, eventProxy)
                        ;(inst as EventEmitter).on(event, eventProxy.on.bind(eventProxy))
                        this.sendPayload({ type: RpcMessageType.success, result: 'ok', id: payload.id } as RpcSuccessPayload, MessageType.ResponseMessage, this.name, source)
                    } else
                        this.sendPayload({ type: RpcMessageType.success, result: 'ok - already exists', id: payload.id } as RpcSuccessPayload, MessageType.ResponseMessage, this.name, source)
                } else
                    this.sendPayload({ type: RpcMessageType.error, code: 'MethodNotFound' } as RpcErrorPayload, MessageType.ErrorMessage, this.name, source)
                return
            }

            const params = [...payload.params]
            let result
            try {
                result = await handler(...params)
                this.sendPayload({ type: RpcMessageType.success, id: payload.id, result } as RpcSuccessPayload, MessageType.ResponseMessage, this.name, source)
            } catch (e) {
                this.sendPayload({ type: RpcMessageType.error, code: 'Exception', exception: e } as RpcErrorPayload, MessageType.ErrorMessage, this.name, source)
            }
        }
    }

    async sendEvent(target: string, event: string, params: unknown[]) {
        return await this.sendPayload({ type: RpcMessageType.event, event, params } as RpcEventPayload, MessageType.EventMessage, this.name, target)
    }
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

    exposeClassInstance(instance: object, name: string) {
        this.exposedNameSpaceInstances[name] = instance
        // Iterate upwards to find all the methods within the prototype chain.
        let props = Object.getOwnPropertyNames(instance.constructor.prototype)
        let parent = Object.getPrototypeOf(instance.constructor.prototype)
        while (parent && parent.constructor.name !== 'Object' && parent.constructor.name !== 'EventEmitter') {
            const parentProps = Object.getOwnPropertyNames(parent)
            props = props.concat(parentProps)
            parent = Object.getPrototypeOf(parent)
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