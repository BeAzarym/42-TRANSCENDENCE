import fastifyFormbody, { FastifyFormbodyOptions } from '@fastify/formbody'
import fp from 'fastify-plugin'

export default fp<FastifyFormbodyOptions>(async (fastify) => {
	fastify.register(fastifyFormbody);
})