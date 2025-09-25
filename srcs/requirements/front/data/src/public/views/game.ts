import { renderNavbar } from "./navbar";
import { navigate } from "../main";
import { showNotification } from "../utils/notifications";

interface UserData {
	id: string;
	username?: string;
	email?: string;
}

interface StatusInterface {
	divId: string
	status: string
};

interface divEditInterface {
	divId: string
	mode: "add" | "remove"
	parameter: string
}

type updateStatusTextProps = Array<StatusInterface>

type divEditProps = Array<divEditInterface>

let gameSocket: WebSocket;
let currentUserId: string | null = null;

export function updateStatusTexts(updateStatusTexts: updateStatusTextProps): void {
	updateStatusTexts.forEach((item: { divId: string; status: string; }) => {
		updateStatusText(item.divId, item.status)
	});
}

function editDivClass(divArray: divEditProps): void {
	divArray.forEach((item: { divId: string; mode: "add" | "remove"; parameter: string; }) => {
		updateDivClass(item.divId, item.mode, item.parameter)
	});
}

function updateDivClass(divId: string, mode: "add" | "remove", parameter: string) {
	const div = document.getElementById(divId);
	if (div) {
		if (mode === "add") {
			div.classList.add(parameter);
		}
		else {
			div.classList.remove(parameter);
		}
	}
}

function updateStatusText(divId: string, status: string): void {
	const div = document.getElementById(divId);
	if (div) {
		div.textContent = status;
		return;
	}
	console.error("[UpdateStatusText] Unknow div ", divId);
}

function updatePlayerStatusUI(isReady: boolean): void {
	const statusText = document.getElementById("statusText");
	const statusToggle = document.getElementById("statusToggle");

	if (statusText) {
		if (isReady) {
			statusText.textContent = "Ready";
			statusText.className = "text-sm text-green-600 font-mono";
		} else {
			statusText.textContent = "Not Ready";
			statusText.className = "text-sm text-red-600 font-mono";
		}
	}

	if (statusToggle) {
		if (isReady) {
			statusToggle.className = "flex items-center justify-center w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors duration-200 ml-2";
			statusToggle.innerHTML = `
				<svg class="w-4 h-4 text-red-600" viewBox="0 0 16 16" fill="currentColor">
					<path fill-rule="evenodd" clip-rule="evenodd" d="M15 1H1V15H15V1ZM4.29289 5.70711L6.58579 8L4.29289 10.2929L5.70711 11.7071L8 9.41421L10.2929 11.7071L11.7071 10.2929L9.41421 8L11.7071 5.70711L10.2929 4.29289L8 6.58579L5.70711 4.29289L4.29289 5.70711Z"/>
				</svg>
			`;
		} else {
			statusToggle.className = "flex items-center justify-center w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors duration-200 ml-2";
			statusToggle.innerHTML = `
				<svg class="w-4 h-4 text-green-600" viewBox="0 0 16 16" fill="currentColor">
					<path fill-rule="evenodd" clip-rule="evenodd" d="M15 1H1V15H15V1ZM12.7071 5.70711L11.2929 4.29289L6.5 9.08579L4.70711 7.29289L3.29289 8.70711L6.5 11.9142L12.7071 5.70711Z"/>
				</svg>
			`;
		}
	}
}

function wsUrl(path: string): string {
	const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
	return `${protocol}//${location.host}${path}`;
}

