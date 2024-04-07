import { IDsModule, DsModule } from '../Core'

/**
 * Sends received messages to the correct target.
 * If a message is sent to a target which doesn't exist, a TargetNotFoundError is thrown.
 */
export class SwitchSource<MsgType = any, SrcType = any, TrgtType = any> extends DsModule<any> {
    private targets = new Map<TrgtType, IDsModule<MsgType> | ((message: MsgType) => void)>()
    constructor(
        sources: IDsModule<any, any>[],
        private getTarget?: (target: TrgtType) => IDsModule<MsgType> | ((message: MsgType) => void)
    ) {
        super(sources)
    }
    async receive(message: any) {
        let target = this.targets.get(message.target)
        if (!target && this.getTarget) {
            target = this.getTarget(message.target)
        }
        if (!target) {
            throw new Error('Switch')
        }
        if (typeof target === 'function') {
            return target(message)
        }
        return target.receive(message)
    }
    /**
     * Add a target for the switch.
     * @param identifier A unique identifier for this target.
     * @param mod The module to send the messages to.
     * @returns A function which can be called to remove this target.
     */
    public setTarget(identifier: TrgtType, mod: IDsModule<MsgType> | ((message: MsgType) => void)) {
        this.targets.set(identifier, mod)
        let deleted = false
        return () => {
            if (deleted) {
                return
            }
            deleted = true
            this.targets.delete(identifier)
        }
    }
    public targetPiper(target: TrgtType): IDsModule<any, MsgType> {
        return {
            pipe: (mod: IDsModule<MsgType> | ((message: MsgType) => void)) => {
                return this.setTarget(target, mod)
            }
        } as any
    }
}

/**
 * Sends a targeted message to the correct target. 
 * If a message is sent to a target which doesn't exist, a TargetNotFoundError is thrown.
 */
export class SwitchTarget<MsgType = any, TrgtType = any> extends DsModule<any> {
    private targets = new Map<TrgtType, IDsModule<MsgType> | ((message: MsgType) => void)>()
    constructor(
        sources: IDsModule<any, any>[],
        private getTarget?: (target: TrgtType) => IDsModule<MsgType> | ((message: MsgType) => void)
    ) {
        super(sources)
    }
    async receive(message: any) {
        let target = this.targets.get(message.target)
        if (!target && this.getTarget) {
            target = this.getTarget(message.target)
        }
        if (!target) {
            throw new Error('Switch')
        }
        if (typeof target === 'function') {
            return target(message)
        }
        return target.receive(message)
    }
    /**
     * Add a target for the switch.
     * @param identifier A unique identifier for this target.
     * @param mod The module to send the messages to.
     * @returns A function which can be called to remove this target.
     */
    public setTarget(identifier: TrgtType, mod: IDsModule<MsgType> | ((message: MsgType) => void)) {
        this.targets.set(identifier, mod)
        let deleted = false
        return () => {
            if (deleted) {
                return
            }
            deleted = true
            this.targets.delete(identifier)
        }
    }
    public targetPiper(target: TrgtType): IDsModule<any, MsgType> {
        return {
            pipe: (mod: IDsModule<MsgType> | ((message: MsgType) => void)) => {
                return this.setTarget(target, mod)
            }
        } as any
    }
}
