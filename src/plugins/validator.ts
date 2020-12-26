import { Validator } from 'class-validator';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export type ValidatorPluginOptions = undefined;

export default fp<ValidatorPluginOptions>(async (fastify: FastifyInstance) => {
  const validator = new Validator();
  fastify.decorate('validator', function () {
    return validator;
  });
});

declare module 'fastify' {
  export interface FastifyInstance {
    validator(): Validator;
  }
}
