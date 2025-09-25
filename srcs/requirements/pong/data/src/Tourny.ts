import crypto from "node:crypto"
import { OPEN, WebSocket } from "ws";
import pongGameServer from "./GameServer";
import DataBase from "database-sdk";

const db = new DataBase();

// Utility function to append to JSON array fields
async function appendToUserDataArray(userDataId: string, fieldName: string, newValue: string): Promise<void> {
	try {
		const dbUserData = await db.collection("userData").getOne(userDataId);
		if (!dbUserData) return;

		let array: string[] = [];
		const fieldValue = dbUserData.item[fieldName];

		if (fieldValue && typeof fieldValue === 'string' && fieldValue.trim() !== '') {
			try {
				array = JSON.parse(fieldValue) as string[];
			} catch (parseError) {
				console.error(`Error parsing ${fieldName}:`, parseError);
				array = [];
			}
		}

		array.push(newValue);
		await db.collection("userData").update(userDataId, {
			[fieldName]: JSON.stringify(array)
		});
	} catch (error) {
		console.error(`Error updating ${fieldName}:`, error);
	}
}

// Fonction utilitaire pour mettre à jour les statistiques de tournoi
async function updateTournamentStats(userDataId: string, isWin: boolean, isCompleted: boolean = false) {
	try {
		const userData = await db.collection("userData").getOne(userDataId);
		if (!userData) return;

		const updates: any = {};

		// Incrémenter le nombre de tournois joués
		if (isCompleted) {
			updates.totalTournamentPlayed = (userData.item.totalTournamentPlayed || 0) + 1;
		}

		// Gérer les victoires/défaites et streaks
		if (isWin) {
			updates.totalTournamentWin = (userData.item.totalTournamentWin || 0) + 1;

			// Gérer les streaks de victoires
			const currentStreak = (userData.item.currentTournamentStreak || 0) >= 0
				? (userData.item.currentTournamentStreak || 0) + 1
				: 1;
			updates.currentTournamentStreak = currentStreak;

			// Mettre à jour le meilleur streak si nécessaire
			if (currentStreak > (userData.item.highestTournamentStreak || 0)) {
				updates.highestTournamentStreak = currentStreak;
			}
		} else {
			updates.totalTournamentLoose = (userData.item.totalTournamentLoose || 0) + 1;

			// Gérer les streaks de défaites (valeurs négatives)
			const currentStreak = (userData.item.currentTournamentStreak || 0) <= 0
				? (userData.item.currentTournamentStreak || 0) - 1
				: -1;
			updates.currentTournamentStreak = currentStreak;
		}

		await db.collection("userData").update(userDataId, updates);
	} catch (error) {
		console.error("Error updating tournament stats:", error);
	}
}

interface TournyRoom {
	locked: boolean;
	num_players: number;
	players: Player[];
	brackets: Bracket[][];
	roomId: string,
	ownerId: string,
	createdAt: number
}

interface Bracket {
	p1: Player | undefined,
	p2: Player | undefined,
	gameRoomId: string,
	finalScore?: number[],
	winner?: Player | null
}

interface Player {
	id: string,
	username?: string,
	avatar?: string,
	currentRoom: string | null,
	ws: WebSocket,
	currentElo: number,
	currentTournamentElo: number,
	left: boolean
}

class TournySystem {
	private tournyRooms: Map<string, TournyRoom> = new Map();

	private async getUserInfo(userId: string): Promise<{ username: string; avatar: string }> {
		try {
			const userResponse = await db.collection("users").getOne(userId);
			if (userResponse.error || !userResponse.item) {
				return {
					username: userId, // Fallback to userId if user not found
					avatar: '/files/users/default.png'
				};
			}

			return {
				username: userResponse.item.username || userId,
				avatar: userResponse.item.avatar || '/files/users/default.png'
			};
		} catch (error) {
			console.error("Error fetching user info:", error);
			return {
				username: userId,
				avatar: '/files/users/default.png'
			};
		}
	}

	public async createRoom(ws: WebSocket, num_players: number, userId: string): Promise<string> {
		const userInfo = await this.getUserInfo(userId);
		
		const roomId = crypto.randomBytes(10).toString("hex");
		const room: TournyRoom = {
			locked: false,
			num_players: num_players,
			roomId: roomId,
			players: [],
			brackets: [],
			ownerId: userId,
			createdAt: Date.now()
		};

		this.tournyRooms.set(roomId, room);

		ws.roomId = roomId;

		// Add the creator to the room immediately
		const creator: Player = {
			id: userId,
			username: userInfo.username,
			avatar: userInfo.avatar,
			currentRoom: roomId,
			ws: ws,
			currentElo: 1000,
			currentTournamentElo: 1000,
			left: false
		};
		room.players.push(creator);

		this.send(ws, {
			type: "tourny_created",
			roomId: roomId
		});

		// Send initial room info
		this.sendRoomInfoToAll(room);

		return roomId;
	}

