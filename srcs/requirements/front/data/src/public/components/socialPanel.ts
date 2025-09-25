import { socialWebSocket } from '../utils/socialWebSocket';
import { navigate } from '../main';
import { joinTournament } from '../views/tournament';

async function checkUserRoomStatus(): Promise<{ inRoom: boolean; roomId: string | null; gameType: string | null }> {
    const currentPath = window.location.pathname;
    
    if (currentPath === '/play') {
        const roomIdElement = document.getElementById('roomIdText');
        if (roomIdElement && roomIdElement.textContent && roomIdElement.textContent !== 'Not in a room') {
            return {
                inRoom: true,
                roomId: roomIdElement.textContent.trim(),
                gameType: 'game'
            };
        }
    } else if (currentPath === '/tournament') {
        const tournamentIdElement = document.getElementById('tournamentIdText');
        if (tournamentIdElement && tournamentIdElement.textContent && tournamentIdElement.textContent !== 'Not in a tournament') {
            return {
                inRoom: true,
                roomId: tournamentIdElement.textContent.trim(),
                gameType: 'tournament'
            };
        }
    }
    
    return { inRoom: false, roomId: null, gameType: null };
}

interface Friend {
    id: string;
    username: string;
    avatar: string;
    online: number;
}

interface FriendRequest {
    id: string;
    username: string;
    avatar: string;
    requestDate?: string;
}

interface SocialMessage {
    type: string;
    userId?: string;
    username?: string;
    message?: string;
    roomId?: string;
}

interface GameInvite {
    id: string;
    username: string;
    avatar: string;
    roomId: string;
    type: 'game' | 'tournament';
}

