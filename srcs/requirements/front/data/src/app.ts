import { join } from 'node:path'
import fastifyStatic from '@fastify/static'
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload'
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify'

// import login from './routes/example/login'


export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {

}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
}

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  // Place here your custom code!
  await fastify.register(fastifyStatic, {
     root: '/var/www/database/avatars', // chemin dans le conteneur
  prefix: '/avatars/', // URL publique
  });

  // Servir les fichiers statiques buildés par Vite (sans préfixe pour que /assets/ fonctionne)
  await fastify.register(fastifyStatic, {
    root: join(__dirname, 'public'),
    decorateReply: false
  });

	// await fastify.register(login)
  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts
  })
}



export default app
export { app, options }
