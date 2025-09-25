import { FastifyPluginAsync } from "fastify";


const table: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	console.log("registering table routes");
	fastify.register(require("./getList"));
	fastify.register(require("./getOne"));
	fastify.register(require('./create'));
	fastify.register(require('./update'));
	fastify.register(require('./delete'));
}

export default table