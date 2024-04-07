import { IDsModule, DsModule_Emitter } from '../Core'

export declare interface TryCatch<MsgType = any> extends DsModule_Emitter<MsgType, MsgType> {
    on(event: 'caught', handler: (message: MsgType, error: any) => void): this
    emit(event: 'caught', message: MsgType, error: any): boolean
    removeListener(event: 'caught', handler: (message: MsgType, error: any) => void): this
}

export class TryCatch<MsgType = any> extends DsModule_Emitter<MsgType, MsgType> {
    constructor(sources: IDsModule<any, MsgType>[]) {
        super(sources)
    }
    async receive(message: MsgType) {
        let p = this.send(message).then()
        p.catch(e => this.emit('caught', message, e))
    }
}
