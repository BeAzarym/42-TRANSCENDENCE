import { renderNavbar } from "./navbar";
import { navigate } from "../main";
import { draw, loadGameWindow, handleRoomInfo, setupInGameMenuListeners } from "./game";
import { showNotification } from "../utils/notifications";

interface UserData {
	id: string;
	username?: string;
	email?: string;
	avatar?: string;
}

function wsUrl(path: string): string {
	const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
	return `${protocol}//${location.host}${path}`;
}

function showTournamentEndSummary(msg: any): void {

	const isTournamentEnd = msg.type === "tourny_end";
	const brackets = msg.brackets || [];
	const tournamentWinner = msg.winner || null;
	
	const finalBracket = brackets.length > 0 ? brackets[brackets.length - 1] : null;
	const finalMatch = finalBracket && finalBracket[0] ? finalBracket[0] : null;
	
	let player1 = { id: 'unknown', username: 'Player 1', avatar: null };
	let player2 = { id: 'unknown', username: 'Player 2', avatar: null };
	let finalScore = [0, 0];
	
	if (finalMatch) {
		player1 = finalMatch.p1 || player1;
		player2 = finalMatch.p2 || player2;
		finalScore = finalMatch.finalScore || msg.score || [0, 0];
	} else if (msg.score) {
		finalScore = msg.score;
	}
	
	const tournamentWinnerName = tournamentWinner ? (tournamentWinner.username || tournamentWinner.id || 'Unknown Player') : 'Unknown Winner';
	
	const isPlayer1Winner = tournamentWinner && tournamentWinner.id === player1.id;
	const isPlayer2Winner = tournamentWinner && tournamentWinner.id === player2.id;

	let player1Score = finalScore[0];
	let player2Score = finalScore[1];
	
	if (tournamentWinner && finalScore[0] !== finalScore[1]) {
		if (isPlayer1Winner && finalScore[0] < finalScore[1]) {
			player1Score = finalScore[1];
			player2Score = finalScore[0];
		} else if (isPlayer2Winner && finalScore[1] < finalScore[0]) {
			player1Score = finalScore[1];
			player2Score = finalScore[0];
		}
	}

	const app = document.getElementById("app");
	if (app) {
		const overlay = document.createElement('div');
		overlay.id = 'tournamentEndOverlay';
		overlay.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
		
		let bracketsHtml = '';
		if (brackets.length > 0) {
			bracketsHtml = `
				<!-- Tournament Brackets History -->
				<div class="bg-slate-100 rounded-md p-4 mb-4 border border-slate-300">
					<h3 class="text-lg font-semibold text-slate-800 mb-3 text-center">Historique du Tournoi</h3>
					<div class="space-y-3">
			`;
			
			brackets.forEach((round: any[], roundIndex: number) => {
				bracketsHtml += `
					<div class="mb-4">
						<h3 class="text-md font-semibold text-slate-700 mb-2">Tour ${roundIndex + 1}</h3>
						<div class="space-y-2">
				`;
				
				round.forEach((bracket: any) => {
					const p1Name = bracket.p1 ? (bracket.p1.username || bracket.p1.id) : 'No opponent';
					const p2Name = bracket.p2 ? (bracket.p2.username || bracket.p2.id) : 'No opponent';
					const p1avatar = bracket.p1 ? (`/user/avatar/${bracket.p1.id}`) : "/files/users/default.png";
					const p2avatar = bracket.p2 ? (`/user/avatar/${bracket.p2.id}`) : "/files/users/default.png";
					
					let p1Score = 0;
					let p2Score = 0;
					
					if (bracket.finalScore) {
						p1Score = bracket.finalScore[0];
						p2Score = bracket.finalScore[1];
						
						if (bracket.winner && bracket.finalScore[0] !== bracket.finalScore[1]) {
							const isP1Winner = bracket.winner.id === bracket.p1?.id;
							const isP2Winner = bracket.winner.id === bracket.p2?.id;
							
							if (isP1Winner && bracket.finalScore[0] < bracket.finalScore[1]) {
								p1Score = bracket.finalScore[1];
								p2Score = bracket.finalScore[0];
							} else if (isP2Winner && bracket.finalScore[1] < bracket.finalScore[0]) {
								p1Score = bracket.finalScore[1];
								p2Score = bracket.finalScore[0];
							}
						}
					}
					
					const scoreDisplay = `${p1Score} - ${p2Score}`;
					
					let status = "En cours";
					if (bracket.winner) {
						status = "Terminé";
					} else if (!bracket.p1 || !bracket.p2) {
						status = "En attente";
					}
					
					bracketsHtml += `
						<div class="bg-white rounded-md p-3 border border-slate-200 flex items-center justify-between">
							<!-- Match info en une ligne -->
							<div class="flex items-center space-x-3 flex-1">
								<!-- Joueur 1 -->
								<div class="flex items-center space-x-2">
									<img src="${p1avatar}" alt="${p1Name}" class="w-6 h-6 rounded-full object-cover border ${bracket.winner && bracket.winner.id === bracket.p1?.id ? 'border-green-500' : 'border-slate-300'}">
									<span class="text-sm font-medium ${bracket.winner && bracket.winner.id === bracket.p1?.id ? 'text-green-600' : 'text-slate-800'}">${p1Name}</span>
								</div>
								
								<!-- VS -->
								<span class="text-xs text-slate-500 font-medium">VS</span>
								
								<!-- Joueur 2 -->
								<div class="flex items-center space-x-2">
									<span class="text-sm font-medium ${bracket.winner && bracket.winner.id === bracket.p2?.id ? 'text-green-600' : 'text-slate-800'}">${p2Name}</span>
									<img src="${p2avatar}" alt="${p2Name}" class="w-6 h-6 rounded-full object-cover border ${bracket.winner && bracket.winner.id === bracket.p2?.id ? 'border-green-500' : 'border-slate-300'}">
								</div>
							</div>
							
							<!-- Score et Status -->
							<div class="flex items-center space-x-4">
								<span class="text-sm text-slate-600 font-mono">${scoreDisplay}</span>
								<span class="text-xs px-2 py-1 rounded-full font-medium ${status === "Terminé" ? "bg-green-100 text-green-700" :
									status === "En cours" ? "bg-blue-100 text-blue-700" :
									"bg-gray-100 text-gray-700"
								}">${status}</span>
							</div>
						</div>
					`;
				});
				
				bracketsHtml += `
						</div>
					</div>
				`;
			});
			
			bracketsHtml += `
					</div>
				</div>
			`;
		}

		overlay.innerHTML = `
			<div class="bg-slate-200 rounded-lg shadow-xl border-2 border-slate-300 p-6 w-full max-w-2xl mx-auto">
				<!-- Title -->
				<div class="text-center mb-6">
					${isTournamentEnd ? `
						<h2 class="text-2xl font-bold text-slate-800 mb-2">🏆 Tournoi Terminé !</h2>
						<p class="text-lg text-slate-700">
							<span class="font-semibold text-green-600">${tournamentWinnerName}</span> remporte le tournoi !
						</p>
					` : `
						<h2 class="text-2xl font-bold text-slate-800 mb-2">⚔️ Match Terminé !</h2>
						<p class="text-lg text-slate-700">Fin du match</p>
					`}
				</div>

				<!-- Players vs Section -->
				<div class="bg-slate-100 rounded-md p-4 mb-4 border border-slate-300">
					<div class="flex items-center justify-between">
						<!-- Player 1 -->
						<div class="flex items-center space-x-3">
							<img src="${player1.avatar ? `/user/avatar/${player1.id}` : '/files/users/default.png'}" 
								 alt="${player1.username || 'Player 1'}" 
								 class="w-12 h-12 rounded-full object-cover border-2 ${isPlayer1Winner ? 'border-green-500' : 'border-slate-300'}"
								 onerror="this.src='/files/users/default.png'">
							<div>
								<p class="font-medium text-slate-800 ${isPlayer1Winner ? 'text-green-600' : ''}">${player1.username || player1.id || 'Player 1'}</p>
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
								<p class="font-medium text-slate-800 ${isPlayer2Winner ? 'text-green-600' : ''}">${player2.username || player2.id || 'Player 2'}</p>
								<p class="text-sm text-slate-600">Joueur 2</p>
							</div>
							<img src="${player2.avatar ? `/user/avatar/${player2.id}` : '/files/users/default.png'}" 
								 alt="${player2.username || 'Player 2'}" 
								 class="w-12 h-12 rounded-full object-cover border-2 ${isPlayer2Winner ? 'border-green-500' : 'border-slate-300'}"
								 onerror="this.src='/files/users/default.png'">
						</div>
					</div>
				</div>

				<!-- Score Recap -->
				<div class="bg-slate-100 rounded-md p-4 mb-4 border border-slate-300">
					<h3 class="text-lg font-semibold text-slate-800 mb-3 text-center">Score Final</h3>
					<div class="flex justify-center items-center space-x-6">
						<div class="text-center">
							<p class="text-2xl font-bold ${isPlayer1Winner ? 'text-green-600' : 'text-slate-900'}">${player1Score}</p>
							<p class="text-sm text-slate-600">${player1.username || player1.id || 'Player 1'}</p>
						</div>
						<div class="text-xl font-bold text-slate-500">-</div>
						<div class="text-center">
							<p class="text-2xl font-bold ${isPlayer2Winner ? 'text-green-600' : 'text-slate-900'}">${player2Score}</p>
							<p class="text-sm text-slate-600">${player2.username || player2.id || 'Player 2'}</p>
						</div>
					</div>
				</div>

				${bracketsHtml}

				<!-- Leave Button -->
				<div class="text-center">
					<button id="leaveTournamentMatchBtn" class="bg-slate-600 hover:bg-slate-800 text-white px-6 py-3 rounded-md transition-colors duration-200 font-medium">
						Retour au menu
					</button>
				</div>
			</div>
		`;

		app.appendChild(overlay);

		const leaveBtn = document.getElementById('leaveTournamentMatchBtn');
		if (leaveBtn) {
			leaveBtn.addEventListener('click', () => {
				overlay.remove();
				navigate('/tournament');
			});
		}

		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.remove();
				navigate('/tournament');
			}
		});
	}
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

