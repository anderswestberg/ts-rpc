/* eslint-disable @typescript-eslint/no-explicit-any */
import { RpcClientConnection, SocketIoTransport } from '../../../src/index-web.js';

export class LocalDataProvider {
    async getList(
        resource: string,
        params: any
    ): Promise<any> {
        const result = await remoteDataProvider.getList(resource, params)
        return result
    }

    async getOne(
        resource: string,
        params: any
    ): Promise<any> {
        return
        const result = await remoteDataProvider.getOne(resource, params)
        return result
    }

    async getMany(
        resource: string,
        params: any
    ): Promise<any> {
        return
        const result = await remoteDataProvider.getMany(resource, params)
        return result
    }

    async getManyReference(
        resource: string,
        params: any
    ): Promise<any> {
        return
        const result = await remoteDataProvider.getManyReference(resource, params)
        return result
    }

    async update(
        resource: string,
        params: any
    ): Promise<any> {
        return
        const result = await remoteDataProvider.update(resource, params)
        return result
    }

    async updateMany(
        resource: string,
        params: any
    ): Promise<any> {
        return
        const result = await remoteDataProvider.updateMany(resource, params)
        return result
    }

    async create(
        resource: string,
        params: any
    ): Promise<any> {
        return
        const result = await remoteDataProvider.create(resource, params)
        return result
    }

    async delete(
        resource: string,
        params: any
    ): Promise<any> {
        return
        const result = await remoteDataProvider.delete(resource, params)
        return result
    }

    async deleteMany(
        resource: string,
        params: any
    ): Promise<any> {
        return
        const result = await remoteDataProvider.deleteMany(resource, params)
        return result
    }
    async subscribe(topic: string, subscriptionCallback: any): Promise<any> {
        return
        const result = await remoteDataProvider.subscribe(topic, subscriptionCallback)
        return result
    }

    async unsubscribe(topic: string, subscriptionCallback: any): Promise<any> {
        return
        const result = await remoteDataProvider.unsubscribe(topic, subscriptionCallback)
        return result
    }

    async publish(topic: string, event: any): Promise<any> {
        return
        const result = await remoteDataProvider.publish(topic, event)
        return result
    }
    async lock(resource: string, { id, identity, meta }: any): Promise<any> {
        return
        const result = await remoteDataProvider.lock(resource, { id, identity, meta })
        return result
    }
    async unlock(resource: string, { id, identity, meta }: any): Promise<any> {
        return
        const result = await remoteDataProvider.unlock(resource, { id, identity, meta })
        return result
    }
    async getLock(resource: string, { id, meta }: any): Promise<any> {
        return
        const result = await remoteDataProvider.getLock(resource, { id, meta })
        return result
    }
    async getLocks(resource: string, { meta }: any): Promise<any> {
        return
        const result = await remoteDataProvider.getLock(resource, { meta })
        return result
    }
}

let remoteDataProvider: LocalDataProvider
let transport: SocketIoTransport
let rpcConn: RpcClientConnection

export const getDataProvider = async () => {
    let result;
    if (!transport) {
        transport = new SocketIoTransport('http://localhost:3000')
        rpcConn = new RpcClientConnection('app.emellio', transport, 'rpcServer1')
        await rpcConn.ready()
        result = (await rpcConn.api('dataProvider'))
        remoteDataProvider = result.proxy as any
    }
    return result
}
