import { DsModule_Emitter } from '../Core'
import { RpcResponse, RpcRequest } from './JsonRpc'
import { EventEmitter } from 'events'

export class RpcError {
    constructor(public code: 'MethodNotFound' | 'InvalidRequest' | 'Exception' | 'InvalidResponse', public message: string, public errorDetails?: any) {}
}

export declare interface RpcClient extends DsModule_Emitter<RpcResponse, RpcRequest> {
    on(event: 'event', handler: (serviceName: string, _event: string, params: any[]) => void): this
    emit(event: 'event', serviceName: string, _event: string, params: any[]): boolean
    removeListener(event: 'event', handler: (serviceName: string, _event: string, params: any[]) => void): this
}

export class RpcClient extends DsModule_Emitter<RpcResponse, RpcRequest> {
    private messageIdCounter = 1
    private responsePromiseMap = new Map<number, { resolve: Function; reject: Function }>()

    private eventEmitterMap = new Map<string, EventEmitter>()

    private static clientIdCounter = 0
    private clientId = RpcClient.clientIdCounter++

    receive(message: RpcResponse) {
        const _message = message as any
        if (_message.event) {
            let emitter = this.eventEmitterMap.get(_message.serviceName)
            if (emitter) {
                emitter.emit(_message.event, ..._message.params)
            }
            this.emit('event', _message.serviceName, _message.event, _message.params)
            return
        }
        if (_message.clientId !== this.clientId) {
            return
        }
        const promise = this.responsePromiseMap.get(_message.id)
        if (!promise) {
            return
        }
        this.responsePromiseMap.delete(_message.id)
        if (_message.error) {
            promise.reject(new RpcError(_message.error.code, _message.error.message, _message.error.errorDetails))
        } else {
            promise.resolve(_message.result)
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