type updateStatusTextProps = StatusInterface[]
type divEditProps = divEditInterface[]

let tournamentSocket: WebSocket;
let tournamentId: string | undefined;
let gameId: string | undefined;
let gameSocket: WebSocket;
let currentUserId: string | undefined;
let isOwner: boolean = false;

function updateStatusTexts(updateStatusTexts: updateStatusTextProps): void {
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
	console.error("[UpdateStatusText] Unknown div ", divId);
}

export function renderTournament(root: HTMLElement, navigate: (path: string) => void): void {
	renderNavbar(navigate);
	const app = document.getElementById("app");
	if (app) {
		app.innerHTML = `
			<div class="h-screen ml-20 box-border w-auto mr-2">
				<div class="bg-slate-200 rounded-md shadow-lg border-2 border-slate-300 h-auto w-auto w-max-[2448px] flex flex-col justify-center items-center m-24">
					
					<!-- Main Title-->
					<div id="TitleDiv" class="p-3 border-b border-slate-300">
						<h1 id="MainTitle" class="text-center text-lg lg:text-xl font-bold text-slate-900">PLAY TOURNAMENT!</h1>
					</div>

					<!-- Content Container -->
					<div class="flex-1 p-4 overflow-hidden">
						
						<!-- Main Menu -->
						<div id="TournyMainMenu" class="h-full flex items-center justify-center">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
								<!--  CREATE TOURNY  -->	
								<div class="bg-slate-100 rounded-md p-6 border border-slate-300 flex flex-col">
									<div class="flex justify-center items-center mb-4">
										<svg class="w-5 h-5 mr-2" viewBox="0 0 16 16" fill="currentColor">
											<path d="M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16ZM7 7V4H9V7H12V9H9V12H7V9H4V7H7Z"/>
										</svg>
										<h2 class="text-lg font-semibold text-slate-800">Create New Tournament</h2>
									</div>
									<p class="text-slate-700 text-center mb-6 italic">Create your own arena, bring your crew, and see who comes out on top.</p>
									<button type="button" id="createRoomBtn" class="bg-slate-600 hover:bg-slate-800 text-white px-6 py-3 rounded-md transition-colors duration-200 flex items-center justify-center font-medium">
										<svg class="w-4 h-4 mr-2" viewBox="0 0 16 16" fill="currentColor">
											<path d="M10 1H6V6L1 6V10H6V15H10V10H15V6L10 6V1Z"/>
										</svg>
										Create Tournament Room
									</button>
								</div>

								<!--  JOIN TOURNY  -->	
								<div class="bg-slate-100 rounded-md p-6 border border-slate-300 flex flex-col">
									<div class="flex justify-center items-center mb-4">
										<svg class="w-5 h-5 mr-2" viewBox="0 0 16 16" fill="currentColor">
											<path d="M16 1V15H9V13H14V3H9V1L16 1Z"/>
											<path d="M6 4V7L8.74229e-08 7L0 9H6V12H7L11 8L7 4H6Z"/>
										</svg>
										<h2 class="text-lg font-semibold text-slate-800">Join Tournament Room</h2>
									</div>
									<p class="text-slate-700 text-center mb-6 italic">Jump into the fight, crush the competition, and show them who the real beast is.</p>
									<div class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
										<input type="text" id="joinRoomInput" placeholder="Enter Tournament ID" class="bg-white text-slate-800 border-slate-300 border rounded-md px-4 py-3 flex-grow"/>
										<button type="button" id="joinRoomBtn" class="bg-slate-600 hover:bg-slate-800 text-white px-6 py-3 rounded-md transition-colors duration-200 flex items-center justify-center font-medium whitespace-nowrap">
											<svg class="w-4 h-4 mr-2" viewBox="0 0 16 16" fill="currentColor">
												<path d="M8.1716 8.00003L3.58582 3.41424L6.41424 0.585815L13.8285 8.00003L6.41424 15.4142L3.58582 12.5858L8.1716 8.00003Z"/>
											</svg>
											Join
										</button>
									</div>
								</div>
							</div>
						</div>
						
						<!-- Tournament panels (hidden by default) -->
						<div class="h-full hidden" id="tournamentContent">
							<div class="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">
								<!-- Colonne gauche : inGameMenu -->
								<div class="flex flex-col h-full">
									<div id="inGameMenu" class="bg-slate-200 rounded-md border-2 border-slate-300 shadow-lg hidden flex-1 overflow-hidden min-w-[660px]"></div>
								</div>
								
								<!-- Colonne droite : TournyInfoPanel et TournyBracketPanel -->
								<div class="flex flex-col h-full space-y-4">
									<div id="TournyInfoPanel" class="bg-slate-200 rounded-md border-2 border-slate-300 shadow-lg hidden flex-1 overflow-auto"></div>
									
									<!-- BRACKETS -->
									<div id="TournyBracketPanel" class="bg-slate-200 rounded-md border-2 border-slate-300 shadow-lg hidden flex-1 overflow-auto">
									   <div id="tournamentBrackets" class="h-full flex flex-col p-4">
				                    		<div class="flex items-center mb-3">
				                        		<svg class="w-5 h-5 mr-2" viewBox="0 0 16 16" fill="currentColor">
				                            	<path d="M4 0C1.79086 0 0 1.79086 0 4V12C0 14.2091 1.79086 16 4 16H12C14.2091 16 16 14.2091 16 12V4C16 1.79086 14.2091 0 12 0H4ZM3 4C3 3.44772 3.44772 3 4 3H12C12.5523 3 13 3.44772 13 4V12C13 12.5523 12.5523 13 12 13H4C3.44772 13 3 12.5523 3 12V4Z"/>
				                        		</svg>
				                        		<h2 class="text-lg font-semibold text-slate-800">Tournament Brackets</h2>
				                    		</div>
				                    		<div id="bracketsContent" class="bg-slate-100 rounded-md p-3 border border-slate-300 flex-1 overflow-y-auto">
				                        		<!-- Brackets will be displayed here -->
				                    		</div>
				                		</div>
									</div>
								</div>
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
				})
				.catch((error: unknown) => {
					console.error("Error fetching user data:", error);
					navigate('/login');
				});
		})
		.catch(() => navigate('/login'));


	MainMenuListeners();

}

/*
			MENU
*/
function loadTournamentInfoPanel(): void {
	const TournyInfoPanel = document.getElementById("TournyInfoPanel");
	if (TournyInfoPanel) {
		TournyInfoPanel.innerHTML = `
			<div class="flex justify-start items-center p-3 flex-shrink-0 h-auto">
					<svg class="w-4 h-4 mr-2" viewBox="0 0 16 16" fill="currentColor">
						<path d="M3 1V4L4.66667 5.66667L4.2 8H2V6H0V15H6V12C6 10.8954 6.89543 10 8 10C9.10457 10 10 10.8954 10 12V15H16V6H14V8H11.8L11.3333 5.66667L13 4V1H11V3H9V1H7V3H5V1H3Z"/>
					</svg>
					<h2 class="text-base lg:text-lg font-semibold text-slate-800">Tournament Panel</h2>
				</div>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 overflow-y-auto flex-grow">

					<!-- TOURNAMENT ID -->
					<div class="bg-slate-100 rounded-md p-2 border border-slate-300 min-h-[3.5rem] flex items-center justify-between">
						<div class="flex items-center min-w-0 flex-1">
							<svg class="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
								<path fill-rule="evenodd" clip-rule="evenodd" d="M3.54944 12L3.21611 15H5.22841L5.56175 12H9.54944L9.21611 15H11.2284L11.5617 12H14.5552L14.7774 10H11.784L12.2284 6H15.2218L15.4441 4H12.4506L12.784 1H10.7717L10.4383 4H6.45064L6.78397 1H4.77166L4.43833 4H1.44431L1.22209 6H4.21611L3.77166 10H0.777642L0.55542 12H3.54944ZM5.78397 10H9.77166L10.2161 6H6.22841L5.78397 10Z"/>
							</svg>
							<div class="flex flex-col min-w-0">
								<p class="text-xs font-semibold text-slate-700">Tournament ID</p>
								<p id="tournamentIdText" class="text-sm text-slate-500 truncate">Not in tournament</p>
							</div>
						</div>
						<button type="button" id="copyTournamentId" class="flex items-center justify-center w-8 h-8 hover:bg-slate-200 rounded-md transition-colors duration-200 ml-2 flex-shrink-0">
							<svg class="w-4 h-4 text-slate-600" viewBox="0 0 16 16" fill="currentColor">
								<path d="M10 0L9 1L11.2929 3.29289L6.2929 8.29289L7.70711 9.70711L12.7071 4.7071L15 7L16 6V0H10Z"/>
								<path d="M1 2H6V4H3V13H12V10H14V15H1V2Z"/>
							</svg>
						</button>
					</div>

					<!-- TOURNAMNET PLAYER -->
					<div class="bg-slate-100 rounded-md p-2 border border-slate-300 min-h-[3.5rem] flex items-center justify-between">
						<div class="flex items-center min-w-0 flex-1">
							<svg class="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
								<path d="M8 9C9.38071 9 10.5 7.88071 10.5 6.5C10.5 5.11929 9.38071 4 8 4C6.61929 4 5.5 5.11929 5.5 6.5C5.5 7.88071 6.61929 9 8 9Z"/>
								<path fill-rule="evenodd" clip-rule="evenodd" d="M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16ZM6 10C4.80291 10 3.76957 10.7012 3.28827 11.7152C2.48151 10.6934 2 9.40294 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 9.40294 13.5185 10.6934 12.7117 11.7152C12.2304 10.7012 11.1971 10 10 10H6Z"/>
							</svg>
							<div class="flex flex-col min-w-0">
								<p class="text-xs font-semibold text-slate-700">Players</p>
								<p id="playersStatus" class="text-sm text-slate-500">Not in tournament</p>
							</div>
						</div>
						<button type="button" id="leaveTournamentBtn" class="flex items-center justify-center w-8 h-8 hover:bg-red-200 rounded-md transition-colors duration-200 ml-2 flex-shrink-0">
							<svg class="w-4 h-4 text-red-600" viewBox="0 0 16 16" fill="currentColor">
								<path d="M11 4V7L5 7V9H11V12H12L16 8L12 4L11 4Z"/>
								<path d="M0 1L3.41715e-07 15H8V13H2L2 3H8L8 1L0 1Z"/>
							</svg>
						</button>
					</div>

			  		  <!-- TOUNRMANET ROLES -->
                    <div class="bg-slate-100 rounded-md p-2 border border-slate-300 min-h-[3.5rem] flex items-center justify-between">
                        <div class="flex items-center min-w-0 flex-1">
                            <svg class="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 4C9.10457 4 10 3.10457 10 2C10 0.895431 9.10457 0 8 0C6.89543 0 6 0.895431 6 2C6 3.10457 6.89543 4 8 4Z"/>
                                <path d="M2 6C3.10457 6 4 5.10457 4 4C4 2.89543 3.10457 2 2 2C0.895431 2 0 2.89543 0 4C0 5.10457 0.895431 6 2 6Z"/>
                                <path d="M14 6C15.1046 6 16 5.10457 16 4C16 2.89543 15.1046 2 14 2C12.8954 2 12 2.89543 12 4C12 5.10457 12.8954 6 14 6Z"/>
                                <path d="M8 16C10.2091 16 12 14.2091 12 12C12 9.79086 10.2091 8 8 8C5.79086 8 4 9.79086 4 12C4 14.2091 5.79086 16 8 16Z"/>
                            </svg>
                            <div class="flex flex-col min-w-0">
                                <p class="text-xs font-semibold text-slate-700">Role</p>
                                <p id="userRole" class="text-sm text-slate-500 font-medium">Participant</p>
                            </div>
                        </div>
                        <button type="button" id="startTournamentBtn" class="flex items-center justify-center w-8 h-8 bg-green-100 hover:bg-green-200 rounded-md transition-colors duration-200 ml-2 hidden flex-shrink-0">
                            <svg class="w-4 h-4 text-green-600" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8.1716 8.00003L3.58582 3.41424L6.41424 0.585815L13.8285 8.00003L6.41424 15.4142L3.58582 12.5858L8.1716 8.00003Z"/>
                            </svg>
                        </button>
                    </div>

					<!-- TOURNAMENT STATUS -->
					<div class="bg-slate-100 rounded-md p-2 border border-slate-300 min-h-[3.5rem] flex items-center justify-between">
						<div class="flex items-center min-w-0 flex-1">
							<svg class="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
								<path d="M15.4141 4.91424L5.99991 14.3285L0.585693 8.91424L3.41412 6.08582L5.99991 8.6716L12.5857 2.08582L15.4141 4.91424Z"/>
							</svg>
							<div class="flex flex-col min-w-0">
								<p class="text-xs font-semibold text-slate-700">Tournament Status</p>
								<p id="tournamentStatus" class="text-sm text-slate-500 font-medium truncate">Waiting for the room owner to kick things off…</p>
							</div> 
						</div>
						
					</div>

				</div>
				<div class="border-t border-dashed border-slate-300 mx-2 my-4"></div>
		`
	}

	TournamentLobbyPanelListeners();
}
/*
			LISTENERS
*/

function MainMenuListeners(): void {
	const createTournamentBtn = document.getElementById("createRoomBtn");
	if (createTournamentBtn) {
		createTournamentBtn.addEventListener("click", () => {
			createTournament();
		})
	}

	const joinRoomBtn = document.getElementById("joinRoomBtn");
	const joinRoomInput = document.getElementById("joinRoomInput") as HTMLInputElement
	if (joinRoomBtn && joinRoomInput) {
		joinRoomBtn.addEventListener("click", () => {
			const tournamentId = joinRoomInput.value || '';
			if (tournamentId)
				joinTournament(tournamentId);
		})
	}
}

function TournamentLobbyPanelListeners(): void {
	const copyTournamentId = document.getElementById("copyTournamentId") as HTMLButtonElement;
	const tournamentIdText = document.getElementById("tournamentIdText");

	if (copyTournamentId && tournamentIdText) {
		copyTournamentId.addEventListener("click", () => {
			try {
				navigator.clipboard.writeText(tournamentIdText.textContent || "").then(() => {
					const popup = document.createElement('div');
					popup.textContent = 'Copied!';
					popup.className = 'absolute bg-green-600 text-white text-xs px-2 py-1 rounded-md shadow-lg z-50 transition-opacity duration-200';
					popup.style.transform = 'translateX(-50%)';
					popup.style.left = '50%';
					popup.style.bottom = '120%';

					copyTournamentId.style.position = 'relative';
					copyTournamentId.appendChild(popup);

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

	const leaveTournamentBtn = document.getElementById("leaveTournamentBtn")
	if (leaveTournamentBtn) {
		leaveTournamentBtn.addEventListener("click", () => {
			leaveTournament();
			navigate("/tournament");
		});
	}

	const startTournamentBtn = document.getElementById("startTournamentBtn");
	if (startTournamentBtn) {
		startTournamentBtn.addEventListener("click", () => {
			if (tournamentSocket && tournamentSocket.readyState === WebSocket.OPEN && isOwner) {
				tournamentSocket.send(JSON.stringify({ type: 'start' }));
			}
		});
	}
}

/* 
		DATA SYNC FUNC
*/

function syncGameServerData(msg: any): void {
	// UPDATING USER ROLE
	if (msg.ownerId && msg.ownerId === currentUserId) {
		updateStatusTexts([
			{ divId: "userRole", status: "Room Owner" }
		])
		if (!msg.locked && msg.current_players >= 2) {
			editDivClass([{ divId: "startTournamentBtn", mode: "remove", parameter: "hidden" }]);
		} else {
			editDivClass([{ divId: "startTournamentBtn", mode: "add", parameter: "hidden" }]);
		}
	}

	if (msg.type === "tourny_info") {
		handleTournyInfo(msg);
		editDivClass([
			{ divId: "TournyMainMenu", mode: "add", parameter: "hidden" },
			{ divId: "tournamentContent", mode: "remove", parameter: "hidden" },
			{ divId: "TournyInfoPanel", mode: "remove", parameter: "hidden" }
		])
	}
}

function handleTournyInfo(msg: any): void {
	// HANDLE TOURNAMENT ID AND PLAYER COUNT
	if (msg.roomId && msg.current_players) {
		updateStatusTexts([
			{ divId: "tournamentIdText", status: msg.roomId },
			{ divId: "playersStatus", status: `${msg.current_players} / 4` }
		])
	}

	if (msg.brackets && msg.brackets.length > 0) {
		displayTournamentBrackets(msg.brackets);
		editDivClass([
			{ divId: "TournyBracketPanel", mode: "remove", parameter: "hidden" }
		]);

	}
}

function displayTournamentBrackets(brackets: any): void {
	let bracketsContainer = document.getElementById("tournamentBrackets");

	if (bracketsContainer) {

		const bracketsContent = document.getElementById("bracketsContent");
		if (bracketsContent && brackets && brackets.length > 0) {
			let bracketsHTML = "";

			for (let roundIndex = 0; roundIndex < brackets.length; roundIndex++) {
				const round = brackets[roundIndex];
				bracketsHTML += `
                <div class="mb-4">
                    <h3 class="text-md font-semibold text-slate-700 mb-2">
                        ${roundIndex === brackets.length - 1 ? 'Current Round' : `Round ${roundIndex + 1}`}
                    </h3>
                    <div class="space-y-2">
            `;

				for (let matchIndex = 0; matchIndex < round.length; matchIndex++) {
					const bracket = round[matchIndex];


					const p1Name = bracket.p1 ? (bracket.p1.username || bracket.p1.id) : "No opponent";
					const p2Name = bracket.p2 ? (bracket.p2.username || bracket.p2.id) : "No opponent";
					const p1avatar = bracket.p1 ? (`/user/avatar/${bracket.p1.id}`) : "/files/users/default.png";
					const p2avatar = bracket.p2 ? (`/user/avatar/${bracket.p2.id}`) : "/files/users/default.png";

					// Determine correct scores for display
					let p1Score = 0;
					let p2Score = 0;
					
					if (bracket.finalScore) {
						p1Score = bracket.finalScore[0];
						p2Score = bracket.finalScore[1];
						
						// If we have a winner and scores are different, ensure winner has higher score
						if (bracket.winner && bracket.finalScore[0] !== bracket.finalScore[1]) {
							const isP1Winner = bracket.winner.id === bracket.p1?.id;
							const isP2Winner = bracket.winner.id === bracket.p2?.id;
							
							if (isP1Winner && bracket.finalScore[0] < bracket.finalScore[1]) {
								// P1 won but has lower score - swap
								p1Score = bracket.finalScore[1];
								p2Score = bracket.finalScore[0];
							} else if (isP2Winner && bracket.finalScore[1] < bracket.finalScore[0]) {
								// P2 won but has lower score - swap
								p1Score = bracket.finalScore[1];
								p2Score = bracket.finalScore[0];
							}
						}
					}
					
					const scoreDisplay = `${p1Score} - ${p2Score}`;

					// Déterminer le statut
					let status = "En cours";
					if (bracket.winner) {
						status = "Terminé";
					} else if (!bracket.p1 || !bracket.p2) {
						status = "En attente";
					}

					bracketsHTML += `
                    <div class="bg-white rounded-md p-3 border border-slate-200 flex items-center justify-between">
                        <!-- Match info en une ligne -->
                        <div class="flex items-center space-x-3 flex-1">
                            <!-- Joueur 1 -->
                            <div class="flex items-center space-x-2">
                                <img src="${p1avatar}" alt="${p1Name}" class="w-6 h-6 rounded-full object-cover border ${bracket.winner && bracket.winner.id === bracket.p1?.id ? 'border-green-500' : 'border-slate-300'}">
                                <span class="text-sm font-medium ${bracket.winner && bracket.winner.id === bracket.p1?.id ? 'text-green-600' : 'text-slate-800'}">${p1Name}</span>
                            </div>
                            
                            <!-- VS -->
                            <span class="text-xs text-slate-500 font-medium">VS</span>
                            
                            <!-- Joueur 2 -->
                            <div class="flex items-center space-x-2">
                                <span class="text-sm font-medium ${bracket.winner && bracket.winner.id === bracket.p2?.id ? 'text-green-600' : 'text-slate-800'}">${p2Name}</span>
                                <img src="${p2avatar}" alt="${p2Name}" class="w-6 h-6 rounded-full object-cover border ${bracket.winner && bracket.winner.id === bracket.p2?.id ? 'border-green-500' : 'border-slate-300'}">
                            </div>
                        </div>
                        
                        <!-- Score et Status -->
                        <div class="flex items-center space-x-4">
                            <span class="text-sm text-slate-600 font-mono">${scoreDisplay}</span>
                            <span class="text-xs px-2 py-1 rounded-full font-medium ${status === "Terminé" ? "bg-green-100 text-green-700" :
							status === "En cours" ? "bg-blue-100 text-blue-700" :
								"bg-gray-100 text-gray-700"
						}">${status}</span>
                        </div>
                    </div>
                `;
				}

				bracketsHTML += `
                    </div>
                </div>
            `;
			}

			bracketsContent.innerHTML = bracketsHTML;
		}
	}
}

/*
			GAME ROOM METHODS
*/

function connectToGameRoom(roomId: string): void {
	if (gameSocket && (gameSocket.readyState === WebSocket.OPEN || gameSocket.readyState === WebSocket.CONNECTING))
		gameSocket.close();

	gameSocket = new WebSocket(wsUrl(`/pong/join/${roomId}`));

	gameSocket.onopen = () => {

	}

	gameSocket.onclose = () => {

	}

	gameSocket.onerror = () => {

	}

	gameSocket.onmessage = (e) => {
		const msg = JSON.parse(e.data);
		console.log("[DBUG GAMESOCKET]", msg);
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

			case "opponent_left":
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				showNotification("L'adversaire s'est déconnecté.", "error");

				break;
			case "opponent_lost":
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				showNotification("Connection avec l'adversaire perdue", "error");
				break;

			case "game_found":
				// ALERTE
				handleRoomInfo(msg, roomId).catch(console.error);
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				showNotification("Partie trouvé", "success");

				break;

			case "game_full":
				showNotification("La partie est complète", "error");
				break;

			case "connected":
				// ALERTE
				loadGameWindow();
				setupInGameMenuListeners(gameSocket);
				handleRoomInfo(msg, roomId).catch(console.error);
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				editDivClass([
					{ divId: "inGameMenu", mode: "remove", parameter: "hidden" }
				])
				showNotification("Connecté à la partie!", "success");

				break;

			case "room_info":
				activateGameControls();
				handleRoomInfo(msg, roomId).catch(console.error);
				break;


			case "reconnect_to_game":
				const reconnect = confirm(`${msg.message} Room: ${msg.roomId}`);
				if (reconnect && gameSocket) {
					showNotification("Reconnexion à la partie...", "success");
					gameSocket.send(JSON.stringify({ type: "reconnect" }));
				}
				else {
					showNotification("Reconnexion annulée", "error");
				}
				if (gameSocket) {
					gameSocket.send(JSON.stringify({ type: "getRoomInfo" }));
				}
				break;

			default:
				console.log("[GAMESOCKET] Unknow message type:", msg.type);


		}

	}

}

/*
			TOURNAMENT METHODS
*/

function createTournament(): void {
	leaveTournament();

	tournamentSocket = new WebSocket(wsUrl(`/pong/tourny/create/${(4)}`));

	tournamentSocket.onopen = () => {
		console.log("Connected to Tournament WebSocket.");
		isOwner = true;
	}

	tournamentSocket.onclose = () => {
	}

	tournamentSocket.onerror = () => {

	}

	tournamentSocket.onmessage = (e: any) => {
		const msg = JSON.parse(e.data);
		console.log("[DEBUG TOURNAMENT SOCKET]", msg);
		if (msg.roomId) {
			tournamentId = msg.roomId;
		}

		handleTournamentMessage(msg);
	}

}

export function joinTournament(tournamentId: string): void {
	leaveTournament();

	tournamentSocket = new WebSocket(wsUrl(`/pong/tourny/join/${tournamentId}`));

	tournamentSocket.onopen = () => {
		console.log("Connected to Tournament WebSocket.");
	}

	tournamentSocket.onclose = () => {
	}

	tournamentSocket.onerror = () => {

	}

	tournamentSocket.onmessage = (e: any) => {
		const msg = JSON.parse(e.data);
		console.log("[DEBUG TOURNAMENT SOCKET]", msg);
		if (msg.roomId) {
			tournamentId = msg.roomId;
		}
		handleTournamentMessage(msg);
	}

}

function leaveTournament(): void {
	if (tournamentSocket && (tournamentSocket.readyState === WebSocket.OPEN || tournamentSocket.readyState === WebSocket.CONNECTING)) {
		try {
			tournamentSocket.close(1000, tournamentId);
		} catch (error) {
			console.error("[Tournament] Failed to close tournamentSocket.", error);
		}
	}

	if (gameSocket && (gameSocket.readyState === WebSocket.OPEN || gameSocket.readyState === WebSocket.CONNECTING)) {
		try {
			gameSocket.close(1000, gameId);
		} catch (error) {
			console.error("[Tournament] Failed to close roomGameSocket.", error);

		}
	}
}

function handleTournamentMessage(msg: any): void {
	switch (msg.type) {
		case "tourny_created":
			loadTournamentInfoPanel();
			showNotification("Tournois crée !", "success");

			break;

		case "joined_tourny":
			loadTournamentInfoPanel();
			showNotification("Connecté à la partie!", "success");
			break;

		case "tourny_info":
			syncGameServerData(msg);
			break;

		case "join_game":
			displayTournamentBrackets(msg.bracket);
			connectToGameRoom(msg.roomId);
			break;

		case "advancing":
			displayTournamentBrackets(msg.bracket);
			showNotification("Advancing to next brackets", "success");

			break;

		case "tourny_end":
			syncGameServerData(msg);
			displayTournamentBrackets(msg.bracket);
			showNotification("Partie terminée!", "success");
			showTournamentEndSummary(msg);
			break;


		default:
			console.log("TOURNAMENT MSG:", msg);
			break;
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
