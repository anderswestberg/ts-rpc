import { DsModule_Emitter } from '../Core'
import { RpcResponse, RpcRequest, RpcEventMessage, RpcErrorResponse } from './JsonRpc'
import { EventEmitter } from 'events'

export class RpcError {
    constructor(public error: { code: 'MethodNotFound' } | { code: 'Exception'; details?: string }) {}
}

export declare interface RpcClient extends DsModule_Emitter<RpcResponse, RpcRequest> {
    on(event: 'event', handler: (serviceName: string, _event: string, params: any[]) => void): this
    emit(event: 'event', serviceName: string, _event: string, params: any[]): boolean
    removeListener(event: 'event', handler: (serviceName: string, _event: string, params: any[]) => void): this
}

function isEventMessage(message: RpcResponse): message is RpcEventMessage {
    return Boolean((message as any).event)
}
function isErrorResponse(message: RpcResponse): message is RpcErrorResponse {
    return Boolean((message as any).error)
}

export class RpcClient extends DsModule_Emitter<RpcResponse, RpcRequest> {
    private messageIdCounter = 1
    private responsePromiseMap = new Map<number, { resolve: Function; reject: Function }>()

    private eventEmitterMap = new Map<string, EventEmitter>()

    private static clientIdCounter = 0
    private clientId = RpcClient.clientIdCounter++

    receive(message: RpcResponse) {
        if (isEventMessage(message)) {
            let emitter = this.eventEmitterMap.get(message.serviceName)
            if (emitter) {
                emitter.emit(message.event, ...message.params)
            }
            this.emit('event', message.serviceName, message.event, message.params)
            return
        }
        if (message.clientId !== this.clientId) {
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

    public call(serviceName: string, method: string, additionalParameter: any, ...params: string[]): Promise<any> {
        const id = this.messageIdCounter++
        const message: RpcRequest = {
            id,
            clientId: this.clientId,
            method: method as any,
            params,
            serviceName,
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

    public api(serviceName: string, additionalParameter?: any, captureEventFunctions: boolean = true) {
        return new Proxy({} as any, {
            get: (target, prop) => {
                if (target[prop]) {
                    return target[prop]
                } else if (
                    captureEventFunctions &&
                    (prop === 'on' ||
                        prop === 'addListener' ||
                        prop === 'prependListener' ||
                        prop === 'once' ||
                        prop === 'prependOnceListener' ||
                        prop === 'off' ||
                        prop === 'removeListener' ||
                        prop === 'emit' ||
                        prop === 'removeListener' ||
                        prop === 'removeAllListeners' ||
                        prop === 'setMaxListeners' ||
                        prop === 'getMaxListeners')
                ) {
                    if (!this.eventEmitterMap.has(serviceName)) {
                        this.eventEmitterMap.set(serviceName, new EventEmitter())
                    }
                    target[prop] = (...args: any[]) => (this.eventEmitterMap.get(serviceName)![prop] as any)(...args)
                } else {
                    target[prop] = (...args: any[]) => this.call(serviceName, prop as any, additionalParameter, ...args)
                }
                return target[prop]
            }
        }) as any
    }
}
