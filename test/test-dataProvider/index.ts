import { DataProvider } from './DataProvider.js'
import { RpcServerConnection, SocketIoServer } from '../../src/index.js'

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
  }
}

new Main()
