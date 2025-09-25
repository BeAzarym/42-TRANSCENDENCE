import { FastifyPluginAsync } from "fastify";
import { db } from "../../database";

function getRetval(params: any): Promise<any> {
	return new Promise((resolve, reject) => {
		db.get(`SELECT * FROM ${params.tableName} WHERE id = ?`, [params.id], (err, val: any) => {
			if (err) return reject(err);
			resolve(val);
		})
	})
}

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get("/:tableName/getOne/:id", async (request, reply) => {
		const ret = await getRetval(request.params);
		return ret;
	})
}

export default route;