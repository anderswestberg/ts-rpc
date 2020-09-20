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

export function JsonStringifier<T = any>(sources?: IDsModule<any, any>[]) {
    return new Converter<T, string>(sources || [], message => {
        return JSON.stringify(message)
    })
}

export function JsonParser<T = any>(sources?: IDsModule<any, string>[]) {
    return new Converter<string, T>(sources || [], message => {
        return JSON.parse(message)
    })
}
