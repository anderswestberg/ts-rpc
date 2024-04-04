import { DsModule_Emitter } from '../Core'
import { isEventFunction } from './Rpc'
import { RpcResponse, RpcRequestCallInstanceMethod, RpcEventMessage, RpcErrorResponse, RpcRequests, RequestMessageType, RpcErrorItem } from './RpcServer'
import { EventEmitter } from 'events'

export class RpcError extends Error {
    error: RpcErrorItem
    constructor(error: RpcErrorItem) {
        if (error.code === 'MethodNotFound') {
            super('RpcClient: The called method was not found on the server.')
        } else {
            super('RpcClient: The server responded with an exception -  ' + error.exception)
        }
        this.error = error
    }
}

export declare interface RpcClient extends DsModule_Emitter<RpcResponse, RpcRequests> {
    on(event: string, handler: (_event: string, params: any[]) => void): this
    emit(event: string, params: any[]): boolean
    removeListener(event: string, handler: (params: any[]) => void): this
}

function isEventMessage(message: RpcResponse): message is RpcEventMessage {
    return Boolean((message as any).event)
}

function isErrorResponse(message: RpcResponse): message is RpcErrorResponse {
    return Boolean((message as any).error)
}

export class RpcClient extends DsModule_Emitter<RpcResponse, RpcRequests> {
    private messageIdCounter = 1
    private responsePromiseMap = new Map<number, { resolve: Function; reject: Function }>()

    private eventEmitter = new EventEmitter()

    receive(message: RpcResponse) {
        if (isEventMessage(message)) {
            this.eventEmitter.emit(message.event, ...message.params)
            this.emit(message.event, message.params)
            return
        }
        const promise = this.responsePromiseMap.get(message.id)
        if (!promise) {
            return
        }
        this.responsePromiseMap.delete(message.id)
        if (isErrorResponse(message)) {
            promise.reject(new RpcError(message.error))
        } else {
            promise.resolve(message.result)
        }
    }

    /**
     * Call a method on the RPC server.
     * @param method The method to call.
     * @param additionalParameter The (optional) additionalParameter to include. See the JsonRpc class for more details.
     * @param params
     */
    public call(instanceName: string, method: string, additionalParameter: any, ...params: string[]): Promise<any> {
        const id = this.messageIdCounter++
        const message: RpcRequests = {
            id,
            type: RequestMessageType.CallInstanceMethod,
            instanceName,
            method: method as any,
            params,
            additionalParameter
        }
        return new Promise(async (resolve, reject) => {
            this.responsePromiseMap.set(id, { resolve, reject })
            try {
                await this.send(message)
            } catch (e) {
                this.responsePromiseMap.delete(id)
                reject(e)
            }
        }) as any
    }

    /**
     * Create an API object - a sort of wrapper for calling methods and listening for events.
     * @param additionalParameter If provided, this value will be provided as the "additionalParameter" for all RPC requests made by this API object.
     * See the JsonRpc class for more details about this parameter.
     * @param captureEventFunctions Default: true. If true, all eventEmitter-related functions will not call the method on the RPC server, but instead
     * react appropriately when the RPC server emits an event. For example, if the "on" function is called, the client will call the provided
     * callback when the server sends an event. The eventEmitter-related functions are "on", "addListener", "once", "prependOnceListener", "off",
     * "removeListener", "emit", "removeListener", "removeAllListeners", "setMaxListeners", "getMaxListeners".
     */
    public api(name: string, url?: string, additionalParameter?: any, captureEventFunctions: boolean = true) {
        return new Proxy({} as any, {
            get: (target, prop) => {
                if (target[prop]) {
                    return target[prop]
                } else if (captureEventFunctions && typeof(prop) === 'string'  && isEventFunction(prop)) {
                    target[prop] = (...args: any[]) => {
                        (this.eventEmitter[prop] as any)(...args)
                        this.call(name, prop, additionalParameter, ...args)
                    }
                } else {
                    target[prop] = (...args: any[]) => this.call(name, prop as any, additionalParameter, ...args)
                }
                return target[prop]
            }
        }) as any
    }
}
