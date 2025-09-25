import { FastifyPluginAsync } from "fastify";
import { db } from "../../database";

function deleteRecord(params: {tableName: string, id: string}): Promise<any> {
	return new Promise(async(resolve, reject) => {
		db.run(`DELETE FROM ${params.tableName} WHERE id = ?`, [params.id], function(this, err) {
			if (err) return reject(err);
			resolve(null);
		})
	})
}

const route: FastifyPluginAsync = async (fastify, opts) => {
	console.log("registering /delete route");
	fastify.delete("/:tableName/delete/:id", async function(request, reply) {
		try {
			await deleteRecord(request.params as any);
			return reply.send({success: true});
		} catch (err: any) {
			reply.status(400).send({error: err.message});
		}
	})
	console.log("registered");
}

export default route;