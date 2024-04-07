import { RpcClientConnection } from "../RpcClientConnection"

export interface IManageRpc {
    exposeClassInstance(instance: object, name: string, prototypeSteps?: number): void
    exposeClass<T>(constructor: new (...args: unknown[]) => T, aliasName?: string): void
    exposeObject(obj: object, name: string): void
    // eslint-disable-next-line @typescript-eslint/ban-types
    expose(methodName: string, method: Function): void
    createRpcInstance(className: string, ...args: unknown[]): Promise<string | undefined>
    getRemoteClientConnection(name: string, url: string): Promise<RpcClientConnection>
    createProxyToRemote(name: string, url: string | string[], ...args: unknown[]): Promise<string>
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