function showGameEndSummary(msg: any): void {
	// Determine winner based on score (player with score of 7 wins)
	const score = msg.gameState?.score || [0, 0];
	const winnerIndex = score[0] === 7 ? 0 : score[1] === 7 ? 1 : -1;
	let isTournament: boolean;
	console.log("DEBUG TOURNY ID", msg);
	// Check if this is a tournament game
	if (msg.tournyId === null || msg.tournyId === undefined)
		isTournament = false;
	else { 
		isTournament = true;
	}

	// Use players data from the message
	const gamePlayersData = msg.players || [];
	const player1 = gamePlayersData[0];
	const player2 = gamePlayersData[1];

	const winnerName = winnerIndex >= 0 ? gamePlayersData[winnerIndex]?.username || gamePlayersData[winnerIndex]?.id || 'Unknown Player' : 'Draw';

	const app = document.getElementById("app");
	if (app) {
		// Create overlay
		const overlay = document.createElement('div');
		overlay.id = 'gameEndOverlay';
		overlay.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
		overlay.innerHTML = `
			<div class="bg-slate-200 rounded-lg shadow-xl border-2 border-slate-300 p-6 max-w-md w-full mx-4">
				<!-- Title -->
				<div class="text-center mb-6">
					<h2 class="text-2xl font-bold text-slate-800 mb-2">${isTournament ? '⚔️ Match de Tournoi Terminé !' : '🎉 Partie Terminée !'}</h2>
					<p class="text-lg text-slate-700">
						<span class="font-semibold text-green-600">${winnerName}</span> a gagné !
					</p>
					${isTournament ? '<p class="text-sm text-slate-600 mt-2">Retour au tournoi dans 5 secondes...</p>' : ''}
				</div>

				<!-- Players vs Section -->
				<div class="bg-slate-100 rounded-md p-4 mb-4 border border-slate-300">
					<div class="flex items-center justify-between">
						<!-- Player 1 -->
						<div class="flex items-center space-x-3">
							<img src="/user/avatar/${player1.id}" || '/files/users/default.png'}" 
								 alt="${player1.username || 'Player 1'}" 
								 class="w-12 h-12 rounded-full object-cover border-2 ${winnerIndex === 0 ? 'border-green-500' : 'border-slate-300'}"
								 onerror="this.src='/files/users/default.png'">
							<div>
								<p class="font-medium text-slate-800">${player1.username || player1.id || 'Player 1'}</p>
								<p class="text-sm text-slate-600">Joueur 1</p>
							</div>
						</div>
						
						<!-- VS -->
						<div class="px-4">
							<p class="text-lg font-bold text-slate-600">VS</p>
						</div>
						
						<!-- Player 2 -->
						<div class="flex items-center space-x-3">
							<div class="text-right">
								<p class="font-medium text-slate-800">${player2.username || player2.id || 'Player 2'}</p>
								<p class="text-sm text-slate-600">Joueur 2</p>
							</div>
							<img src="/user/avatar/${player2.id}" || '/files/users/default.png'}" 
								 alt="${player2.username || 'Player 2'}" 
								 class="w-12 h-12 rounded-full object-cover border-2 ${winnerIndex === 1 ? 'border-green-500' : 'border-slate-300'}"
								 onerror="this.src='/files/users/default.png'">
						</div>
					</div>
				</div>

				<!-- Score Recap -->
				<div class="bg-slate-100 rounded-md p-4 mb-6 border border-slate-300">
					<h3 class="text-lg font-semibold text-slate-800 mb-3 text-center">Score Final</h3>
					<div class="flex justify-center items-center space-x-6">
						<div class="text-center">
							<p class="text-2xl font-bold text-slate-900">${score[0]}</p>
							<p class="text-sm text-slate-600">${player1.username || player1.id || 'Player 1'}</p>
						</div>
						<div class="text-xl font-bold text-slate-500">-</div>
						<div class="text-center">
							<p class="text-2xl font-bold text-slate-900">${score[1]}</p>
							<p class="text-sm text-slate-600">${player2.username || player2.id || 'Player 2'}</p>
						</div>
					</div>
				</div>

				<!-- Leave Button (only show if not tournament) -->
				${!isTournament ? `
					<div class="text-center">
						<button id="leaveGameBtn" class="bg-slate-600 hover:bg-slate-800 text-white px-6 py-3 rounded-md transition-colors duration-200 font-medium">
							Retour au menu
						</button>
					</div>
				` : ''}
			</div>
		`;

		app.appendChild(overlay);

		if (isTournament) {
			// Auto-close after 5 seconds for tournament games
			setTimeout(() => {
				if (overlay && overlay.parentNode) {
					overlay.remove();
				}
			}, 5000);
		} else {
			// Add event listener for leave button (regular games only)
			const leaveBtn = document.getElementById('leaveGameBtn');
			if (leaveBtn) {
				leaveBtn.addEventListener('click', () => {
					overlay.remove();
					navigate('/play');
				});
			}

			// Close on overlay click (regular games only)
			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) {
					overlay.remove();
					navigate('/play');
				}
			});
		}
	}
}


export function renderGame(root: HTMLElement, navigate: (path: string) => void): void {
	renderNavbar(navigate);
	const app = document.getElementById('app');

	if (app) {
		app.innerHTML = `
		<div class="flex justify-center items-center h-full w-full">
			<div class="bg-slate-200 rounded-md shadow-lg border-2 border-slate-300 w-full max-w-4xl mx-auto p-6">
				<div class="p-4 mb-6">
					<div class ="flex justify-center items-center mb-6">
						<h1 id="title" class="flex justify-center items-center text-2xl font-bold text-slate-900 p-2">PLAY AT PONG!</h1>
					</div>
					<div id="roomMenu" class="bg-slate-200 flex flex-col justify-center rounded-md mb-4 border-2 border-slate-300 shadow-lg hidden"></div>
					<div id="inGameMenu"></div>
					<div id="gameMenu" class="grid grid-cols-2 gap-4">
						<div class="bg-slate-50 flex flex-col justify-between rounded-md mb-4 border-2 border-slate-200 shadow-lg hover:border-slate-400">
							<h2 class="flex justify-center items-center gap-2 font-semibold py-4">
								<svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor">
									<path d="M16 0H13L3.70711 9.29289L2.20711 7.79289L0.792893 9.20711L3.08579 11.5L1.5835 13.0023C1.55586 13.0008 1.52802 13 1.5 13C0.671573 13 0 13.6716 0 14.5C0 15.3284 0.671573 16 1.5 16C2.32843 16 3 15.3284 3 14.5C3 14.472 2.99923 14.4441 2.99771 14.4165L4.5 12.9142L6.79289 15.2071L8.20711 13.7929L6.70711 12.2929L16 3V0Z"/>
								</svg>
								Play Online
							</h2>
							<div class="text-center px-4 py-4 h-16 flex items-start justify-center">
								<p class="text-md text-gray-600 font-medium">Jump in, play against anyone, and dominate the leaderboard!</p>
							</div>
							<div class="flex justify-center items-center py-4">
								<button type="button" id="matchmakingBtn" 
								class="bg-slate-600 hover:bg-slate-800 w-56 text-white py-2 px-4 rounded-md cursor-pointer transition-colors duration-200 shadow-sm flex items-center justify-center">
								<svg class="w-4 h-4 mr-2" viewBox="0 0 16 16" fill="currentColor">
									<path d="M8.1716 8.00003L3.58582 3.41424L6.41424 0.585815L13.8285 8.00003L6.41424 15.4142L3.58582 12.5858L8.1716 8.00003Z"/>
								</svg>
								Join Matchmaking</button>
							</div>
						</div>

						<div class="bg-slate-50 flex flex-col justify-between rounded-md mb-4 border-2 border-slate-200 shadow-lg hover:border-slate-400">
							<h2 class="flex justify-center items-center gap-2 font-semibold py-4">
								<svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor">
									<path fill-rule="evenodd" clip-rule="evenodd" d="M4 6V4C4 1.79086 5.79086 0 8 0C10.2091 0 12 1.79086 12 4V6H14V16H2V6H4ZM6 4C6 2.89543 6.89543 2 8 2C9.10457 2 10 2.89543 10 4V6H6V4ZM7 13V9H9V13H7Z"/>
								</svg>
								Private Match
							</h2>
							<div class="text-center px-4 py-4 h-16 flex items-start justify-center">
								<p class="text-md text-gray-600 font-medium">Host your own game and challenge your friends!</p>
							</div>
							<div class="flex justify-center items-center py-4">
								<button  type="button" id="privateBtn" 
								class="bg-slate-600 hover:bg-slate-800 w-56 text-white py-2 px-4 rounded-md cursor-pointer transition-colors duration-200 shadow-sm flex items-center justify-center">
								<svg class="w-4 h-4 mr-2" viewBox="0 0 16 16" fill="currentColor">
									<path d="M8.1716 8.00003L3.58582 3.41424L6.41424 0.585815L13.8285 8.00003L6.41424 15.4142L3.58582 12.5858L8.1716 8.00003Z"/>
								</svg>
								Join Private</button>
							</div>
						</div>
					</div>
			</div>
		</div>
    `;
	}

	fetch('/auth/checkAuth', { credentials: 'include' })
		.then((r: Response) => r.ok ? r.json() as Promise<boolean> : false)
		.then((isAuthenticated: boolean | false) => {
			if (!isAuthenticated) {
				navigate('/login');
				return;
			}
			return fetch('/auth/me', { credentials: 'include' })
				.then((userResponse: Response) => {
					if (userResponse.ok) {
						return userResponse.json();
					} else {
						navigate('/login');
						throw new Error('User not authenticated');
					}
				})
				.then((userData: UserData) => {
					(currentUserId as any) = userData.id;
					console.log("Current user ID set to:", currentUserId);
					
					const urlParams = new URLSearchParams(window.location.search);
					const joinRoomId = urlParams.get('join');
					if (joinRoomId) {
						console.log("[Game] Auto-joining game room:", joinRoomId);
						joinRoom(joinRoomId);
						loadGameWindow();
						const newUrl = window.location.pathname;
						window.history.replaceState({}, '', newUrl);
					}
				})
				.catch((error: unknown) => {
					console.error("Error fetching user data:", error);
					navigate('/login');
				});
		})
		.catch(() => navigate('/login'));

	setupListeners();
};

