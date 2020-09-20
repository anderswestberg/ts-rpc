import { IDsModule, DsModule } from '../Core'

/**
 * Filters message to only send along accepted messages.
 */
export class Filter<MsgType = any> extends DsModule<MsgType, MsgType> {
    constructor(sources: IDsModule<any, MsgType>[], public filter: (msg: MsgType) => boolean) {
        super(sources)
    }
    receive(message: MsgType) {
        if (this.filter(message)) {
            return this.send(message)
        }
    }
}
