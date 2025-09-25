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
    fastify.get("/add/:userId", async function (request, reply) {
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

        const userRequests: {in: string[], out: string[]} = JSON.parse(user.friendRequests);
        if (userRequests.out.includes(targetId) || userRequests.in.includes(targetId)) return reply.conflict();

        userRequests.out.push(targetId);
        await db.collection("users").update(user.id, {
            friendRequests: JSON.stringify(userRequests)
        });

        const targetRequests: {in: string[], out: string[]} = JSON.parse(target.friendRequests);
        if (!targetRequests.in.includes(user.id)) {
            targetRequests.in.push(user.id);
            await db.collection("users").update(targetId, {
                friendRequests: JSON.stringify(targetRequests)
            })
        }

        if (connectedUsers.has(targetId)) {
            const ws = connectedUsers.get(targetId)!;
            ws.send(JSON.stringify({
                type: "friend_request",
                message: "New friend request incoming",
                userId: user.id,
                username: user.username
            }));
        }

        return reply.send({
            type: "success",
            message: "Firend request succesfully sent!"
        });
    })
}

export default route