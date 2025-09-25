import DataBase from "database-sdk";
import { FastifyPluginAsync } from "fastify";
import * as jwt from "jsonwebtoken";
import { WebSocket } from "ws";

const db = new DataBase();

export const connectedUsers: Map<string, WebSocket> = new Map();

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

async function handlePrivateInvite(sender: any, message: any) {
    const targetId = message.userId;
    const roomId = message.roomId;

    if (!targetId || !roomId) {
        console.error('[SOCIAL] Invalid private invite message:', message);
        return;
    }

    const senderFriends: string[] = JSON.parse(sender.friends || '[]');
    if (!senderFriends.includes(targetId)) {
        console.error('[SOCIAL] User not in friends list:', targetId);
        return;
    }

    if (connectedUsers.has(targetId)) {
        const targetWs = connectedUsers.get(targetId)!;
        targetWs.send(JSON.stringify({
            type: "private_invite",
            message: `${sender.username} invited you to a private game`,
            userId: sender.id,
            username: sender.username,
            roomId: roomId
        }));
        console.log('[SOCIAL] Private invite sent to:', targetId);
    } else {
        console.log('[SOCIAL] Target user not online:', targetId);
    }
}

async function handleTournamentInvite(sender: any, message: any) {
    const targetId = message.userId;
    const roomId = message.roomId;

    if (!targetId || !roomId) {
        console.error('[SOCIAL] Invalid tournament invite message:', message);
        return;
    }

    const senderFriends: string[] = JSON.parse(sender.friends || '[]');
    if (!senderFriends.includes(targetId)) {
        console.error('[SOCIAL] User not in friends list:', targetId);
        return;
    }

    if (connectedUsers.has(targetId)) {
        const targetWs = connectedUsers.get(targetId)!;
        targetWs.send(JSON.stringify({
            type: "tourny_invite",
            message: `${sender.username} invited you to a tournament`,
            userId: sender.id,
            username: sender.username,
            roomId: roomId
        }));
        console.log('[SOCIAL] Tournament invite sent to:', targetId);
    } else {
        console.log('[SOCIAL] Target user not online:', targetId);
    }
}

const route: FastifyPluginAsync = async (fastify, opts) => {
    fastify.get("/", {websocket: true}, async function (ws, request) {
        const token = request.cookies["jwt-token"];
        const user = await getUser(token);
        if (!user) {
            return ws.close(3000, "Unauthorized");
        }
        const updated = await db.collection("users").update(user.id, {
            online: 1
        });
        if (updated.error) throw updated.error 
        connectedUsers.set(user.id, ws);

        const userFriends: string[] = JSON.parse(user.friends || '[]');
        userFriends.forEach(friendId => {
            const friendWs = connectedUsers.get(friendId);
            if (friendWs) {
                friendWs.send(JSON.stringify({
                    type: "user_online",
                    userId: user.id,
                    username: user.username
                }));
            }
        });

        ws.on("message", async (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('[SOCIAL WS] Received message:', message);

                switch (message.type) {
                    case "private_invite":
                        await handlePrivateInvite(user, message);
                        break;
                    case "tourny_invite":
                        await handleTournamentInvite(user, message);
                        break;
                    default:
                        console.log('[SOCIAL WS] Unknown message type:', message.type);
                }
            } catch (error) {
                console.error('[SOCIAL WS] Error handling message:', error);
            }
        });

        ws.on("close", () => {
            connectedUsers.delete(user.id);
            db.collection("users").update(user.id, {
                online: 0
            }).then((updated) => {
                if (updated.error) throw updated.error;
            });

            userFriends.forEach(friendId => {
                const friendWs = connectedUsers.get(friendId);
                if (friendWs) {
                    friendWs.send(JSON.stringify({
                        type: "user_offline",
                        userId: user.id,
                        username: user.username
                    }));
                }
            });
        })
    })
}

export default route;