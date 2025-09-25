import fastifyWebsocket, { WebsocketPluginOptions } from '@fastify/websocket'
import fp from 'fastify-plugin'

export default fp<WebsocketPluginOptions>((fastify, opts) => {
	fastify.register(fastifyWebsocket);
})