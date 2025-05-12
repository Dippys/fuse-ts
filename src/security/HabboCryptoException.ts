export class HabboCryptoException extends Error {
    constructor(message: string);
    constructor(message: string, cause: Error);
    constructor(cause: Error);
    constructor(messageOrCause: string | Error, cause?: Error) {
        if (typeof messageOrCause === 'string') {
            super(messageOrCause);
            if (cause) {
                this.cause = cause;
            }
        } else {
            super(messageOrCause.message);
            this.cause = messageOrCause;
        }
        this.name = 'HabboCryptoException';
    }

    cause?: Error;
}