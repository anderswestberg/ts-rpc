import { IDsModule, DsModule } from '../Core'

/**
 * Filters message to only send along accepted messages.
 */
export class Filter<MsgType = unknown> extends DsModule<MsgType, MsgType> {
    constructor(sources: IDsModule<unknown, MsgType>[], public filter: (msg: MsgType) => boolean) {
        super(sources)
    }
    async receive(message: MsgType) {
        if (this.filter(message)) {
            return await this.send(message)
        }
    }
}
