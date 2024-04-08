import { GenericModule, IGenericModule, Message, MessageModule } from '../Core'

/**
 * Sends received messages to the correct target.
 * If a message is sent to a target which doesn't exist, a TargetNotFoundError is thrown.
 */
export class Switch extends GenericModule {
    targets = new Map<string, IGenericModule | ((message: Message) => void)>()
    constructor(
        sources: IGenericModule[],
        public getTarget?: (target: string) => IGenericModule | ((message: Message) => void)
    ) {
        super(undefined, sources)
    }
    async receive(message: Message) {
        let target = this.targets.get(message.target)
        if (!target && this.getTarget)
            target = this.getTarget(message.target)
        if (!target)
            return
        if (typeof target === 'function') {
            target(message)
            return 
        }
        return await target.receive(message)
    }
    /**
     * Add a target for the switch.
     * @param identifier A unique identifier for this target.
     * @param mod The module to send the messages to.
     * @returns A function which can be called to remove this target.
     */
    public setTarget(identifier: string, mod: IGenericModule | ((message: unknown) => void)) {
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
    public targetPiper(target: string): IGenericModule {
        return {
            pipe: (mod: IGenericModule | ((message: Message) => void)) => {
                return this.setTarget(target, mod)
            }
        } as any
    }
}
