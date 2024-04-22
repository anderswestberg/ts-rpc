import { DataProvider } from './DataProvider.js'
import { RpcServerConnection, SocketIoServer } from '../../src/index.js'
import { FilterPayload, PaginationPayload, SortPayload } from './DataProviderTypes.js'
import { ObjectId } from 'mongodb'

export interface CollectionDefinition {
  name: string
}

const collectionDefinitions: CollectionDefinition[] = [
  {
    name: "project",
  },
  {
    name: "user",
  },
  {
    name: "device",
  },
  {
    name: "sensor",
  },
  {
    name: "action",
  },
  {
    name: "system",
  },
  {
    name: "network",
  },
  {
    name: "events",
  },
  {
    name: "revisions",
  }
]

export class Main {
  dataProvider: DataProvider
  constructor() {
    this.dataProvider = new DataProvider(collectionDefinitions)

    const transport = new SocketIoServer(undefined, 3000, false)
    const rpc = new RpcServerConnection('app.emellio', [transport])
    rpc.rpcServer.manageRpc.exposeClassInstance(this.dataProvider, 'dataProvider')
    rpc.rpcServer.manageRpc.exposeObject({
      hello: (arg: string) => {
        console.log(arg)
        return arg + ' World!'
      }
    }, 'MyRpc')
    this.init()
  }
  async init() {
    await this.dataProvider.waitReady()
    let firstId: ObjectId | undefined
    let n = 0
    for (const resource of collectionDefinitions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = { hej: n++ }as any
      if (firstId)
        data.ref_id = firstId
      const res = await this.dataProvider.dbs[resource.name].insertOne(data)
      if (!firstId)
        firstId = res.insertedId
    }
    const pagination: PaginationPayload = {
      page: 1,
      perPage: 10,
    }
    const sort: SortPayload = {
      field: 'name',
      order: 'ASC',
    }
    const filter: FilterPayload = {
      //name: 'abc'
    }
    const listData = await this.dataProvider.getList('project', { pagination, sort, filter })
    console.log(listData)
    const data = await this.dataProvider.getOne('project', { id: listData.data[0].id })
    console.log(data)
    const data2 = await this.dataProvider.getMany('project', { ids: listData.data.map(data => data.id) })
    console.log(data2)
    const data3 = await this.dataProvider.getManyReference('sensor', { target: 'ref_id', id: firstId.toHexString(), pagination, sort, filter })
    console.log(data3)
    for (; ;) {
      await new Promise(res => setTimeout(res, 1000))
    }
  }
}

new Main()
