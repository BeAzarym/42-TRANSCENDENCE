import DataBase from "database-sdk";
import { FastifyPluginAsync } from "fastify";
import * as jwt from "jsonwebtoken";
import { connectedUsers } from "../root";

const db = new DataBase();

async function getUser(token: string | undefined) {
    if (!token || typeof token !== "string") {
        return null;
    }

    try {
        const userToken: { userId: string, username: string } = jwt.verify(token, process.env.JWT_SECRET!) as any;
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
    fastify.get("/remove/:userId", async function (request, reply) {
        const user = await getUser(request.cookies["jwt-token"]);
        if (!user) return reply.unauthorized();

        const targetId = (request.params as any).userId;
        if (user.id === targetId) return reply.badRequest("You cheeky cheeky guy");
        let target: any;
        try {
            target = await db.collection("users").getOne(targetId);
            if (target.error) return reply.internalServerError();
            target = target.item;
        } catch (err) {
            return reply.notFound("user not found");
        }

        const userFriends: string[] = JSON.parse(user.friends);
        if (!userFriends.includes(targetId)) return reply.gone();

        userFriends.splice(userFriends.indexOf(targetId));
        await db.collection("users").update(user.id, {
            friends: userFriends
        });

        const targetFriends: string[] = JSON.parse(target.friends);
        if (targetFriends.includes(user.id)) {
            targetFriends.splice(targetFriends.indexOf(user.id), 1);
            await db.collection("users").update(targetId, {
                friends: targetFriends
            })
        }

        if (connectedUsers.has(targetId)) {
            const ws = connectedUsers.get(targetId)!;
            ws.send(JSON.stringify({
                type: "friend_removed",
                message: "A \"used-to-be\" friend removed you :(",
                userId: user.id,
                username: user.username
            }));
        }

        return reply.send({
            type: "success",
            message: "Firend succesfully removed (and the crowd goes mild) :("
        });
    })
}

export default route