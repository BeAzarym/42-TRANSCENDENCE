import { FastifyPluginAsync } from "fastify";
import * as fs from "fs"
import mimeType from "mime-type/with-db";

function __createStream(params: any): fs.ReadStream {
	const baseFolder = "/var/www/database/files"; // fixed: include 'files' subfolder
	const filePath = `${baseFolder}/${params.tableName}/${params.id}/${params.filename}`;

	const stream = fs.createReadStream(filePath);
	return stream;
}

const route: FastifyPluginAsync = async (fatsify, opts): Promise<void> => {
	fatsify.get("/:tableName/:id/:filename", async function(request, reply) {
		const stream = __createStream(request.params);

		return reply
			.header("Content-Type", mimeType.lookup((request.params as any).filename))
			.send(stream);
	})
}

export default route;