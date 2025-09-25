import DataBase from "database-sdk";
import { FastifyPluginAsync } from "fastify";
import * as jwt from 'jsonwebtoken'

export function checkAuth(jwt_token: string | undefined): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		if (!jwt_token || typeof jwt_token != 'string') {
			return resolve(false);
		}
		const userToken: { userId: string, username: string } = jwt.verify(jwt_token, process.env.JWT_SECRET!) as any;

		try {
			const db = new DataBase();
			const user = await db.collection("users").getOne(userToken.userId)
			if (user.error) {
				return resolve(false);
			}
			return resolve(true);
		} catch (err) {
			return reject(err);
		}
	})
}

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get("/checkAuth", async function (request, reply) {
		/* const jwt_token = request.cookies['jwt-token'];
		if (!jwt_token || typeof jwt_token != 'string') {
			return reply.code(200).send(false);
		}
		const userToken: {userId: string, username: string} = jwt.verify(jwt_token, process.env.JWT_SECRET!) as any;
		try {
			if (!(await getUserById(userToken.userId))) {
				return reply.code(200).send(false);
			}
			return reply.code(200).send(true);
		} catch (err) {
			console.error(err);
			return reply.internalServerError();
		} */

		try {
			const res = await checkAuth(request.cookies['jwt-token']);
			return reply.code(200).send(res);
		} catch (err) {
			console.error(err);
			return reply.internalServerError();
		}
	})
}

export default route;