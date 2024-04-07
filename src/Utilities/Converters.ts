import { DsModule, IDsModule } from '../Core'

/**
 * Converts a message using a callback function.
 */
export class Converter<I = unknown, O = unknown> extends DsModule<I, O> {
    constructor(sources: IDsModule<unknown, I>[], public converter: (message: I) => O) {
        super(sources)
    }
    async receive(message: I) {
        return this.send(this.converter(message))
    }
}

export class JsonStringifier<I = unknown> extends Converter<I, string> {
    constructor(sources?: IDsModule<unknown, I>[]) {
        super(sources || [], (msg) => {
                return JSON.stringify(msg)
            })
    }
}

export class JsonParser<O = unknown> extends Converter<string, O> {
    constructor(sources?: IDsModule<unknown, string>[]) {
        super(sources || [], (msg) => {
            return JSON.parse(msg)
        })
    }
}
