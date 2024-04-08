import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'

export interface IGenericModule<I = unknown, IP = unknown, O = unknown, OP = unknown> {
    pipe(target: GenericModule<O, OP, unknown, unknown> | ((message: O) => void))
    receive(message: I): Promise<void>
    send(message: O): Promise<void>
    sendPayload(payload: OP): Promise<void>
}

export class GenericModule<I = unknown, IP = unknown, O = unknown, OP = unknown> extends EventEmitter implements IGenericModule<I, IP, O, OP> {
    destinations: { id: string; target: IGenericModule<O, OP, unknown, unknown> | ((message: O) => void | Promise<void>) }[] = []

    constructor(public name?: string, sources?: IGenericModule<unknown, unknown, I, IP>[]) {
        super()
        if (!name)
            this.name = uuidv4()
        if (sources) {
            sources.forEach((src) => {
                src.pipe(this)
            })
        }
    }

    pipe(target: IGenericModule<O, OP, unknown, unknown> | ((message: O) => void)) {
        const id = uuidv4()
        this.destinations.push({ id, target })
        return () => {
            this.destinations = this.destinations.filter((el) => el.id !== id)
        }
    }

    receive(message: I): Promise<void> {
        return Promise.resolve()
    }

    async send(message: O) {
        await Promise.all(
            this.destinations.map(async (dest) => {
                if (typeof dest.target === 'function') {
                    return dest.target(message)
                }
                return await dest.target.receive(message)
            })
        )
    }
    async sendPayload(payload: OP) {
    }
}

export enum MessageTypes { BasicMessage = 'A' }

export interface Payload {    
}

export interface Message<P = Payload> {
    id: string
    source: string
    target?: string
    type: MessageTypes
    payload: P
}

export class MessageModule<I extends Message, IP extends Payload, O extends Message, OP extends Payload> extends GenericModule<I, IP, O, OP> {
    constructor(public name?: string, sources?: IGenericModule<Message, unknown, I, IP>[]) {
        super()
        if (!name)
            this.name = uuidv4()
        if (sources) {
            sources.forEach((src) => {
                src.pipe(this)
            })
        }
    }

    pipe(target: IGenericModule<O, OP, Message, unknown> | ((message: O) => void)) {
        const id = uuidv4()
        this.destinations.push({ id, target })
        return () => {
            this.destinations = this.destinations.filter((el) => el.id !== id)
        }
    }

    receive(message: I): Promise<void> {
        return Promise.resolve()
    }

    async send(message: O) {
        await Promise.all(
            this.destinations.map(async (dest) => {
                if (typeof dest.target === 'function') {
                    return dest.target(message)
                }
                return await dest.target.receive(message)
            })
        )
    }
    async sendPayload(payload: OP) {
        const message = {
            id: uuidv4(),
            source: this.name,
            type: MessageTypes.BasicMessage,
            payload
        }
        await this.send(message as unknown as O) //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! type error
    }
}
