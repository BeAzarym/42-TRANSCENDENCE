import { FastifyPluginAsync, RouteShorthandOptions } from 'fastify'
import DataBase from "database-sdk";

const db = new DataBase();

function getResult(players: string[], score: number[], playerId: string): "win" | "loose" {
    const idx = players.indexOf(playerId);
    if (idx === -1) return "loose";
    return score[idx] === 7 ? "win" : "loose";
}

function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const months = [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}


// interface ProfileEntry { 
// 	userId: string
// 	userDataId: string
// 	username: string
// 	avatar: string
// 	ratio: number
// 	gamesPlayed: number
// 	gamesWon: number
// 	gamesLost: number
// 	currentStreak: number
// 	highestStreak: number
// 	tournamentWins: number
// 	pastGame: Array<gameInfo>
// }

// interface gameInfo { 
// 	gameId: number
// 	players: Array<string>
// 	score: Array<number>
// 	date: string
// 	isTournament: boolean
// }

const options: RouteShorthandOptions = {
    schema: {
        params: {
            type: 'object',
            properties: {
                id: { type: 'string', pattern: '^[a-fA-F0-9]+$' }
            },
            required: ['id'],
            additionalProperties: false
        }
    }
}

const profile: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.get<{ Params: { id: string } }>(
        '/:id', options, async function (request, reply) {

            const { id } = request.params;

            try {
                const res = await db.collection("users").getOne(id);
                if (res.error || !res.item) {
                    console.error(res.error);
                    return reply.code(404).send({ error: 'User not found' })
                }
                const user = res.item;
                const resData = await db.collection("userData").getOne(user.userData);

                if (resData.error || !resData.item) {
                    console.error(resData.error)
                    return reply.code(500).send({ erorr: "Error fetching userData" })
                }
                if (res.item && (res.item as any).pwd) delete (res.item as any).pwd;

                const userData = resData.item;

                const gameRes = await db.collection("games").getList();

                if (gameRes.error) return reply.code(500).send({ error: "Error fetching games." })


                const pastGameIds: string[] = JSON.parse(userData.pastGames ?? "[]");

                let pastGame = (gameRes.items ?? [])
                    .filter(game => pastGameIds.includes(game.id))
                    .map(game => {
                        const players = JSON.parse(game.players);
                        const score = JSON.parse(game.score);
                        return {
                            gameId: game.id,
                            players,
                            score,
                            date: formatDate(game.updatedAt),
                            isTournament: !!game.tournyId,
                            result: getResult(players, score, id)
                        };
                    });

                // Collect all unique player IDs from pastGame
                const allPlayerIds = new Set<string>();
                pastGame.forEach((game: any) => game.players.forEach((playerId: string) => allPlayerIds.add(playerId)));

                // Fetch all users and create a map of id to username
                const userRes = await db.collection("users").getList();
                if (userRes.error) return reply.code(500).send({ error: "Error fetching users." });
                const userMap = new Map<string, string>();
                (userRes.items ?? []).forEach(u => userMap.set(u.id, u.username));

                // Replace player IDs with usernames in pastGame
                pastGame = pastGame.map((game: any) => ({
                    ...game,
                    players: game.players.map((playerId: string) => userMap.get(playerId) || 'Unknown')
                }));

                const gamesPlayed = userData.totalGamePlayed ?? 0;
                const gamesWon = userData.totalGameWin ?? 0;
                const gamesLost = userData.totalGameLoose ?? 0;

                const gameRatio = gamesPlayed > 0 ? Number(((gamesWon / gamesPlayed).toFixed(2))) * 100 : 0;

                const tournamentPlayed = userData.totalTournamentPlayed ?? 0;
                const tournamentWins = userData.totalTournamentWin ?? 0;
                const tournamentLoose = userData.totalTournamentLoose ?? 0;

                const tournamentRatio = tournamentPlayed > 0 ? Number(((tournamentWins / tournamentPlayed).toFixed(2))) * 100 : 0;

                const ProfileEntry = {
                    userId: user.id,
                    userDataId: user.userData,
                    username: user.username,
                    avatar: user.avatar,
                    online: user.online || 0,
                    friends: JSON.parse(user.friends || "[]"),
                    friendRequests: JSON.parse(user.friendRequests || '{"in":[],"out":[]}'),
                    gameRatio,
                    gamesPlayed,
                    gamesWon,
                    gamesLost,
                    currentStreak: userData.currentStreak,
                    highestStreak: userData.highestStreak,
                    tournamentRatio,
                    tournamentPlayed,
                    tournamentWins,
                    tournamentLoose,
                    currentTournamentStreak: userData.currentTournamentStreak,
                    highestTournamentStreak: userData.highestTournamentStreak,
                    pastGame

                }
                console.log(ProfileEntry);


                return reply.code(200).send(ProfileEntry);

            } catch (err) {
                console.error(err);
                return reply.code(500).send({ error: "Internal Server Error" });
            }
        }
    )

    // Route pour récupérer les détails des amis d'un utilisateur
    fastify.get<{ Params: { id: string } }>(
        '/:id/friends', options, async function (request, reply) {
            const { id } = request.params;

            try {
                const res = await db.collection("users").getOne(id);
                if (res.error || !res.item) {
                    console.error(res.error);
                    return reply.code(404).send({ error: 'User not found' });
                }

                const user = res.item;
                const friendsIds: string[] = JSON.parse(user.friends || "[]");
                
                if (friendsIds.length === 0) {
                    return reply.code(200).send([]);
                }

                // Récupérer les détails de tous les amis
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

                return reply.code(200).send(friendsDetails);

            } catch (err) {
                console.error(err);
                return reply.code(500).send({ error: "Internal Server Error" });
            }
        }
    )

    // Route pour récupérer les demandes d'amis d'un utilisateur
    fastify.get<{ Params: { id: string } }>(
        '/:id/friend-requests', options, async function (request, reply) {
            const { id } = request.params;

            try {
                const res = await db.collection("users").getOne(id);
                if (res.error || !res.item) {
                    console.error(res.error);
                    return reply.code(404).send({ error: 'User not found' });
                }

                const user = res.item;
                const friendRequests: {in: string[], out: string[]} = JSON.parse(user.friendRequests || '{"in":[],"out":[]}');
                
                // Récupérer les détails des demandes reçues
                const incomingRequests = [];
                for (const requesterId of friendRequests.in) {
                    const requesterRes = await db.collection("users").getOne(requesterId);
                    if (!requesterRes.error && requesterRes.item) {
                        incomingRequests.push({
                            id: requesterRes.item.id,
                            username: requesterRes.item.username,
                            avatar: requesterRes.item.avatar,
                            online: requesterRes.item.online || 0
                        });
                    }
                }

                // Récupérer les détails des demandes envoyées
                const outgoingRequests = [];
                for (const targetId of friendRequests.out) {
                    const targetRes = await db.collection("users").getOne(targetId);
                    if (!targetRes.error && targetRes.item) {
                        outgoingRequests.push({
                            id: targetRes.item.id,
                            username: targetRes.item.username,
                            avatar: targetRes.item.avatar,
                            online: targetRes.item.online || 0
                        });
                    }
                }

                return reply.code(200).send({
                    incoming: incomingRequests,
                    outgoing: outgoingRequests
                });

            } catch (err) {
                console.error(err);
                return reply.code(500).send({ error: "Internal Server Error" });
            }
        }
    )

}

export default profile