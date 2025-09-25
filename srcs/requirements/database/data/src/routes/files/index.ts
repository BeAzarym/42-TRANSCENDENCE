import { FastifyPluginAsync } from "fastify";

const files: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.register(require("./get"));
	fastify.register(require("./default"));
}

export default files;