export function createSocialPanel(): void {
    const existingPanel = document.getElementById('social-panel');
    if (existingPanel) return;

    const socialPanel = document.createElement('div');
    socialPanel.id = 'social-panel';
    socialPanel.className = 'fixed top-4 right-4 z-40';
    
    socialPanel.innerHTML = `
        <div class="relative">
            <button id="social-toggle" class="bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-all duration-200 border border-gray-200">
                <div class="relative">
                    <svg class="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 5.3585V14H16V5.35849L8 10.3585L0 5.3585Z"/>
                        <path d="M16 3V2H0V3L8 8L16 3Z"/>
                    </svg>
                    <div id="social-status-indicator" class="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white"></div>
                    <div id="friend-notifications" class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full hidden items-center justify-center font-bold"></div>
                </div>
            </button>
            
            <div id="social-dropdown" class="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl hidden max-h-96 overflow-hidden">
                <div class="p-4 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <h3 class="font-semibold text-gray-900">Friends</h3>
                        <div id="connection-status" class="flex items-center gap-2">
                            <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span class="text-xs text-gray-500">Disconnected</span>
                        </div>
                    </div>
                </div>
                
                <div class="max-h-80 overflow-y-auto">
                    <div id="game-invites-section" class="hidden border-b-2 border-green-100">
                        <div class="px-4 py-2 bg-green-50 border-b border-green-100">
                            <h4 class="text-sm font-medium text-green-600 flex items-center gap-2">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M0 13L3 14L6 11H10L13 14L16 13L15.248 4.7284C15.1076 3.18316 13.812 2 12.2604 2H3.73964C2.18803 2 0.89244 3.18316 0.751964 4.72839L0 13ZM12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6ZM12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8ZM5 8C6.10457 8 7 7.10457 7 6C7 4.89543 6.10457 4 5 4C3.89543 4 3 4.89543 3 6C3 7.10457 3.89543 8 5 8Z"/>
                                </svg>
                                Game Invites
                                <span id="invites-count" class="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">0</span>
                            </h4>
                        </div>
                        <div id="game-invites-list"></div>
                    </div>

                    <div id="friend-requests-section" class="hidden border-b-2 border-blue-100">
                        <div class="px-4 py-2 bg-blue-50 border-b border-blue-100">
                            <h4 class="text-sm font-medium text-blue-600 flex items-center gap-2">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                                </svg>
                                Friend Requests
                                <span id="requests-count" class="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">0</span>
                            </h4>
                        </div>
                        <div id="friend-requests-list"></div>
                    </div>

                    <div id="online-friends-section" class="hidden">
                        <div class="px-4 py-2 bg-gray-50 border-b border-gray-100">
                            <h4 class="text-sm font-medium text-green-600">Online</h4>
                        </div>
                        <div id="online-friends-list"></div>
                    </div>
                    
                    <div id="offline-friends-section" class="hidden">
                        <div class="px-4 py-2 bg-gray-50 border-b border-gray-100">
                            <h4 class="text-sm font-medium text-gray-500">Offline</h4>
                        </div>
                        <div id="offline-friends-list"></div>
                    </div>
                    
                    <div id="no-friends-message" class="p-6 text-center text-gray-500">
                        <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                        </svg>
                        <div class="text-sm">No friends yet</div>
                        <div class="text-xs">Search for users to add friends</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(socialPanel);
    setupSocialPanelListeners();
    initializeSocialPanel();
}

function setupSocialPanelListeners(): void {
    const toggle = document.getElementById('social-toggle');
    const dropdown = document.getElementById('social-dropdown');

    if (toggle && dropdown) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            const panel = document.getElementById('social-panel');
            if (!panel?.contains(e.target as Node)) {
                dropdown.classList.add('hidden');
            }
        });
    }

    window.addEventListener('social-connection-status', (e: any) => {
        updateConnectionStatus(e.detail.connected);
    });

    window.addEventListener('social-friends-updated', (e: any) => {
        updateFriendsList(e.detail.friends, e.detail.onlineUsers);
    });

    window.addEventListener('social-fetch-requests', () => {
        fetchFriendRequests();
    });

    window.addEventListener('social-game-invite', (e: any) => {
        addGameInviteToPanel(e.detail.invite);
    });

    socialWebSocket.onMessage((message: SocialMessage) => {
        handleSocialMessage(message);
    });
}

function initializeSocialPanel(): void {
    if (!socialWebSocket.getConnectionStatus()) {
        socialWebSocket.connect();
    } else {
        socialWebSocket.fetchFriends();
        fetchFriendRequests();
    }
    
    if (socialWebSocket.getConnectionStatus()) {
        updateConnectionStatus(true);
    }
}

function updateConnectionStatus(connected: boolean): void {
    const statusIndicator = document.getElementById('social-status-indicator');
    const connectionStatus = document.getElementById('connection-status');
    
    if (statusIndicator) {
        statusIndicator.className = `absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
            connected ? 'bg-green-500' : 'bg-gray-400'
        }`;
    }
    
    if (connectionStatus) {
        connectionStatus.innerHTML = `
            <div class="w-2 h-2 ${connected ? 'bg-green-500' : 'bg-gray-400'} rounded-full"></div>
            <span class="text-xs ${connected ? 'text-green-600' : 'text-gray-500'}">${connected ? 'Connected' : 'Disconnected'}</span>
        `;
    }
}

function updateFriendsList(friends: Friend[], onlineUsers: Set<string>): void {
    const onlineFriends = friends.filter(friend => onlineUsers.has(friend.id));
    const offlineFriends = friends.filter(friend => !onlineUsers.has(friend.id));
    
    const onlineSection = document.getElementById('online-friends-section');
    const offlineSection = document.getElementById('offline-friends-section');
    const onlineList = document.getElementById('online-friends-list');
    const offlineList = document.getElementById('offline-friends-list');
    const noFriendsMessage = document.getElementById('no-friends-message');
    
    if (!onlineList || !offlineList || !onlineSection || !offlineSection || !noFriendsMessage) return;

    onlineList.innerHTML = '';
    offlineList.innerHTML = '';

    if (friends.length === 0) {
        noFriendsMessage.classList.remove('hidden');
        onlineSection.classList.add('hidden');
        offlineSection.classList.add('hidden');
        return;
    }

    noFriendsMessage.classList.add('hidden');

    if (onlineFriends.length > 0) {
        onlineSection.classList.remove('hidden');
        onlineFriends.forEach(friend => {
            onlineList.appendChild(createFriendElement(friend, true));
        });
    } else {
        onlineSection.classList.add('hidden');
    }

    if (offlineFriends.length > 0) {
        offlineSection.classList.remove('hidden');
        offlineFriends.forEach(friend => {
            offlineList.appendChild(createFriendElement(friend, false));
        });
    } else {
        offlineSection.classList.add('hidden');
    }
}

async function fetchFriendRequests(): Promise<void> {
    try {
        const response = await fetch('/auth/me', { credentials: 'include' });
        if (response.ok) {
            const userData = await response.json();
            const friendRequests = JSON.parse(userData.friendRequests || '{"in":[],"out":[]}');
            const incomingRequests: FriendRequest[] = [];
            
            for (const requesterId of friendRequests.in) {
                try {
                    const userResponse = await fetch(`/api/profile/${requesterId}`, { credentials: 'include' });
                    if (userResponse.ok) {
                        const requesterData = await userResponse.json();
                        incomingRequests.push({
                            id: requesterData.userId,
                            username: requesterData.username,
                            avatar: requesterData.avatar
                        });
                    }
                } catch (error) {
                    console.error('Error fetching requester data:', error);
                }
            }
            
            updateFriendRequestsList(incomingRequests);
        }
    } catch (error) {
        console.error('Error fetching friend requests:', error);
    }
}

function updateFriendRequestsList(requests: FriendRequest[]): void {
    const requestsSection = document.getElementById('friend-requests-section');
    const requestsList = document.getElementById('friend-requests-list');
    const requestsCount = document.getElementById('requests-count');
    
    if (!requestsSection || !requestsList || !requestsCount) return;

    requestsList.innerHTML = '';
    requestsCount.textContent = requests.length.toString();

    if (requests.length === 0) {
        requestsSection.classList.add('hidden');
        return;
    }

    requestsSection.classList.remove('hidden');
    requests.forEach(request => {
        requestsList.appendChild(createFriendRequestElement(request));
    });
}

function createFriendRequestElement(request: FriendRequest): HTMLElement {
    const requestElement = document.createElement('div');
    requestElement.className = 'flex items-center justify-between p-3 hover:bg-blue-25 border-b border-blue-100 last:border-b-0';
    
    requestElement.innerHTML = `
        <div class="flex items-center gap-3 flex-1 cursor-pointer min-w-0" data-user-id="${request.id}">
            <div class="relative flex-shrink-0">
                <img src="/user/avatar/${request.id}" alt="${request.username}" class="w-8 h-8 rounded-full">
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">${request.username}</div>
                <div class="text-xs text-blue-600">wants to be your friend</div>
            </div>
        </div>
        <div class="flex gap-1 flex-shrink-0">
            <button class="accept-request bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1" data-user-id="${request.id}">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M15 1H1V15H15V1ZM7 4H9V7H12V9H9V12H7V9H4V7H7V4Z"/>
                </svg>
            </button>
            <button class="reject-request bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1" data-user-id="${request.id}">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M15 1H1V15H15V1ZM4 7V9L12 9V7L4 7Z"/>
                </svg>
            </button>
        </div>
    `;

    const profileLink = requestElement.querySelector('[data-user-id]') as HTMLElement;
    if (profileLink) {
        profileLink.addEventListener('click', () => {
            navigate(`/profile/${request.id}`);
        });
    }

    const acceptBtn = requestElement.querySelector('.accept-request') as HTMLElement;
    const rejectBtn = requestElement.querySelector('.reject-request') as HTMLElement;

    if (acceptBtn) {
        acceptBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleFriendRequestAction(request.id, 'accept');
        });
    }

    if (rejectBtn) {
        rejectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleFriendRequestAction(request.id, 'reject');
        });
    }

    return requestElement;
}

async function handleFriendRequestAction(userId: string, action: 'accept' | 'reject'): Promise<void> {
    try {
        const response = await fetch(`/social/friend/${action}/${userId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            showNotification(`Friend request ${action}ed!`, 'success');
            fetchFriendRequests();
            if (action === 'accept') {
                socialWebSocket.fetchFriends();
            }
        } else {
            const error = await response.json();
            showNotification(error.message || `Failed to ${action} friend request`, 'error');
        }
    } catch (error) {
        console.error(`Error ${action}ing friend request:`, error);
        showNotification(`Failed to ${action} friend request`, 'error');
    }
}

