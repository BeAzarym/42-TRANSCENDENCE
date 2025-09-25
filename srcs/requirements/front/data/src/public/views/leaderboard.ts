import { renderNavbar } from "./navbar";
import { navigate } from "../main";

interface LeaderboardEntry {
	dataId: string;
    userId: string;
	username: string;
    value: number;
    ratio?: number;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    currentStreak: number;
    maxStreak: number;
    tournamentWins: number;
    avatar?: string;
}

type LeaderboardType = 'Normal' | 'Tournament';
type StatType = 'mostGamePlayed' | 'highestWinRatio' | 'highestWinStreak';

let currentLeaderboardType: LeaderboardType = 'Normal';
let currentStatType: StatType = 'mostGamePlayed';

export function renderLeaderboard(root: HTMLElement, navigate: (path: string) => void): void {
    renderNavbar(navigate);

    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `
            <div class="flex justify-center items-center h-full w-full">
                <div class="bg-slate-200 rounded-md shadow-lg border-2 border-slate-300 w-full max-w-4xl mx-auto p-6">
                    <div class="p-4 mb-6">
                        <div class="flex justify-center items-center mb-6">
                            <h1 class="flex justify-center items-center text-2xl font-bold text-slate-900 p-2">LEADERBOARD</h1>
                        </div>

                        <div class="bg-slate-50 rounded-md mb-6 border-2 border-slate-200 shadow-lg p-4">
                            <h2 class="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M2 2C2 0.895431 2.89543 0 4 0H12C13.1046 0 14 0.895431 14 2V14C14 15.1046 13.1046 16 12 16H4C2.89543 16 4 15.1046 2 14V2ZM4 2V14H12V2H4Z"/>
                                </svg>
                                Type de classement
                            </h2>
                            <div class="grid grid-cols-2 gap-4">
                                <button id="normalLeaderboardBtn" 
                                        class="leaderboard-type-btn ${currentLeaderboardType === 'Normal' ? 'bg-slate-800' : 'bg-slate-600 hover:bg-slate-800'} text-white py-3 px-6 rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2">
                                    <svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M8 0C12.4183 0 16 3.58172 16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0ZM8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z"/>
                                    </svg>
                                    Match Normal
                                </button>
                                <button id="tournamentLeaderboardBtn" 
                                        class="leaderboard-type-btn ${currentLeaderboardType === 'Tournament' ? 'bg-slate-800' : 'bg-slate-600 hover:bg-slate-800'} text-white py-3 px-6 rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2">
                                    <svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M6 2L6 14L10 14L10 2L6 2ZM4 6L4 14L5 14L5 6L4 6ZM11 6L11 14L12 14L12 6L11 6ZM2 8L2 14L3 14L3 8L2 8ZM13 8L13 14L14 14L14 8L13 8Z"/>
                                    </svg>
                                    Tournoi
                                </button>
                            </div>
                        </div>

                        <div class="bg-slate-50 rounded-md mb-6 border-2 border-slate-200 shadow-lg p-4">
                            <h2 class="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M4 2C2.89543 2 2 2.89543 2 4V12C2 13.1046 2.89543 14 4 14H12C13.1046 14 12 13.1046 12 12V4C12 2.89543 13.1046 2 12 2H4ZM4 4H12V12H4V4Z"/>
                                </svg>
                                Critère de classement
                            </h2>
                            <div class="grid grid-cols-3 gap-4">
                                <button id="gamesStatBtn" 
                                        class="stat-type-btn ${currentStatType === 'mostGamePlayed' ? 'bg-slate-800' : 'bg-slate-600 hover:bg-slate-800'} text-white py-3 px-4 rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M1 1L1 15L15 15L15 1L1 1ZM3 3L13 3L13 13L3 13L3 3Z"/>
                                    </svg>
                                    <span class="text-sm">Parties jouées</span>
                                </button>
                                <button id="ratioStatBtn" 
                                        class="stat-type-btn ${currentStatType === 'highestWinRatio' ? 'bg-slate-800' : 'bg-slate-600 hover:bg-slate-800'} text-white py-3 px-4 rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M8 1L11 6L6 6L8 1Z"/>
                                        <path d="M8 15L5 10L10 10L8 15Z"/>
                                    </svg>
                                    <span class="text-sm">Meilleur ratio</span>
                                </button>
                                <button id="streakStatBtn" 
                                        class="stat-type-btn ${currentStatType === 'highestWinStreak' ? 'bg-slate-800' : 'bg-slate-600 hover:bg-slate-800'} text-white py-3 px-4 rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M8 2L10 6L14 6L11 9L12 14L8 11L4 14L5 9L2 6L6 6L8 2Z"/>
                                    </svg>
                                    <span class="text-sm">Plus haute streak</span>
                                </button>
                            </div>
                        </div>

                        <div id="leaderboardContent" class="bg-slate-50 rounded-md border-2 border-slate-200 shadow-lg p-4">
                            <div class="text-center text-slate-600">Chargement...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupLeaderboardEventListeners();
        loadLeaderboard();
    }
}

function setupLeaderboardEventListeners(): void {
    const normalBtn = document.getElementById('normalLeaderboardBtn');
    const tournamentBtn = document.getElementById('tournamentLeaderboardBtn');

    if (normalBtn) {
        normalBtn.addEventListener('click', function() {
            currentLeaderboardType = 'Normal';
            updateButtonStates();
            loadLeaderboard();
        });
    }

    if (tournamentBtn) {
        tournamentBtn.addEventListener('click', function() {
            currentLeaderboardType = 'Tournament';
            updateButtonStates();
            loadLeaderboard();
        });
    }

    const gamesBtn = document.getElementById('gamesStatBtn');
    const ratioBtn = document.getElementById('ratioStatBtn');
    const streakBtn = document.getElementById('streakStatBtn');

    if (gamesBtn) {
        gamesBtn.addEventListener('click', function() {
            currentStatType = 'mostGamePlayed';
            updateButtonStates();
            loadLeaderboard();
        });
    }

    if (ratioBtn) {
        ratioBtn.addEventListener('click', function() {
            currentStatType = 'highestWinRatio';
            updateButtonStates();
            loadLeaderboard();
        });
    }

    if (streakBtn) {
        streakBtn.addEventListener('click', function() {
            currentStatType = 'highestWinStreak';
            updateButtonStates();
            loadLeaderboard();
        });
    }
}

function updateButtonStates(): void {
    const normalBtn = document.getElementById('normalLeaderboardBtn');
    const tournamentBtn = document.getElementById('tournamentLeaderboardBtn');

    if (normalBtn) {
        normalBtn.className = `leaderboard-type-btn ${currentLeaderboardType === 'Normal' ? 'bg-slate-800' : 'bg-slate-600 hover:bg-slate-800'} text-white py-3 px-6 rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2`;
    }
    if (tournamentBtn) {
        tournamentBtn.className = `leaderboard-type-btn ${currentLeaderboardType === 'Tournament' ? 'bg-slate-800' : 'bg-slate-600 hover:bg-slate-800'} text-white py-3 px-6 rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2`;
    }

    const gamesBtn = document.getElementById('gamesStatBtn');
    const ratioBtn = document.getElementById('ratioStatBtn');
    const streakBtn = document.getElementById('streakStatBtn');

    if (gamesBtn) {
        gamesBtn.className = `stat-type-btn ${currentStatType === 'mostGamePlayed' ? 'bg-slate-800' : 'bg-slate-600 hover:bg-slate-800'} text-white py-3 px-4 rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2`;
    }
    if (ratioBtn) {
        ratioBtn.className = `stat-type-btn ${currentStatType === 'highestWinRatio' ? 'bg-slate-800' : 'bg-slate-600 hover:bg-slate-800'} text-white py-3 px-4 rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2`;
    }
    if (streakBtn) {
        streakBtn.className = `stat-type-btn ${currentStatType === 'highestWinStreak' ? 'bg-slate-800' : 'bg-slate-600 hover:bg-slate-800'} text-white py-3 px-4 rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2`;
    }
}

function loadLeaderboard(): void {
    const content = document.getElementById('leaderboardContent');
    if (!content) return;

    content.innerHTML = '<div class="text-center text-slate-600">Chargement...</div>';

    const type = currentLeaderboardType === 'Normal' ? 'Normal' : 'Tournament';
    const criteria = currentStatType === 'mostGamePlayed' ? 'mostGamePlayed' : currentStatType === 'highestWinRatio' ? 'highestWinRatio' : 'highestWinStreak';

    const relativeUrl = `/api/leaderboard/${type}/${criteria}`;
    const localhostUrl = `https://localhost:3000/${type}/${criteria}`;

    const urls = [relativeUrl];
    if (location.protocol !== 'https:') urls.push(localhostUrl);

    (async function tryFetchList() {
        for (const url of urls) {
            try {
                const response = await fetch(url, { credentials: 'include' });
                if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`);
                const data = await response.json();
                if (!Array.isArray(data)) throw new Error('Données invalides reçues');
                displayLeaderboard(data);
                return;
            } catch (e) {
                console.error('fetch failed for', url, e);
            }
        }
        content.innerHTML = `<div class="text-center text-red-600">Erreur: Impossible de joindre le service leaderboard</div>`;
    })();
}

function displayLeaderboard(entries: LeaderboardEntry[]): void {
    const content = document.getElementById('leaderboardContent');
    if (!content) return;

    if (entries.length === 0) {
        content.innerHTML = '<div class="text-center text-slate-600">Aucune donnée disponible pour ce classement</div>';
        return;
    }

    let titleText = '';
    if (currentLeaderboardType === 'Tournament') {
        titleText = currentStatType === 'mostGamePlayed' ? 'Classement par tournois gagnés' :
                   currentStatType === 'highestWinRatio' ? 'Meilleur ratio en tournoi' :
                   'Plus haute streak en tournoi';
    } else {
        titleText = currentStatType === 'mostGamePlayed' ? 'Classement par parties jouées' :
                   currentStatType === 'highestWinRatio' ? 'Meilleur ratio de victoires' :
                   'Plus haute streak de victoires';
    }

    let leaderboardHTML = `
        <h3 class="text-lg font-semibold text-slate-800 mb-4 text-center">${titleText}</h3>
        <div class="space-y-3 max-h-96 overflow-y-auto">
    `;

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const rank = i + 1;

        let rankColor = 'text-slate-600';
        if (rank === 1) rankColor = 'text-yellow-600';
        else if (rank === 2) rankColor = 'text-gray-500';
        else if (rank === 3) rankColor = 'text-orange-600';

        let valueText = '';
        if (currentStatType === 'mostGamePlayed') {
            valueText = currentLeaderboardType === 'Tournament' ?
                `${entry.tournamentWins} tournois gagnés` :
                `${entry.gamesPlayed} parties jouées`;
        } else if (currentStatType === 'highestWinRatio') {
            valueText = `${entry.value.toFixed(1)}% de victoires`;
        } else {
            valueText = `${entry.value} victoires consécutives`;
        }

		 const displayName = entry.username;
		const avatarUrl = `/user/avatar/${entry.userId}`;

        leaderboardHTML += `
            <div class="bg-white rounded-lg p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onclick="showPlayerProfile('${entry.userId}')">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="text-2xl font-bold ${rankColor} w-8 text-center">
                            #${rank}
                        </div>
                        <div class="w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center overflow-hidden">
                            ${avatarUrl ?
                                `<img src="${avatarUrl}" alt="${displayName}" class="w-full h-full object-cover">` :
                                `<span class="text-lg font-bold text-slate-600">${displayName.charAt(0).toUpperCase()}</span>`
                            }
                        </div>
                        <div>
                            <h4 class="text-lg font-semibold text-slate-800">${displayName}</h4>
                            <p class="text-slate-600 text-sm">${valueText}</p>
                        </div>
                    </div>
                    <div class="text-right text-sm text-slate-500">
                        <div>Victoires: ${entry.gamesWon} | Défaites: ${entry.gamesLost}</div>
                        <div>Streak actuelle: ${entry.currentStreak}</div>
                    </div>
                </div>
            </div>
        `;
    }

    leaderboardHTML += '</div>';
    content.innerHTML = leaderboardHTML;
}

function showPlayerProfile(playerId: string): void {
    navigate(`/profile/${playerId}`);
}

(window as any).showPlayerProfile = showPlayerProfile;