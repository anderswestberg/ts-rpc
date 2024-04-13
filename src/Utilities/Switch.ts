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
    async receive(message: Message, target: string) {
        let switchTarget = this.targets.get(target)
        if (!switchTarget && this.getTarget)
            switchTarget = this.getTarget(target)
        if (!switchTarget)
            return
        if (typeof switchTarget === 'function') {
            switchTarget(message)
            return 
        }
        return await switchTarget.receive(message, target)
    }
    /**
     * Add a target for the switch.
     * @param identifier A unique identifier for this target.
     * @param mod The module to send the messages to.
     * @returns A function which can be called to remove this target.
     */
    public setTarget(mod: IGenericModule | ((message: unknown) => void), identifier?: string) {
        const getNameFromMod = (mod: IGenericModule | ((message: unknown) => void)) => {
            let result = ''
            if (typeof mod !== 'function')
                result = mod.getName()
            return result
        }
        const targetName = (identifier === undefined) ? getNameFromMod(mod) : identifier
        this.targets.set(targetName, mod)
        let deleted = false
        return () => {
            if (deleted) {
                return
            }
            deleted = true
            this.targets.delete(targetName)
        }
    }
    public targetPiper(target: string): IGenericModule {
        return {
            pipe: (mod: IGenericModule | ((message: Message) => void)) => {
                return this.setTarget(mod, target)
            }
        } as any
    }
    targetExists(name: string) {
        let result = super.targetExists(name)
        if (!result) {
            this.targets.forEach(target => {
                if (typeof target === 'function')
                    return
                if (!result && target.targetExists(name))
                    result = true
            })
        }
        return result
    }
}