function setupListeners(): void {


	const matchmakingBtn = document.getElementById("matchmakingBtn");
	if (matchmakingBtn) {
		matchmakingBtn.addEventListener("click", async () => {
			updateGameMenu("Online Game");
		});
	}

	const privateBtn = document.getElementById("privateBtn");
	if (privateBtn) {
		privateBtn.addEventListener("click", async () => {
			updateGameMenu("Private Game");
		});
	}
}

export function setupInGameMenuListeners(socket: WebSocket): void {

	const statusToggle = document.getElementById("statusToggle");

	if (statusToggle) {
		statusToggle.addEventListener("click", () => {
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.send(JSON.stringify({ type: 'ready' }));
			}
		});
	}

	const copyRoomId = document.getElementById("copyRoomId");
	let roomIdText = document.getElementById("roomIdText");

	if (copyRoomId && roomIdText) {
		copyRoomId.addEventListener("click", () => {
			try {
				navigator.clipboard.writeText(roomIdText.textContent || "").then(() => {
					const popup = document.createElement('div');
					popup.textContent = 'Copied!';
					popup.className = 'absolute bg-green-600 text-white text-xs px-2 py-1 rounded-md shadow-lg z-50 transition-opacity duration-200';
					popup.style.transform = 'translateX(-50%)';
					popup.style.left = '50%';
					popup.style.bottom = '120%';

					copyRoomId.style.position = 'relative';
					copyRoomId.appendChild(popup);

					setTimeout(() => {
						if (popup.parentNode) {
							popup.parentNode.removeChild(popup);
						}
					}, 2000);
				}).catch((err: any) => {
					console.error('Failed to copy room ID: ', err);
				});
			} catch (err) {
				console.error('Clipboard not supported: ', err);
			}
		});
	}

	const leaveRoomBtn = document.getElementById("leaveRoom");
	if (leaveRoomBtn) {
		leaveRoomBtn.addEventListener("click", () => {
			leaveRoom();
		});
	}

}

function setupMatchmakingMenuListeners(): void {
	const leaveRoomBtn = document.getElementById("leaveMatchmaking");
	if (leaveRoomBtn) {
		leaveRoomBtn.addEventListener("click", () => {
			leaveRoom();
			navigate("/play");
		});
	}
}


function setupPrivateGameMenuListerners(): void {

	const createRoomBtn = document.getElementById("createRoomBtn");
	const joinRoomBtn = document.getElementById("joinRoomBtn") as HTMLButtonElement;
	const joinRoomInput = document.getElementById("joinRoomInput") as HTMLInputElement;

	if (createRoomBtn) {
		createRoomBtn.addEventListener("click", () => {
			createRoom();
			loadGameWindow();
		});
	}

	if (joinRoomBtn && joinRoomInput) {
		joinRoomBtn.addEventListener("click", () => {
			const roomId = (joinRoomInput.value || '').trim();
			if (roomId) {
				joinRoom(roomId);
				loadGameWindow();
			}
		});
	}

}

