import { FastifyPluginAsync } from 'fastify'
import pongGameServer from '../GameServer'
import * as jwt from 'jsonwebtoken'
import DataBase from 'database-sdk';

async function getUser(token: string | undefined) {
	if (!token || typeof token != 'string') {
		return null;
	}
	const userToken: { userId: string, username: string } = jwt.verify(token, process.env.JWT_SECRET!) as any;

	const db = new DataBase();
	const user = await db.collection("users").getOne(userToken.userId);
	if (user.error) {
		return null;
	}
	return user;
}

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/', { websocket: true }, async function (ws, request) {
		const user = await getUser(request.cookies["jwt-token"]);
		if (!user) {
			return ws.close(3000, "Unauthorized");
		}
		pongGameServer.handleConnection(ws, user.item.id);
	})
}

export default root
