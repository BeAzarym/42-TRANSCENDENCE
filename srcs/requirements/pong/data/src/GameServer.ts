import { WebSocket } from "ws"
import crypto from "node:crypto"
import assert from "assert"
import tournySystem from "./Tourny"
import DataBase from "database-sdk"

const db = new DataBase();

async function appendToUserDataArray(userDataId: string, fieldName: string, newValue: string): Promise<void> {
	try {
		const dbUserData = await db.collection("userData").getOne(userDataId);
		if (dbUserData.status > 399) return;

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

async function updateGameStats(userId: string, won: boolean, newElo: number) {
	try {
		const userDataIdResponse = await db.collection("users").getOne(userId);
		if (userDataIdResponse.error || !userDataIdResponse.item) return;
		const userDataId = userDataIdResponse.item;
		const userDataResponse = await db.collection("userData").getOne(userDataId.userData);
		if (userDataResponse.error || !userDataResponse.item) return;
		const userData = userDataResponse.item;

		const prevStreak = Number(userData.currentStreak || 0);
		let currentStreak: number;
		if (won) {
			currentStreak = prevStreak >= 0 ? prevStreak + 1 : 0;
		} else {
			currentStreak = prevStreak <= 0 ? prevStreak - 1 : 0;
		}

		let highestStreak = Number(userData.highestStreak || 0);
		if (currentStreak > 0 && currentStreak > highestStreak) highestStreak = currentStreak;
		const highestElo = Math.max(userData.highestElo || 1000, newElo);

		await db.collection("userData").update(userDataId.userData, {
			totalGamePlayed: (userData.totalGamePlayed) + 1,
			totalGameWin: (userData.totalGameWin) + (won ? 1 : 0),
			totalGameLoose: (userData.totalGameLoose) + (won ? 0 : 1),
			currentStreak,
			highestStreak,
			currentElo: newElo,
			highestElo
		});
	} catch (error) {
		console.error("Error updating game statistics:", error);
	}
}

interface Player {
	id: string,
	username?: string,
	avatar?: string,
	currentRoom: string | null,
	ws: WebSocket,
	currentElo: number,
	paddle?: {
		x: number,
		y: number,
		direction: number,
		height: number,
		width: number
	},
	ready: boolean
	left: boolean
}

interface vec2 {
	x: number,
	y: number
}

interface Ball {
	x: number,
	y: number,
	v: vec2,

}

interface GameRoom {
	ball: Ball
	players: Player[],
	roomId: string,
	mapSize: { x: number, y: number },
	gameState?: {
		type: string,
		score: number[]
	}
	lastUpdate: number,
	tournyId?: string
}

type Paddle = NonNullable<Player["paddle"]>;
type Collision = {
	t: number;
	nx: number;
	ny: number;
	type: "paddle" | "wall";
	index?: number;
	player?: Player;
	hitX: number;
	hitY: number
};

class PongGameServer {
	private waitingPlayers: Player[];
	private gameRooms: Map<string, GameRoom>;
	private gameIntervalLoop?: NodeJS.Timeout;

	private readonly FPS = 120;
	private readonly INTERVAL_UPDATE = 1000 / this.FPS;

	private readonly BALL_RADIUS = 2.5;
	private readonly INIT_BALL_SPEED = 200;
	private readonly PADDLE_SPEED = 5;

	constructor() {
		this.waitingPlayers = [];
		this.gameRooms = new Map();
		this.gameIntervalLoop;
		this.gameServerLoop();
	}

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

	private gameServerLoop() {

		this.gameIntervalLoop = setInterval(() => {
			const now = Date.now();

			for (const room of this.gameRooms.values()) {
				if (room.gameState && room.gameState.type === "play") {
					if (!room.lastUpdate || (now - room.lastUpdate) > 250) {
						room.lastUpdate = now;
						continue;
					}

					// Clamp dtime to avoid huge steps (helps with tunneling)
					const dtime = Math.min((now - room.lastUpdate) / 1000, 0.05);
					this.updateRoom(room, dtime);
					room.lastUpdate = now;
				}
			}
		}, this.INTERVAL_UPDATE);
	}

	public hasGame(gameId: string) {
		return (this.gameRooms.has(gameId));
	}

	public async joinGame(ws: WebSocket, gameId: string, userId: string) {
		const userInfo = await this.getUserInfo(userId);

		const player: Player = {
			ready: false,
			id: userId,
			username: userInfo.username,
			avatar: userInfo.avatar,
			currentRoom: null,
			ws: ws,
			currentElo: 1000,
			left: false
		};
		const room = this.gameRooms.get(gameId);
		if (!room) {
			this.send(ws, {
				type: "not_found",
				message: "No game found with id " + gameId
			})
			return;
		}

		if (room.players.find(player => player.id === userId) !== undefined) {
			this.send(ws, {
				type: "already_in_game",
				message: "ts guy really thought he was gonna play himself (gulp)"
			});
		}
		if (room.players.length == 2) {
			this.send(ws, {
				"type": "game_full",
			})
			return;
		}

		room.players.push(player);
		ws.roomId = gameId;

		if (room.players.length == 2) {
			room.players.forEach((player, index) => {
				this.send(player.ws, {
					type: "game_found",
					roomId: gameId,
					playerIndex: index,
					opponenet: room.players[1 - index].id
				})
			})
		}

		console.log(this.gameRooms);
	}

	public createBlankGame(tournyId?: string) {
		const roomId = crypto.randomBytes(10).toString("hex");
		const room: GameRoom = {
			players: [],
			roomId: roomId,
			mapSize: {
				x: 640,
				y: 320
			},
			gameState: {
				type: "idle",
				score: [0, 0]
			},
			lastUpdate: Date.now(),
			ball: {
				x: 320,
				y: 160,
				v: { x: 0, y: 0 }
			},
			tournyId: tournyId
		}

		room.ball = this.createBall(room);

		this.gameRooms.set(roomId, room);
		return (roomId)
	}

	private rayVsExpandedAABB(prevX: number, prevY: number, dx: number, dy: number, minX: number, minY: number, maxX: number, maxY: number) {
		let tminX: number, tmaxX: number, tminY: number, tmaxY: number;

		if (dx !== 0) {
			const tx1 = (minX - prevX) / dx;
			const tx2 = (maxX - prevX) / dx;
			tminX = Math.min(tx1, tx2);
			tmaxX = Math.max(tx1, tx2);
		} else {
			if (prevX < minX || prevX > maxX) return null;
			tminX = -Infinity;
			tmaxX = Infinity;
		}

		if (dy !== 0) {
			const ty1 = (minY - prevY) / dy;
			const ty2 = (maxY - prevY) / dy;
			tminY = Math.min(ty1, ty2);
			tmaxY = Math.max(ty1, ty2);
		} else {
			if (prevY < minY || prevY > maxY) return null;
			tminY = -Infinity;
			tmaxY = Infinity;
		}

		const tEnter = Math.max(tminX, tminY);
		const tExit = Math.min(tmaxX, tmaxY);

		if (tExit < 0 || tEnter > tExit || tEnter > 1 || tEnter < 0) return null;

		let nx = 0, ny = 0;
		if (tminX > tminY) {
			nx = dx > 0 ? -1 : 1;
		} else {
			ny = dy > 0 ? -1 : 1;
		}
		return { t: tEnter, nx, ny };
	}

	private applyPaddleResponse(room: GameRoom, player: Player, index: number, prevVy: number) {
		const ball = room.ball;

		const paddle = player.paddle!;
		let rel = (ball.y - paddle.y) / (paddle.height / 2);
		rel = Math.max(-1, Math.min(1, rel));

		const dir = index === 0 ? 1 : -1;
		const incomingSpeed = Math.hypot(ball.v.x, ball.v.y);

		let vx = Math.abs(ball.v.x) * dir;
		let vy = ball.v.y;

		const CONTROL = 0.8;
		vy += rel * this.INIT_BALL_SPEED * CONTROL;

		const vxl = Math.abs(vx);
		const angleRaw = Math.atan2(vy, vxl);
		const desiredVySign = prevVy !== 0 ? -Math.sign(prevVy) : Math.sign(rel);
		const angleDesired = desiredVySign === 0 ? angleRaw : (Math.sign(desiredVySign) * Math.abs(angleRaw));
		const BIAS = 0.3;
		let angle = (1 - BIAS) * angleRaw + BIAS * angleDesired;

		const MAX_BOUNCE_ANGLE = Math.PI / 4;
		angle = Math.max(-MAX_BOUNCE_ANGLE, Math.min(MAX_BOUNCE_ANGLE, angle));

		const targetSpeed = Math.max(incomingSpeed * 1.05, this.INIT_BALL_SPEED * 0.75);
		let vxl2 = Math.cos(angle) * targetSpeed;
		let vyl2 = Math.sin(angle) * targetSpeed;

		vx = dir * vxl2;
		vy = vyl2;

		const MIN_HORIZ_FRAC = 0.6;
		const minVx = MIN_HORIZ_FRAC * targetSpeed;
		if (Math.abs(vx) < minVx) {
			vx = (Math.sign(vx) || dir) * minVx;
			vy = Math.sign(vy || 1) * Math.sqrt(Math.max(0, targetSpeed * targetSpeed - vx * vx));
		}

		ball.v.x = vx;
		ball.v.y = vy;
	}

	private updateBall(room: GameRoom, dtime: number) {
		const ball = room.ball;

		let remaining = dtime;
		let iterations = 0;

		while (remaining > 1e-6 && iterations < 3) {
			const prevX = ball.x;
			const prevY = ball.y;
			const dx = ball.v.x * remaining;
			const dy = ball.v.y * remaining;

			let best: Collision | null = null;

			for (let index = 0; index < room.players.length; index++) {
				const player = room.players[index];
				if (!player.paddle) continue;
				const pad = player.paddle as Paddle;

				const minX = pad.x - this.BALL_RADIUS;
				const maxX = pad.x + pad.width + this.BALL_RADIUS;
				const minY = pad.y - pad.height / 2 - this.BALL_RADIUS;
				const maxY = pad.y + pad.height / 2 + this.BALL_RADIUS;

				const hit = this.rayVsExpandedAABB(prevX, prevY, dx, dy, minX, minY, maxX, maxY);
				if (hit) {
					const hitX = prevX + dx * hit.t;
					const hitY = prevY + dy * hit.t;
					if (best === null || hit.t < best.t) {
						best = { t: hit.t, nx: hit.nx, ny: hit.ny, type: "paddle", index, player, hitX, hitY };
					}
				}
			}

			if (dy < 0) {
				const tTop = (this.BALL_RADIUS - prevY) / dy;
				if (tTop >= 0 && tTop <= 1) {
					const hitX = prevX + dx * tTop;
					const hitY = this.BALL_RADIUS;
					if (best === null || tTop < best.t) {
						best = { t: tTop, nx: 0, ny: 1, type: "wall", hitX, hitY };
					}
				}
			} else if (dy > 0) {
				const bottomY = room.mapSize.y - this.BALL_RADIUS;
				const tBot = (bottomY - prevY) / dy;
				if (tBot >= 0 && tBot <= 1) {
					const hitX = prevX + dx * tBot;
					const hitY = bottomY;
					if (best === null || tBot < best.t) {
						best = { t: tBot, nx: 0, ny: -1, type: "wall", hitX, hitY };
					}
				}
			}

			if (best === null) {
				ball.x += dx;
				ball.y += dy;
				break;
			}

			const EPS = 0.05;
			ball.x = best.hitX + best.nx * EPS;
			ball.y = best.hitY + best.ny * EPS;

			if (best.type === "wall") {
				ball.v.y = -ball.v.y;
			} else if (best.type === "paddle") {
				const prevVy = ball.v.y;
				if (Math.abs(best.ny) > 0 && Math.abs(best.nx) === 0) {
					ball.v.y = -ball.v.y;
				} else {
					this.applyPaddleResponse(room, best.player!, best.index!, prevVy);
				}
			}

			const rem = remaining * (1 - best.t);
			ball.x += ball.v.x * rem;
			ball.y += ball.v.y * rem;
			remaining = 0;
			iterations++;
		}
	}

	private async dbAddGameToPast(room: GameRoom, userId: string) {
		try {
			const dbUser = await db.collection("users").getOne(userId);
			if (dbUser.status >= 400) {
				return;
			}

			let userDataId = dbUser.item.userData;
			if (!userDataId) {
				try {
					const newUserData = await db.collection("userData").create({
						pastGames: JSON.stringify([room.roomId])
					});

					await db.collection("users").update(userId, {
						userData: newUserData.item.id
					});

					return;
				} catch (createError) {
					return;
				}
			}

			const dbUserData = await db.collection("userData").getOne(userDataId);
			if (!dbUserData) {
				return;
			}

			await appendToUserDataArray(userDataId, 'pastGames', room.roomId);

		} catch (error) {
		}
	}

	private async checkScore(room: GameRoom) {
		const ball = room.ball;
		if (!room.gameState) {
			return;
		}

		if (ball.x > room.mapSize.x) {
			room.gameState.score[0]++;
			db.collection("games").update(room.roomId, {
				score: JSON.stringify(room.gameState.score)
			}).catch(error => {
				console.error("Failed to update game score:", error.message);
			});
			this.resetBall(room, -1);
		} else if (ball.x < 0) {
			room.gameState.score[1]++;
			db.collection("games").update(room.roomId, {
				score: JSON.stringify(room.gameState.score)
			}).catch(error => {
				console.error("Failed to update game score:", error.message);
			});
			this.resetBall(room, 1);
		}

		if (room.gameState.score[0] >= 7 || room.gameState.score[1] >= 7) {
			room.gameState.type = "finished";

			if (!room.tournyId) {
				const winner = room.gameState.score[0] >= 7 ? room.players[0] : room.players[1];
				const loser = room.gameState.score[0] >= 7 ? room.players[1] : room.players[0];

				await updateGameStats(winner.id, true, room.players[1].currentElo);
				await updateGameStats(loser.id, false, room.players[0].currentElo);
			}

			room.players.forEach(player => {
				this.dbAddGameToPast(room, player.id);
				this.send(player.ws, {
					type: "game_end",
					score: room.gameState?.score,
				})
				this.getRoomInfo(player.ws);
			})

			console.log("ended game:");
			console.log(room);

			if (room.tournyId) {
				tournySystem.reportGameScore(
					room.tournyId,
					room.roomId,
					room.gameState.score,
					room.gameState.score[0] >= 7 ? room.players[0].id : room.players[1].id
				);
			}
			this.gameRooms.delete(room.roomId);
		}
	}

	private resetBall(room: GameRoom, dir: number) {
		room.ball = this.createBall(room);
		room.ball.v.x = Math.abs(room.ball.v.x) * dir;
	}

	private createBall(room: GameRoom): Ball {
		return ({
			x: room.mapSize.x / 2,
			y: room.mapSize.y / 2,
			v: {
				x: (Math.random() > 0.5 ? 1 : -1) * this.INIT_BALL_SPEED,
				y: (Math.random() - 0.5) * this.INIT_BALL_SPEED
			}
		})
	}

	private updateRoom(room: GameRoom, dtime: number) {
		this.updatePaddles(room, dtime);
		this.updateBall(room, dtime);
		this.checkScore(room).catch(error => {
			console.error("Error in checkScore:", error);
		});

		assert(room.gameState, "how tf did this get undefined :(");
		const gameState = {
			score: room.gameState.score,
			ball: room.ball,
			players: room.players.map(player => ({
				userId: player.id,
				paddle: player.paddle,
			}))
		}

		room.players.forEach((player) => {
			this.send(player.ws, {
				type: "state_update",
				state: gameState
			})
		})
	}

	private updatePaddles(room: GameRoom, dtime: number) {
		room.players.forEach(player => {
			if (player.paddle && player.paddle.direction !== undefined) {
				const movement = player.paddle.direction * this.PADDLE_SPEED * dtime * 60;
				const newY = player.paddle.y + movement;

				const minY = player.paddle.height / 2;
				const maxY = room.mapSize.y - (player.paddle.height / 2);

				player.paddle.y = Math.max(minY, Math.min(maxY, newY));
			}
		});
	}

	private handlePaddleMove(ws: WebSocket, userId: string, message: any) {
		const room = this.getGameRoom(userId);
		if (!room || !room.gameState || room.gameState.type !== "play") return;

		const player = room.players.find(p => p.id === userId);
		if (!player || !player.paddle) return;

		if (message.paddleDirection === "up") {
			player.paddle.direction = -1;
		} else if (message.paddleDirection === "down") {
			player.paddle.direction = 1;
		} else if (message.paddleDirection === "stop") {
			player.paddle.direction = 0;
		}
	}

	public handleConnection(ws: WebSocket, userId: string) {
		console.log(`[PONG] [handleConnection] new user: ${userId}`);
		ws.on("message", (data: Buffer) => {
			try {
				const message = JSON.parse(data.toString());
				this.handleMessage(ws, userId, message).catch(console.error);
			}
			catch (err) {
				console.error(err);
			}
		});
		ws.on("close", (code) => {
			if (code === 1000)
				this.handleLeaving(ws, userId);
			else {
				this.handleUnexpectedDisconnect(userId);
			}
		})

		const reconGame = this.getGameRoom(userId);
		if (reconGame) {
			this.send(ws, {
				type: "reconnect_to_game",
				message: "Rejoin ongoing game?",
				roomId: reconGame.roomId
			})
		} else {
			this.send(ws, {
				type: "connected",
			})
		}
	}

	public handleConnectionManual(ws: WebSocket, userId: string) {
		console.log(`[PONG] [handleConnection] new user: ${userId}`);
		ws.on("message", (data: Buffer) => {
			try {
				const message = JSON.parse(data.toString());
				this.handleMessage(ws, userId, message).catch(console.error);
			}
			catch (err) {
				console.error(err);
			}
		});
		ws.on("close", (code) => {
			if (code === 1000)
				this.handleLeaving(ws, userId);
			else {
				this.handleUnexpectedDisconnect(userId);
			}
		})

		this.send(ws, {
			type: "connected",
		})
	}

	private async handleJoinQueue(ws: WebSocket, userId: string, message: any) {
		const userInfo = await this.getUserInfo(userId);

		const player: Player = {
			ready: false,
			id: userId,
			username: userInfo.username,
			avatar: userInfo.avatar,
			currentRoom: null,
			ws: ws,
			currentElo: 1000,
			left: false
		};


		if (this.waitingPlayers.find(player => player.id === userId)) {
			this.send(ws, {
				type: "already_in_queue",
				message: "what would actually happen if you won *thinking emoji*"
			})
			return;
		}

		this.waitingPlayers.push(player);
		for (const player of this.waitingPlayers) {
			this.updateQueueCount(player.ws);
		}
		if (this.waitingPlayers.length >= 2) {
			this.createRoom();
		} else {
			this.send(ws, {
				type: "in_queue",
				message: "You are in queue ! Waiting for another player...",
			})
		}
	}

	private createRoom() {
		const player1 = this.waitingPlayers.shift()!;
		const player2 = this.waitingPlayers.shift()!;

		const roomId = crypto.randomBytes(10).toString("hex");
		const room: GameRoom = {
			players: [player1, player2],
			roomId: roomId,
			mapSize: {
				x: 640,
				y: 320
			},
			gameState: {
				type: "idle",
				score: [0, 0]
			},
			lastUpdate: Date.now(),
			ball: {
				x: 320,
				y: 160,
				v: { x: 0, y: 0 }
			}
		}

		room.ball = this.createBall(room);
		console.log(room);

		this.gameRooms.set(roomId, room);

		room.players.forEach((player, index) => {
			this.send(player.ws, {
				type: "game_found",
				roomId: roomId,
				playerIndex: index,
				opponenet: room.players[1 - index].id
			})
			player.ws.roomId = roomId;

			for (const player of this.waitingPlayers) {
				this.updateQueueCount(player.ws);
			}
		})
	}

	private getGameRoom(userId: string): GameRoom | undefined {
		for (const room of this.gameRooms.values()) {
			if (room.players.find(player => { return (player.id === userId && player.left === false) })) {
				return room
			}
		}
		return undefined;
	}

	private handleReady(ws: WebSocket, userId: string) {
		const roomId = ws.roomId || ""
		const room: GameRoom | undefined = this.gameRooms.get(roomId);
		if (!room) {
			this.send(ws, {
				type: "not_in_game",
				message: "Can't ready up if not in a game"
			})
			return;
		}

		for (const player of room.players.values()) {
			if (player.id === userId) {
				player.ready = true;

				const playerIndex = room.players.findIndex(p => p.id === player.id);
				player.paddle = {
					x: playerIndex === 0 ? 10 : room.mapSize.x - 10 - 10,
					y: room.mapSize.y / 2,
					height: 60,
					width: 10,
					direction: 0
				};

				room.players.forEach((player) => {
					this.getRoomInfo(player.ws);
				});
			}
		}


		if (room.players.length == 2 && room.players[0].ready && room.players[1].ready && room.gameState) {
			db.collection("games").create({
				id: room.roomId,
				players: JSON.stringify([room.players[0].id, room.players[1].id]),
				score: JSON.stringify([0, 0]),
				tournyId: room.tournyId
			}).catch(error => {
				console.error("Failed to create game record:", error.message);
			});
			room.gameState.type = "play";
		}
	}

	private handleReconnect(ws: WebSocket, userId: string) {
		const reconGame = this.getGameRoom(userId);
		if (!reconGame) {
			this.send(ws, {
				type: "not_in_game",
				message: "Not in any active games"
			})
			return;
		}
		reconGame.players.forEach(player => {
			if (player.id === userId) {
				player.ws = ws;
				player.ready = true;
			}
		})
	}

	private updateQueueCount(ws: WebSocket) {
		const playerCount = this.waitingPlayers.length;

		this.send(ws, {
			type: "updateQueueCount",
			playersinQueue: playerCount,
			message: "You are in queue ! Waiting for another player...",
		})
	}

	private async handleMessage(ws: WebSocket, userId: string, message: any) {
		switch (message.type) {
			case "join_queue":
				await this.handleJoinQueue(ws, userId, message);
				break;

			case "ready":
				this.handleReady(ws, userId);
				break;

			case "reconnect":
				this.handleReconnect(ws, userId);
				break;

			case "getRoomInfo":
				await this.getRoomInfo(ws);
				break;

			case "paddle_move":
				this.handlePaddleMove(ws, userId, message);
				break;

			default:
				console.log("wierd ahhhh message: " + message.type)
		}
	}

	public async getRoomInfo(ws: WebSocket): Promise<void> {
		const roomId = ws.roomId || ""
		const room: GameRoom | undefined = this.gameRooms.get(roomId);
		if (!room) {
			this.send(ws, {
				type: "not_in_game",
				message: "Can't find room Information"
			})
			return;
		}

		const playersWithUsernames = room.players.map(player => ({
			id: player.id,
			username: player.username,
			avatar: player.avatar || '/files/users/default.png',
			ready: player.ready,
			currentElo: player.currentElo,
			paddle: player.paddle,
			currentRoom: player.currentRoom
		}));

		this.send(ws, {
			type: "room_info",
			id: room.roomId,
			players: playersWithUsernames,
			gameState: room.gameState,
			lastUpdate: room.lastUpdate,
			tournyId: room.tournyId || null
		});
	}


	private handleUnexpectedDisconnect(userID: string) {
		const index = this.waitingPlayers.findIndex((player) => { return player.id === userID })
		if (index !== -1) {
			this.waitingPlayers.splice(index, 1);
		}

		this.gameRooms.forEach((gameRoom) => {
			const index2 = gameRoom.players.findIndex((player) => { return player.id === userID });

			if (index2 !== -1) {
				gameRoom.players[index2].ready = false;

				const otherPlayerIndex = 1 - index2;
				if (gameRoom.players[otherPlayerIndex]) {
					this.send(gameRoom.players[otherPlayerIndex].ws, {
						type: "opponent_lost",
						message: "Opponent disconnected..."
					});
				}
			}
		})
		console.log("disconnected player: " + userID);
	}

	private handleLeaving(ws: WebSocket, userID: string) {
		const roomId = ws.roomId || "";
		console.log("leaving room");
		if (roomId === "") {
			const index = this.waitingPlayers.findIndex((player) => { return player.id === userID })
			if (index !== -1) {
				this.waitingPlayers.splice(index, 1);
			}
		} else {
			console.log("with room id: " + roomId);
			const room = this.gameRooms.get(roomId);
			if (!room) return;
			const index = room.players.findIndex(player => player.id === userID);
			console.log("found user");
			if (index !== -1) {
				room.players.at(index)!.left = true;
				const otherPlayer = room.players.at((index - 1) * -1)!;

				this.send(otherPlayer.ws, {
					type: "opponent_left",
					message: "Opponent left the game"
				});
				if (room.gameState! && room.gameState.type === "idle") {
					console.log("aborting game");
					this.send(otherPlayer.ws, {
						type: "game_aborted",
						message: "Game was aborted before starting"
					})
					this.gameRooms.delete(roomId);
				} else if (room.gameState && room.gameState.type !== "idle" && room.gameState.type !== "finished") {
					console.log("forfeiting game")
					room.gameState.score[(index - 1) * -1] = 7;
					room.gameState.score[index] = 0;
					room.ball = {
						x: 320,
						y: 160,
						v: { x: 0, y: 0 }
					}
					this.send(otherPlayer.ws, {
						type: "game_forfeited",
						message: "Opponent forfeited the game"
					});
				}
			}
		}
		/* const index = this.waitingPlayers.findIndex((player) => { return player.id === userID })
		if (index !== -1) {
			this.waitingPlayers.splice(index, 1);
		}



		this.gameRooms.forEach((gameRoom, roomId) => {
			const index2 = gameRoom.players.findIndex((player) => { return player.id === userID });

			if (index2 !== -1) {
				gameRoom.players.splice(index2, 1);

				if (gameRoom.players.length === 0) {
					this.gameRooms.delete(roomId);
				} else {
					gameRoom.players.forEach(remainingPlayer => {
						remainingPlayer.ready = false;
						this.send(remainingPlayer.ws, {
							type: "opponent_left",
							message: "Opponent left the game"
						});
					});
				}
			}
		}) */
		console.log("player left voluntarily: " + userID);
	}

	private send(ws: WebSocket, data: any) {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(data));
		}
	}

	public shutdown() {
		if (this.gameIntervalLoop) {
			clearInterval(this.gameIntervalLoop);
		}
	}
}

var pongGameServer = new PongGameServer();

process.on("beforeExit", (code) => {
	pongGameServer.shutdown();
})

export default pongGameServer;