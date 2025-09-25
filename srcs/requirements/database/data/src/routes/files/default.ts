import { FastifyPluginAsync } from "fastify";
import * as fs from "fs"

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.get("/users/default.png", async function(request, reply) {
        try {
            const defaultAvatarPath = "/var/www/database/files/users/default.png";
            
            if (fs.existsSync(defaultAvatarPath)) {
                const stream = fs.createReadStream(defaultAvatarPath);
                return reply
                    .header("Content-Type", "image/png")
                    .send(stream);
            } else {
                return reply.code(404).send({ error: "Default avatar not found" });
            }
        } catch (error) {
            console.error("Error serving default avatar:", error);
            return reply.code(500).send({ error: "Internal server error" });
        }
    });
};

export default route;
