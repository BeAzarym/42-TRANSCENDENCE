import fp from "fastify-plugin"
import fastifyWebsocket, { WebsocketPluginOptions } from "@fastify/websocket"

export default fp<WebsocketPluginOptions>(async (fastify) => {
    fastify.register(fastifyWebsocket);
})