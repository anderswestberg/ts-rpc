import { GenericModule, IGenericModule, MessageModule } from '../Core'

/**
 * Filters message to only send along accepted messages.
 */
export class Filter<MsgType = unknown> extends GenericModule {
    constructor(name: string, sources: IGenericModule[], public filter: (msg: MsgType) => boolean) {
        super(name, sources)
    }
    async receive(message: MsgType, target: string) {
        if (this.filter(message)) {
            return await this.send(message, target)
        }
    }
}