function createFriendElement(friend: Friend, isOnline: boolean): HTMLElement {
    const friendElement = document.createElement('div');
    friendElement.className = 'flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0';
    
    friendElement.innerHTML = `
        <div class="flex items-center gap-3 flex-1 cursor-pointer min-w-0" data-user-id="${friend.id}">
            <div class="relative flex-shrink-0">
                <img src="/user/avatar/${friend.id}" alt="${friend.username}" class="w-8 h-8 rounded-full">
                <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    isOnline ? 'bg-green-500' : 'bg-gray-400'
                }"></div>
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">${friend.username}</div>
                <div class="text-xs text-gray-500">${isOnline ? 'Online' : 'Offline'}</div>
            </div>
        </div>
        ${isOnline ? `
        <div class="flex flex-col gap-1 flex-shrink-0">
            <button class="invite-game flex items-center gap-1 px-2 py-1 bg-slate-300 hover:bg-slate-500 text-slate-700 rounded text-xs font-medium transition-colors" title="Invite to game" data-user-id="${friend.id}">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M0 13L3 14L6 11H10L13 14L16 13L15.248 4.7284C15.1076 3.18316 13.812 2 12.2604 2H3.73964C2.18803 2 0.89244 3.18316 0.751964 4.72839L0 13ZM12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6ZM12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8ZM5 8C6.10457 8 7 7.10457 7 6C7 4.89543 6.10457 4 5 4C3.89543 4 3 4.89543 3 6C3 7.10457 3.89543 8 5 8Z"/>
                </svg>
                <span>Room</span>
            </button>
            <button class="invite-tournament flex items-center gap-1 px-2 py-1 bg-slate-300 hover:bg-slate-500 text-slate-700 rounded text-xs font-medium transition-colors" title="Invite to tournament" data-user-id="${friend.id}">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M4 0H12V2H16V4C16 6.45641 14.2286 8.49909 11.8936 8.92038C11.5537 10.3637 10.432 11.5054 9 11.874V14H12V16H4V14H7V11.874C5.56796 11.5054 4.44628 10.3637 4.1064 8.92038C1.77136 8.49909 0 6.45641 0 4V2H4V0ZM12 6.82929V4H14C14 5.30622 13.1652 6.41746 12 6.82929ZM4 4H2C2 5.30622 2.83481 6.41746 4 6.82929V4Z"/>
                </svg>
                <span>Tourny</span>
            </button>
        </div>
        ` : ''}
    `;

    const profileLink = friendElement.querySelector('[data-user-id]') as HTMLElement;
    if (profileLink) {
        profileLink.addEventListener('click', () => {
            navigate(`/profile/${friend.id}`);
        });
    }

    if (isOnline) {
        const gameInviteBtn = friendElement.querySelector('.invite-game') as HTMLElement;
        const tournamentInviteBtn = friendElement.querySelector('.invite-tournament') as HTMLElement;

        if (gameInviteBtn) {
            gameInviteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                inviteToGame(friend.id);
            });
        }

        if (tournamentInviteBtn) {
            tournamentInviteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                inviteToTournament(friend.id);
            });
        }
    }

    return friendElement;
}