function loadPrivateGameMenu(): void {
	const roomMenu = document.getElementById("roomMenu");
	if (roomMenu) {
		roomMenu.classList.remove("hidden");
		roomMenu.innerHTML = ``;
		roomMenu.innerHTML = `
			<div id="roomBase">
				<div class="grid grid-cols-2 gap-2 p-2">
					<div class="bg-slate-100 rounded-md p-2 border border-slate-300 flex flex-col">
						<div class="flex justify-start items-center mb-2">
							<svg class="w-4 h-4 mr-2" viewBox="0 0 16 16" fill="currentColor">
								<path d="M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16ZM7 7V4H9V7H12V9H9V12H7V9H4V7H7Z"/>
							</svg>
							<h2 class="text-lg font-semibold text-slate-800">Create New Room</h2>
						</div>
						<button type="button" id="createRoomBtn" class="bg-slate-600 hover:bg-slate-800 text-white px-4 py-2 rounded-md transition-colors duration-200 flex items-center justify-center">
							<svg class="w-4 h-4 mr-2" viewBox="0 0 16 16" fill="currentColor">
								<path d="M10 1H6V6L1 6V10H6V15H10V10H15V6L10 6V1Z"/>
							</svg>
							Create Room
						</button>
					</div>
					<div class="bg-slate-100 rounded-md p-2 border border-slate-300 flex flex-col">
						<div class="flex justify-start items-center mb-2">
							<svg class="w-4 h-4 mr-2" viewBox="0 0 16 16" fill="currentColor">
								<path d="M16 1V15H9V13H14V3H9V1L16 1Z"/>
								<path d="M6 4V7L8.74229e-08 7L0 9H6V12H7L11 8L7 4H6Z"/>
							</svg>
							<h2 class="text-lg font-semibold text-slate-800">Join Existing Room</h2>
						</div>
						<div class="flex space-x-2">
							<input type="text" id="joinRoomInput" placeholder="Enter Room ID" class="bg-white text-slate-800 border-slate-300 border rounded-md px-2 py-1 flex-grow text-sm"/>
							<button type="button" id="joinRoomBtn" class="bg-slate-600 hover:bg-slate-800 text-white px-4 py-1 rounded-md transition-colors duration-200 text-sm flex items-center">
								<svg class="w-3 h-3 mr-1" viewBox="0 0 16 16" fill="currentColor">
									<path d="M8.1716 8.00003L3.58582 3.41424L6.41424 0.585815L13.8285 8.00003L6.41424 15.4142L3.58582 12.5858L8.1716 8.00003Z"/>
								</svg>
								Join
							</button>
						</div>
					</div>
				</div>
			</div>
			`;
		setupPrivateGameMenuListerners();
	}
}

function loadMatchmakingMenu(): void {
	const roomMenu = document.getElementById("roomMenu");
	if (roomMenu) {
		roomMenu.classList.remove("hidden");
		roomMenu.innerHTML = ``;
		roomMenu.innerHTML = `
			<div id="MatchmakingStatus" class="">
    <div class="flex justify-start items-center p-2">
        <svg class="w-5 h-5 mr-2" viewBox="0 0 16 16" fill="currentColor">
            <path d="M16 0H13L3.70711 9.29289L2.20711 7.79289L0.792893 9.20711L3.08579 11.5L1.5835 13.0023C1.55586 13.0008 1.52802 13 1.5 13C0.671573 13 0 13.6716 0 14.5C0 15.3284 0.671573 16 1.5 16C2.32843 16 3 15.3284 3 14.5C3 14.472 2.99923 14.4441 2.99771 14.4165L4.5 12.9142L6.79289 15.2071L8.20711 13.7929L6.70711 12.2929L16 3V0Z"/>
        </svg>
        <h2 class="text-lg font-semibold text-slate-800">Matchmaking Status</h2>
    </div>
    
    <div class="bg-slate-100 rounded-md p-2 border border-slate-300 h-14 flex items-center justify-between mx-2">
        <div class="flex items-center">
            <svg class="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M15.4141 4.91424L5.99991 14.3285L0.585693 8.91424L3.41412 6.08582L5.99991 8.6716L12.5857 2.08582L15.4141 4.91424Z"/>
            </svg>
            <div class="flex flex-col">
                <p class="text-xs font-semibold text-slate-700">Status</p>
                <p id="matchmakingStatusText" class="text-sm text-slate-500 font-medium">Waiting Players</p>
            </div>
        </div>
        <button type="button" id="leaveMatchmaking" class="flex items-center justify-center w-8 h-8 hover:bg-red-200 rounded-md transition-colors duration-200 ml-2">
            <svg class="w-4 h-4 text-red-600" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11 4V7L5 7V9H11V12H12L16 8L12 4L11 4Z"/>
                <path d="M0 1L3.41715e-07 15H8V13H2L2 3H8L8 1L0 1Z"/>
            </svg>
        </button>
    </div>
    
    <div class="flex justify-center items-center p-2 mt-2">
        <div class="bg-slate-50 rounded-md px-3 py-1 border border-slate-200">
            <p class="text-sm text-slate-600">
                <span id="playersInQueue" class="font-semibold">0</span> 
                <span class="text-xs">players in queue</span>
            </p>
        </div>
    </div>
</div>
		`;

		setupMatchmakingMenuListeners();
	}
}

