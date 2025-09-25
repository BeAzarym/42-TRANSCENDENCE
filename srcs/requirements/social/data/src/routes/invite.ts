import DataBase from "database-sdk";
import { FastifyPluginAsync } from "fastify";
import * as jwt from "jsonwebtoken";
import { connectedUsers } from "./root";

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
    fastify.get("/invite/:userId/:roomId", async function (request, reply) {
        const user = await getUser(request.cookies["jwt-token"]);
        if (!user) return reply.unauthorized();

        const targetId = (request.params as any).userId;
        const userFriends: string[] = JSON.parse(user.friends);
        if (!userFriends.includes(targetId)) return reply.gone();

        if (connectedUsers.has(targetId)) {
            const ws = connectedUsers.get(targetId)!;
            ws.send(JSON.stringify({
                type: "private_invite",
                message: "A user invited you to a private game",
                userId: user.id,
                roomId: (request.params as any).roomId
            }));
            return reply.send({
                type: "success",
                message: "Invitation sent"
            })
        } else {
            return reply.send({
                type: "failure",
                message: "Requested user is not online"
            })
        }
    })

    fastify.get("/inviteTourny/:userId/:roomId", async function (request, reply) {
        const user = await getUser(request.cookies["jwt-token"]);
        if (!user) return reply.unauthorized();

        const targetId = (request.params as any).userId;
        const userFriends: string[] = JSON.parse(user.friends);
        if (!userFriends.includes(targetId)) return reply.gone();

        if (connectedUsers.has(targetId)) {
            const ws = connectedUsers.get(targetId)!;
            ws.send(JSON.stringify({
                type: "tourny_invite",
                message: "A user invited you to a tourny game",
                userId: user.id,
                roomId: (request.params as any).roomId
            }));
            return reply.send({
                type: "success",
                message: "Invitation sent"
            })
        } else {
            return reply.send({
                type: "failure",
                message: "Requested user is not online"
            })
        }
    })
}

export default route;