async function inviteToGame(friendId: string): Promise<void> {
    try {
        if (!socialWebSocket.getConnectionStatus()) {
            showNotification('Not connected to social service', 'error');
            return;
        }

        const userStatus = await checkUserRoomStatus();
        
        if (!userStatus.inRoom || !userStatus.roomId) {
            showNotification('You must be in a game room to invite friends', 'error');
            return;
        }

        if (userStatus.gameType !== 'game') {
            showNotification('You can only invite friends to regular games', 'error');
            return;
        }

        socialWebSocket.sendGameInvite(friendId, userStatus.roomId);
        showNotification('Game invitation sent!', 'success');
    } catch (error) {
        console.error('Error inviting to game:', error);
        showNotification('Failed to send game invitation', 'error');
    }
}

async function inviteToTournament(friendId: string): Promise<void> {
    try {
        if (!socialWebSocket.getConnectionStatus()) {
            showNotification('Not connected to social service', 'error');
            return;
        }

        const userStatus = await checkUserRoomStatus();
        
        if (!userStatus.inRoom || !userStatus.roomId) {
            showNotification('You must be in a tournament to invite friends', 'error');
            return;
        }

        if (userStatus.gameType !== 'tournament') {
            showNotification('You can only invite friends when you are in a tournament', 'error');
            return;
        }

        socialWebSocket.sendTournamentInvite(friendId, userStatus.roomId);
        showNotification('Tournament invitation sent!', 'success');
    } catch (error) {
        console.error('Error inviting to tournament:', error);
        showNotification('Failed to send tournament invitation', 'error');
    }
}

