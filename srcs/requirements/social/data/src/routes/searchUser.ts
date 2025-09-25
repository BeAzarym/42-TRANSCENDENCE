import { Static, Type } from "@sinclair/typebox";
import DataBase from "database-sdk";
import * as jwt from "jsonwebtoken";
import { FastifyPluginAsync, RouteShorthandOptions } from "fastify";

const queryOptions = Type.Object({
    name: Type.String()
});

const options: RouteShorthandOptions = {
    schema: {
        querystring: queryOptions
    }
}

const db = new DataBase();

async function searchUser(prefix: string) {
    const cleaned = prefix.trim();
    if (!cleaned) return [];

    const pattern = prefix.replace(/[\\%_]/g, m => "\\" + m) + "%";
    const retval = await db.collection("users").getList(1, 20, {
        filter: `username LIKE '${pattern}' ESCAPE '\\' COLLATE NOCASE` 
    })

    if (retval.error) {
        throw retval.error;
    }
    return retval.items;
}

export function checkAuth(jwt_token: string | undefined): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		if (!jwt_token || typeof jwt_token != 'string') {
			return resolve(false);
		}
        
		try {
            const userToken: { userId: string, username: string } = jwt.verify(jwt_token, process.env.JWT_SECRET!) as any;
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

const route: FastifyPluginAsync = async (fastify, opts) => {
    fastify.get<{Querystring: Static<typeof queryOptions>}>("/searchUser", options, async function (request, reply) {
        if (!await checkAuth(request.cookies["jwt-token"])) return reply.unauthorized();
        const name = request.query.name;
        const users = await searchUser(name);
        if (users === undefined) return [];
        for (const user of users) {
            if (user.pwd !== undefined) delete user.pwd;
            if (user.twoFA !== undefined) delete user.twoFA;
            if (user.twoFAReset !== undefined) delete user.twoFAReset;
        }
        return users;
    })
}

export default route;