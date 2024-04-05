import { RpcClientConnection } from "../RpcClientConnection"

export interface IManageRpc {
    exposeClassInstance(instance: any, name: string, prototypeSteps?: number): void
    exposeClass<T>(constructor: new (...args: any[]) => T, aliasName?: string): void
    exposeObject(obj: any, name: string): void
    expose(methodName: string, method: Function): void
    createRpcInstance(className: string, ...args: any[]): Promise<string | undefined>
    getRemoteClientConnection(name: string, url: string): Promise<RpcClientConnection>
    createProxyToRemote(name: string, url: string | string[], ...args: any[]): Promise<string>
}

export const isEventFunction = (prop: string) => 
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
