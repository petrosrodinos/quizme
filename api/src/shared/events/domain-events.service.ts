import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { EventEmitter } from 'events';

type Listener<T = any> = (payload: T) => Promise<void> | void;

/** In-process domain event bus. Listeners run asynchronously and never break the emitter. */
@Injectable()
export class DomainEventsService {
    private readonly logger = new Logger(DomainEventsService.name);
    private readonly emitter = new EventEmitter();

    constructor() {
        this.emitter.setMaxListeners(100);
    }

    on<T = any>(event: string, listener: Listener<T>) {
        this.emitter.on(event, (payload: T) => {
            setImmediate(async () => {
                try {
                    await listener(payload);
                } catch (error) {
                    this.logger.error(`Listener for ${event} failed: ${error?.message}`, error?.stack);
                }
            });
        });
    }

    emit<T = any>(event: string, payload: T) {
        this.emitter.emit(event, payload);
    }
}

@Global()
@Module({ providers: [DomainEventsService], exports: [DomainEventsService] })
export class DomainEventsModule { }