export function loadGameWindow(): void {
	const inGameMenu = document.getElementById("inGameMenu");
	if (inGameMenu)
		inGameMenu.innerHTML = `
			<div id="RoomInfoPanel" class="">
				<div class="flex justify-start items-center p-2">
					<svg class="w-5 h-5 mr-2" viewBox="0 0 16 16" fill="currentColor">
						<path d="M3 1V4L4.66667 5.66667L4.2 8H2V6H0V15H6V12C6 10.8954 6.89543 10 8 10C9.10457 10 10 10.8954 10 12V15H16V6H14V8H11.8L11.3333 5.66667L13 4V1H11V3H9V1H7V3H5V1H3Z"/>
					</svg>
					<h2 class="text-lg font-semibold text-slate-800">Room Information</h2>
				</div>
				<div class="grid grid-cols-2 gap-2 p-2">
					<div class="bg-slate-100 rounded-md p-2 border border-slate-300 h-14 flex items-center justify-between">
						<div class="flex items-center">
							<svg class="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
								<path fill-rule="evenodd" clip-rule="evenodd" d="M3.54944 12L3.21611 15H5.22841L5.56175 12H9.54944L9.21611 15H11.2284L11.5617 12H14.5552L14.7774 10H11.784L12.2284 6H15.2218L15.4441 4H12.4506L12.784 1H10.7717L10.4383 4H6.45064L6.78397 1H4.77166L4.43833 4H1.44431L1.22209 6H4.21611L3.77166 10H0.777642L0.55542 12H3.54944ZM5.78397 10H9.77166L10.2161 6H6.22841L5.78397 10Z"/>
							</svg>
							<div class="flex flex-col">
								<p class="text-xs font-semibold text-slate-700">Room ID</p>
								<p id="roomIdText" class="text-sm text-slate-500">Not in a room</p>
							</div>
						</div>

						<button type="button" id="copyRoomId" class="flex items-center justify-center w-8 h-8 hover:bg-slate-200 rounded-md transition-colors duration-200 ml-2 hidden">
							<svg class="w-4 h-4 text-slate-600" viewBox="0 0 16 16" fill="currentColor">
								<path d="M10 0L9 1L11.2929 3.29289L6.2929 8.29289L7.70711 9.70711L12.7071 4.7071L15 7L16 6V0H10Z"/>
								<path d="M1 2H6V4H3V13H12V10H14V15H1V2Z"/>
							</svg>
						</button>
					</div>
					<div class="bg-slate-100 rounded-md p-2 border border-slate-300 h-14 flex items-center justify-between">
						<div class="flex items-center">
							<svg class="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
								<path d="M8 9C9.38071 9 10.5 7.88071 10.5 6.5C10.5 5.11929 9.38071 4 8 4C6.61929 4 5.5 5.11929 5.5 6.5C5.5 7.88071 6.61929 9 8 9Z"/>
								<path fill-rule="evenodd" clip-rule="evenodd" d="M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16ZM6 10C4.80291 10 3.76957 10.7012 3.28827 11.7152C2.48151 10.6934 2 9.40294 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 9.40294 13.5185 10.6934 12.7117 11.7152C12.2304 10.7012 11.1971 10 10 10H6Z"/>
							</svg>
							<div class="flex flex-col">
								<p class="text-xs font-semibold text-slate-700">Players</p>
								<p id="playersStatus" class="text-sm text-slate-500">Not in a room</p>
							</div>
						</div>
						<button type="button" id="leaveRoom" class="flex items-center justify-center w-8 h-8 hover:bg-red-200 rounded-md transition-colors duration-200 ml-2 hidden">
							<svg class="w-4 h-4 text-red-600" viewBox="0 0 16 16" fill="currentColor">
								<path d="M11 4V7L5 7V9H11V12H12L16 8L12 4L11 4Z"/>
								<path d="M0 1L3.41715e-07 15H8V13H2L2 3H8L8 1L0 1Z"/>
							</svg>
						</button>
					</div>
					<div class="bg-slate-100 rounded-md p-2 border border-slate-300 h-14 flex items-center justify-between">
						<div class="flex items-center">
							<svg class="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
								<path d="M15.4141 4.91424L5.99991 14.3285L0.585693 8.91424L3.41412 6.08582L5.99991 8.6716L12.5857 2.08582L15.4141 4.91424Z"/>
							</svg>
							<div class="flex flex-col">
								<p class="text-xs font-semibold text-slate-700">Your Status</p>
								<p id="statusText" class="text-sm text-red-600 font-mono">Not Ready</p>
							</div> 
						</div>
						<button type="button" id="statusToggle" class="flex items-center justify-center w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors duration-200 ml-2 hidden">
							<svg class="w-4 h-4 text-green-600" viewBox="0 0 16 16" fill="currentColor">
								<path fill-rule="evenodd" clip-rule="evenodd" d="M15 1H1V15H15V1ZM12.7071 5.70711L11.2929 4.29289L6.5 9.08579L4.70711 7.29289L3.29289 8.70711L6.5 11.9142L12.7071 5.70711Z"/>
							</svg>
						</button>
					</div>
					<div class="bg-slate-100 rounded-md p-2 border border-slate-300 h-14 flex items-center">
						<svg class="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
							<path d="M15.4141 4.91424L5.99991 14.3285L0.585693 8.91424L3.41412 6.08582L5.99991 8.6716L12.5857 2.08582L15.4141 4.91424Z"/>
						</svg>
						<div class="flex flex-col">
							<p class="text-xs font-semibold text-slate-700">Room Status</p>
							<p id="roomStatusInfo" class="text-sm text-slate-500 font-medium">Not in a room</p>
						</div>
					</div>
				</div>
				<div class="border-t border-dashed border-slate-300 mx-2 my-4"></div>
			</div>		
			<div id="gameWindow" class="bg-slate-200 flex flex-col justify-center rounded-md mb-4 border-2 border-slate-300 shadow-lg hidden">
				<div id="scoreDiv" class="bg-slate-2 rounded-t-md">			
					
					<!-- Title -->
					<div class="flex justify-start items-center p-2">
						<svg class="w-5 h-5 mr-2" viewBox="0 0 16 16" fill="currentColor">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M0 13L3 14L6 11H10L13 14L16 13L15.248 4.7284C15.1076 3.18316 13.812 2 12.2604 2H3.73964C2.18803 2 0.89244 3.18316 0.751964 4.72839L0 13ZM12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6ZM12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8ZM5 8C6.10457 8 7 7.10457 7 6C7 4.89543 6.10457 4 5 4C3.89543 4 3 4.89543 3 6C3 7.10457 3.89543 8 5 8Z"/>
						</svg>
						<h2 class="text-lg font-semibold text-slate-800">Game Window</h2>
					</div>

					<!-- Score Div -->
					<div class="p-2">
					<div class="flex justify-between items-center px-6 py-2 bg-slate-100 rounded-md shadow-sm h-18">
						<!-- Player 1 Section -->
						<div class="flex items-center space-x-3">
							<div class="w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
								<img id="player1Avatar" src="/files/users/default.png" alt="Player 1" class="w-full h-full object-cover">
							</div>
							<div class="flex flex-col">
								<p id="player1Username" class="text-lg font-semibold text-slate-800 truncate">Player 1</p>
								<p id="player1Score" class="text-2xl font-bold text-slate-900">0</p>
							</div>
						</div>
						
						<!-- VS Section -->
						<div class="flex items-center justify-center px-4">
							<p class="text-xl font-bold text-slate-600">VS</p>
						</div>
						
						<!-- Player 2 Section -->
						<div class="flex items-center space-x-3">
							<div class="flex flex-col text-right">
								<p id="player2Username" class="text-lg font-semibold text-slate-800 truncate">Player 2</p>
								<p id="player2Score" class="text-2xl font-bold text-slate-900">0</p>
							</div>
							<div class="w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
								<img id="player2Avatar" src="/files/users/default.png" alt="Player 2" class="w-full h-full object-cover">
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="flex justify-center items-center p-4">
							<canvas id="pongCanvas" width="640" height="320" class="bg-black border-2 border-slate-400 rounded-md"></canvas>
						</div>
					</div>

			`;

	setupInGameMenuListeners(gameSocket);

}