function handleSocialMessage(message: SocialMessage): void {
    switch (message.type) {
        case 'friend_request':
            showNotification(`${message.username} sent you a friend request`, 'info');
            updateNotificationBadge();
            fetchFriendRequests();
            break;
        
        case 'friend_accepted':
            showNotification(`${message.username} accepted your friend request`, 'success');
            socialWebSocket.fetchFriends();
            fetchFriendRequests();
            break;
        
        case 'friend_removed':
            showNotification(`${message.username} removed you from friends`, 'info');
            socialWebSocket.fetchFriends();
            break;

        case 'private_invite':
        case 'tourny_invite':
            if (message.userId && message.roomId) {
                const friend = socialWebSocket.getFriends().find(f => f.id === message.userId);
                const gameInvite: GameInvite = {
                    id: message.userId,
                    username: friend?.username || 'Unknown',
                    avatar: friend?.avatar || '',
                    roomId: message.roomId,
                    type: message.type === 'tourny_invite' ? 'tournament' : 'game'
                };
                addGameInviteToPanel(gameInvite);
                showNotification(`${gameInvite.username} invited you to a ${gameInvite.type}`, 'info');
            }
            break;
    }
}

function addGameInviteToPanel(invite: GameInvite): void {
    const invitesSection = document.getElementById('game-invites-section');
    const invitesList = document.getElementById('game-invites-list');
    const invitesCount = document.getElementById('invites-count');
    
    if (!invitesSection || !invitesList || !invitesCount) return;

    if (document.querySelector(`[data-invite-id="${invite.id}-${invite.roomId}"]`)) {
        return;
    }

    invitesSection.classList.remove('hidden');
    
    const inviteElement = createGameInviteElement(invite);
    invitesList.appendChild(inviteElement);
    
    const currentCount = invitesList.children.length;
    invitesCount.textContent = currentCount.toString();
}

