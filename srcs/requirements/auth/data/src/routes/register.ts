import { Static, Type } from "@sinclair/typebox";
import { FastifyPluginAsync, RouteShorthandOptions } from "fastify";
import * as jwt from 'jsonwebtoken'
import * as bcrypt from 'bcrypt'
import DataBase from "database-sdk";

const UserData = Type.Object({
	username: Type.String(),
	email: Type.String(),
	password: Type.String()
});

const options: RouteShorthandOptions = {
	schema: {
		body: UserData
	}
}

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post<{Body: Static<typeof UserData>}>('/register', options, async function (request, reply) {
		const obj = Object.assign(request.body, {
			pwd: bcrypt.hashSync((request.body as any).password, 10),
			avatar: null
		}) as any;
		delete obj.password;

		const db = new DataBase();
		const user = await db.collection("users").getFirstListItem(`username = '${obj.username}'`);
		if (!user.error) {
			if (user.status >= 404) return reply.internalServerError();
		}
		if (user.status === 200) return reply.conflict("User already exists.");

		const newUserData = await db.collection("userData").create({})
		obj.userData = newUserData.item.id;
		const newUser = await db.collection("users").create(obj);
		if (newUser.error) {
			return reply.internalServerError(JSON.stringify(newUser));
		}
		console.log(newUser);
		delete newUser.item.pwd;

		const jwtBase = {userId: newUser.item.id, username: newUser.item.username};
		const token = jwt.sign(jwtBase, process.env.JWT_SECRET!, {expiresIn: "1h"});

		reply.setCookie("jwt-token", token, {
			httpOnly: true,
			secure: true,
			sameSite: true,
			maxAge: 604800,
			path: "/"
		})
		return reply.send({
			type: 'success',
			message: 'User registered.',
			data: {
				user: newUser
			}
		})
	})
}

export default route;