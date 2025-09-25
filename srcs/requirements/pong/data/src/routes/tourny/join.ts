import { FastifyPluginAsync } from "fastify";
import DataBase from "database-sdk";
import * as jwt from "jsonwebtoken";
import tournySystem from "../../Tourny";

async function getUser(token: string | undefined) {
	if (!token || typeof token != 'string') {
		return null;
	}
	const userToken: {userId: string, username: string} = jwt.verify(token, process.env.JWT_SECRET!) as any;

	const db = new DataBase();
	const user = await db.collection("users").getOne(userToken.userId);
	if (user.error) {
		return null;
	}
	return user;
}

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get("/join/:roomId", {websocket: true}, async (ws, request) => {
		const user = await getUser(request.cookies["jwt-token"]);
		if (!user) {
			return ws.close(3000, "Unauthorized");
		}
		tournySystem.handleConnection(ws, user.item.id);
		await tournySystem.joinRoom(ws, user.item.id, (request.params as any).roomId);
	})
}

export default route;