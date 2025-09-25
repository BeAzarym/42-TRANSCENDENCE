import DataBase from "database-sdk";
import { FastifyPluginAsync } from "fastify";
import * as jwt from "jsonwebtoken";

const db = new DataBase();

async function getUser(token: string | undefined) {
    if (!token || typeof token !== "string") {
        return null;
    }

    try {
        const userToken: {userId: string, username: string} = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await db.collection("users").getOne(userToken.userId);
        if (user.error) {
            return null;
        }
        return user.item;
    } catch (error) {
        return null;
    }
}

const route: FastifyPluginAsync = async (fastify, opts) => {
    fastify.get("/friends", async function (request, reply) {
        const user = await getUser(request.cookies["jwt-token"]);
        if (!user) return reply.unauthorized();

        try {
            const friendsIds: string[] = JSON.parse(user.friends || "[]");
            
            if (friendsIds.length === 0) {
                return reply.send([]);
            }

            const friendsDetails = [];
            for (const friendId of friendsIds) {
                const friendRes = await db.collection("users").getOne(friendId);
                if (!friendRes.error && friendRes.item) {
                    friendsDetails.push({
                        id: friendRes.item.id,
                        username: friendRes.item.username,
                        avatar: friendRes.item.avatar,
                        online: friendRes.item.online || 0
                    });
                }
            }

            return reply.send(friendsDetails);

        } catch (error) {
            console.error("[SOCIAL] Error fetching friends:", error);
            return reply.internalServerError("Error fetching friends");
        }
    });
}

export default route;
