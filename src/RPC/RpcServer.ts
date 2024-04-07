import { DsModule, IDsModule } from '../Core'
import { v4 as uuidv4 } from 'uuid'
import { IManageRpc } from './Rpc'
import EventEmitter from 'events'
import { RpcClientConnection } from '../RpcClientConnection'

export type RpcErrorCode = 'ClassNotFound' | 'MethodNotFound' | 'Exception'

export type RpcErrorItem = { code: RpcErrorCode, exception?: unknown }

export type RpcErrorResponse = {
    id: string
    error: RpcErrorItem
}

export type RpcSuccessfulResponse = {
    id: string
    result: unknown
}

export type RpcEventMessage = {
    event: string
    params: unknown[]
}

export type RpcResponse = RpcErrorResponse | RpcSuccessfulResponse | RpcEventMessage

export enum RequestMessageType { CallInstanceMethod = '1', SomeOtherMessage = '2' }

export type RpcRequestCallInstanceMethod = {
    type: RequestMessageType.CallInstanceMethod
    id: string
    source?: string
    target?: string
    instanceName: string
    method: string
    params: unknown[]
    additionalParameter?: unknown
}

export type RpcRequestCreateInstance = {
    type: RequestMessageType.SomeOtherMessage
    id: string
    source?: string
    target?: string
    className: string
    params: unknown[]
}

export type RpcRequests = RpcRequestCallInstanceMethod | RpcRequestCreateInstance

class EventProxy {
    constructor(public rpcServer: RpcServer, public instance: object, public event: string, public target: string) {
    }
    on(...args: unknown[]) {
        this.rpcServer.sendEvent(this.target, this.event, args)
    }
}

export class RpcServer<SrcType = unknown> extends DsModule<unknown, unknown> {
    manageRpc = new ManageRpc()
    eventProxies: EventProxy[] = []

    constructor(sources?: IDsModule<unknown, unknown>[]) {
        super(sources)
    }

    async receive(message: RpcRequests) {
        switch (message.type) {
            case RequestMessageType.CallInstanceMethod:
                {
                    const map = this.manageRpc.getNameSpaceMethodMap(message.instanceName)
                    const handler = map.get(message.method)
                    if (!handler) {
                        const inst = this.manageRpc.exposedNameSpaceInstances[message.instanceName]
                        if (message.method === 'on' && inst instanceof EventEmitter) {
                            const eventProxy = new EventProxy(this, inst, message.params[0] as string, message.source)
                            this.eventProxies.push(eventProxy)
                                ; (inst as EventEmitter).on(message.params[0] as string, eventProxy.on.bind(eventProxy))
                            this.send({ target: message.source, message: { id: message.id, result: 'oko' } })
                        } else {
                            this.send({
                                target: message.source,
                                message: {
                                    id: message.id,
                                    error: {
                                        code: 'MethodNotFound'
                                    }
                                }
                            })
                        }
                        return
                    }

                    const params = [...message.params]

                    // Add the additional parameters. We check how many parameters the handler
                    // takes and supply these parameters outside the function parameters.
                    // The function would have to use arguments[] to access these parameters.
                    if (message.additionalParameter !== undefined) {
                        params.push(message.additionalParameter)
                    }
                    if (message.source !== undefined) {
                        params.push(message.source)
                    }
                    let result
                    try {
                        result = await handler(...params)
                        this.send({ target: message.source, message: { id: message.id, result } })
                    } catch (e) {
                        this.send({ target: message.source, message: { id: message.id, error: { code: 'Exception', exception: e } } })
                    }
                }
                break
            case RequestMessageType.SomeOtherMessage:
                break
        }
    }

    sendEvent(target: SrcType, event: string, params: unknown[]) {
        return this.send({ target, message: { event, params } })
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
    exposedNameSpaceMethodMaps: { [nameSpace: string]: Map<string, () => void> } = {}
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
    async getRemoteClientConnection(name: string, url: string) {
        let result = this.rpcClientConnections[url]
        if (!result) {
            result = new RpcClientConnection(url)
            await result.ready(5000)
            this.rpcClientConnections[url] = result
        }
        return result
    }
    async createProxyToRemote(name: string, url: string | string[], ...args: unknown[]) {
        let result = ''
        const remoteUrl = Array.isArray(url) ? url[0] : url
        const nextUrls = Array.isArray(url) ? url.slice(1) : ''
        const remoteConnection = await this.getRemoteClientConnection(name, remoteUrl)
        if (!nextUrls) {
            const [instanceName, typeName] = parseDeclaration(name)
            result = await remoteConnection.manageRpc.createRpcInstance(typeName, instanceName, ...args)
        } else {
            result = await remoteConnection.manageRpc.createProxyToRemote(name, nextUrls, ...args)
        }
        return result
    }
}