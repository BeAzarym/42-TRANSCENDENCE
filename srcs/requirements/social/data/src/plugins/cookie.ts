import fp from 'fastify-plugin'
import cookie, {FastifyCookieOptions} from '@fastify/cookie'

export default fp<FastifyCookieOptions>(async (fastify) => {
  fastify.register(cookie, {
    secret: process.env.FASTIFY_COOKIE_SECRET,
    hook: "onRequest"
  });
})