import { plainToClass } from 'class-transformer';
import { FastifyLoggerInstance } from 'fastify';
import { defer, Observable, Subscriber } from 'rxjs';
import WebSocket from 'ws';
import WikiEvent, {
  WikiCategorizeEvent,
  WikiEditEvent,
  WikiEventType,
  WikiExternalEvent,
  WikiLogEvent,
  WikiNewEvent,
} from '../../schemas/WikiEvent';

const mappers = {
  [WikiEventType.LOG]: (event: any): WikiLogEvent => {
    return plainToClass(WikiLogEvent, event);
  },
  [WikiEventType.CATEGORIZE]: (event: any): WikiCategorizeEvent => {
    return plainToClass(WikiCategorizeEvent, event);
  },
  [WikiEventType.NEW]: (event: any): WikiNewEvent => {
    return plainToClass(WikiNewEvent, event);
  },
  [WikiEventType.EDIT]: (event: any): WikiEditEvent => {
    return plainToClass(WikiEditEvent, event);
  },
  [WikiEventType.EXTERNAL]: (event: any): WikiExternalEvent => {
    return plainToClass(WikiExternalEvent, event);
  },
};

export default class EventSource {
  constructor(
    private readonly url: string,
    private readonly logger: FastifyLoggerInstance,
  ) {}

  public connect(): Observable<WikiEvent> {
    return defer(() => {
      return new Observable((subscriber: Subscriber<WikiEvent>) => {
        this.logger.info(
          `[${EventSource.name}]: Connecting to PollingService at ${this.url}`,
        );
        const pollingService = new WebSocket(`${this.url}recent-changes`);

        pollingService.on('open', this.onOpenHandler());
        pollingService.on('error', this.onErrorHandler(subscriber));
        pollingService.on('message', this.onMessageHandler(subscriber));

        return () => {
          pollingService.close();
          this.logger.info(
            `[${EventSource.name}]: Connection to PollingService closed`,
          );
        };
      });
    });
  }

  private onOpenHandler() {
    return () => {
      this.logger.info(
        `[${EventSource.name}]: PollingService connected at ${this.url}`,
      );
    };
  }

  private onErrorHandler(subscriber: Subscriber<WikiEvent>) {
    return (errorEvent: any): void => {
      this.logger.error(
        `[${EventSource.name}]: Connection error occurred: ${errorEvent.message}`,
      );
      subscriber.error(errorEvent);
    };
  }

  private onMessageHandler(subscriber: Subscriber<WikiEvent>) {
    return (event: WebSocket.Data) => {
      this.logger.info(
        `[${EventSource.name}]: Incoming event: ${JSON.stringify(event)}`,
      );
      try {
        if (typeof event !== 'string') {
          event = event.toString();
        }
        const wikiEvent: any = JSON.parse(event);
        const mapper = mappers[(wikiEvent as WikiEvent).type];
        if (mapper) {
          subscriber.next(mapper(wikiEvent));
        }
      } catch (error) {
        subscriber.error(error);
      }
    };
  }
}
