import { MessageModule, Message, MessageTypes, Payload, GenericModule } from '../Core'
import { isEventFunction } from './Rpc'
import { RpcErrorPayload, RpcEventPayload, RpcErrorCode, RpcCallInstanceMethodPayload, RpcRequest, RpcResponse, RpcSuccessPayload, RpcResponseType, RpcRequestType } from './RpcServer'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'

export class RpcError extends Error {
    constructor(error: RpcErrorCode) {
        super('RpcClient: ' + error.toString())
    }
}

export interface RpcClientEmitter extends MessageModule<Message, RpcResponse, Message, RpcRequest> {
    on(event: string, handler: (_event: string, params: unknown[]) => void): this
    emit(event: string, params: unknown[]): boolean
    removeListener(event: string, handler: (params: unknown[]) => void): this
}

function isSuccessResponse(payload: RpcResponse): payload is RpcSuccessPayload {
    return payload.type === RpcResponseType.error
}

function isEventMessage(payload: RpcResponse): payload is RpcEventPayload {
    return Boolean(payload['event'] !== undefined)
}

function isErrorResponse(payload: RpcResponse): payload is RpcErrorPayload {
    return Boolean(payload['error'] !== undefined)
}

export class RpcClient extends MessageModule<Message, RpcResponse, Message, RpcRequest> implements RpcClientEmitter {
    responsePromiseMap = new Map<string, { resolve: (result: unknown) => void; reject: (reason?: unknown) => void }>()
    eventEmitter = new EventEmitter()
    constructor(name?: string, sources?: GenericModule<unknown, unknown, Message, RpcResponse>[], public target?: string | string[]) {
        super(name, sources)
    }

    async receive(message: Message<RpcResponse>) {
        if (isEventMessage(message.payload)) {
            this.eventEmitter.emit(message.payload.event, ...message.payload.params)
            this.emit(message.payload.event, message.payload.params)
            return
        }
        const promise = this.responsePromiseMap.get(message.id)
        if (!promise) {
            return
        }
        this.responsePromiseMap.delete(message.id)
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
    public call(instanceName: string, method: string, ...params: unknown[]): Promise<unknown> {
        const payload: RpcCallInstanceMethodPayload = {
            id: uuidv4(),
            type: RpcRequestType.CallInstanceMethod,
            instanceName,
            method,
            params,
        }
        return new Promise((resolve, reject) => {
            this.responsePromiseMap.set(payload.id, { resolve, reject })
            this.sendPayload(payload).then(value => {
                return resolve(value)
            }).catch(e => {
                this.responsePromiseMap.delete(payload.id)
                reject(e)
            })
        })
    }

    /**
     * Create an API object - a sort of wrapper for calling methods and listening for events.
     * @param name Name of an existing instance on the server instance. If in the form "name: Class" an instance of type Class will be created 
     * on the server if it does not already exist.
     */
    api(name: string) {
        return new Proxy({}, {
            get: (target, prop) => {
                if (target[prop]) {
                    return target[prop]
                } else if (typeof (prop) === 'string' && isEventFunction(prop)) {
                    target[prop] = (...args: unknown[]) => {
                        (this.eventEmitter[prop] as (...args: unknown[]) => void)(...args)
                        this.call(name, prop, ...args)
                    }
                } else {
                    target[prop] = (...args: unknown[]) => this.call(name, prop as string, ...args)
                }
                return target[prop]
            }
        })
    }
}
