import { serialize } from 'class-transformer';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { SocketStream } from 'fastify-websocket';
import { map } from 'rxjs/operators';
import subscribeClient from '../utlis/subscribe-client';

function recentChangesHandler(fastify: FastifyInstance) {
  return (connection: SocketStream) => {
    const socket = connection.socket;
    const eventStream = fastify.pollingService
      .getEventStream()
      .pipe(map((wikiEvent) => serialize(wikiEvent)));

    subscribeClient(eventStream, socket);
  };
}

const recentChanges: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {
  fastify.get(
    '/recent-changes',
    { websocket: true },
    recentChangesHandler(fastify),
  );
};

export default recentChanges;