export async function handleRoomInfo(msg: any, roomId: string): Promise<void> {

	const actualRoomId = msg.id || roomId;
	console.log("ROOMINFO DEBUG:", msg);
	editDivClass([
		{ divId: "gameMenu", mode: "add", parameter: "hidden" },
		{ divId: "MatchmakingStatus", mode: "add", parameter: "hidden" },
		{ divId: "gameWindow", mode: "remove", parameter: "hidden" },
		{ divId: "copyRoomId", mode: "remove", parameter: "hidden" },
		{ divId: "leaveRoom", mode: "remove", parameter: "hidden" },
		{ divId: "scoreDiv", mode: "remove", parameter: "hidden" },
		{ divId: "RoomInfoPanel", mode: "remove", parameter: "hidden" },
	]);

	updateStatusTexts([
		{ divId: "roomIdText", status: actualRoomId }
	]);

	if (msg.players && msg.gameState) {
		const playerCount = msg.players.length;
		const maxPlayers = 2;
		let roomStatusMessage = "";

		const notReadyPlayers = msg.players.filter((player: any) => !player.ready);

		updateStatusTexts([
			{ divId: "playersStatus", status: `${playerCount}/${maxPlayers} players` }
		]);


		if (playerCount < maxPlayers) {
			const playersNeeded = maxPlayers - playerCount;
			roomStatusMessage = `Waiting ${playersNeeded} more player${playersNeeded > 1 ? 's' : ''}`;
		} else if (notReadyPlayers.length > 0) {
			const notReadyNames = notReadyPlayers.map((player: any) => {
				return player.username;
			});

			if (notReadyNames.length === 1) {
				roomStatusMessage = `Waiting ${notReadyNames[0]} to be ready`;
			} else {
				roomStatusMessage = `Waiting ${notReadyNames.join(', ')} to be ready`;
			}
		} else {
			roomStatusMessage = "All players ready! Starting game...";
		}

		if (msg.gameState.type === "play") {
			roomStatusMessage = "Game in progress";

		} else if (msg.gameState.type === "finished") {
			roomStatusMessage = "Game finished";

			// Show game end summary when status is finished
			// if (!msg.tournyId)
				showGameEndSummary(msg);
		}

		const currentPlayer = msg.players.find((player: any) => player.id === currentUserId);
		if (currentPlayer) {
			updatePlayerStatusUI(currentPlayer.ready);
		}

		if (playerCount === maxPlayers) {
			editDivClass([{ divId: "statusToggle", mode: "remove", parameter: "hidden" }]);
		} else {
			editDivClass([{ divId: "statusToggle", mode: "add", parameter: "hidden" }]);
		}

		updateStatusTexts([
			{ divId: "roomStatusInfo", status: roomStatusMessage }
		]);

		if (msg.gameState.score) {
			updateStatusTexts([
				{ divId: "player1Score", status: msg.gameState.score[0].toString() },
				{ divId: "player2Score", status: msg.gameState.score[1].toString() }
			]);
		}

		if (msg.players && msg.players.length >= 1) {
			const player1 = msg.players[0];
			updateStatusTexts([
				{ divId: "player1Username", status: player1.username || "Player 1" }
			]);

			const player1Avatar = document.getElementById("player1Avatar") as HTMLImageElement;
			if (player1Avatar && player1.avatar) {
				player1Avatar.src = `/user/avatar/${player1.id}`;
			}
		}

		if (msg.players && msg.players.length >= 2) {
			const player2 = msg.players[1];
			updateStatusTexts([
				{ divId: "player2Username", status: player2.username || "Player 2" }
			]);

			const player2Avatar = document.getElementById("player2Avatar") as HTMLImageElement;
			if (player2Avatar && player2.avatar) {
				player2Avatar.src = `/user/avatar/${player2.id}`;
			}
		}
	}
}

function updateGameMenu(gameType: "Online Game" | "Private Game") {
	editDivClass([{ divId: "gameMenu", mode: "add", parameter: "hidden" }])
	updateStatusTexts([{ divId: "title", status: gameType }])

	if (gameType === "Private Game") {
		loadPrivateGameMenu();
	}
	else {
		loadMatchmakingMenu();
		joinMatchmaking();

	}
}

