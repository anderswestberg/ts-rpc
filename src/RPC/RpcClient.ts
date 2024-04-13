import { MessageModule, Message, MessageType, GenericModule } from '../Core.js'
import { isEventFunction } from './Rpc.js'
import { RpcErrorPayload, RpcEventPayload, RpcErrorCode, RpcCallInstanceMethodPayload, RpcMessage, RpcSuccessPayload, RpcMessageType } from './RpcServer.js'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'

export class RpcError extends Error {
    constructor(error: RpcErrorCode) {
        super('RpcClient: ' + error.toString())
    }
}

export interface RpcClientEmitter extends MessageModule<Message<RpcMessage>, RpcMessage, Message<RpcMessage>, RpcMessage> {
    on(event: string, handler: (_event: string, params: unknown[]) => void): this
    emit(event: string, params: unknown[]): boolean
    removeListener(event: string, handler: (params: unknown[]) => void): this
}

function isSuccessResponse(payload: RpcMessage): payload is RpcSuccessPayload {
    return payload.type === RpcMessageType.success
}

function isEventMessage(payload: RpcMessage): payload is RpcEventPayload {
    return payload.type === RpcMessageType.event
}

function isErrorResponse(payload: RpcMessage): payload is RpcErrorPayload {
    return payload.type === RpcMessageType.error
}

export type PromiseResolver<T> = { resolve: (result: T) => void; reject: (reason?: unknown) => void }

export class RpcClient extends MessageModule<Message<RpcMessage>, RpcMessage, Message<RpcMessage>, RpcMessage> implements RpcClientEmitter {
    responsePromiseMap = new Map<string, PromiseResolver<unknown>>()
    eventEmitter = new EventEmitter()
    constructor(name?: string, sources?: GenericModule<unknown, unknown, Message, RpcMessage>[], public target?: string | string[]) {
        super(name, sources)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async receive(message: Message<RpcMessage>, target: string) {
        if (isEventMessage(message.payload)) {
            this.eventEmitter.emit(message.payload.event, ...message.payload.params)
            this.emit(message.payload.event, message.payload.params)
            return
        }
        let promise: PromiseResolver<unknown>
        if (isSuccessResponse(message.payload)) {
            promise = this.responsePromiseMap.get(message.payload.id)
            this.responsePromiseMap.delete(message.payload.id)
        }
        if (!promise) {
            return
        }
        if (isErrorResponse(message.payload)) {
            promise.reject(new RpcError(message.payload.code))
        } else if (isSuccessResponse(message.payload)) {
            promise.resolve(message.payload.result)
        } else
            promise.reject('Invalid response type: ' + message.payload.type)
    }

    /**
     * Call a method on the RPC server.
     * @param method The method to call.
     * @param additionalParameter The (optional) additionalParameter to include. See the JsonRpc class for more details.
     * @param params
     */
    public call(remote: string, instanceName: string, method: string, ...params: unknown[]): Promise<unknown> {
        const payload: RpcCallInstanceMethodPayload = {
            id: uuidv4(),
            type: RpcMessageType.CallInstanceMethod,
            path: instanceName,
            method,
            params,
        }
        return new Promise((resolve, reject) => {
            this.sendPayload(payload, MessageType.RequestMessage, this.name, remote).then(() => {
                this.responsePromiseMap.set(payload.id, { resolve, reject })
                setTimeout(() => {
                    reject('Call timeout')
                }, 10000)
            }).catch(() => {
                this.responsePromiseMap.delete(payload.id)
            })
        })
    }

    /**
     * Create an API object - a sort of wrapper for calling methods and listening for events.
     * @param name Name of an existing instance on the server instance. If in the form "name: Class" an instance of type Class will be created 
     * on the server if it does not already exist.
     */
    api(name: string, remote?: string) {
        const proxyObj = {}
        return new Proxy(proxyObj, {
            get: (target, prop) => {
                if (target[prop]) {
                    return target[prop]
                } else if (typeof (prop) === 'string' && isEventFunction(prop)) {
                    target[prop] = (...args: unknown[]) => {
                        (this.eventEmitter[prop] as (...args: unknown[]) => void)(...args)
                        return this.call(remote, name, prop, args[0])
                    }
                } else {
                    target[prop] = (...args: unknown[]) => this.call(remote, name, prop as string, ...args)
                }
                return target[prop]
            }
        })
    }
}