function createGameInviteElement(invite: GameInvite): HTMLElement {
    const inviteElement = document.createElement('div');
    inviteElement.className = 'flex items-center justify-between p-3 hover:bg-green-25 border-b border-green-100 last:border-b-0';
    inviteElement.setAttribute('data-invite-id', `${invite.id}-${invite.roomId}`);
    
    const gameTypeText = invite.type === 'tournament' ? 'tournament' : 'private game';
    const gameTypeIcon = invite.type === 'tournament' ? 
        `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M4 0H12V2H16V4C16 6.45641 14.2286 8.49909 11.8936 8.92038C11.5537 10.3637 10.432 11.5054 9 11.874V14H12V16H4V14H7V11.874C5.56796 11.5054 4.44628 10.3637 4.1064 8.92038C1.77136 8.49909 0 6.45641 0 4V2H4V0ZM12 6.82929V4H14C14 5.30622 13.1652 6.41746 12 6.82929ZM4 4H2C2 5.30622 2.83481 6.41746 4 6.82929V4Z"/>
        </svg>` :
        `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M0 13L3 14L6 11H10L13 14L16 13L15.248 4.7284C15.1076 3.18316 13.812 2 12.2604 2H3.73964C2.18803 2 0.89244 3.18316 0.751964 4.72839L0 13ZM12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6ZM12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8ZM5 8C6.10457 8 7 7.10457 7 6C7 4.89543 6.10457 4 5 4C3.89543 4 3 4.89543 3 6C3 7.10457 3.89543 8 5 8Z"/>
        </svg>`;
    
    inviteElement.innerHTML = `
        <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="relative flex-shrink-0">
                <img src="/user/avatar/${invite.id}" alt="${invite.username}" class="w-8 h-8 rounded-full">
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">${invite.username}</div>
                <div class="text-xs text-green-600 flex items-center gap-1">
                    ${gameTypeIcon}
                    invited you to ${gameTypeText}
                </div>
            </div>
        </div>
        <div class="flex gap-1 flex-shrink-0">
            <button class="accept-invite bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors" 
                    data-room-id="${invite.roomId}" data-type="${invite.type}">
                Join
            </button>
            <button class="decline-invite bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
                Decline
            </button>
        </div>
    `;

    const acceptBtn = inviteElement.querySelector('.accept-invite') as HTMLElement;
    const declineBtn = inviteElement.querySelector('.decline-invite') as HTMLElement;

    if (acceptBtn) {
        acceptBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleGameInviteAccept(invite.roomId, invite.type);
            removeGameInviteFromPanel(inviteElement);
        });
    }

    if (declineBtn) {
        declineBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeGameInviteFromPanel(inviteElement);
            showNotification('Game invitation declined', 'info');
        });
    }

    return inviteElement;
}

function handleGameInviteAccept(roomId: string, type: 'game' | 'tournament'): void {
    if (type === 'tournament') {
        navigate('/tournament');
        setTimeout(() => {
            joinTournament(roomId);
        }, 100);
    } else {
        navigate(`/play?join=${roomId}`);
    }
    showNotification(`Joining ${type}...`, 'success');
}

function removeGameInviteFromPanel(inviteElement: HTMLElement): void {
    const invitesList = document.getElementById('game-invites-list');
    const invitesSection = document.getElementById('game-invites-section');
    const invitesCount = document.getElementById('invites-count');
    
    if (invitesList && inviteElement.parentNode === invitesList) {
        invitesList.removeChild(inviteElement);
        
        if (invitesCount) {
            const currentCount = invitesList.children.length;
            invitesCount.textContent = currentCount.toString();
            
            if (currentCount === 0 && invitesSection) {
                invitesSection.classList.add('hidden');
            }
        }
    }
}

function updateNotificationBadge(): void {
    const badge = document.getElementById('friend-notifications');
    if (badge) {
        badge.classList.remove('hidden');
        badge.classList.add('flex');
    }
}

function showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

export function destroySocialPanel(): void {
    const socialPanel = document.getElementById('social-panel');
    if (socialPanel) {
        document.body.removeChild(socialPanel);
    }
}
