import { GenericModule, IGenericModule } from '../Core'

export interface ITryCatch<MsgType = unknown> {
    on(event: 'caught', handler: (message: MsgType, error: unknown) => void): this
    emit(event: 'caught', message: MsgType, error: unknown): boolean
    removeListener(event: 'caught', handler: (message: MsgType, error: unknown) => void): this
}

export class TryCatch extends GenericModule implements ITryCatch<unknown> {
    constructor(sources: IGenericModule[]) {
        super(undefined, sources)
    }
    async receive(message: unknown) {
        const p = this.send(message).then().catch(e => this.emit('Caught exception', message, e))
    }
}