	public async joinRoom(ws: WebSocket, userId: string, roomId: string) {
		if (!this.tournyRooms.has(roomId)) {
			this.send(ws, {
				type: "not_found",
				message: "No tourny with id " + roomId
			});
			return;
		}

		
		const room = this.tournyRooms.get(roomId)!;
		
		// Check if player is already in the room
		const existingPlayer = room.players.find(p => p.id === userId && p.left !== true);
		if (existingPlayer) {
			if (existingPlayer.ws.readyState === OPEN) {
				this.send(ws, {
					type: "already_in_tourny",
					message: "sooooo we're trying to bot farm, balrightttttttt"
				})
				return;
			}
			// Player already in room, just update the websocket connection
			existingPlayer.ws = ws;
			this.send(ws, {
				type: "joined_tourny",
				message: "successfully rejoined tourny"
			});
			ws.roomId = roomId;
			this.sendRoomInfoToAll(room);
			return;
		}
		
		if (room.locked === true) {
			this.send(ws, {
				type: "tourny_started",
				message: "Tournament already started"
			});
			return;
		}
		
		const userInfo = await this.getUserInfo(userId);
		
		ws.roomId = roomId;
		const player: Player = {
			id: userId,
			username: userInfo.username,
			avatar: userInfo.avatar,
			currentRoom: "",
			ws: ws,
			currentElo: 1000,
			currentTournamentElo: 1000,
			left: false
		}

		// Notify existing players about new player joining
		room.players.forEach(player => {
			this.send(player.ws, {
				type: "new_player",
				message: "A player joined the tournament",
				userId: userId
			});
		})
		room.players.push(player);
		this.send(ws, {
			type: "joined_tourny",
			message: "succesfully joined tourny"
		});

		// Send updated room info to all players
		this.sendRoomInfoToAll(room);

		if (room.players.length === room.num_players) {
			this.startRoom(room);
		}
	}

	private sendRoomInfoToAll(room: TournyRoom) {
		const roomInfo = {
			type: "tourny_info",
			roomId: room.roomId,
			ownerId: room.ownerId,
			locked: room.locked,
			num_players: room.num_players,
			current_players: room.players.length,
			players: room.players.map(p => ({
				id: p.id,
				username: p.username || p.id,
				avatar: p.avatar || '/files/users/default.png'
			})),
			brackets: this.createSerializableBrackets(room.brackets),
			canStart: room.players.length >= 2 && room.players.length <= room.num_players && !room.locked
		};

		room.players.forEach(player => {
			this.send(player.ws, roomInfo);
		});
	}

	private createSerializableBrackets(brackets: Bracket[][]): any[][] {
		return brackets.map(round =>
			round.map(bracket => ({
				p1: bracket.p1 ? { 
					id: bracket.p1.id, 
					username: bracket.p1.username || bracket.p1.id,
					avatar: bracket.p1.avatar || '/files/users/default.png',
					currentElo: bracket.p1.currentElo, 
					currentTournamentElo: bracket.p1.currentTournamentElo 
				} : undefined,
				p2: bracket.p2 ? { 
					id: bracket.p2.id, 
					username: bracket.p2.username || bracket.p2.id,
					avatar: bracket.p2.avatar || '/files/users/default.png',
					currentElo: bracket.p2.currentElo, 
					currentTournamentElo: bracket.p2.currentTournamentElo 
				} : undefined,
				gameRoomId: bracket.gameRoomId,
				finalScore: bracket.finalScore,
				winner: bracket.winner ? { 
					id: bracket.winner.id, 
					username: bracket.winner.username || bracket.winner.id,
					avatar: bracket.winner.avatar || '/files/users/default.png',
					currentElo: bracket.winner.currentElo, 
					currentTournamentElo: bracket.winner.currentTournamentElo 
				} : undefined
			}))
		);
	}

