import { FastifyPluginAsync } from 'fastify'


const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => { 
	fastify.post('/logout', async function (request, reply) {
		reply.clearCookie('jwt-token', {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			path: '/'
		})
		return reply.send({
			type: 'success',
			message: 'User logged out successfully.'
		})
	})
}

export default route;