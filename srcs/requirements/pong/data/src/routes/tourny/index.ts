import { FastifyPluginAsync } from "fastify";

const routes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.register(require("./create"));
	fastify.register(require("./join"));
}

export default routes;