import { FastifyPluginAsync } from "fastify";
import { checkAuth } from "./checkAuth";
import * as jwt from 'jsonwebtoken';
import Database from "database-sdk";

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get("/me", async function (request, reply) {
		try {
			if (!await checkAuth(request.cookies["jwt-token"])) {
				return reply.unauthorized();
			}
			/* const userToken: { userId: string, username: string } = jwt.verify(request.cookies["jwt-token"]!, process.env.JWT_SECRET!) as any;
			const req = await fetch("http://database:3000/users/getUserFrom/id", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ value: userToken.userId })
			})
			const user = (await req.json()) as any;


			reply.code(200).send({
				username: user.name,
				email: user.email,
				avatar: user.avatar
			}) */

			const userToken: {userId: string, username: string} = jwt.verify(request.cookies["jwt-token"]!, process.env.JWT_SECRET!) as any;
			const db = new Database();
			const user = await db.collection("users").getOne(userToken.userId);
			if (user.error) {
				if (typeof user.error === "object") {
					return reply.internalServerError(JSON.stringify(user.error));
				}
				return reply.internalServerError(user.error)
			}
			/* if (user.item.pwd !== undefined) {
				const {pwd, ...rest} = user.item;
				return reply.code(200).send(rest);
			} else {
				return reply.code(200).send(user.item);
			} */
			const item = user.item;
			if (item.pwd !== undefined) delete item.pwd;
            if (item.twoFA !== undefined) delete item.twoFA;
            if (item.twoFAReset !== undefined) delete item.twoFAReset;
			return reply.send(item);
		} catch (err) {
			console.error(err);
			reply.internalServerError(JSON.stringify(err));
		}
	})
}

export default route;