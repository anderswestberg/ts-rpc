import { Logger, SeqLogLevel } from 'seq-logging'
export { SeqLogLevel }

export class SeqLogger {
    protected logger: Logger
    constructor(public serverUrl: string = 'http://seq:5341', public apiKey?: string) {
        this.logger = new Logger({
            serverUrl,
            apiKey,
            onError: (e) => {
                console.error('Failed to log to Seq!', e)
            }
        })
    }
    log(level: SeqLogLevel, messageTemplate: string, properties?: { [key: string]: unknown }) {
        this.logger.emit({
            timestamp: new Date(),
            level,
            messageTemplate,
            properties
        })
    }
    close() {
        // When you're done
        this.logger.close()
    }
}