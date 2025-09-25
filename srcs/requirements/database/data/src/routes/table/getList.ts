import { FastifyPluginAsync } from "fastify";
import { db } from "../../database";

function getRetvals(query: any, table: string): Promise<any> {
	return new Promise((resolve, reject) => {
		const filter = query.filter !== undefined ? `WHERE ${query.filter}` : "";
		db.all(`SELECT * FROM ${table} ${filter} LIMIT ? OFFSET ?`, [query.perPage, (query.page - 1) * query.perPage], (err, val: any[]) => {
			if (err) return reject(err);
			resolve(val);
		})
	})
}

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get("/:tableName/getList", async function (request, reply) {
		const table = (request.params as any).tableName as string;
		const ret = await getRetvals(request.query, table);
		return (ret);
	})
}

export default route