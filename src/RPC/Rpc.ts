export interface IManageRpc {
    exposeClassInstance(instance: any, name: string, prototypeSteps?: number): void
    exposeClass<T>(constructor: new (...args: any[]) => T, aliasName?: string): void
    exposeObject(obj: any, name: string): void
    expose(methodName: string, method: Function): void
    createRpcInstance(className: string, ...args: any[]): string | undefined
}