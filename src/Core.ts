import { EventEmitter } from 'events'

export interface IDsModule<I = unknown, O = unknown> {
    pipe(target: IDsModule<O> | ((message: O) => void)): () => void
    receive(message: I): Promise<void>
}

export class DsModule<I = unknown, O = unknown> implements IDsModule<I, O> {
    private _idCounter = 0

    private destinations: { id: number; target: IDsModule<O> | ((message: O) => void | Promise<void>) }[] = []

    constructor(sources?: IDsModule<unknown, I>[]) {
        if (sources) {
            sources.forEach((src) => {
                src.pipe(this)
            })
        }
    }

    /**
     * Pipe all the message that this module sends to another module, or to a callback.
     */
    public pipe(target: IDsModule<O> | ((message: O) => void)) {
        const id = this._idCounter++
        this.destinations.push({ id, target })
        return () => {
            this.destinations = this.destinations.filter((el) => el.id !== id)
        }
    }

    /**
     * Receive and process a message.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public receive(message: I): Promise<void> {
        return Promise.resolve()
    }

    /**
     * Send a message to all modules that this module pipes to.
     */
    protected async send(message: O) {
        // Await all these promises in order to propagate errors.
        await Promise.all(
            this.destinations.map(async (dest) => {
                if (typeof dest.target === 'function') {
                    return dest.target(message)
                }
                return await dest.target.receive(message)
            })
        )
    }
}

export class DsModule_Emitter<I = unknown, O = unknown> extends EventEmitter implements IDsModule<I, O> {
    private _idCounter = 0

    private destinations: { id: number; target: IDsModule<O> | ((message: O) => void | Promise<void>) }[] = []

    constructor(sources?: IDsModule<unknown, I>[]) {
        super()
        if (sources) {
            sources.forEach((src) => {
                src.pipe(this)
            })
        }
    }

    /**
     * Pipe all the message that this module sends to another module, or to a callback.
     */
    public pipe(target: IDsModule<O> | ((message: O) => void)) {
        const id = this._idCounter++
        this.destinations.push({ id, target })
        return () => {
            this.destinations = this.destinations.filter((el) => el.id !== id)
        }
    }

    /**
     * Receive and process a message.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public receive(message: I): Promise<void> {
        return Promise.resolve()
    }

    /**
     * Send a message to all modules that this module pipes to.
     */
    protected async send(message: O) {
        // Await all these promises in order to propagate errors.
        await Promise.all(
            this.destinations.map(async (dest) => {
                if (typeof dest.target === 'function') {
                    return dest.target(message)
                }
                return await dest.target.receive(message)
            })
        )
    }
}
