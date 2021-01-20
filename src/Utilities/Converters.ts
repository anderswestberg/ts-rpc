import { DsModule, IDsModule } from '../Core'

/**
 * Converts a message using a callback function.
 */
export class Converter<I = any, O = any> extends DsModule<I, O> {
    constructor(sources: IDsModule<any, I>[], public converter: (message: I) => O) {
        super(sources)
    }
    receive(message: I) {
        return this.send(this.converter(message))
    }
}

export class JsonStringifier<I = any> extends Converter<I, string> {
    constructor(sources?: IDsModule<any, I>[]) {
        super(sources || [], (msg) => JSON.stringify(msg))
    }
}

export class JsonParser<O = any> extends Converter<string, O> {
    constructor(sources?: IDsModule<any, string>[]) {
        super(sources || [], (msg) => JSON.parse(msg))
    }
}
