import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'

export interface IGenericModule<I = unknown, IP = unknown, O = unknown, OP = unknown> {
    pipe(target: GenericModule<O, OP, unknown, unknown> | ((message: O) => void))
    receive(message: I, target: string): Promise<void>
    send(message: O, target: string): Promise<void>
    sendPayload(payload: OP): Promise<void>
    ready(): Promise<boolean>
    getName(): string
    targetExists(name: string): boolean
}

export class GenericModule<I = unknown, IP = unknown, O = unknown, OP = unknown> extends EventEmitter implements IGenericModule<I, IP, O, OP> {
    destinations: { id: string; target: IGenericModule<O, OP, unknown, unknown> | ((message: O) => void | Promise<void>) }[] = []
    readyFlag = false

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

    async ready() {
        while (!this.readyFlag)
            await new Promise(res => setTimeout(res, 10))
        return true
    }

    getName(): string {
        return this.name
    }

    targetExists(name: string) {
        let result = this.name === name
        if (!result) {
            this.destinations.map(dest => {
                if (typeof dest.target === 'function')
                    return
                if (!result && dest.target.targetExists(name))
                    result = true
            })
        }
        return result
    }
    pipe(target: IGenericModule<O, OP, unknown, unknown> | ((message: O) => void)) {
        const id = uuidv4()
        this.destinations.push({ id, target })
        return () => {
            this.destinations = this.destinations.filter((el) => el.id !== id)
        }
    }

    receive(message: I, target: string): Promise<void> {
        return Promise.resolve()
    }

    async send(message: O, target: string) {
        if (!target)
                target = (message as any).target
        await Promise.all(
            this.destinations.map(async (dest) => {
                if (typeof dest.target === 'function') {
                    return dest.target(message)
                }
                return await dest.target.receive(message, target)
            })
        )
    }
    async sendPayload(payload: OP) {
    }
}

export enum MessageType { RequestMessage = 'REQUEST', ResponseMessage = 'RESPONSE', ErrorMessage = 'ERROR', EventMessage = 'EVENT', UnknownMessage = 'UNKNOWN' }

export interface Payload {
}

export class Message<P = Payload> {
    id: string
    source: string
    target?: string
    type: MessageType
    payload: P
}

const makeMessage = <M extends Message<MP>, MP extends Payload>(payload: MP, source: string, target: string, messageType: MessageType): M => {
    const result = new Message()
    result.id = uuidv4()
    result.source = source
    result.target = target
    result.type = messageType ? messageType : MessageType.UnknownMessage
    result.payload = payload
    return result as M
}

export class MessageModule<I extends Message<IP>, IP extends Payload, O extends Message<OP>, OP extends Payload> extends GenericModule<I, IP, O, OP> {
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

    receive(message: I, target: string): Promise<void> {
        return Promise.resolve()
    }

    async send(message: O, target: string) {
        await Promise.all(
            this.destinations.map(async (dest) => {
                if (typeof dest.target === 'function') {
                    return dest.target(message)
                }
                return await dest.target.receive(message, target)
            })
        )
    }
    async sendPayload(payload: OP, messageType?: MessageType, target?: string) {
        const message = makeMessage<O, OP>(payload, this.name, target, messageType)
        await this.send(message, target)
    }
}
