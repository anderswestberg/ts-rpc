import * as WebSocket from 'ws'
import type { IncomingMessage } from 'http'

import { DsModule_Emitter, IDsModule } from '../Core'
import { TargetNotFoundError, TargetedMessage, SourcedMessage } from '../Utilities/Targets'

export type WebSocketServerOptions = {
    wsOptions?: WebSocket.ServerOptions
    wsSendOptions?: { mask?: boolean; binary?: boolean; compress?: boolean; fin?: boolean }
    openTimeout?: number
    openAttempts?: number
}

type InputType = TargetedMessage<string | Buffer | ArrayBuffer | Buffer[], WebSocket>
type OutputType = SourcedMessage<string | Buffer | ArrayBuffer | Buffer[], WebSocket>

export declare interface WebSocketServer extends DsModule_Emitter<InputType, OutputType> {
    on(event: 'retryTimesExceeded', handler: (totalRetries: number) => void): this
    emit(event: 'retryTimesExceeded', totalRetries: number): boolean
    removeListener(event: 'retryTimesExceeded', handler: (totalRetries: number) => void): this

    on(event: 'openTimeoutExceeded', handler: (timeElapsed: number) => void): this
    emit(event: 'openTimeoutExceeded', timeElapsed: number): boolean
    removeListener(event: 'openTimeoutExceeded', handler: (timeElapsed: number) => void): this

    on(event: 'openFailed', handler: (attemptNumber: number, event: Error) => void): this
    emit(event: 'openFailed', attemptNumber: number, ws_event: Error): boolean
    removeListener(event: 'openFailed', handler: (attemptNumber: number, ws_event: Error) => void): this

    on(event: 'connection', handler: (socket: WebSocket, request: IncomingMessage) => void): this
    emit(event: 'connection', socket: WebSocket, request: IncomingMessage): boolean
    removeListener(event: 'connection', handler: (socket: WebSocket, request: IncomingMessage) => void): this

    on(event: 'ws_open', handler: () => void): this
    emit(event: 'ws_open'): boolean
    removeListener(event: 'ws_open', handler: () => void): this

    on(event: 'ws_error', handler: (evt: Error) => void): this
    emit(event: 'ws_error', evt: Error): boolean
    removeListener(event: 'ws_error', handler: (evt: Error) => void): this

    on(event: 'close', handler: () => void): this
    emit(event: 'close'): boolean
    removeListener(event: 'close', handler: () => void): this
}

export class WebSocketServer extends DsModule_Emitter<InputType, OutputType> {
    private closed = false
    private ws?: WebSocket.Server
    private wsPromise: Promise<{ ws?: WebSocket.Server; error?: Error }> = null as any
    constructor(sources?: IDsModule<any, InputType>[], private options: WebSocketServerOptions = {}) {
        super(sources)
        this.connectWs()
    }
    private previousCloseListener?: () => void
    private connectWs() {
        delete this.ws
        if (this.previousCloseListener) {
            this.removeListener('close', this.previousCloseListener)
        }
        if (this.closed) {
            this.wsPromise = Promise.resolve({ error: new Error('WebSocketServer was closed') })
            return
        }
        this.wsPromise = new Promise(async resolve => {
            let ws: WebSocket.Server

            let didTimeout = false
            if (this.options.openTimeout) {
                var timer = setTimeout(() => {
                    didTimeout = true
                    this.emit('openTimeoutExceeded', this.options.openTimeout!)
                    resolve({
                        error: new Error(
                            `WebSocketServer: Unable to open connection. Timed out after ${this.options.openTimeout}ms`
                        )
                    })
                }, this.options.openTimeout)
            }

            let retryTimes = 0
            while (true) {
                if (didTimeout) {
                    return
                }
                if (this.options.openAttempts && this.options.openAttempts <= retryTimes) {
                    let err = `WebSocketServer: Unable to open connection after ${retryTimes} retries.`
                    this.emit('retryTimesExceeded', retryTimes)
                    resolve({ error: new Error(err) })
                    return
                }
                try {
                    ws = await this.createWebSocket()
                    break
                } catch (event) {
                    this.emit('openFailed', ++retryTimes, event)
                    await new Promise(resolve => setTimeout(resolve, 500))
                    if (this.closed) {
                        resolve({ error: new Error('WebSocketServer was closed') })
                        return
                    }
                }
            }

            if (didTimeout) {
                return
            }

            clearTimeout(timer!)

            if (this.closed) {
                resolve({ error: new Error('WebSocketServer was closed') })
                return
            }

            ws.on('connection', (socket, req) => {
                this.emit('connection', socket, req)
                socket.on('message', data => {
                    this.send({ source: socket, message: data })
                })
                // ws automatically closes after 60 seconds of inactivity, therefore we must ping
                let isAlive = true
                socket.on('pong', () => {
                    isAlive = true
                })
                let i = setInterval(() => {
                    if (socket.readyState !== socket.OPEN) {
                        clearInterval(i)
                        return
                    }
                    if (!isAlive) {
                        socket.close()
                        return
                    }
                    isAlive = false
                    socket.ping()
                }, 30000)
            })

            ws.on('error', err => {
                this.emit('ws_error', err)
            })

            this.ws = ws

            this.emit('ws_open')

            resolve({ ws })
        })
        this.wsPromise.catch(() => {})
    }
    private createWebSocket() {
        return new Promise<WebSocket.Server>((resolve, reject) => {
            let ws = new WebSocket.Server(this.options.wsOptions)
            let closeListener = () => {
                ws.close()
                resolve()
            }
            this.previousCloseListener = closeListener
            this.once('close', closeListener)
            ws.on('listening', () => {
                ws.removeAllListeners()
                resolve(ws)
            })
            ws.on('error', err => {
                ws.removeAllListeners()
                this.removeListener('close', closeListener)
                reject(err)
            })
        })
    }
    async receive(message: TargetedMessage<string | Buffer | ArrayBuffer | Buffer[], WebSocket>) {
        let ws = await this.wsPromise
        if (ws.error) {
            throw ws.error
        }
        if (!ws.ws!.clients.has(message.target)) {
            throw TargetNotFoundError()
        }
        message.target.send(message.message, this.options.wsSendOptions || {})
    }
    getTargets() {
        if (!this.ws) {
            return []
        }
        return Array.from(this.ws.clients.values())
    }
    close() {
        if (this.closed) {
            return
        }
        this.closed = true
        this.emit('close')
    }
}
