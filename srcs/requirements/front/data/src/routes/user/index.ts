import { FastifyPluginAsync } from "fastify";

const user: FastifyPluginAsync = async (fastify, opts) => {
    fastify.register(require("./avatar"));
}

export default user;