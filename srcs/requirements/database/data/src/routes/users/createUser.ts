import { FastifyPluginAsync, RouteShorthandOptions } from "fastify";
import { db } from "../../database";
import { Type, Static } from "@sinclair/typebox";

const UserData = Type.Object({
	username: Type.String(),
	email: Type.String(),
	password: Type.String(),
})

const options: RouteShorthandOptions = {
	schema: {
		body: UserData
	}
}

type UserDataStatic = Static<typeof UserData>;

function __userExists(userInfo: UserDataStatic): Promise<boolean> {
	return new Promise((resolve, reject) => {
		db.get("SELECT * FROM users WHERE name = ? OR email = ?", [userInfo.username || userInfo.email], (err, val) => {
			if (err) return reject(err);
			resolve(val ? true : false);
		})
	})
}

function __createUser(userInfo: UserDataStatic): Promise<any> {
	return new Promise((resolve, reject) => {
		const avatar = "/avatars/user-default-avatar.png"

		db.run("INSERT INTO users (name, email, pwd, avatar) VALUES (?, ?, ?, ?)",
			[userInfo.username, userInfo.email, userInfo.password, avatar],
			function(this, err) {
				if (err) return reject(err);
				db.get("SELECT * FROM users WHERE id = ?", [this.lastID],
					(err, val) => {
						if (err) return reject(err);
						return resolve(val);
					}
				)
			}
		)
	})
}


const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post<{Body: UserDataStatic}>('/createUser', options,
		async function (request, reply) {
		try {
			const userInfo = request.body;
			if (await __userExists(userInfo)) {
				return reply.conflict('User already exists');
			}
			const user = await __createUser(userInfo);
			return reply.code(200).send(user);
		} catch (err) {
			console.error(err);
			return reply.internalServerError();
		}
	})
}

export default route