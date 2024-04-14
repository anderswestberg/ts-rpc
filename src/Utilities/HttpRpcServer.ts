import express from 'express'
import { RpcServer } from '../RPC/RpcServer.js'


export class HttpRpcServer {
    constructor(public rpcServer: RpcServer) {
        const app = express()
        const PORT = 8080

        app.get('/', (req, res) => {
            let result = ''
            this.rpcServer.eventProxies.forEach((value, key) => {
                result += 'EVENT: ' + JSON.stringify(key) + '<br>'
            })
            this.rpcServer.destinations.map(dest => {
                result += `DESTINATION: id: ${dest.id}, name: ${dest.target.getName()}<br>`
            })
            result += `exposedNameSpaceMethodMaps: ${JSON.stringify(this.rpcServer.manageRpc.exposedNameSpaceMethodMaps)}<br>`
            //result += `exposedNameSpaceInstances: ${JSON.stringify(this.rpcServer.manageRpc.exposedNameSpaceInstances)}<br>`
            result += `exposedClasses: ${JSON.stringify(this.rpcServer.manageRpc.exposedClasses)}<br>`
            //result += `createdInstances: ${JSON.stringify(this.rpcServer.manageRpc.createdInstances)}<br>`
            //const metadataValue = getMethods(HttpRpcServer, this)
            //result += metadataValue + '<br>'
            res.send(result)
        })

        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`)
        })
    }
    doSomeThing(a: string) {
        return a + a
    }
}