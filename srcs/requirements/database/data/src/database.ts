import { Database } from "sqlite3";

export let db: Database;

export async function init() {
	db = new Database("/var/www/database/database.db")
	//Create tables for db if not already done
	db.serialize(() => {
		db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, email TEXT, pwd TEXT, avatar TEXT, userData TEXT, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, twoFA TEXT, twoFAReset TEXT, online BOOLEAN DEFAULT 0, friends TEXT DEFAULT '[]', friendRequests TEXT DEFAULT '{\"in\":[],\"out\":[]}')");
		db.run("CREATE TABLE IF NOT EXISTS userData (id TEXT PRIMARY KEY, pastGames TEXT DEFAULT '[]', pastTournaments TEXT DEFAULT '[]', currentElo INTEGER DEFAULT 1000, highestElo INTEGER DEFAULT 1000, currentTournamentElo INTEGER DEFAULT 1000, highestTournamentElo INTEGER DEFAULT 1000, totalGamePlayed INTEGER DEFAULT 0, totalGameWin INTEGER DEFAULT 0, totalGameLoose INTEGER DEFAULT 0, currentStreak INTEGER DEFAULT 0, highestStreak INTEGER DEFAULT 0, totalTournamentPlayed INTEGER DEFAULT 0, totalTournamentWin INTEGER DEFAULT 0, totalTournamentLoose INTEGER DEFAULT 0, currentTournamentStreak INTEGER DEFAULT 0, highestTournamentStreak INTEGER DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)");
		db.run("CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, players TEXT, score TEXT, tournyId TEXT, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)");
		db.run("CREATE TABLE IF NOT EXISTS tournament (id TEXT PRIMARY KEY, players TEXT, brackets TEXT, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, ownerId TEXT)");
	
		db.run("CREATE INDEX IF NOT EXISTS idx_users_username_nocase ON users(username COLLATE NOCASE)");
	})
}
