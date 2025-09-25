import fastifyMultipart, { FastifyMultipartOptions } from '@fastify/multipart'
import fp from 'fastify-plugin'

export default fp<FastifyMultipartOptions>(async (fastify) => {
	fastify.register(fastifyMultipart, {
		limits: {
			fileSize: 5 * 1024 * 1024, // 5MB
			files: 1,
			fields: 10
		}
	})
})	
