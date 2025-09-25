import { FastifyPluginAsync } from 'fastify'
import DataBase from "database-sdk";

const db = new DataBase()

interface LeaderboardEntry {
	dataId: string
	userId: string
    username: string
    value: number
    ratio?: number
    gamesPlayed: number
    gamesWon: number
    gamesLost: number
    currentStreak: number
    maxStreak: number
    tournamentWins: number
    avatar?: string
}

const leaderboard: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.get('/:type/:criteria', async function (request, reply) {
        const { type, criteria } = request.params as { type: string; criteria: string }

        if (!['Normal', 'Tournament'].includes(type)) {
            return reply.code(400).send({ error: 'Invalid type.' })
        }

        if (!['mostGamePlayed', 'highestWinStreak', 'highestWinRatio'].includes(criteria)) {
            return reply.code(400).send({ error: 'Invalid criteria.' })
        }

        try {
            const dbUserData = await db.collection("userData").getList(1, 1000)
            if (dbUserData.error) {
                return reply.code(dbUserData.status).send(dbUserData.error)
            }

            const processedData = await processLeaderboardData(dbUserData.items || [], type, criteria)
            return reply.send(processedData)
        } catch (error) {
            return reply.code(500).send({ error: 'Internal server error' })
        }
    })
}

async function resolveUserMeta(userId: string) {
    const eqFilter = `userData='${userId}'`
    let res = await db.collection("users").getFirstListItem(eqFilter)
    if (!res.item) {
        const likeFilter = `userData LIKE '%"${userId}"%'`
        res = await db.collection("users").getFirstListItem(likeFilter)
	}
	if (res && res.item.pwd) delete res.item.pwd;
    return res.item || null
}

async function processLeaderboardData(userData: any[], type: string, criteria: string): Promise<LeaderboardEntry[]> {
    const entries: LeaderboardEntry[] = []
    if (!userData || userData.length === 0) return []

    const tasks = userData.map(async (user) => {
        const isTournament = type === 'Tournament'
        const gamesPlayed = isTournament ? Number(user.totalTournamentPlayed || 0) : Number(user.totalGamePlayed || 0)
        const gamesWon = isTournament ? Number(user.totalTournamentWin || 0) : Number(user.totalGameWin || 0)
        const gamesLost = isTournament ? Number(user.totalTournamentLoose || 0) : Number(user.totalGameLoose || 0)
        const currentStreak = isTournament ? Number(user.currentTournamentStreak || 0) : Number(user.currentStreak || 0)
        const maxStreak = isTournament ? Number(user.highestTournamentStreak || 0) : Number(user.highestStreak || 0)
        const tournamentWins = Number(user.totalTournamentWin || 0)

        let value = 0
        let ratio: number | undefined = undefined

        if (criteria === 'mostGamePlayed') value = gamesPlayed
        else if (criteria === 'highestWinRatio') {
            value = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0
            ratio = value
        } else if (criteria === 'highestWinStreak') value = maxStreak

        if (!(value > 0 || (criteria === 'highestWinRatio' && gamesPlayed > 0))) return null

        const meta = await resolveUserMeta(user.id)
        const username = (meta && meta.username) || user.username || (user.id ? String(user.id).slice(0, 8) : 'Unknown')
        const avatar = (meta && meta.avatar) || user.avatar || null

        return {
            dataId: user.id,
            userId: meta.id,
			username,
            value,
            ratio,
            gamesPlayed,
            gamesWon,
            gamesLost,
            currentStreak,
            maxStreak,
            tournamentWins,
            avatar
        } as LeaderboardEntry
    })

    const results = await Promise.all(tasks)
    for (const r of results) if (r) entries.push(r)

    if (criteria === 'highestWinRatio') entries.sort((a, b) => (b.ratio || 0) - (a.ratio || 0))
    else entries.sort((a, b) => b.value - a.value)

    return entries.slice(0, 20)
}

export default leaderboard