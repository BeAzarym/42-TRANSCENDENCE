import { FastifyPluginAsync } from "fastify";
import pongGameServer from "../GameServer";
import DataBase from "database-sdk";
import * as jwt from "jsonwebtoken"

async function getUser(token: string | undefined) {
	if (!token || typeof token != 'string') {
		return null;
	}
	
	try {
		const userToken: {userId: string, username: string} = jwt.verify(token, process.env.JWT_SECRET!) as any;

		const db = new DataBase();
		const user = await db.collection("users").getOne(userToken.userId);
		if (user.error) {
			return null;
		}
		return user;
	} catch (error) {
		console.error('JWT verification failed:', error);
		return null;
	}
}

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get("/join/:roomId", {websocket: true}, async (ws, request) => {
		const token = request.cookies["jwt-token"] || (request.query as any).token;
		const user = await getUser(token);
		if (!user) {
			return ws.close(3000, "Unauthorized");
		}
		if (!pongGameServer.hasGame((request.params as any).roomId)) {
			ws.send(JSON.stringify({
				type: "not_found",
				message: "No game found with id " + (request.params as any).roomId
			}));
			ws.close(4004, "Not Found");
			return ;
		}
		await pongGameServer.joinGame(ws, (request.params as any).roomId, user.item.id);
		pongGameServer.handleConnectionManual(ws, user.item.id);
	})
}

export default route;