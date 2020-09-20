import { IDsModule, DsModule_Emitter } from '../Core'

export type BrowserWebSocketTransportOptions = {
    address?: string
    wsOpenTimeout?: number
    openRetryTimes?: number
    openTimeout?: number
}

type MsgType = string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView

export declare interface BrowserWebSocketTransport extends DsModule_Emitter<any, MsgType> {
    on(event: 'retryTimesExceeded', handler: (totalRetries: number) => void): this
    emit(event: 'retryTimesExceeded', totalRetries: number): boolean
    removeListener(event: 'retryTimesExceeded', handler: (totalRetries: number) => void): this

    on(event: 'openTimeoutExceeded', handler: (timeElapsed: number) => void): this
    emit(event: 'openTimeoutExceeded', timeElapsed: number): boolean
    removeListener(event: 'openTimeoutExceeded', handler: (timeElapsed: number) => void): this

    on(event: 'openFailed', handler: (attemptNumber: number, event: CloseEvent | ErrorEvent) => void): this
    emit(event: 'openFailed', attemptNumber: number, ws_event: CloseEvent | ErrorEvent): boolean
    removeListener(event: 'openFailed', handler: (attemptNumber: number, ws_event: CloseEvent | ErrorEvent) => void): this

    on(event: 'ws_open', handler: () => void): this
    emit(event: 'ws_open'): boolean
    removeListener(event: 'ws_open', handler: () => void): this

    on(event: 'ws_closed', handler: (evt: CloseEvent) => void): this
    emit(event: 'ws_closed', evt: CloseEvent): boolean
    removeListener(event: 'ws_closed', handler: (evt: CloseEvent) => void): this

    on(event: 'ws_error', handler: (evt: ErrorEvent) => void): this
    emit(event: 'ws_error', evt: ErrorEvent): boolean
    removeListener(event: 'ws_error', handler: (evt: ErrorEvent) => void): this

    on(event: 'close', handler: () => void): this
    emit(event: 'close'): boolean
    removeListener(event: 'close', handler: () => void): this
}

export class BrowserWebSocketTransport extends DsModule_Emitter<MsgType, MsgType> {
    private opened = false
    private closed = false
    private wsPromise: Promise<{ ws?: WebSocket; error?: Error }> = null as any
    constructor(sources?: IDsModule<any, MsgType>[], private options: BrowserWebSocketTransportOptions = {}) {
        super(sources)
        this.connectWs()
    }
    /**
     * Open the socket.
     *
     * Note: If options.address was provided in the constructor, the socket will already have been opened.
     */
    public open(address: string) {
        if (this.opened) {
            throw new Error('BrowserWebSocketTransport was already opened')
        }
        if (this.closed) {
            throw new Error('BrowserWebSocketTransport was closed')
        }
        this.opened = true
        this.options.address = address
        this.onAddressProvided()
    }
    private previousCloseListener?: () => void
    private onAddressProvided = () => {}
    private connectWs() {
        if (this.previousCloseListener) {
            this.removeListener('close', this.previousCloseListener)
        }
        if (this.closed) {
            this.wsPromise = Promise.resolve({ error: new Error('BrowserWebSocketTransport was closed') })
            return
        }
        this.wsPromise = new Promise(async resolve => {
            // Address wasn't provided, so we must wait for the open() call to receive the addresss.
            if (this.options.address) {
                this.opened = true
            } else {
                await new Promise(resolve => {
                    this.onAddressProvided = resolve
                })
            }

            let ws: WebSocket

            let didTimeout = false
            if (this.options.openTimeout) {
                var timer = setTimeout(() => {
                    didTimeout = true
                    this.emit('openTimeoutExceeded', this.options.openTimeout)
                    resolve({
                        error: new Error(
                            `BrowserWebSocketTransport: Unable to open connection. Timed out after ${this.options.openTimeout}ms`
                        )
                    })
                }, this.options.openTimeout)
            }

            let retryTimes = 0
            while (true) {
                if (didTimeout) {
                    return
                }
                if (this.options.openRetryTimes && this.options.openRetryTimes <= retryTimes) {
                    let err = `BrowserWebSocketTransport: Unable to open connection after ${retryTimes} retries.`
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
                        resolve({ error: new Error('BrowserWebSocketTransport was closed') })
                        return
                    }
                }
            }

            if (didTimeout) {
                return
            }

            clearTimeout(timer)

            if (this.closed) {
                resolve({ error: new Error('BrowserWebSocketTransport was closed') })
                return
            }

            ws.onerror = ev => {
                this.emit('ws_error', ev as any)
            }
            ws.onclose = ev => {
                this.emit('ws_closed', ev as any)
                this.connectWs()
            }
            ws.onmessage = ev => {
                this.send(ev.data)
            }

            this.emit('ws_open')

            resolve({ ws })
        })
    }
    private createWebSocket() {
        return new Promise<WebSocket>((resolve, reject) => {
            let ws = new WebSocket(this.options.address || 'ws://127.0.0.1:80')
            let closeListener = () => {
                ws.close()
                resolve()
            }
            this.previousCloseListener = closeListener
            this.once('close', closeListener)
            ws.onopen = () => {
                clearTimeout(timer)
                resolve(ws)
            }
            ws.onerror = ev => {
                clearTimeout(timer)
                this.removeListener('close', closeListener)
                reject(ev)
            }
            ws.onclose = ev => {
                clearTimeout(timer)
                this.removeListener('close', closeListener)
                reject(ev)
            }

            if (this.options.wsOpenTimeout) {
                var timer = setTimeout(() => {
                    ws.close()
                }, this.options.wsOpenTimeout)
            }
        })
    }
    async receive(message: string | Buffer) {
        let ws = await this.wsPromise
        if (ws.error) {
            throw ws.error
        }
        ws.ws.send(message)
    }
    close() {
        if (this.closed) {
            return
        }
        this.closed = true
        this.emit('close')
    }
}
