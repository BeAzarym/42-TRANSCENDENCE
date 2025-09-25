import { FastifyPluginAsync } from 'fastify'
import * as fs from 'fs'

const example: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
	const stream = fs.createReadStream('./src/public/index.html');
	return reply.type('text/html').send(stream);
  })
}

export default example