import { Message, GenericModule, IGenericModule } from '../Core'

/**
 * Converts a message using a callback function.
 */
export class Converter<I = unknown, O = unknown> extends GenericModule<I, unknown, O, unknown> {
    constructor(sources: IGenericModule<unknown, unknown, I, unknown>[], public converter: (message: I) => O) {
        super(undefined, sources)
    }
    async receive(message: I) {
        await this.send(this.converter(message))
    }
}

export class JsonStringifier<I extends object> extends Converter<I, string> {
    constructor(sources?: GenericModule<unknown, unknown, I, unknown>[]) {
        super(sources, (msg: I) => JSON.stringify(msg))
    }
}

export class JsonParser extends Converter<string, object> {
    constructor(sources?: IGenericModule<unknown, unknown, string, unknown>[]) {
        super(sources, (msg: string) => {
            return JSON.parse(msg)
        })
    }
}
