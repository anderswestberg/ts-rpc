import { GenericModule, IGenericModule } from '../Core'

/**
 * Filters message to only send along accepted messages.
 */
export class Filter<MsgType = unknown> extends GenericModule {
    constructor(name: string, sources: IGenericModule[], public filter: (msg: MsgType) => boolean) {
        super(name, sources)
    }
    async receive(message: MsgType, source: string, target: string) {
        if (this.filter(message)) {
            return await this.send(message, source, target)
        }
    }
}
