import { Static, Type } from "@sinclair/typebox";
import DataBase from "database-sdk";
import { FastifyPluginAsync, RouteShorthandOptions } from "fastify";


const paramOptions = Type.Object({
    userId: Type.String()
});

const options: RouteShorthandOptions = {
    schema: {
        params: paramOptions
    }
};

const db = new DataBase();

const route: FastifyPluginAsync = async (fastify, opts) => {
    fastify.get<{Params: Static<typeof paramOptions>}>("/avatar/:userId", options, async function (request, reply) {
        const userId = request.params.userId;
        const user = await db.collection("users").getOne(userId);
        if (user.error) {
            return reply.notFound();
        }

        let avatarUrl;
        if (user.item.avatar === null) {
            avatarUrl = "http://database:3000/files/users/default.png";
        } else {
            avatarUrl = db.getFileUrl("users", userId, user.item.avatar);
        }

        const resp = await fetch(avatarUrl);
        reply.headers({
            'content-type': resp.headers.get('content-type') || "application/octet-stream"
        })
        return reply.send(resp.body);
    })
}

export default route;