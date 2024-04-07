import { EventEmitter } from 'events'

export interface IDsModule<I = any, O = any> {
    pipe(target: IDsModule<O> | ((message: O) => void)): () => void
    receive(message: I): Promise<void>
}

export class DsModule<I = any, O = any> implements IDsModule<I, O> {
    private _idCounter = 0

    private destinations: { id: number; target: IDsModule<O> | ((message: O) => void | Promise<void>) }[] = []

    constructor(sources?: IDsModule<any, I>[]) {
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
    public receive(message: I): Promise<void> {
        return Promise.resolve()
    }

    /**
     * Send a message to all modules that this module pipes to.
     */
    protected async send(message: O) {
        // Await all these promises in order to propagate errors.
        await Promise.all(
            this.destinations.map((dest) => {
                if (typeof dest.target === 'function') {
                    return dest.target(message)
                }
                return dest.target.receive(message)
            })
        )
    }
}

export class DsModule_Emitter<I = any, O = any> extends EventEmitter implements IDsModule<I, O> {
    private _idCounter = 0

    private destinations: { id: number; target: IDsModule<O> | ((message: O) => void | Promise<void>) }[] = []

    constructor(sources?: IDsModule<any, I>[]) {
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
    public receive(message: I): Promise<void> {
        return Promise.resolve()
    }

    /**
     * Send a message to all modules that this module pipes to.
     */
    protected async send(message: O) {
        // Await all these promises in order to propagate errors.
        await Promise.all(
            this.destinations.map((dest) => {
                if (typeof dest.target === 'function') {
                    return dest.target(message)
                }
                return dest.target.receive(message)
            })
        )
    }
}
