import { FastifyPluginAsync } from "fastify";
import DataBase from "database-sdk";
import * as jwt from "jsonwebtoken";
import pongGameServer from "../GameServer";

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
	fastify.get("/create", { websocket: true }, async (ws, request) => {
		const user = await getUser(request.cookies["jwt-token"]);
		if (!user) {
			return ws.close(3000, "Unauthorized");
		}
		const roomId = pongGameServer.createBlankGame();
		ws.send(JSON.stringify({
			type: "room_created",
			message: "Created room succesfully",
			roomId: roomId
		}))
		await pongGameServer.joinGame(ws, roomId, user.item.id);
		pongGameServer.handleConnectionManual(ws, user.item.id);

	})

}

export default route;