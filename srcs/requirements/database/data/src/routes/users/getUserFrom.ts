import { Static, Type } from "@sinclair/typebox";
import { FastifyPluginAsync, RouteShorthandOptions } from "fastify";
import { db } from "../../database";

const bodySchema = Type.Object({
	value: Type.String()
})

const paramSchema = Type.Object({
	field: Type.String()
})

const options: RouteShorthandOptions = {
	schema: {
		body: bodySchema,
		params: paramSchema
	}
};

function getUserFromField(field: string, value: string): Promise<any> {
	return new Promise((resolve, reject) => {
		db.get(`SELECT * FROM users WHERE ${field} = ?`, [value], (err, val) => {
			if (err) return reject(err);
			resolve(val);
		})
	})
}

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post<{ Body: Static<typeof bodySchema>, Params: Static<typeof paramSchema> }>('/getUserFrom/:field', options, async function (request, reply) {
		const field = request.params.field;
		const value = request.body.value;
		try {
			const user = await getUserFromField(field, value);
			if (!user) return reply.notFound();
			return reply.code(200).send(user);
		} catch (err) {
			console.error(err);
			return reply.internalServerError();
		}
	})

}

export default route