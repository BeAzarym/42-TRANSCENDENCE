import { renderNavbar } from "./navbar";

interface ProfileEntry {
    userId: string;
    userDataId: string;
    username: string;
    avatar: string;
    online: number;
    friends: string[];
    friendRequests: {in: string[], out: string[]};
    gameRatio: number;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    currentStreak: number;
    highestStreak: number;
    tournamentRatio: number;
    tournamentPlayed: number;
    tournamentWins: number;
    tournamentLoose: number;
    currentTournamentStreak: number;
    highestTournamentStreak: number;
    pastGame: Array<{
        gameId: string;
        players: string[];
        score: number[];
        date: string;
        isTournament: boolean;
        result: "win" | "loose";
    }>;
}

interface Friend {
    id: string;
    username: string;
    avatar: string;
    online: number;
}

export function renderProfile(root: HTMLElement, navigate: (path: string) => void, userId?: string): void {
    renderNavbar(navigate);

    const app = document.getElementById('app');
    if (!app) return;

    let currentUserId: string | null = null;

    const fetchProfile = async (profileUserId: string) => {
        try {
            const response = await fetch(`/api/profile/${profileUserId}`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch profile');
            const data: ProfileEntry = await response.json();
            
            // Récupérer les amis 
            const friendsResponse = await fetch(`/api/profile/${profileUserId}/friends`, { credentials: 'include' });
            const friends: Friend[] = friendsResponse.ok ? await friendsResponse.json() : [];
            
            // Récupérer les demandes d'amis pour l'utilisateur actuel
            let incomingRequests: Friend[] = [];
            let outgoingRequests: Friend[] = [];
            
            if (currentUserId === profileUserId) {
                // Pour les demandes entrantes, récupérer les détails des utilisateurs
                if (data.friendRequests.in.length > 0) {
                    for (const userId of data.friendRequests.in) {
                        try {
                            const userResponse = await fetch(`/api/profile/${userId}`, { credentials: 'include' });
                            if (userResponse.ok) {
                                const userData = await userResponse.json();
                                incomingRequests.push({
                                    id: userData.userId,
                                    username: userData.username,
                                    avatar: userData.avatar,
                                    online: userData.online
                                });
                            }
                        } catch (error) {
                            console.error('Error fetching user data:', error);
                        }
                    }
                }
                
                // Pour les demandes sortantes
                if (data.friendRequests.out.length > 0) {
                    for (const userId of data.friendRequests.out) {
                        try {
                            const userResponse = await fetch(`/api/profile/${userId}`, { credentials: 'include' });
                            if (userResponse.ok) {
                                const userData = await userResponse.json();
                                outgoingRequests.push({
                                    id: userData.userId,
                                    username: userData.username,
                                    avatar: userData.avatar,
                                    online: userData.online
                                });
                            }
                        } catch (error) {
                            console.error('Error fetching user data:', error);
                        }
                    }
                }
            }
            
            const isOwnProfile = currentUserId === profileUserId;
            const isFriend = data.friends.includes(currentUserId || '');
            const hasOutgoingRequest = data.friendRequests.in.includes(currentUserId || ''); // L'utilisateur actuel est dans les demandes ENTRANTES du profil visité = demande envoyée
            const hasIncomingRequest = data.friendRequests.out.includes(currentUserId || ''); // L'utilisateur actuel est dans les demandes SORTANTES du profil visité = demande reçue
            
            displayProfile(data, friends, incomingRequests, outgoingRequests, isOwnProfile, isFriend, hasOutgoingRequest, hasIncomingRequest, navigate);
        } catch (error) {
            console.error(error);
            app.innerHTML = '<div class="text-center text-red-600">Erreur: Impossible de charger le profil</div>';
        }
    };

    // Récupérer l'utilisateur actuel d'abord
    fetch('/auth/me', { credentials: 'include' })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch current user');
            return response.json();
        })
        .then(data => {
            currentUserId = data.id;
            const targetUserId = userId || currentUserId!; // Utiliser currentUserId si userId n'est pas fourni
            fetchProfile(targetUserId);
        })
        .catch(error => {
            console.error(error);
            app.innerHTML = '<div class="text-center text-red-600">Erreur: Impossible de récupérer l\'utilisateur actuel</div>';
        });

    function displayProfile(
        profile: ProfileEntry, 
        friends: Friend[], 
        incomingRequests: Friend[], 
        outgoingRequests: Friend[], 
        isOwnProfile: boolean, 
        isFriend: boolean, 
        hasOutgoingRequest: boolean, 
        hasIncomingRequest: boolean, 
        navigate: (path: string) => void
    ): void {
        if (app)
            app.innerHTML = `
            <div class="flex justify-center items-center h-full w-full">
                <div class="bg-slate-200 rounded-md shadow-lg border-2 border-slate-300 w-fit max-w-5xl mx-auto p-6">
                    <!-- Section 1: Avatar, Username et Statut -->
                    <div class="bg-slate-50 rounded-md mb-6 border-2 border-slate-200 shadow-lg p-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <div class="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center overflow-hidden">
                                    ${profile.avatar ?
                                        `<img src="/user/avatar/${profile.userId}" alt="${profile.username}" class="w-full h-full object-cover">` :
                                        `<span class="text-2xl font-bold text-slate-600">${profile.username.charAt(0).toUpperCase()}</span>`
                                    }
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h1 class="text-2xl font-bold text-slate-900">${profile.username}</h1>
                                        <div class="w-3 h-3 rounded-full ${profile.online !== 0 ? 'bg-green-500' : 'bg-gray-400'}"></div>
                                    </div>
                                    <p class="text-sm text-slate-600">
                                        ${profile.online !== 0 ? 'En ligne' : 'Hors ligne'}
                                    </p>
                                </div>
                            </div>
                            
                            <!-- Boutons d'action ami (seulement si ce n'est pas son propre profil) -->
                            ${!isOwnProfile ? `
                                <div class="flex gap-2">
                                    ${isFriend ? `
                                        <button onclick="removeFriend('${profile.userId}')" class="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm border-2 border-slate-700">
                                            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M15 1H1V15H15V1ZM4 7V9L12 9V7L4 7Z"/>
                                            </svg>
                                            Retirer cet ami
                                        </button>
                                    ` : hasOutgoingRequest ? `
                                        <button onclick="cancelFriendRequest('${profile.userId}')" class="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm border-2 border-slate-700">
                                            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M15 1H1V15H15V1ZM4.29289 5.70711L6.58579 8L4.29289 10.2929L5.70711 11.7071L8 9.41421L10.2929 11.7071L11.7071 10.2929L9.41421 8L11.7071 5.70711L10.2929 4.29289L8 6.58579L5.70711 4.29289L4.29289 5.70711Z"/>
                                            </svg>
                                            Annuler la demande
                                        </button>
                                    ` : hasIncomingRequest ? `
                                        <button onclick="acceptFriendRequest('${profile.userId}')" class="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm border-2 border-slate-700">
                                            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M15 1H1V15H15V1ZM7 4H9V7H12V9H9V12H7V9H4V7H7V4Z"/>
                                            </svg>
                                            Accepter
                                        </button>
                                        <button onclick="rejectFriendRequest('${profile.userId}')" class="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm border-2 border-slate-700">
                                            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M15 1H1V15H15V1ZM4.29289 5.70711L6.58579 8L4.29289 10.2929L5.70711 11.7071L8 9.41421L10.2929 11.7071L11.7071 10.2929L9.41421 8L11.7071 5.70711L10.2929 4.29289L8 6.58579L5.70711 4.29289L4.29289 5.70711Z"/>
                                            </svg>
                                            Refuser
                                        </button>
                                    ` : `
                                        <button onclick="addFriend('${profile.userId}')" class="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm border-2 border-slate-700">
                                            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M15 1H1V15H15V1ZM7 4H9V7H12V9H9V12H7V9H4V7H7V4Z"/>
                                            </svg>
                                            Ajouter en ami
                                        </button>
                                    `}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    ${isOwnProfile ? `
                        <!-- Grille 2x2 pour le profil personnel -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    ` : `
                        <!-- Grille pour le profil d'un autre utilisateur -->
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    `}
                        <!-- Section 1: Statistiques -->
                        <div class="bg-slate-50 rounded-md border-2 border-slate-200 shadow-lg p-4 ${!isOwnProfile ? 'lg:col-span-2' : ''}">
                            <h2 class="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="3" y1="19" x2="21" y2="19"/>
                                    <polyline points="3 15 8 9 14 12 21 5"/>
                                    <polyline points="21 10 21 5 16 5"/>
                                </svg>
                                Statistiques
                            </h2>
                            <div class="grid grid-cols-1 gap-4">
                                <div class="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                                    <h3 class="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor">
                                            <path fill-rule="evenodd" clip-rule="evenodd" d="M0 13L3 14L6 11H10L13 14L16 13L15.248 4.7284C15.1076 3.18316 13.812 2 12.2604 2H3.73964C2.18803 2 0.89244 3.18316 0.751964 4.72839L0 13ZM12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6ZM12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8ZM5 8C6.10457 8 7 7.10457 7 6C7 4.89543 6.10457 4 5 4C3.89543 4 3 4.89543 3 6C3 7.10457 3.89543 8 5 8Z"/>
                                        </svg>
                                        Parties Normales <span class="text-sm text-slate-600">(${profile.gamesPlayed})</span>
                                    </h3>
                                    <div class="grid grid-cols-2 gap-2 text-sm">
                                        <div class="text-slate-600 font-medium"><strong class="text-green-600 font-bold">${profile.gamesWon}</strong> Victoires / <strong class="text-red-600 font-bold">${profile.gamesLost}</strong> Défaites</div>
                                        <div class="text-slate-600 font-medium"><strong class="text-blue-600 font-bold">${(profile.gameRatio as any).toFixed(1)}%</strong> Taux de victoire</div>
                                        <div class="text-slate-600 font-medium flex items-center gap-2">
                                            Série actuelle: <strong class="text-purple-600 font-bold">${profile.currentStreak}</strong>
                                            <svg class="w-4 h-4 text-purple-600" viewBox="0 0 16 16" fill="currentColor">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M15 9C15 12.866 11.866 16 8 16C4.13401 16 1 12.866 1 9C1 5.5 4 3 4 3H6V4.5C6 5.05228 6.44772 5.5 7 5.5C7.55228 5.5 8 5.05228 8 4.5V0H10C10 0 15 3 15 9ZM10 12C10 13.1046 9.10457 14 8 14C6.89543 14 6 13.1046 6 12C6 9.5 8 8 8 8C8 8 10 9.5 10 12Z"/>
                                            </svg>
                                        </div>
                                        <div class="text-slate-600 font-medium flex items-center gap-2">
                                            Meilleure série: <strong class="text-amber-500 font-bold">${profile.highestStreak}</strong>
                                            <svg class="w-4 h-4 text-amber-500" viewBox="0 0 16 16" fill="currentColor">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M15 9C15 12.866 11.866 16 8 16C4.13401 16 1 12.866 1 9C1 5.5 4 3 4 3H6V4.5C6 5.05228 6.44772 5.5 7 5.5C7.55228 5.5 8 5.05228 8 4.5V0H10C10 0 15 3 15 9ZM10 12C10 13.1046 9.10457 14 8 14C6.89543 14 6 13.1046 6 12C6 9.5 8 8 8 8C8 8 10 9.5 10 12Z"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                                    <h3 class="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor">
                                            <path fill-rule="evenodd" clip-rule="evenodd" d="M4 0H12V2H16V4C16 6.45641 14.2286 8.49909 11.8936 8.92038C11.5537 10.3637 10.432 11.5054 9 11.874V14H12V16H4V14H7V11.874C5.56796 11.5054 4.44628 10.3637 4.1064 8.92038C1.77136 8.49909 0 6.45641 0 4V2H4V0ZM12 6.82929V4H14C14 5.30622 13.1652 6.41746 12 6.82929ZM4 4H2C2 5.30622 2.83481 6.41746 4 6.82929V4Z"/>
                                        </svg>
                                        Tournois <span class="text-sm text-slate-600">(${profile.tournamentPlayed})</span>
                                    </h3>
                                    <div class="grid grid-cols-2 gap-2 text-sm">
                                        <div class="text-slate-600 font-medium"><strong class="text-green-600 font-bold">${profile.tournamentWins}</strong> Victoires / <strong class="text-red-600 font-bold">${profile.tournamentLoose}</strong> Défaites</div>
                                        <div class="text-slate-600 font-medium"><strong class="text-blue-600 font-bold">${(profile.tournamentRatio as any).toFixed(1)}%</strong> Taux de victoire</div>
                                        <div class="text-slate-600 font-medium flex items-center gap-2">
                                            Série actuelle: <strong class="text-purple-600 font-bold">${profile.currentTournamentStreak}</strong>
                                            <svg class="w-4 h-4 text-purple-600" viewBox="0 0 16 16" fill="currentColor">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M15 9C15 12.866 11.866 16 8 16C4.13401 16 1 12.866 1 9C1 5.5 4 3 4 3H6V4.5C6 5.05228 6.44772 5.5 7 5.5C7.55228 5.5 8 5.05228 8 4.5V0H10C10 0 15 3 15 9ZM10 12C10 13.1046 9.10457 14 8 14C6.89543 14 6 13.1046 6 12C6 9.5 8 8 8 8C8 8 10 9.5 10 12Z"/>
                                            </svg>
                                        </div>
                                        <div class="text-slate-600 font-medium flex items-center gap-2">
                                            Meilleure série: <strong class="text-amber-500 font-bold">${profile.highestTournamentStreak}</strong>
                                            <svg class="w-4 h-4 text-amber-500" viewBox="0 0 16 16" fill="currentColor">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M15 9C15 12.866 11.866 16 8 16C4.13401 16 1 12.866 1 9C1 5.5 4 3 4 3H6V4.5C6 5.05228 6.44772 5.5 7 5.5C7.55228 5.5 8 5.05228 8 4.5V0H10C10 0 15 3 15 9ZM10 12C10 13.1046 9.10457 14 8 14C6.89543 14 6 13.1046 6 12C6 9.5 8 8 8 8C8 8 10 9.5 10 12Z"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Section 2: Amis -->
                        <div class="bg-slate-50 rounded-md border-2 border-slate-200 shadow-lg p-4 ${!isOwnProfile ? 'lg:row-span-2' : ''}">
                            <h2 class="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 3.5C8 4.88071 6.88071 6 5.5 6C4.11929 6 3 4.88071 3 3.5C3 2.11929 4.11929 1 5.5 1C6.88071 1 8 2.11929 8 3.5Z"/>
                                    <path d="M3 8C1.34315 8 0 9.34315 0 11V15H8V8H3Z"/>
                                    <path d="M13 8H10V15H16V11C16 9.34315 14.6569 8 13 8Z"/>
                                    <path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z"/>
                                </svg>
                                Amis (${friends.length})
                            </h2>
                            <div class="space-y-2 ${!isOwnProfile ? 'max-h-96' : 'max-h-80'} overflow-y-auto">
                                ${friends.length > 0 ? friends.map(friend => `
                                    <div onclick="goToProfile('${friend.id}')" class="bg-white rounded-lg p-2 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer w-full">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                                ${friend.avatar ?
                                                    `<img src="/user/avatar/${friend.id}" alt="${friend.username}" class="w-full h-full object-cover">` :
                                                    `<span class="text-xs font-bold text-slate-600">${friend.username.charAt(0).toUpperCase()}</span>`
                                                }
                                            </div>
                                            <div class="flex items-center gap-1 flex-1">
                                                <h3 class="text-sm font-semibold text-slate-800">${friend.username}</h3>
                                                <div class="w-2 h-2 rounded-full ${friend.online !== 0 ? 'bg-green-500' : 'bg-gray-400'}"></div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('') : '<div class="text-center text-slate-600 py-4">Aucun ami pour le moment</div>'}
                            </div>
                        </div>

                        ${isOwnProfile ? `
                            <!-- Section 3: Historique des parties -->
                            <div class="bg-slate-50 rounded-md border-2 border-slate-200 shadow-lg p-4">
                            <h2 class="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M0 13L3 14L6 11H10L13 14L16 13L15.248 4.7284C15.1076 3.18316 13.812 2 12.2604 2H3.73964C2.18803 2 0.89244 3.18316 0.751964 4.72839L0 13ZM12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6ZM12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8ZM5 8C6.10457 8 7 7.10457 7 6C7 4.89543 6.10457 4 5 4C3.89543 4 3 4.89543 3 6C3 7.10457 3.89543 8 5 8Z"/>
                                </svg>
                                Historique des Parties
                            </h2>
                            <div class="space-y-2 max-h-80 overflow-y-auto">
                                ${profile.pastGame.length > 0 ? profile.pastGame.map(game => `
                                    <div class="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
                                        <div class="flex justify-between items-center text-sm gap-4">
                                            <div class="flex items-center gap-3 w-24">
                                                <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                                    ${game.isTournament ? 
                                                        `<path fill-rule="evenodd" clip-rule="evenodd" d="M4 0H12V2H16V4C16 6.45641 14.2286 8.49909 11.8936 8.92038C11.5537 10.3637 10.432 11.5054 9 11.874V14H12V16H4V14H7V11.874C5.56796 11.5054 4.44628 10.3637 4.1064 8.92038C1.77136 8.49909 0 6.45641 0 4V2H4V0ZM12 6.82929V4H14C14 5.30622 13.1652 6.41746 12 6.82929ZM4 4H2C2 5.30622 2.83481 6.41746 4 6.82929V4Z"/>` :
                                                        `<path fill-rule="evenodd" clip-rule="evenodd" d="M0 13L3 14L6 11H10L13 14L16 13L15.248 4.7284C15.1076 3.18316 13.812 2 12.2604 2H3.73964C2.18803 2 0.89244 3.18316 0.751964 4.72839L0 13ZM12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6ZM12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8ZM5 8C6.10457 8 7 7.10457 7 6C7 4.89543 6.10457 4 5 4C3.89543 4 3 4.89543 3 6C3 7.10457 3.89543 8 5 8Z"/>`
                                                    }
                                                </svg>
                                                <span class="font-semibold text-slate-800">${game.isTournament ? 'Tournoi' : 'Normal'}</span>
                                            </div>
                                            <div class="flex items-center gap-3 w-32">
                                                <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                                    <path d="M8 3.5C8 4.88071 6.88071 6 5.5 6C4.11929 6 3 4.88071 3 3.5C3 2.11929 4.11929 1 5.5 1C6.88071 1 8 2.11929 8 3.5Z"/>
                                                    <path d="M3 8C1.34315 8 0 9.34315 0 11V15H8V8H3Z"/>
                                                    <path d="M13 8H10V15H16V11C16 9.34315 14.6569 8 13 8Z"/>
                                                    <path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z"/>
                                                </svg>
                                                <span class="text-slate-600 truncate">${game.players.join(', ')}</span>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                                                    <path d="M8.16923 2.00234C8.11301 2.00078 8.0566 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 7.9434 13.9992 7.88699 13.9977 7.83077L15.7642 6.06422C15.9182 6.68407 16 7.33249 16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C8.66751 0 9.31593 0.0817526 9.93578 0.235791L8.16923 2.00234Z M4 7.99996C4 6.13612 5.27477 4.57002 7 4.12598V6.26752C6.4022 6.61333 6 7.25968 6 7.99996C6 9.10453 6.89543 9.99996 8 9.99996C8.74028 9.99996 9.38663 9.59776 9.73244 8.99996H11.874C11.4299 10.7252 9.86384 12 8 12C5.79086 12 4 10.2091 4 7.99996Z M14 2L13 0L10 3V4.58579L7.79289 6.79289L9.20711 8.20711L11.4142 6H13L16 3L14 2Z"/>
                                                </svg>
                                                <span class="px-2 py-1 rounded-lg font-bold text-xs ${game.result === 'win' ? 'bg-green-300 text-green-900' : 'bg-red-300 text-red-900'}">${game.result === 'win' ? 'Victoire' : 'Défaite'}</span>
                                            </div>
                                            <span class="text-slate-600 font-medium text-xs w-16 text-center">
                                                ${game.score.join('-')}
                                            </span>
                                            <div class="flex items-center gap-2 w-20">
                                                <svg class="w-3 h-3" viewBox="-0.5 0 15 15" fill="currentColor">
                                                    <path fill-rule="evenodd" d="M107,154.006845 C107,153.45078 107.449949,153 108.006845,153 L119.993155,153 C120.54922,153 121,153.449949 121,154.006845 L121,165.993155 C121,166.54922 120.550051,167 119.993155,167 L108.006845,167 C107.45078,167 107,166.550051 107,165.993155 L107,154.006845 Z M108,157 L120,157 L120,166 L108,166 L108,157 Z M116.5,163.5 L116.5,159.5 L115.757485,159.5 L114.5,160.765367 L114.98503,161.275112 L115.649701,160.597451 L115.649701,163.5 L116.5,163.5 Z M112.5,163.5 C113.412548,163.5 114,163.029753 114,162.362119 C114,161.781567 113.498099,161.473875 113.110266,161.433237 C113.532319,161.357765 113.942966,161.038462 113.942966,160.550798 C113.942966,159.906386 113.395437,159.5 112.505703,159.5 C111.838403,159.5 111.359316,159.761248 111.051331,160.115385 L111.456274,160.632075 C111.724335,160.370827 112.055133,160.231495 112.425856,160.231495 C112.819392,160.231495 113.13308,160.382438 113.13308,160.690131 C113.13308,160.974601 112.847909,161.102322 112.425856,161.102322 C112.28327,161.102322 112.020913,161.102322 111.952471,161.096517 L111.952471,161.839623 C112.009506,161.833817 112.26616,161.828012 112.425856,161.828012 C112.956274,161.828012 113.190114,161.967344 113.190114,162.275036 C113.190114,162.565312 112.93346,162.768505 112.471483,162.768505 C112.10076,162.768505 111.684411,162.605951 111.427757,162.327286 L111,162.87881 C111.279468,163.227141 111.804183,163.5 112.5,163.5 Z M110,152.5 C110,152.223858 110.214035,152 110.504684,152 L111.495316,152 C111.774045,152 112,152.231934 112,152.5 L112,153 L110,153 L110,152.5 Z M116,152.5 C116,152.223858 116.214035,152 116.504684,152 L117.495316,152 C117.774045,152 118,152.231934 118,152.5 L118,153 L116,153 L116,152.5 Z" transform="translate(-107 -152)"/>
                                                </svg>
                                                <span class="text-blue-600 font-semibold text-xs">${game.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('') : '<div class="text-center text-slate-600">Aucune partie jouée</div>'}
                            </div>
                        </div>
                        ` : `
                            <!-- Section 3: Historique des parties (élargi pour profil visiteur) -->
                            <div class="bg-slate-50 rounded-md border-2 border-slate-200 shadow-lg p-4 lg:col-span-2">
                                <h2 class="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor">
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M0 13L3 14L6 11H10L13 14L16 13L15.248 4.7284C15.1076 3.18316 13.812 2 12.2604 2H3.73964C2.18803 2 0.89244 3.18316 0.751964 4.72839L0 13ZM12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6ZM12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8ZM5 8C6.10457 8 7 7.10457 7 6C7 4.89543 6.10457 4 5 4C3.89543 4 3 4.89543 3 6C3 7.10457 3.89543 8 5 8Z"/>
                                    </svg>
                                    Historique des Parties
                                </h2>
                                <div class="space-y-2 max-h-96 overflow-y-auto">
                                    ${profile.pastGame.length > 0 ? profile.pastGame.map(game => `
                                        <div class="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
                                            <div class="flex justify-between items-center text-sm gap-4">
                                                <div class="flex items-center gap-3 w-24">
                                                    <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                                        ${game.isTournament ? 
                                                            `<path fill-rule="evenodd" clip-rule="evenodd" d="M4 0H12V2H16V4C16 6.45641 14.2286 8.49909 11.8936 8.92038C11.5537 10.3637 10.432 11.5054 9 11.874V14H12V16H4V14H7V11.874C5.56796 11.5054 4.44628 10.3637 4.1064 8.92038C1.77136 8.49909 0 6.45641 0 4V2H4V0ZM12 6.82929V4H14C14 5.30622 13.1652 6.41746 12 6.82929ZM4 4H2C2 5.30622 2.83481 6.41746 4 6.82929V4Z"/>` :
                                                            `<path fill-rule="evenodd" clip-rule="evenodd" d="M0 13L3 14L6 11H10L13 14L16 13L15.248 4.7284C15.1076 3.18316 13.812 2 12.2604 2H3.73964C2.18803 2 0.89244 3.18316 0.751964 4.72839L0 13ZM12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6ZM12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8ZM5 8C6.10457 8 7 7.10457 7 6C7 4.89543 6.10457 4 5 4C3.89543 4 3 4.89543 3 6C3 7.10457 3.89543 8 5 8Z"/>`
                                                        }
                                                    </svg>
                                                    <span class="font-semibold text-slate-800">${game.isTournament ? 'Tournoi' : 'Normal'}</span>
                                                </div>
                                                <div class="flex items-center gap-3 w-32">
                                                    <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                                        <path d="M8 3.5C8 4.88071 6.88071 6 5.5 6C4.11929 6 3 4.88071 3 3.5C3 2.11929 4.11929 1 5.5 1C6.88071 1 8 2.11929 8 3.5Z"/>
                                                        <path d="M3 8C1.34315 8 0 9.34315 0 11V15H8V8H3Z"/>
                                                        <path d="M13 8H10V15H16V11C16 9.34315 14.6569 8 13 8Z"/>
                                                        <path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z"/>
                                                    </svg>
                                                    <span class="text-slate-600 truncate">${game.players.join(', ')}</span>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                                                        <path d="M8.16923 2.00234C8.11301 2.00078 8.0566 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 7.9434 13.9992 7.88699 13.9977 7.83077L15.7642 6.06422C15.9182 6.68407 16 7.33249 16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C8.66751 0 9.31593 0.0817526 9.93578 0.235791L8.16923 2.00234Z M4 7.99996C4 6.13612 5.27477 4.57002 7 4.12598V6.26752C6.4022 6.61333 6 7.25968 6 7.99996C6 9.10453 6.89543 9.99996 8 9.99996C8.74028 9.99996 9.38663 9.59776 9.73244 8.99996H11.874C11.4299 10.7252 9.86384 12 8 12C5.79086 12 4 10.2091 4 7.99996Z M14 2L13 0L10 3V4.58579L7.79289 6.79289L9.20711 8.20711L11.4142 6H13L16 3L14 2Z"/>
                                                    </svg>
                                                    <span class="px-2 py-1 rounded-lg font-bold text-xs ${game.result === 'win' ? 'bg-green-300 text-green-900' : 'bg-red-300 text-red-900'}">${game.result === 'win' ? 'Victoire' : 'Défaite'}</span>
                                                </div>
                                                <span class="text-slate-600 font-medium text-xs w-16 text-center">
                                                    ${game.score.join('-')}
                                                </span>
                                                <div class="flex items-center gap-2 w-20">
                                                    <svg class="w-3 h-3" viewBox="-0.5 0 15 15" fill="currentColor">
                                                        <path fill-rule="evenodd" d="M107,154.006845 C107,153.45078 107.449949,153 108.006845,153 L119.993155,153 C120.54922,153 121,153.449949 121,154.006845 L121,165.993155 C121,166.54922 120.550051,167 119.993155,167 L108.006845,167 C107.45078,167 107,166.550051 107,165.993155 L107,154.006845 Z M108,157 L120,157 L120,166 L108,166 L108,157 Z M116.5,163.5 L116.5,159.5 L115.757485,159.5 L114.5,160.765367 L114.98503,161.275112 L115.649701,160.597451 L115.649701,163.5 L116.5,163.5 Z M112.5,163.5 C113.412548,163.5 114,163.029753 114,162.362119 C114,161.781567 113.498099,161.473875 113.110266,161.433237 C113.532319,161.357765 113.942966,161.038462 113.942966,160.550798 C113.942966,159.906386 113.395437,159.5 112.505703,159.5 C111.838403,159.5 111.359316,159.761248 111.051331,160.115385 L111.456274,160.632075 C111.724335,160.370827 112.055133,160.231495 112.425856,160.231495 C112.819392,160.231495 113.13308,160.382438 113.13308,160.690131 C113.13308,160.974601 112.847909,161.102322 112.425856,161.102322 C112.28327,161.102322 112.020913,161.102322 111.952471,161.096517 L111.952471,161.839623 C112.009506,161.833817 112.26616,161.828012 112.425856,161.828012 C112.956274,161.828012 113.190114,161.967344 113.190114,162.275036 C113.190114,162.565312 112.93346,162.768505 112.471483,162.768505 C112.10076,162.768505 111.684411,162.605951 111.427757,162.327286 L111,162.87881 C111.279468,163.227141 111.804183,163.5 112.5,163.5 Z M110,152.5 C110,152.223858 110.214035,152 110.504684,152 L111.495316,152 C111.774045,152 112,152.231934 112,152.5 L112,153 L110,153 L110,152.5 Z M116,152.5 C116,152.223858 116.214035,152 116.504684,152 L117.495316,152 C117.774045,152 118,152.231934 118,152.5 L118,153 L116,153 L116,152.5 Z" transform="translate(-107 -152)"/>
                                                    </svg>
                                                    <span class="text-blue-600 font-semibold text-xs">${game.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('') : '<div class="text-center text-slate-600">Aucune partie jouée</div>'}
                                </div>
                            </div>
                        `}

                        <!-- Section 4 (Bas droite): Demandes d'amis -->
                        ${isOwnProfile ? `
                            <div class="bg-slate-50 rounded-md border-2 border-slate-200 shadow-lg p-4">
                                <h2 class="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor">
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M15 1H1V15H15V1ZM7 4H9V7H12V9H9V12H7V9H4V7H7V4Z"/>
                                    </svg>
                                    Demandes d'amis
                                </h2>
                                
                                ${incomingRequests.length > 0 ? `
                                    <div class="mb-3">
                                        <h3 class="text-sm font-medium text-slate-700 mb-2">Demandes reçues (${incomingRequests.length})</h3>
                                        <div class="space-y-1">
                                            ${incomingRequests.map(request => `
                                                <div class="bg-white rounded-lg p-2 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer w-full" onclick="goToProfile('${request.id}')">
                                                    <div class="flex items-center justify-between w-full">
                                                        <div class="flex items-center gap-3">
                                                            <div class="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                ${request.avatar ?
                                                                    `<img src="/user/avatar/${request.id}" alt="${request.username}" class="w-full h-full object-cover">` :
                                                                    `<span class="text-xs font-bold text-slate-600">${request.username.charAt(0).toUpperCase()}</span>`
                                                                }
                                                            </div>
                                                            <div class="flex items-center gap-1">
                                                                <h4 class="text-sm font-semibold text-slate-800">${request.username}</h4>
                                                                <div class="w-2 h-2 rounded-full ${request.online !== 0 ? 'bg-green-500' : 'bg-gray-400'}"></div>
                                                            </div>
                                                        </div>
                                                        <div class="flex gap-2" onclick="event.stopPropagation()">
                                                            <button onclick="acceptFriendRequest('${request.id}')" class="px-2 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded hover:bg-green-600 transition-colors border-1 border-slate-700 shadow-sm">
                                                                Accepter
                                                            </button>
                                                            <button onclick="rejectFriendRequest('${request.id}')" class="px-2 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded hover:bg-red-600 transition-colors border-1 border-slate-700 shadow-sm">
                                                                Refuser
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : `
                                    <div class="mb-3">
                                        <h3 class="text-sm font-medium text-slate-700 mb-2">Demandes reçues (0)</h3>
                                        <div class="text-center text-slate-500 text-xs py-2">Aucune demande reçue</div>
                                    </div>
                                `}
                                
                                ${outgoingRequests.length > 0 ? `
                                    <div>
                                        <h3 class="text-sm font-medium text-slate-700 mb-2">Demandes envoyées (${outgoingRequests.length})</h3>
                                        <div class="space-y-1">
                                            ${outgoingRequests.map(request => `
                                                <div class="bg-white rounded-lg p-2 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer w-fit" onclick="goToProfile('${request.id}')">
                                                    <div class="flex items-center justify-between w-full">
                                                        <div class="flex items-center gap-3">
                                                            <div class="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                ${request.avatar ?
                                                                    `<img src="/user/avatar/${request.id}" alt="${request.username}" class="w-full h-full object-cover">` :
                                                                    `<span class="text-xs font-bold text-slate-600">${request.username.charAt(0).toUpperCase()}</span>`
                                                                }
                                                            </div>
                                                            <div class="flex items-center gap-1">
                                                                <h4 class="text-sm font-semibold text-slate-800">${request.username}</h4>
                                                                <div class="w-2 h-2 rounded-full ${request.online !== 0 ? 'bg-green-500' : 'bg-gray-400'}"></div>
                                                            </div>
                                                        </div>
                                                        <button onclick="event.stopPropagation(); cancelFriendRequest('${request.id}')" class="px-2 py-1 bg-orange-500 text-slate-700 text-sm font-medium rounded hover:bg-orange-600 transition-colors border-1 border-slate-700 shadow-sm">
                                                            Annuler
                                                        </button>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : `
                                    <div>
                                        <h3 class="text-sm font-medium text-slate-700 mb-2">Demandes envoyées (0)</h3>
                                        <div class="text-center text-slate-500 text-xs py-2">Aucune demande envoyée</div>
                                    </div>
                                `}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // Ajouter les gestionnaires d'événements
        setupFriendEventHandlers(navigate, () => fetchProfile(profile.userId));
    }

    // Fonctions pour gérer les actions d'amis en utilisant les routes exactes du microservice social
    function setupFriendEventHandlers(navigate: (path: string) => void, refreshProfile: () => void): void {
        // Rendre les fonctions disponibles globalement pour les onclick
        (window as any).addFriend = async (userId: string) => {
            try {
                const response = await fetch(`/social/friend/add/${userId}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    refreshProfile();
                } else {
                    console.error('Failed to add friend');
                }
            } catch (error) {
                console.error('Error adding friend:', error);
            }
        };

        (window as any).removeFriend = async (userId: string) => {
            try {
                const response = await fetch(`/social/friend/remove/${userId}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    refreshProfile();
                } else {
                    console.error('Failed to remove friend');
                }
            } catch (error) {
                console.error('Error removing friend:', error);
            }
        };

        (window as any).acceptFriendRequest = async (userId: string) => {
            try {
                const response = await fetch(`/social/friend/accept/${userId}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    refreshProfile();
                } else {
                    console.error('Failed to accept friend request');
                }
            } catch (error) {
                console.error('Error accepting friend request:', error);
            }
        };

        (window as any).rejectFriendRequest = async (userId: string) => {
            try {
                const response = await fetch(`/social/friend/reject/${userId}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    refreshProfile();
                } else {
                    console.error('Failed to reject friend request');
                }
            } catch (error) {
                console.error('Error rejecting friend request:', error);
            }
        };

        (window as any).cancelFriendRequest = async (userId: string) => {
            try {
                const response = await fetch(`/social/friend/cancel/${userId}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    refreshProfile();
                } else {
                    console.error('Failed to cancel friend request');
                }
            } catch (error) {
                console.error('Error canceling friend request:', error);
            }
        };

        (window as any).goToProfile = (userId: string) => {
            navigate(`/profile/${userId}`);
        };
    }
}
