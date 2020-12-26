import { FastifyLoggerInstance } from 'fastify';
import fp from 'fastify-plugin';
import { EMPTY, Observable } from 'rxjs';
import { delay, filter, retryWhen, share, switchMap } from 'rxjs/operators';
import { URL } from 'url';
import User from '../../schemas/user';
import WikiEvent from '../../schemas/WikiEvent';
import EventSource from './event-source';

const RETRY_DELAY = 1000;

export class PollingService {
  private readonly eventStream: Observable<WikiEvent>;

  constructor(url: string, logger: FastifyLoggerInstance) {
    const href = new URL('ws://' + url + '/').href;
    this.eventStream = new EventSource(href, logger).connect().pipe(
      retryWhen((errors) => {
        return errors.pipe(delay(RETRY_DELAY));
      }),
      share(),
    );
  }

  public getEventStream(): Observable<WikiEvent> {
    return this.eventStream;
  }

  public getUsersEventStream(
    usersStream: Observable<User[]>,
  ): Observable<WikiEvent> {
    return usersStream.pipe(
      switchMap((users: User[]) => {
        if (users.length === 0) return EMPTY;
        return this.eventStream.pipe(
          filter((event): boolean => {
            return !!users.find((user: User) => user.name == event.user);
          }),
        );
      }),
    );
  }
}

export interface PollingServicePluginOptions {
  pollingServiceUrl: string;
}

export const autoConfig: PollingServicePluginOptions = {
  pollingServiceUrl: process.env.POLLING_SERVICE || 'polling-service:3000',
};

export default fp<PollingServicePluginOptions>(async (fastify, options) => {
  const pollingService = new PollingService(
    options.pollingServiceUrl,
    fastify.log,
  );
  fastify.decorate('pollingService', pollingService);
});

declare module 'fastify' {
  export interface FastifyInstance {
    pollingService: PollingService;
  }
}
