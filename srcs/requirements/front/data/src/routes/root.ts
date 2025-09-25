import { FastifyPluginAsync } from 'fastify'
import * as fs from 'fs'
import { join } from 'node:path'

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	const htmlPath = join(__dirname, '../public/index.html');
   
	const Routes = ['/', '/login', '/register', '/settings'];

	Routes.forEach(route => {
		fastify.get(route, async (request, reply) => {
			const stream = fs.createReadStream(htmlPath);
			return reply.type('text/html').send(stream);
		});
	});
	  
	fastify.setNotFoundHandler(async (request, reply) => {
	
		const stream = fs.createReadStream(htmlPath);
		return reply.type('text/html').send(stream);
	})
}


export default root
