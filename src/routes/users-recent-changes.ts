import { plainToClass, serialize } from 'class-transformer';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { SocketStream } from 'fastify-websocket';
import { defer, fromEvent, of, throwError } from 'rxjs';
import { catchError, map, pluck, switchMap } from 'rxjs/operators';
import WebSocket from 'ws';
import User from '../schemas/user';
import {
  AppErrorCodes,
  BadRequestError,
  USERS_VALIDATION,
} from '../utlis/errors';
import subscribeClient from '../utlis/subscribe-client';

function usersRecentChangesHandler(fastify: FastifyInstance) {
  return (connection: SocketStream) => {
    const socket: WebSocket = connection.socket;

    const users = fromEvent(socket, 'message').pipe(
      pluck('data'),
      switchMap((message: any) => {
        return defer(
          async (): Promise<User[]> => {
            if (typeof message !== 'string') {
              throw new BadRequestError(USERS_VALIDATION);
            }
            const users = plainToClass(User, JSON.parse(message), {
              excludeExtraneousValues: true,
            });
            const errors = await fastify.validator().validate(users);
            if (errors.length > 0) {
              throw new BadRequestError(USERS_VALIDATION, errors);
            }
            return users;
          },
        ).pipe(
          catchError((error) => {
            if (error.code === AppErrorCodes.BAD_REQUEST_CODE) {
              socket.send(JSON.stringify(error));
              return of([]);
            }
            return throwError(error);
          }),
        );
      }),
    );

    const usersEventStream = fastify.pollingService
      .getUsersEventStream(users)
      .pipe(map((wikiEvent) => serialize(wikiEvent)));

    subscribeClient(usersEventStream, socket);
  };
}

const usersRecentChanges: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {
  fastify.get(
    '/users-recent-changes',
    { websocket: true },
    usersRecentChangesHandler(fastify),
  );
};

export default usersRecentChanges;
