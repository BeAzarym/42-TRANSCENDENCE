import { FastifyPluginAsync } from "fastify";

const friend: FastifyPluginAsync = async (fastify, opts) => {
    fastify.register(require("./add"));
    fastify.register(require("./cancel"));
    fastify.register(require("./reject"));
    fastify.register(require("./accept"));
    fastify.register(require("./remove"));
}

export default friend