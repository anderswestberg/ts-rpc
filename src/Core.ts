import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'

export const MAX_HEADER_LENGTH = 256
export const HEADER_DELIMITER = '$'

export interface IGenericModule<I = unknown, IP = unknown, O = unknown, OP = unknown> {
    pipe(target: IGenericModule)
    receive(message: I, source: string, target: string): Promise<void>
    receivePayload(payload: IP, source: string, target: string): Promise<void>
    send(message: O, source: string, target: string): Promise<void>
    sendPayload(payload: OP, messageType: MessageType, source: string, target: string): Promise<void>
    ready(): Promise<boolean>
    getName(): string
    targetExists(name: string, level?: number): IGenericModule
    isTransport(): boolean
}

export interface MessageHeader {
    source: string
    target: string
    time: number
    seq: number
}

export class GenericModule<I = unknown, IP = unknown, O = unknown, OP = unknown> extends EventEmitter implements IGenericModule<I, IP, O, OP> {
    destinations: { id: string; target: IGenericModule }[] = []
    static knownSources: { [source: string]: IGenericModule } = {}
    readyFlag = false
    seq = 0

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
    prependHeader(source: string, target: string, message: string | Buffer): string | Buffer {
        let result: string | Buffer
        const header = { source, target, time: Date.now(), seq: this.seq++ }
        if (typeof message === 'string') {
            result = JSON.stringify(header) + HEADER_DELIMITER + message
        } else {
            const headerBuffer = Buffer.from(JSON.stringify(header) + HEADER_DELIMITER)
            result = Buffer.alloc(headerBuffer.length + message.length)
            headerBuffer.copy(result, 0)
            message.copy(result, headerBuffer.length)
        }
        return result
    }
    extractHeader(message: string | Buffer): [MessageHeader | undefined, string | Buffer] {
        let result: [MessageHeader | undefined, string | Buffer]
        if (typeof message === 'string') {
            let header: MessageHeader
            let nullPos = message.indexOf(HEADER_DELIMITER)
            if (nullPos > 0) {
                const headerText = message.substring(0, nullPos)
                if (headerText && headerText[0] === '{') {
                    header = JSON.parse(headerText)
                    if (header.target) {
                        const payload = message.slice(nullPos + HEADER_DELIMITER.length)
                        result = [header, payload]
                    } else
                        nullPos = 0
                }
            } else
                nullPos = 0
        } else {
            const sMessage = message.toString('utf-8', 0, MAX_HEADER_LENGTH - 1)
            let header: MessageHeader
            let nullPos = sMessage.indexOf(HEADER_DELIMITER)
            if (nullPos > 0) {
                const headerText = sMessage.substring(0, nullPos)
                if (headerText && headerText[0] === '{') {
                    header = JSON.parse(headerText) as MessageHeader
                    if (header.target) {
                        const payload = Buffer.alloc(message.length - nullPos - HEADER_DELIMITER.length)
                        message.copy(payload, 0, nullPos + HEADER_DELIMITER.length)
                        result = [header, payload]
                    } else
                        nullPos = 0
                }
            } else
                nullPos = 0
        }
        if (result[0])
            this.setKnownSource(result[0].source)
        return result
    }


    getName(): string {
        return this.name
    }

    targetExists(name: string, level: number = 0) {
        if (level > 5)
            console.log('Ooops')
        let result: IGenericModule
        if (this.name === name) {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            result = this
        }
        if (GenericModule.knownSources[name])
            result = GenericModule.knownSources[name]
        if (!result) {
            this.destinations.map(dest => {
                if (!result && !dest.target.isTransport() && dest.target.targetExists(name, level + 1))
                    result = dest.target
            })
        }
        return result
    }
    pipe(target: IGenericModule<O, OP, unknown, unknown>) {
        const id = uuidv4()
        this.destinations.push({ id, target })
        return () => {
            this.destinations = this.destinations.filter((el) => el.id !== id)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async receive(message: I, source: string, target: string) {
        return
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async receivePayload(message: IP, source: string, target: string) {
        return
    }

    async send(message: O, source: string, target: string) {
        await Promise.all(
            this.destinations.map(async (dest) => {
                return await dest.target.receive(message, source, target)
            })
        )
    }
    setKnownSource(source: string) {
        GenericModule.knownSources[source] = this
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async sendPayload(payload: OP, messageType: MessageType, source: string, target: string) {
    }
    isTransport() {
        return false
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

    pipe(target: IGenericModule<O, OP, Message, unknown>) {
        const id = uuidv4()
        this.destinations.push({ id, target })
        return () => {
            this.destinations = this.destinations.filter((el) => el.id !== id)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    receive(message: I, source: string, target: string): Promise<void> {
        return Promise.resolve()
    }

    async send(message: O, source: string, target: string) {
        await Promise.all(
            this.destinations.map(async (dest) => {
                return await dest.target.receive(message, source, target)
            })
        )
    }
    async sendPayload(payload: OP, messageType: MessageType, source: string, target: string) {
        const message = makeMessage<O, OP>(payload, this.name, target, messageType)
        await this.send(message, source, target)
    }
}