/*
								GAME METHOD
*/

async function createRoom(): Promise<void> {
	gameSocket = new WebSocket(wsUrl("/pong/create"));
	let roomId: string;
	gameSocket.onopen = () => {

	}

	gameSocket.onclose = (e) => {

		editDivClass([
			{ divId: "gameWindow", mode: "add", parameter: "hidden" },
			{ divId: "scoreDiv", mode: "add", parameter: "hidden" },
			{ divId: "RoomInfoPanel", mode: "add", parameter: "hidden" },
			{ divId: "roomBase", mode: "remove", parameter: "hidden" },
		]);
	}

	gameSocket.onerror = () => {
		showNotification("Erreur de connexion WebSocket", "error");
	}

	gameSocket.onmessage = (e) => {
		const msg = JSON.parse(e.data);
		console.log("[GAMESOCKET COMM]", msg);

		switch (msg.type) {
			case "state_update":
				draw(msg.state);
				updateStatusTexts([
					{ divId: "player1Score", status: msg.state.score[0].toString() },
					{ divId: "player2Score", status: msg.state.score[1].toString() }
				]);
				break;

			case "game_end":
				showNotification("Partie terminée!", "success");
				break;

			case "not_found":
				showNotification("Partie non trouvée", "error");
				break;

			case "not_in_game":
				showNotification("Aucune partie en cours trouvée", "error");
				break;

			case "opponent_left":
				showNotification("L'adversaire a quitté la partie", "error");
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				break;
			case "opponent_lost":
				showNotification("L'adversaire a perdu la connexion", "error");
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				break;

			case "game_found":
				showNotification("Partie trouvée!", "success");
				
				// Demander les informations à jour de la room
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				activateGameControls();
				break;

			case "game_full":
				showNotification("La partie est complète", "error");
				break;

			case "connected":
				roomId = msg.roomId;
				showNotification("Connecté à la partie!", "success");
				editDivClass([
					{ divId: "roomBase", mode: "add", parameter: "hidden" },
				]);


				// Demander les informations de la room au lieu de les traiter immédiatement
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}

				break;

			case "room_info":
				console.log(msg);
				handleRoomInfo(msg, roomId).catch(console.error);
				break;
			case "in_queue":
				showNotification("En attente d'un adversaire...", "success");
				break;

			case "reconnect_to_game":
				const reconnect = confirm(`${msg.message} Room: ${msg.roomId}`);
				if (reconnect && gameSocket) {
					showNotification("Reconnexion à la partie...", "success");
					gameSocket.send(JSON.stringify({ type: "reconnect" }));
				} else {
					showNotification("Reconnexion annulée", "error");
				}

				editDivClass([
					{ divId: "roomBase", mode: "add", parameter: "hidden" },
					{ divId: "RoomInfoPanel", mode: "remove", parameter: "hidden" },
					{ divId: "copyRoomId", mode: "remove", parameter: "hidden" }
				])
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				break;

			default:
				console.log("[GAMESOCKET] Unknow message type:", msg.type);

		}
	}

}

