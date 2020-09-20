import WebSocket = require('ws')
import { DsModule_Emitter } from '../Core'
import { TargetedMessage, SourcedMessage, TargetNotFoundError } from '../Utilities/Targets'
import { WebSocketServer, WebSocketServerOptions } from './WebSocketServer'
import { WebSocketTransportOptions, WebSocketTransport } from './WebSocket'

type InputType<TrgtType> = TargetedMessage<string | Buffer | ArrayBuffer | Buffer[], TrgtType>
type OutputType<TrgtType> = SourcedMessage<string | Buffer | ArrayBuffer | Buffer[], TrgtType>

export declare interface MultiWebSocketTransport<TrgtType = unknown>
    extends DsModule_Emitter<InputType<TrgtType>, OutputType<TrgtType>> {
    on(event: 'connection', handler: (target: TrgtType) => void): this
    emit(event: 'connection', target: TrgtType): boolean
    removeListener(event: 'connection', handler: (target: TrgtType) => void): this

    on(event: 'disconnect', handler: (target: TrgtType) => void): this
    emit(event: 'disconnect', target: TrgtType): boolean
    removeListener(event: 'disconnect', handler: (target: TrgtType) => void): this

    on(event: 'close', handler: () => void): this
    emit(event: 'close'): boolean
    removeListener(event: 'close', handler: () => void): this
}

/**
 * Combines multiple WebSocket clients and WebSocket server into a single transport. This transport will figure out
 * over which WebSocket connection to send a message.
 *
 * Uses authentication in both directions. When a client connects to a server it will send a connectRequest. If the server approves it
 * the server will send back a connectRequest to the client. If the client also approves it, the connection is established.
 */
export class MultiWebSocketTransport<TrgtType = unknown> extends DsModule_Emitter<InputType<TrgtType>, OutputType<TrgtType>> {
    private servers: { server: WebSocketServer; targets: Map<WebSocket, TrgtType>; _targets: Map<TrgtType, WebSocket> }[] = []

    private clientTargets = new Map<WebSocketTransport, TrgtType>()
    private _clientTargets = new Map<TrgtType, WebSocketTransport>()

    /**
     * Disconnect from a certain target.
     */
    disconnectFrom(target: TrgtType) {
        let clientTarget = this._clientTargets.get(target)
        if (clientTarget) {
            clientTarget.close()
            this._clientTargets.delete(target)
            this.clientTargets.delete(clientTarget)
            this.emit('disconnect', target)
            return
        }

        for (let server of this.servers) {
            let serverTarget = server._targets.get(target)
            if (serverTarget) {
                serverTarget.send('2')
                serverTarget.close()
                server._targets.delete(target)
                server.targets.delete(serverTarget)
                this.emit('disconnect', target)
                return
            }
        }

        throw TargetNotFoundError()
    }

    /**
     * Opens up a WebSocket server.
     *
     * When a new client is connected, the client will send a connectRequest message. The contents of this message will be passed into
     * the onConnectRequest callback. The callback must return both a target ID and a connectRequest item to send back to the client.
     * @param serverOptions Options to pass to the WebSocket server.
     * @param onConnectRequest Authenticates, and returns a connection request which we should send back to the client.
     */
    openServer(
        serverOptions: WebSocketServerOptions,
        onConnectRequest: (
            req: any
        ) => Promise<{ target: TrgtType; returnConnectRequest: any }> | { target: TrgtType; returnConnectRequest: any }
    ) {
        let server = new WebSocketServer([], serverOptions)
        let targets = new Map<WebSocket, TrgtType>()
        let _targets = new Map<TrgtType, WebSocket>()
        let awaitingConnects = new Map<WebSocket, TrgtType>()
        server.on('connection', ws => {
            ws.on('close', () => {
                let trgt = targets.get(ws)
                if (trgt) {
                    this.disconnectFrom(trgt)
                }
            })
        })
        server.pipe(message => {
            let msg = message.message.toString()
            let code = msg.substr(0, 1)
            var actualMessage = msg.substr(1)
            // 0 = identify, 1 = message, 2 = close, 3 = disallowed connect request, 4 = connection success
            if (code === '0') {
                if (targets.has(message.source)) {
                    // Already identified..
                    return
                }

                try {
                    var accessReq = JSON.parse(actualMessage)
                } catch {
                    // Invalid message
                    return
                }

                Promise.resolve(onConnectRequest(accessReq)).then(
                    res => {
                        // Check if we already have that target, in that case send not allowed
                        if (this.hasTarget(res.target)) {
                            server.receive({ target: message.source, message: '3' })
                            return
                        }
                        awaitingConnects.set(message.source, res.target)
                        // Send back our accessRequest
                        server.receive({ target: message.source, message: '0' + JSON.stringify(res.returnConnectRequest) })
                    },
                    () => {
                        // Not allowed
                        server.receive({ target: message.source, message: '3' })
                    }
                )
            } else if (code === '1') {
                let currentTarget = targets.get(message.source)
                if (!currentTarget) {
                    return
                }
                // Message received!
                this.send({ source: currentTarget, message: actualMessage })
            } else if (code === '4') {
                let trgt = awaitingConnects.get(message.source)
                if (!trgt) {
                    return
                }
                // Connection success both ways
                targets.set(message.source, trgt)
                _targets.set(trgt, message.source)
                this.emit('connection', trgt)
            }
        })
        this.servers.push({ server, _targets, targets })
        return server
    }

