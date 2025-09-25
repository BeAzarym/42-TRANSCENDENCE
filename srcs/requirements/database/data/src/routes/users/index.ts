import { FastifyPluginAsync } from "fastify";


const users: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.register(require("./createUser"));
	fastify.register(require('./getUserFrom'))
}

export default users