function joinMatchmaking(): void {
	leaveRoom();
	gameSocket = new WebSocket(wsUrl("/pong/"));

	gameSocket.onopen = () => {
	}

	gameSocket.onclose = (e) => {
		editDivClass([
			{ divId: "gameWindow", mode: "add", parameter: "hidden" },
			{ divId: "scoreDiv", mode: "add", parameter: "hidden" },
			{ divId: "RoomInfoPanel", mode: "add", parameter: "hidden" },
		]);
	}

	gameSocket.onerror = () => {

	}

	gameSocket.onmessage = (e) => {
		const msg = JSON.parse(e.data);
		console.log("[GAMESOCKET COMM]", msg);

		switch (msg.type) {
			case "state_update":
				draw(msg.state);
				updateStatusTexts([
					{ divId: "player1Score", status: msg.state.score[0].toString() },
					{ divId: "player2Score", status: msg.state.score[1].toString() }
				]);
				break;

			case "game_end":
				showNotification("Partie terminée!", "success");
				deactivateGameControls();
				break;

			case "not_found":
				showNotification("Partie non trouvée", "error");
				break;

			case "not_in_game":
				showNotification("Aucune partie en cours trouvée", "error");
				break;

			case "opponent_lost":
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				showNotification("Connection avec l'adversaire perdue.", "error");

				break;

			case "opponent_left":
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				showNotification("L'adversaire s'est déconnecté.", "error");

				break;

			case "game_found":
				showNotification("Partie trouvée !", "success");
				activateGameControls();
				loadGameWindow();
				
				// Demander les informations à jour de la room
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				break;

			case "game_full":
				showNotification("La partie a atteint son nombre de joueur maximum", "error");

				break;

			case "connected":
				if (gameSocket)
					gameSocket.send(JSON.stringify({ type: "join_queue" }));
				showNotification("Connection avec le matchmaking réussie", "success");

				break;

			case "room_info":
				console.log(msg);
				handleRoomInfo(msg, msg.Id).catch(console.error);
				break;
			case "in_queue":

				break;

			case "updateQueueCount":
				updateStatusTexts([
					{ divId: "matchmakingStatusText", status: msg.message },
					{ divId: "playersInQueue", status: msg.playersinQueue }
				]);
				break;

			case "reconnect_to_game":
				const reconnect = confirm(`${msg.message} Room: ${msg.roomId}`);
				if (reconnect && gameSocket) {
					gameSocket.send(JSON.stringify({ type: "reconnect" }));

					editDivClass([
						{ divId: "roomBase", mode: "add", parameter: "hidden" },
						{ divId: "RoomInfoPanel", mode: "remove", parameter: "hidden" },
						{ divId: "copyRoomId", mode: "remove", parameter: "hidden" }
					])
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				showNotification("Connection avec la partie rétablie", "success");
				break;

			default:
				console.log("[GAMESOCKET] Unknow message type:", msg.type);

		}
	}
}

export function joinRoom(roomId: string): void {
	leaveRoom();
	gameSocket = new WebSocket(wsUrl(`/pong/join/${roomId}`));



	gameSocket.onopen = () => {

	}

	gameSocket.onclose = (e) => {

		editDivClass([
			{ divId: "gameWindow", mode: "add", parameter: "hidden" },
			{ divId: "scoreDiv", mode: "add", parameter: "hidden" },
			{ divId: "RoomInfoPanel", mode: "add", parameter: "hidden" },
			{ divId: "roomBase", mode: "remove", parameter: "hidden" },
		]);
	}

	gameSocket.onerror = () => {
		showNotification("Erreur de connexion WebSocket", "error");
	}

	gameSocket.onmessage = (e) => {
		const msg = JSON.parse(e.data);
		console.log("[GAMESOCKET COMM]", msg);

		switch (msg.type) {
			case "state_update":
				draw(msg.state);
				updateStatusTexts([
					{ divId: "player1Score", status: msg.state.score[0].toString() },
					{ divId: "player2Score", status: msg.state.score[1].toString() }
				]);
				break;

			case "game_end":
				showNotification("Partie terminée!", "success");
				break;

			case "not_found":
				showNotification("Partie non trouvée", "error");
				break;

			case "not_in_game":
				showNotification("Aucune partie en cours trouvée", "error");
				break;

			case "opponent_left":
				showNotification("L'adversaire a quitté la partie", "error");
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				break;
			case "opponent_lost":
				showNotification("L'adversaire a perdu la connexion", "error");
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				break;

			case "game_found":
				showNotification("Partie trouvée!", "success");
				
				// Demander les informations à jour de la room
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				activateGameControls();
				break;

			case "game_full":
				showNotification("La partie est complète", "error");
				break;

			case "connected":
				showNotification("Connecté à la partie!", "success");
				editDivClass([
					{ divId: "roomBase", mode: "add", parameter: "hidden" },
				]);

				// Demander les informations de la room au lieu de les traiter immédiatement
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}

				break;

			case "room_info":
				console.log(msg);
				handleRoomInfo(msg, roomId).catch(console.error);
				break;
			case "in_queue":
				showNotification("En attente d'un adversaire...", "success");
				break;

			case "reconnect_to_game":
				const reconnect = confirm(`${msg.message} Room: ${msg.roomId}`);
				if (reconnect && gameSocket) {
					showNotification("Reconnexion à la partie...", "success");
					gameSocket.send(JSON.stringify({ type: "reconnect" }));
				} else {
					showNotification("Reconnexion annulée", "error");
				}

				editDivClass([
					{ divId: "roomBase", mode: "add", parameter: "hidden" },
					{ divId: "RoomInfoPanel", mode: "remove", parameter: "hidden" },
					{ divId: "copyRoomId", mode: "remove", parameter: "hidden" }
				])
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				break;

			default:
				console.log("[GAMESOCKET] Unknow message type:", msg.type);

		}
	}

}

export function draw(state: any) {
	const canvas = document.getElementById("pongCanvas") as HTMLCanvasElement;
	const ctx = canvas.getContext("2d")!;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// Ball
	ctx.fillStyle = 'white';
	const ball = state.ball;
	ctx.beginPath();
	ctx.arc(ball.x, ball.y, 3, 0, Math.PI * 2);
	ctx.fill();
	// Paddles
	(state.players || []).forEach((p: any, idx: number) => {
		if (!p.paddle) return;
		ctx.fillStyle = idx === 0 ? '#22c55e' : '#3b82f6';
		const x = idx === 0 ? 10 : (canvas.width - 10 - p.paddle.width);
		ctx.fillRect(x, p.paddle.y - p.paddle.height / 2, p.paddle.width, p.paddle.height);
	});
}

function leaveRoom(): void {
	if (gameSocket && (gameSocket.readyState === WebSocket.OPEN || gameSocket.readyState === WebSocket.CONNECTING)) {
		try {
			const roomIdElement = document.getElementById("roomIdText");
			const roomId = roomIdElement ? roomIdElement.textContent || "" : "";

			gameSocket.close(1000, roomId);
		} catch (error) {
			console.error("Failled to close gameSocket.");
		}
	}
}

function activateGameControls() {
	document.addEventListener('keydown', handleKeyPress);
	document.addEventListener('keyup', handleKeyRelease);
}

function deactivateGameControls() {
	document.removeEventListener('keydown', handleKeyPress);
	document.removeEventListener('keyup', handleKeyRelease);
}

function handleKeyPress(event: KeyboardEvent) {
	if (!gameSocket || gameSocket.readyState !== WebSocket.OPEN) return;

	if (event.code === 'KeyW' || event.key === 'ArrowUp') {
		event.preventDefault();
		gameSocket.send(JSON.stringify({
			type: 'paddle_move',
			paddleDirection: 'up'
		}));
	} else if (event.code === 'KeyS' || event.key === 'ArrowDown') {
		event.preventDefault();
		gameSocket.send(JSON.stringify({
			type: 'paddle_move',
			paddleDirection: 'down'
		}));
	}
}

function handleKeyRelease(event: KeyboardEvent) {
	if (!gameSocket || gameSocket.readyState !== WebSocket.OPEN) return;

	if (event.code === 'KeyW' || event.code === 'KeyS' ||
		event.key === 'ArrowUp' || event.key === 'ArrowDown') {
		event.preventDefault();
		gameSocket.send(JSON.stringify({
			type: 'paddle_move',
			paddleDirection: 'stop'
		}));
	}
}