	private generateBrackets(room: TournyRoom) {
		const sortedPlayer = room.players.sort((a, b) => { return b.currentTournamentElo - a.currentTournamentElo })
		room.brackets.push([]);
		/* console.log("generating brackets");
		console.log("tourny size " + room.num_players) */
		for (let i = 0; i < room.num_players / 2; i += 2) {
			const p1 = i < sortedPlayer.length ? sortedPlayer[i] : undefined;
			const p2 = room.num_players - i - 1 < sortedPlayer.length ? sortedPlayer[room.num_players - i - 1] : undefined;
			const bracket: Bracket = {
				p1: p1,
				p2: p2,
				gameRoomId: p1 && p2 ? pongGameServer.createBlankGame(room.roomId) : "",
			};

			if (p1 === undefined || p2 === undefined) {
				bracket.winner = p1 ? p1 : p2;
				if (bracket.winner === undefined) bracket.winner = null
				bracket.finalScore = [0, 0];
				room.brackets[room.brackets.length - 1].push(bracket);
			} else {
				const send_join_game = (ws: WebSocket) => {
					console.log("sent join game");
					this.send(ws, {
						type: "join_game",
						message: "Tourny started, joining game Room",
						roomId: bracket.gameRoomId

					})
				}
				room.brackets[room.brackets.length - 1].push(bracket);
				send_join_game(p1.ws);
				send_join_game(p2.ws);
			}
		}
		for (let i = 1; i < room.num_players / 2; i += 2) {
			const p1 = i < sortedPlayer.length ? sortedPlayer[i] : undefined;
			const p2 = room.num_players - i - 1 < sortedPlayer.length ? sortedPlayer[room.num_players - i - 1] : undefined;
			const bracket: Bracket = {
				p1: p1,
				p2: p2,
				gameRoomId: p1 && p2 ? pongGameServer.createBlankGame() : "",
			};

			if (p1 === undefined || p2 === undefined) {
				bracket.winner = p1 ? p1 : p2;
				if (bracket.winner === undefined) bracket.winner = null
				bracket.finalScore = [0, 0];
				room.brackets[room.brackets.length - 1].push(bracket);
			} else {
				const send_join_game = (ws: WebSocket) => {
					console.log("sent join game");
					this.send(ws, {
						type: "join_game",
						message: "Tourny started, joining game Room",
						roomId: bracket.gameRoomId
					})
				}
				room.brackets[room.brackets.length - 1].push(bracket);
				send_join_game(p1.ws);
				send_join_game(p2.ws);
			}
		}
		// console.log("HI THIS IS ROOM BRACKETS", room.brackets);
	}

	private advanceBrackets(room: TournyRoom) {
		const lastRound = room.brackets[room.brackets.length - 1];
		console.log("rounds length: " + room.brackets.length);
		room.brackets.push([]);

		for (let i = 0; i < lastRound.length; i += 2) {
			const br1 = lastRound[i];
			const br2 = lastRound[i + 1];

			const p1 = br1.winner !== null ? br1.winner : undefined;
			const p2 = br2.winner !== null ? br2.winner : undefined;
			const bracket: Bracket = {
				p1: p1 !== null ? p1 : undefined,
				p2: p2 !== null ? p2 : undefined,
				gameRoomId: p1 && p2 ? pongGameServer.createBlankGame(room.roomId) : "",
			};
			
			
			if (p1 === undefined || p2 === undefined) {
				bracket.winner = p1 ? p1 : p2;
				if (bracket.winner === undefined) bracket.winner = null;
				bracket.finalScore = [0, 0];
				room.brackets[room.brackets.length - 1].push(bracket);
				this.sendRoomInfoToAll(room);
			} else {
				const send_join_game = (ws: WebSocket) => {
					console.log("sent advanced bracket");
					this.send(ws, {
						type: "advancing",
						message: "advancing to next round"
					});
					console.log("sent join game");
					this.send(ws, {
						type: "join_game",
						message: "Tourny started, joining game Room",
						roomId: bracket.gameRoomId
					})
				}
				room.brackets[room.brackets.length - 1].push(bracket);
				send_join_game(p1.ws);
				send_join_game(p2.ws);
				this.sendRoomInfoToAll(room);

			}
		}

		console.log(room.brackets);

		db.collection("tournament").update(room.roomId, {
			brackets: JSON.stringify(this.createSerializableBrackets(room.brackets))
		})
	}

