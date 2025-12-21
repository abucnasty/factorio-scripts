/**
 * Logger interface for injectable logging.
 * Allows piping output to console, UI components, or any other destination.
 */
export interface Logger {
    log(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    debug(message: string): void;
}

/**
 * Default console logger that uses the standard console methods.
 */
export class ConsoleLogger implements Logger {
    log(message: string): void {
        console.log(message);
    }

    warn(message: string): void {
        console.warn(message);
    }

    error(message: string): void {
        console.error(message);
    }

    debug(message: string): void {
        console.debug(message);
    }
}

/**
 * A logger that collects all messages into an array for later retrieval.
 * Useful for capturing logs in a Web Worker and sending them to the UI.
 */
export class CollectingLogger implements Logger {
    private messages: LogMessage[] = [];

    log(message: string): void {
        this.messages.push({ level: 'log', message, timestamp: Date.now() });
    }

    warn(message: string): void {
        this.messages.push({ level: 'warn', message, timestamp: Date.now() });
    }

    error(message: string): void {
        this.messages.push({ level: 'error', message, timestamp: Date.now() });
    }

    debug(message: string): void {
        this.messages.push({ level: 'debug', message, timestamp: Date.now() });
    }

    getMessages(): LogMessage[] {
        return [...this.messages];
    }

    clear(): void {
        this.messages = [];
    }
}

/**
 * A logger that broadcasts messages via a callback.
 * Useful for streaming logs from a Web Worker to the main thread.
 */
export class StreamingLogger implements Logger {
    constructor(private onMessage: (message: LogMessage) => void) {}

    log(message: string): void {
        this.onMessage({ level: 'log', message, timestamp: Date.now() });
    }

    warn(message: string): void {
        this.onMessage({ level: 'warn', message, timestamp: Date.now() });
    }

    error(message: string): void {
        this.onMessage({ level: 'error', message, timestamp: Date.now() });
    }

    debug(message: string): void {
        this.onMessage({ level: 'debug', message, timestamp: Date.now() });
    }
}

/**
 * A logger that forwards messages to multiple loggers.
 */
export class CompositeLogger implements Logger {
    constructor(private loggers: Logger[]) {}

    log(message: string): void {
        this.loggers.forEach(logger => logger.log(message));
    }

    warn(message: string): void {
        this.loggers.forEach(logger => logger.warn(message));
    }

    error(message: string): void {
        this.loggers.forEach(logger => logger.error(message));
    }

    debug(message: string): void {
        this.loggers.forEach(logger => logger.debug(message));
    }
}

export interface LogMessage {
    level: 'log' | 'warn' | 'error' | 'debug';
    message: string;
    timestamp: number;
}

/**
 * Default logger instance using console.
 */
export const defaultLogger: Logger = new ConsoleLogger();
