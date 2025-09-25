import { FastifyPluginAsync } from "fastify";
import * as jwt from 'jsonwebtoken';
import DataBase from "database-sdk";
import { checkAuth } from "./checkAuth";

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {

	fastify.post("/updateAvatar", async function (request, reply) {
		try {
			console.log("[DEBUG] Starting updateAvatar request");
			
			if (!await checkAuth((request as any).cookies["jwt-token"]!)) {
				console.log("[DEBUG] Authentication failed");
				return reply.unauthorized();
			}

			const userToken: { userId: string, username: string } = jwt.verify((request as any).cookies["jwt-token"]!, process.env.JWT_SECRET!) as any;
			console.log("[DEBUG] User authenticated:", userToken.userId);

			console.log("[DEBUG] Getting file data...");
			const data = await (request as any).file();

			if (!data) {
				console.log("[DEBUG] No file provided");
				return reply.code(400).send({ error: "No file upload" });
			}

			console.log("[DEBUG] File received:", data.filename, "Type:", data.mimetype);

			if (data.file && data.file.bytesRead > 10 * 1024 * 1024) {
				console.log("[DEBUG] File too large:", data.file.bytesRead);
				return reply.code(413).send({ error: "File too large. Maximum size is 10MB." });
			}

			console.log("[DEBUG] Converting to buffer...");
			const buffer = await data.toBuffer();
			console.log("[DEBUG] Buffer size:", buffer.length, "bytes");
			
			if (buffer.length > 10 * 1024 * 1024) {
				console.log("[DEBUG] Buffer too large:", buffer.length);
				return reply.code(413).send({ error: "File too large. Maximum size is 10MB." });
			}

			console.log("[DEBUG] Creating File object...");
			const FileCtor: any = (globalThis as any).File;
			if (!FileCtor) {
				console.log("[DEBUG] File constructor not available");
				return reply.code(500).send({ error: "File API not available in this runtime" });
			}
			const fileObj = new FileCtor([buffer], data.filename, { type: data.mimetype });

			console.log("[DEBUG] Updating database...");
			const db = new DataBase();
			const uploadFile: any = await db.collection("users").update(userToken.userId, { avatar: fileObj });
			
			if (uploadFile?.error) {
				console.log("[DEBUG] Database update failed:", uploadFile.error);
				return reply.internalServerError("Avatar upload failed.");
			}

			console.log("[DEBUG] Avatar updated successfully");
			return reply.send({
				success: true
			});
			
		}
		catch (error) { 
			console.error("[ERROR] AvatarHandler failed:", error);
			
			// Gestion spécifique des erreurs de limite de fichier
			if (error instanceof Error) {
				if (error.message.indexOf('File size limit exceeded') !== -1) {
					return reply.code(413).send({ error: "File too large. Maximum size is 10MB." });
				}
				if (error.message.indexOf('timeout') !== -1) {
					return reply.code(408).send({ error: "Request timeout. Please try with a smaller file." });
				}
			}
			
			return reply.code(500).send({ error: "Internal server error" });
		}
		
	});
}

export default route;