    /**
     * Check if a target has been connected.
     */
    hasTarget(target: TrgtType) {
        return (
            this._clientTargets.has(target) ||
            this.servers.some(server => {
                let t = server._targets.get(target)
                return t && server.server.getTargets().includes(t)
            })
        )
    }

    openClient(
        options: WebSocketTransportOptions,
        connectRequest: any,
        onConnectRequest: (req: any) => Promise<TrgtType> | TrgtType
    ) {
        let transport = new WebSocketTransport([], options)

        let didIdentify = false
        let target: TrgtType

        transport.on('close', () => {
            if (didIdentify) {
                let targetId = this.clientTargets.get(transport)
                if (!targetId) {
                    return
                }
                this.clientTargets.delete(transport)
                this._clientTargets.delete(targetId)
                this.emit('disconnect', target)
            }
        })

        let closeListener = () => {
            transport.close()
        }
        this.on('close', closeListener)

        return {
            promise: new Promise<TrgtType>((resolve, reject) => {
                transport.pipe(message => {
                    let msg = message.toString()
                    let code = msg.substr(0, 1)
                    let actualMessage = msg.substr(1)

                    // 0 = identify, 1 = message, 2 = close, 3 = disallowed connect request
                    if (code === '0') {
                        if (didIdentify) {
                            // Already identified
                            return
                        }

                        try {
                            var accessReq = JSON.parse(actualMessage)
                        } catch {
                            // Invalid message
                            return
                        }

                        Promise.resolve(onConnectRequest(accessReq)).then(
                            res => {
                                target = res
                                transport.receive('4')
                                this.clientTargets.set(transport, target)
                                this._clientTargets.set(target, transport)
                                didIdentify = true
                                this.removeListener('close', closeListener)
                                this.emit('connection', target)
                                resolve(target)
                            },
                            () => {
                                // Not allowed
                                transport.receive('3')
                            }
                        )
                    } else if (code === '1') {
                        if (!didIdentify) {
                            return
                        }
                        this.send({ source: target, message: actualMessage })
                    } else if (code === '2') {
                        if (!didIdentify) {
                            return
                        }
                        transport.close()
                        this._clientTargets.delete(target)
                        this.clientTargets.delete(transport)
                        this.emit('disconnect', target)
                    } else if (code === '3') {
                        if (didIdentify) {
                            return
                        }
                        reject(new Error('MultiWebSocketTransport: Could not connect client. Connect request denied.'))
                    }
                })
                transport.receive('0' + JSON.stringify(connectRequest))
            }),
            transport
        }
    }

    /**
     * Get a list of all connected targets.
     */
    getTargets() {
        let actualTargets = Array.from(this._clientTargets.keys())
        for (let server of this.servers) {
            let connectedWebSockets = server.server.getTargets()
            for (let [key, value] of server.targets) {
                if (connectedWebSockets.includes(key)) {
                    actualTargets.push(value)
                }
            }
        }
        return actualTargets
    }

    receive(message: InputType<TrgtType>) {
        if (this._clientTargets.has(message.target)) {
            let client = this._clientTargets.get(message.target)!
            client.receive('1' + message.message)
            return
        }
        for (let server of this.servers) {
            let t = server._targets.get(message.target)
            if (t) {
                server.server.receive({ target: t, message: '1' + message.message })
                return
            }
        }
        throw TargetNotFoundError()
    }

    /**
     * Close the server and all clients.
     */
    close() {
        this.getTargets().forEach(trgt => {
            this.disconnectFrom(trgt)
        })
        for (let server of this.servers) {
            server.server.close()
        }
        this.emit('close')
    }
}
