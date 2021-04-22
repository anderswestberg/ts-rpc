import * as WebSocket from 'ws'
import { DsModule_Emitter } from '../Core'
import { TargetedMessage, SourcedMessage, TargetNotFoundError } from '../Utilities/Targets'
import { WebSocketServer, WebSocketServerOptions } from './WebSocketServer'
import { WebSocketTransportOptions, WebSocketTransport } from './WebSocket'

type InputType = TargetedMessage<string | Buffer | ArrayBuffer | Buffer[], string>
type OutputType = SourcedMessage<string | Buffer | ArrayBuffer | Buffer[], string>

export declare interface MultiWebSocketTransport extends DsModule_Emitter<InputType, OutputType> {
    on(event: 'connection', handler: (target: string, socket: WebSocket | WebSocketTransport) => void): this
    emit(event: 'connection', target: string, socket: WebSocket | WebSocketTransport): boolean
    removeListener(event: 'connection', handler: (target: string, socket: WebSocket | WebSocketTransport) => void): this

    on(event: 'disconnect', handler: (target: string) => void): this
    emit(event: 'disconnect', target: string): boolean
    removeListener(event: 'disconnect', handler: (target: string) => void): this

    on(event: 'close', handler: () => void): this
    emit(event: 'close'): boolean
    removeListener(event: 'close', handler: () => void): this
}

/**
 * Combines multiple WebSocket clients and WebSocket server into a single transport. The transport will figure out over which socket to send a message.
 *
 * When a WebSocket client is opened, the first message sent to the server is an identification. This lets the server know the ID of the client,
 * so that it can properly route the correct messages to the correct clients.
 */
export class MultiWebSocketTransport extends DsModule_Emitter<InputType, OutputType> {
    private servers: { server: WebSocketServer; targets: Map<string, WebSocket> }[] = []

    private clientTargets = new Map<string, WebSocketTransport>()

    /**
     * Disconnect from a certain target.
     */
    disconnectFrom(target: string) {
        const clientTarget = this.clientTargets.get(target)
        if (clientTarget) {
            clientTarget.close()
            this.clientTargets.delete(target)
            this.emit('disconnect', target)
            return
        }

        for (let server of this.servers) {
            const serverTarget = server.targets.get(target)
            if (serverTarget) {
                server.targets.delete(target)
                this.emit('disconnect', target)
                serverTarget.close()
                return
            }
        }

        throw new TargetNotFoundError('MultiWebSocketTransport')
    }

    /**
     * Opens up a WebSocket server.
     *
     * When a new client is connected, the client will send their target identifier, which allows us to send messages to the correct client.
     * @param serverOptions Options to pass to the WebSocket server.
     */
    openServer(serverOptions: WebSocketServerOptions) {
        const server = new WebSocketServer([], serverOptions)
        const targets = new Map<string, WebSocket>()

        const isFirstMessage = new Set<WebSocket>()

        server.on('connection', (ws) => {
            isFirstMessage.add(ws)
            let target: string = null
            ws.on('close', () => {
                ws.removeListener('message', messageListener)
                if (target === null) {
                    return
                }
                if (targets.delete(target)) {
                    this.emit('disconnect', target)
                }
            })
            const messageListener = (msg: WebSocket.Data) => {
                if (target === null) {
                    // This is the first message. This should be an identification.
                    target = msg.toString()
                    if (this.hasTarget(target)) {
                        this.disconnectFrom(target)
                    }
                    targets.set(target, ws)
                    this.emit('connection', target, ws)
                } else {
                    this.send({ source: target, message: msg })
                }
            }
            ws.on('message', messageListener)
        })
        server.on('close', () => {
            Array.from(targets.keys()).forEach((target) => {
                targets.delete(target)
                this.emit('disconnect', target)
            })
            this.servers = this.servers.filter((el) => el.server !== server)
        })
        this.servers.push({ server, targets })

        return server
    }

    /**
     * Open a WebSocketTransport connecting to a server, and connect to the target.
     * @param thisIsme Will send this to the server, which will use it as a target identifier for this replica.
     * @param thisIsThem Target identifier for the server.
     * @param options Options for the transport.
     */
    openClient(thisIsMe: string, thisIsThem: string, options: WebSocketTransportOptions) {
        let transport = new WebSocketTransport([], options)

        transport.on('close', () => {
            this.clientTargets.delete(thisIsThem)
            this.emit('disconnect', thisIsThem)
        })

        transport.on('ws_open', () => {
            transport.receive(thisIsMe)
        })

        transport.pipe((message) => {
            this.send({ source: thisIsThem, message })
        })

        this.clientTargets.set(thisIsThem, transport)
        this.emit('connection', thisIsThem, transport)

        return transport
    }

    /**
     * Get a list of all targets, either clients that we opened, or targets that connected to one of our servers.
     */
    getTargets() {
        const actualTargets = Array.from(this.clientTargets.keys())
        for (let server of this.servers) {
            actualTargets.push(...server.targets.keys())
        }
        return actualTargets
    }

    /**
     * Check if we either have opened a client for a target, or the target connected to one of our servers.
     */
    hasTarget(target: string) {
        return (
            this.clientTargets.has(target) ||
            this.servers.some((server) => {
                let t = server.targets.get(target)
                return t && server.server.getTargets().includes(t)
            })
        )
    }

    receive(message: InputType) {
        const clientTarget = this.clientTargets.get(message.target)
        if (clientTarget) {
            clientTarget.receive(message.message)
            return
        }
        for (let server of this.servers) {
            let t = server.targets.get(message.target)
            if (t) {
                server.server.receive({ target: t, message: '1' + message.message })
                return
            }
        }
        throw new TargetNotFoundError('MultiWebSocketTransport')
    }

    /**
     * Close all servers and clients.
     */
    close() {
        this.getTargets().forEach((trgt) => {
            this.disconnectFrom(trgt)
        })
        for (let server of this.servers) {
            server.server.close()
        }
        this.emit('close')
    }
}
