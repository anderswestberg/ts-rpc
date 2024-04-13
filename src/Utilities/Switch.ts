import { GenericModule, IGenericModule, Message } from '../Core'

/**
 * Sends received messages to the correct target.
 * If a message is sent to a target which doesn't exist, a TargetNotFoundError is thrown.
 */
export class Switch extends GenericModule {
    targets = new Map<string, IGenericModule>()
    constructor(
        sources: IGenericModule[],
        public getTarget?: (target: string) => IGenericModule) {
        super(undefined, sources)
    }
    async receive(message: Message, source: string, target: string) {
        let switchTarget = this.targets.get(target)
        if (!switchTarget && this.getTarget)
            switchTarget = this.getTarget(target)
        if (!switchTarget)
            switchTarget = this.targetExists(target)
        if (switchTarget)
            await switchTarget.receive(message, source, target)
        return
    }
    /**
     * Add a target for the switch.
     * @param target The module to send the messages to.
     * @param identifier A unique identifier for this target.
     * @returns A function which can be called to remove this target.
     */
    public setTarget(target: IGenericModule, identifier?: string) {
        const getNameFromMod = (mod: IGenericModule) => {
            const result = mod.getName()
            return result
        }
        const targetName = (identifier === undefined) ? getNameFromMod(target) : identifier
        this.targets.set(targetName, target)
        let deleted = false
        return () => {
            if (deleted) {
                return
            }
            deleted = true
            this.targets.delete(targetName)
        }
    }
    public setTargets(targets: (IGenericModule)[]) {
        for (const target of targets)
            this.setTarget(target)
    }
    public targetPiper(target: string): IGenericModule {
        return {
            pipe: (mod: IGenericModule) => {
                return this.setTarget(mod, target)
            }
        } as any
    }
    targetExists(name: string, level: number = 0) {
        if (level > 10)
            console.log('Ooops')
        let result: IGenericModule = super.targetExists(name, level + 1)
        if (!result) {
            this.targets.forEach(target => {
                if (!result && target.targetExists(name, level + 1))
                    result = target
            })
        }
        return result
    }
}
