import { FastifyPluginAsync } from "fastify";
import DataBase from "database-sdk";
import * as jwt from "jsonwebtoken";
import tournySystem from "../../Tourny";

function isPowerOfTwo(num: number): boolean {
	return num > 0 && (num & (num - 1)) === 0;
}

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
	fastify.get("/create/:nplayers", {websocket: true}, async (ws, request) => {
		const user = await getUser(request.cookies["jwt-token"]);
		if (!user) {
			return ws.close(3000, "Unauthorized");
		}
		const nplayers = Number((request.params as any).nplayers);
		if (Number.isNaN(nplayers) && !isPowerOfTwo(nplayers) && nplayers >= 32) {
			return ws.close(4000, "Invalid Parameter");
		}
		console.log(nplayers);
		const roomId = await tournySystem.createRoom(ws, nplayers, user.item.id);
		tournySystem.handleConnection(ws, user.item.id);
		await tournySystem.joinRoom(ws, user.item.id, roomId);
	})
}

export default route;