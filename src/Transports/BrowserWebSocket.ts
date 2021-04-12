import { IDsModule, DsModule_Emitter } from '../Core'

export class BrowserWebSocketTransportError extends Error {
    public code: 'sendMessageTimeoutExceeded' | 'openTimeoutExceeded' | 'openRetryTimesExceeded' | 'closed'
    constructor(code: 'sendMessageTimeoutExceeded' | 'openTimeoutExceeded' | 'openRetryTimesExceeded' | 'closed') {
        if (code === 'sendMessageTimeoutExceeded') {
            super('WebSocketTransport: Unable to send message - sendMessageTimeout exceeded.')
        } else if (code === 'openTimeoutExceeded') {
            super('WebSocketTransport: Unable to open transport - maximum timeout exceeded.')
        } else if (code === 'openRetryTimesExceeded') {
            super('WebSocketTransport: Unable to open transport - maximum retry times exceeded.')
        } else {
            super('WebSocketTransport: The transport was closed.')
        }
        this.code = code
    }
}

export type BrowserWebSocketTransportOptions = {
    /**
     * The address to connect to, if the transport should be opened immediately. Should include protocol, IP and port - e.g. ws://localhost:3000.
     * If not provided, open the transport with open(address).
     */
    address?: string
    /**
     * Time in milliseconds to attempt to open a socket, before closing the individual socket and retrying with a new one.
     * If negative, no limit is enforced.
     *
     * Default: -1.
     */
    wsOpenTimeout?: number
    /**
     * Optional number of failed individual sockets in a row, before closing and emitting "openRetryTimesExceeded" event.
     * If negative, any number of retries are allowed. If zero, no retries are allowed.
     *
     * Default: -1.
     */
    openRetryTimes?: number
    /**
     * Time in milliseconds to attempt to open the transport, before closing and emitting "openTimeoutExceeded" event.
     * If negative, no limit is enforced.
     *
     * Default: -1
     */
    openTimeout?: number
    /**
     * Time in milliseconds to spend waiting for the socket to open when attempting to send a message,
     * before aborting and trowing a WebSocket error with code "SendMessageTimeoutExceeded".
     * If negative, a timer will not be used and the message will be attempted to be sent indefinetely.
     * If zero, a timer will not be used and the send will immediately fail if the socket is not open.
     *
     * Default: -1
     */
    sendMessageTimeout?: number
}

type MsgType = string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView

export declare interface BrowserWebSocketTransport extends DsModule_Emitter<any, MsgType> {
    on(event: 'openRetryTimesExceeded', handler: (totalRetries: number) => void): this
    emit(event: 'openRetryTimesExceeded', totalRetries: number): boolean
    removeListener(event: 'openRetryTimesExceeded', handler: (totalRetries: number) => void): this

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
    private openSocket: WebSocket
    private wsPromise: Promise<{ ws?: WebSocket; error?: BrowserWebSocketTransportError }> = null as any

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
            throw new Error('BrowserWebSocketTransport already opened')
        }
        if (this.closed) {
            throw new BrowserWebSocketTransportError('closed')
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
            this.wsPromise = Promise.resolve({ error: new BrowserWebSocketTransportError('closed') })
            return
        }
        this.wsPromise = new Promise(async (resolve) => {
            if (this.options.address) {
                this.opened = true
            } else {
                // Address wasn't provided, so we must wait for the open() call to receive the addresss.
                await new Promise<void>((_resolve) => {
                    this.onAddressProvided = _resolve
                })
            }

            let ws: WebSocket

            let didTimeout = false
            if (this.options.openTimeout) {
                var timer = setTimeout(() => {
                    didTimeout = true
                    this.emit('openTimeoutExceeded', this.options.openTimeout)
                    resolve({
                        error: new BrowserWebSocketTransportError('openTimeoutExceeded')
                    })
                }, this.options.openTimeout)
            }

            let retryTimes = 0
            while (true) {
                if (didTimeout) {
                    return
                }
                if (this.options.openRetryTimes && this.options.openRetryTimes <= retryTimes) {
                    this.emit('openRetryTimesExceeded', retryTimes)
                    resolve({ error: new BrowserWebSocketTransportError('openRetryTimesExceeded') })
                    return
                }
                try {
                    ws = await this.createWebSocket()
                    break
                } catch (event) {
                    this.emit('openFailed', ++retryTimes, event)
                    await new Promise((resolve) => setTimeout(resolve, 500))
                    if (this.closed) {
                        resolve({ error: new BrowserWebSocketTransportError('closed') })
                        return
                    }
                }
            }

            if (didTimeout) {
                return
            }

            clearTimeout(timer)

            if (this.closed) {
                resolve({ error: new BrowserWebSocketTransportError('closed') })
                return
            }

            ws.onerror = (ev) => {
                this.emit('ws_error', ev as any)
            }
            ws.onclose = (ev) => {
                delete this.openSocket
                this.emit('ws_closed', ev as any)
                this.connectWs()
            }
            ws.onmessage = (ev) => {
                this.send(ev.data)
            }

            this.emit('ws_open')

            this.openSocket = ws
            resolve({ ws })
        })
    }
    private createWebSocket() {
        return new Promise<WebSocket>((resolve, reject) => {
            let ws = new WebSocket(this.options.address || 'ws://127.0.0.1:80')
            let closeListener = () => {
                ws.close()
                resolve(null)
            }
            this.previousCloseListener = closeListener
            this.once('close', closeListener)
            ws.onopen = () => {
                clearTimeout(timer)
                resolve(ws)
            }
            ws.onerror = (ev) => {
                clearTimeout(timer)
                this.removeListener('close', closeListener)
                reject(ev)
            }
            ws.onclose = (ev) => {
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
    receive(message: MsgType) {
        return new Promise<void>(async (resolve, reject) => {
            if (typeof this.options.wsOpenTimeout === 'number') {
                if (this.options.wsOpenTimeout === 0) {
                    if (!this.openSocket || this.openSocket.readyState !== this.openSocket.OPEN) {
                        reject(new BrowserWebSocketTransportError('sendMessageTimeoutExceeded'))
                    }
                    this.openSocket.send(message)
                    resolve()
                    return
                }

                var didTimeout = false
                var timer = setTimeout(() => {
                    didTimeout = true
                    reject(new BrowserWebSocketTransportError('sendMessageTimeoutExceeded'))
                }, this.options.wsOpenTimeout)
            }

            while (true) {
                const ws = await this.wsPromise
                if (didTimeout) {
                    return
                }
                if (ws.error) {
                    clearTimeout(timer)
                    reject(ws.error)
                    return
                }
                if (ws.ws.readyState === ws.ws.OPEN) {
                    clearTimeout(timer)
                    ws.ws.send(message)
                    resolve()
                    return
                }
            }
        })
    }
    close() {
        if (this.closed) {
            return
        }
        this.closed = true
        this.emit('close')
    }
}
