import fp from 'fastify-plugin'
import formbody, {FastifyFormbodyOptions} from '@fastify/formbody'

export default fp<FastifyFormbodyOptions>(async (fastify) => {
	fastify.register(formbody);
})