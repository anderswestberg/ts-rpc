import { IDsModule, DsModule } from '../Core'

export type SourcedMessage<MSG = any, SRC = any> = { source: SRC; message: MSG }
export type TargetedMessage<MSG = any, TRGT = any> = { target: TRGT; message: MSG }

export function TargetNotFoundError() {
    return new Error('ETARGET. Target not found.')
}

/**
 * Adds a pre-defined source to a message.
 */
export class Sourcer<MsgType = any, SrcType = any> extends DsModule<MsgType, SourcedMessage<MsgType, SrcType>> {
    constructor(sources: IDsModule<any, MsgType>[], public source: SrcType) {
        super(sources)
    }
    receive(message: MsgType) {
        return this.send({ source: this.source, message })
    }
}

/**
 * Adds a pre-defined target to a message.
 */
export class Targeter<MsgType = any, TrgtType = any> extends DsModule<MsgType, TargetedMessage<MsgType, TrgtType>> {
    constructor(sources: IDsModule<any, MsgType>[], public target: TrgtType) {
        super(sources)
    }
    receive(message: MsgType) {
        return this.send({ target: this.target, message })
    }
}

/**
 * Removes the source/target from a message.
 */
export class DeTargeter<MsgType = any> extends DsModule<TargetedMessage<MsgType> | SourcedMessage<MsgType>, MsgType> {
    receive(message: TargetedMessage<MsgType> | SourcedMessage<MsgType>) {
        return this.send(message.message)
    }
}