	private async addTournamentToPlayerHistories(room: TournyRoom) {
		try {
			await Promise.all(room.players.map(async (player) => {
				try {
					const dbUser = await db.collection("users").getOne(player.id);
					if (!dbUser) {
						console.error(`User ${player.id} not found in users table`);
						return;
					}

					let dbUserData;
					if (!dbUser.item.userData) {
						// User exists but has no UserData, create it
						console.log(`Creating UserData for user ${player.id}`);
						const newUserData = await db.collection("userData").create({});

						// Update user to link to the new UserData
						await db.collection("users").update(player.id, {
							userData: newUserData.item.id
						});

						dbUserData = newUserData;
					} else {
						dbUserData = await db.collection("userData").getOne(dbUser.item.userData);
						if (!dbUserData) {
							// UserData ID exists but UserData is missing, create new one
							console.log(`UserData ${dbUser.item.userData} not found, creating new one for user ${player.id}`);
							const newUserData = await db.collection("userData").create({});

							// Update user to link to the new UserData
							await db.collection("users").update(player.id, {
								userData: newUserData.item.id
							});

							dbUserData = newUserData;
						}
					}

					// Use utility function to append to pastTournaments
					await appendToUserDataArray(dbUserData.item.id, 'pastTournaments', room.roomId);
				} catch (playerError) {
					console.error(`Error processing player ${player.id}:`, playerError);
				}
			}));
		} catch (err) {
			console.error(err);
		}
	}

	private async startRoom(room: TournyRoom) {
		if (room.locked) {
			return;
		}
		room.locked = true;

		console.log("starting room " + room.roomId);

		// Fetch user info for all players before generating brackets
		for (let player of room.players) {
			const userInfo = await this.getUserInfo(player.id);
			if (userInfo) {
				player.username = userInfo.username;
				player.avatar = userInfo.avatar;
			}
		}

		this.generateBrackets(room);
		console.log("brackets generated for room " + room.roomId);

		const serializablePlayers = room.players.map(player => ({
			id: player.id,
			username: player.username || player.id,
			avatar: player.avatar || '/files/users/default.png',
			currentRoom: player.currentRoom,
			currentElo: player.currentElo,
			currentTournamentElo: player.currentTournamentElo
		}));

		db.collection("tournament").create({
			id: room.roomId,
			ownerId: room.ownerId,
			players: JSON.stringify(serializablePlayers),
			brackets: JSON.stringify(this.createSerializableBrackets(room.brackets))
		})

		this.addTournamentToPlayerHistories(room);
		this.sendRoomInfoToAll(room);
		while (!room.brackets[room.brackets.length - 1].find((bracket) => { return bracket.winner === undefined })) {
			this.advanceBrackets(room);
		}
		// console.log("brackets updated for room " + room.roomId);
	}

	private getTournyBracket(room: TournyRoom, gameId: string) {
		const lastRound = room.brackets[room.brackets.length - 1];

		const bracket = lastRound.find((bracket) => {
			return bracket.gameRoomId === gameId;
		})
		return bracket;
	}

	public reportGameScore(tournyId: string, gameId: string, score: number[], winner: string) {
		const room = this.tournyRooms.get(tournyId);
		console.log("reporting match");
		console.log("room:")
		console.log(room);
		if (!room) return;

		const bracket = this.getTournyBracket(room, gameId);
		if (!bracket) return;

		bracket.winner = bracket.p1!.id === winner ? bracket.p1 : bracket.p2;
		bracket.finalScore = score;

		console.log("bracket:");
		console.log(bracket);

		room.players.forEach(player => {
			if (player.id === bracket.p1?.id || player.id === bracket.p2?.id)
				return;

			this.send(player.ws, {
				type: "match_end",
				bracketId: room.brackets[room.brackets.length - 1].indexOf(bracket),
				bracket: bracket.winner ? {
					id: bracket.winner.id,
					username: bracket.winner.username || bracket.winner.id,
					avatar: bracket.winner.avatar || '/files/users/default.png',
					currentElo: bracket.winner.currentElo,
					currentTournamentElo: bracket.winner.currentTournamentElo
				} : null,
				scroe: bracket.finalScore
			})
		})

		console.log("round siwe = " + room.brackets[room.brackets.length - 1].length);

		if (room.brackets[room.brackets.length - 1].length === 1) {
			this.send(bracket.winner!.ws, {
				type: "tourny_won",
				message: "Congrats, you won this tourny!"
			})
			room.players.forEach(async (player) => {
				this.send(player.ws, {
					type: "tourny_end",
					message: "Tourny has ended",
					brackets: this.createSerializableBrackets(room.brackets),
					winner: bracket.winner ? {
						id: bracket.winner.id,
						username: bracket.winner.username || bracket.winner.id,
						avatar: bracket.winner.avatar || '/files/users/default.png',
						currentElo: bracket.winner.currentElo,
						currentTournamentElo: bracket.winner.currentTournamentElo
					} : null,
					score: bracket.finalScore
				})
				this.handleGetRoomInfo(player.ws);
				const dbUser = await db.collection("users").getOne(player.id);
				if (dbUser.status < 400 && dbUser.item.userData) {
					const isWinner = player.id === bracket.winner!.id;
					await updateTournamentStats(dbUser.item.userData, isWinner, true);

					await appendToUserDataArray(dbUser.item.userData, "pastTournaments", room.roomId);
				}
				player.ws.close(1000, "game ended");
			});
			db.collection("tournament").update(room.roomId, {
				brackets: JSON.stringify(this.createSerializableBrackets(room.brackets))
			});
			return;
		}

		db.collection("tournament").update(room.roomId, {
			brackets: JSON.stringify(this.createSerializableBrackets(room.brackets))
		});

		while (!room.brackets[room.brackets.length - 1].find((bracket) => { return bracket.winner === undefined })) {
			this.advanceBrackets(room);
		}
	}

