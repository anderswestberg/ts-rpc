import { IDsModule, DsModule_Emitter } from '../Core'

export interface ITryCatch<MsgType = unknown> extends DsModule_Emitter<MsgType, MsgType> {
    on(event: 'caught', handler: (message: MsgType, error: unknown) => void): this
    emit(event: 'caught', message: MsgType, error: unknown): boolean
    removeListener(event: 'caught', handler: (message: MsgType, error: unknown) => void): this
}

export class TryCatch<MsgType = unknown> extends DsModule_Emitter<MsgType, MsgType> implements ITryCatch<unknown> {
    constructor(sources: IDsModule<unknown, MsgType>[]) {
        super(sources)
    }
    async receive(message: MsgType) {
        const p = this.send(message).then()
        p.catch(e => this.emit('caught', message, e))
    }
}
