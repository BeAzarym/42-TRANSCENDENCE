import { Static, Type } from '@sinclair/typebox'
import { FastifyPluginAsync, RouteShorthandOptions } from 'fastify'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'
import DataBase from 'database-sdk'
import crypto from "crypto"

export const pending_logins: Map<string, {
	user: any,
	time: number
}> = new Map();

const UserData = Type.Object({
	username: Type.String(),
	password: Type.String()
})

const options: RouteShorthandOptions = {
	schema: {
		body: UserData
	}
}

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post<{ Body: Static<typeof UserData> }>('/login', options, async function (request, reply) {
		/* const req = await fetch("http://database:3000/users/getUserFrom/name", {
			method: "POST",
			body: JSON.stringify({ value: request.body.username }),
			headers: {
				"Content-Type": "application/json"
			}
		}); */

		const db = new DataBase();
		const user = await db.collection("users").getFirstListItem(`username = '${request.body.username}'`);
		console.log(user);
		
		if (user.error) {
			if (user.status == 500) {
				return reply.internalServerError();
			} else if (user.status == 404) {
				return reply.badRequest("Invalid email/password");
			}
		}
		
		//console.log(`${request.body.password} === ${dbObj.pwd}`);

		console.log(request.body.password);
		console.log(user.item.pwd);
		if (!bcrypt.compareSync(request.body.password, user.item.pwd)) {
			return reply.badRequest("Invalid email/password.");
		}
		
		console.log();
		if (user.item.twoFA !== null) {
			const token = crypto.randomBytes(16).toString("base64url");
			const userObj = { user: user.item, time: Date.now()};
			pending_logins.set(token, userObj);

			reply.setCookie("transaction-token", token, {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				maxAge: 300,
				path: "/"
			})

			return reply.send({
				type: '2fa_required',
				message: '2fa required to log-in'
			})
		} else {
			const jwtBase = { userId: user.item.id, username: user.item.username };
			const token = jwt.sign(jwtBase, process.env.JWT_SECRET!, { expiresIn: "1h" });
	
			reply.setCookie("jwt-token", token, {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				maxAge: 604800,
				path: "/"
			})
			delete user.item.pwd;
			return reply.send({
				type: 'success',
				message: 'User logged in.',
				data: {
					user: user
				}
			})
		}
	})
}

export default route