	private async handleStart(ws: WebSocket, userId: string) {
		const room = this.findUserRoom(userId);
		console.log(room);
		if (!room || room.ownerId !== userId) {
			this.send(ws, {
				type: "missing_perms",
				message: "Either not in a tourny or not owner of said tourny"
			})
			return;
		}

		await this.startRoom(room);
	}

	private handleGetRoomInfo(ws: WebSocket) {
		const roomId = ws.roomId
		const room = this.tournyRooms.get(roomId || "");
		if (!roomId || !room) {
			this.send(ws, {
				type: "not_in_tourny",
				message: "You are not in any tournament"
			});
			return;
		}
		/* const room = this.findUserRoom(userId);
		if (!room) {
			this.send(ws, {
				type: "not_in_tourny",
				message: "You are not in any tournament"
			});
			return;
		} */

		const roomInfo = {
			type: "tourny_info",
			roomId: room.roomId,
			ownerId: room.ownerId,
			locked: room.locked,
			num_players: room.num_players,
			current_players: room.players.length,
			players: room.players.map(p => ({
				id: p.id,
				username: p.username || p.id,
				avatar: p.avatar || '/files/users/default.png'
			})),
			brackets: this.createSerializableBrackets(room.brackets),
			canStart: room.players.length >= 2 && room.players.length <= room.num_players && !room.locked
		};

		this.send(ws, roomInfo);
	}

	private findUserRoom(userId: string): TournyRoom | null {
		for (const room of this.tournyRooms.values()) {
			if (room.players.some(p => p.id === userId)) {
				return room;
			}
		}
		return null;
	}

	private async handleMessage(ws: WebSocket, userId: string, message: any) {
		switch (message.type) {
			case "start":
				await this.handleStart(ws, userId);
				break;

			case "getRoomInfo":
				this.handleGetRoomInfo(ws);
				break;

			default:
				console.log("wierd ahhhh message: " + message.type)
		}
	}

	public handleConnection(ws: WebSocket, userId: string) {
		ws.on("message", (data: Buffer) => {
			try {
				const message = JSON.parse(data.toString());
				this.handleMessage(ws, userId, message).catch(err => {
					console.error("Error handling message:", err);
				});
			} catch (err) {
				console.error(err);
			}
		})
		ws.on("close", (code: number, reason: Buffer) => {
			const message = reason.toString();
			this.handleDisconnect(ws, userId, code, message);
		})
	}

	private handleDisconnect(ws: WebSocket, userId: string, code: number, reason: string) {
		const roomId = ws.roomId;

		console.log("User leaving with roomId set to:");
		console.log(roomId);
		const room = this.tournyRooms.get(ws.roomId || "");
		if (room) {
			if (room.locked && code === 1000) {
				const existingPlayer = room.players.find(p => p.id === userId);
				if (existingPlayer) {
					existingPlayer.left = true
					room.players.forEach(player => {
						this.send(player.ws, {
							type: "player_left",
							message: "A player left the tournament",
							userId: existingPlayer.id
						});
					})
				}
			} else {
				const existingPlayerIndex = room.players.findIndex(p => p.id === userId);
				if (existingPlayerIndex !== -1) {
					const userId = room.players.at(existingPlayerIndex)!.id;
					room.players.splice(existingPlayerIndex, 1);
					room.players.forEach(player => {
						this.send(player.ws, {
							type: "player_left",
							message: "A player left the tournament",
							userId: userId
						});
					})
					if (userId === room.ownerId && room.players.length > 0) {
						this.send(room.players[0].ws, {
							type: "ownership_transfer",
							message: "you are now owner of this tournament",
						})
						room.ownerId = room.players[0].id
					}
				}
			}
			if (room.players.length === 0 || room.players.find(player => player.left === false) === undefined) {
				this.tournyRooms.delete(room.roomId);
				console.log("deleted tourny room because empty");
			}
		}
	}

	private send(ws: WebSocket, data: any) {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(data));
		}
	}
}

const tournySystem = new TournySystem();
export default tournySystem;