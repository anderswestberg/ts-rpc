import { Message, GenericModule, IGenericModule } from '../Core'

/**
 * Converts a message using a callback function.
 */
export class Converter<I = unknown, O = unknown> extends GenericModule<I, unknown, O, unknown> {
    constructor(sources: IGenericModule<unknown, unknown, I, unknown>[], public converter: (message: I) => O) {
        super(undefined, sources)
    }
    async receive(message: I, source: string, target: string) {
        await this.send(this.converter(message), source, target)
    }
}

export class JsonStringifier<I extends object> extends Converter<I, string> {
    constructor(sources?: GenericModule<unknown, unknown, I, unknown>[]) {
        super(sources, (msg: I) => JSON.stringify(msg))
    }
}

export class JsonStringifierToBuffer<I extends object> extends Converter<I, Buffer> {
    constructor(sources?: GenericModule<unknown, unknown, I, unknown>[]) {
        super(sources, (msg: I) => Buffer.from(JSON.stringify(msg)))
    }
}

export class JsonParser extends Converter<string, object> {
    constructor(sources?: IGenericModule<unknown, unknown, string | Buffer, unknown>[]) {
        super(sources, (msg: string | Buffer) => {
            let result
            if (typeof msg === 'string')
                result = JSON.parse(msg)
            else
                result = JSON.parse(msg.toString('utf-8'))
            return result
        })
    }
}
