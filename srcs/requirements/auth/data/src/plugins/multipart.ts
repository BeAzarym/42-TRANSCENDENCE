import fastifyMultipart, { FastifyMultipartOptions } from "@fastify/multipart"
import fp from "fastify-plugin"

export default fp<FastifyMultipartOptions>(async (fastify) => {
	fastify.register(fastifyMultipart, {
		limits: {
			fileSize: 10 * 1024 * 1024, // 10 MB
			files: 1, // Maximum number of files
			fieldSize: 1024 * 1024, // 1 MB per field
		},
		throwFileSizeLimit: true,
		attachFieldsToBody: false
	})
})