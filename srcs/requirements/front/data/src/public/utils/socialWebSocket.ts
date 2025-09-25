import { wsUrl } from './websocket';

interface Friend {
    id: string;
    username: string;
    avatar: string;
    online: number;
}

interface SocialMessage {
    type: 'friend_request' | 'friend_accepted' | 'friend_removed' | 'private_invite' | 'tourny_invite' | 'user_online' | 'user_offline';
    message?: string;
    userId?: string;
    username?: string;
    roomId?: string;
}

class SocialWebSocketManager {
    private socket: WebSocket | null = null;
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private friends: Friend[] = [];
    private onlineUsers: Set<string> = new Set();
    private messageCallbacks: Array<(message: SocialMessage) => void> = [];

    constructor() {
        this.setupVisibilityListener();
    }

    public connect(): void {
        if (this.isConnected || this.socket?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            this.socket = new WebSocket(wsUrl('/social/'));

            this.socket.onopen = () => {
                console.log('[SOCIAL WS] Connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.notifyStatusChange(true);
                this.fetchFriends();
                
                window.dispatchEvent(new CustomEvent('social-fetch-requests'));
            };

            this.socket.onmessage = (event) => {
                try {
                    const message: SocialMessage = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('[SOCIAL WS] Error parsing message:', error);
                }
            };

            this.socket.onclose = (event) => {
                console.log('[SOCIAL WS] Disconnected:', event.code, event.reason);
                this.isConnected = false;
                this.notifyStatusChange(false);
                
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };

            this.socket.onerror = (error) => {
                console.error('[SOCIAL WS] Error:', error);
            };

        } catch (error) {
            console.error('[SOCIAL WS] Connection error:', error);
            this.scheduleReconnect();
        }
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.close(1000, 'User logout');
            this.socket = null;
        }
        this.isConnected = false;
        this.friends = [];
        this.onlineUsers.clear();
        this.notifyStatusChange(false);
    }

    public sendMessage(message: any): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }

    public onMessage(callback: (message: SocialMessage) => void): void {
        this.messageCallbacks.push(callback);
    }

    public removeMessageListener(callback: (message: SocialMessage) => void): void {
        const index = this.messageCallbacks.indexOf(callback);
        if (index > -1) {
            this.messageCallbacks.splice(index, 1);
        }
    }

    public getFriends(): Friend[] {
        return this.friends;
    }

    public getOnlineUsers(): Set<string> {
        return this.onlineUsers;
    }

    public isUserOnline(userId: string): boolean {
        return this.onlineUsers.has(userId);
    }

    public getConnectionStatus(): boolean {
        return this.isConnected;
    }

    public sendGameInvite(friendId: string, roomId: string): void {
        if (this.isConnected && this.socket) {
            const message = {
                type: 'private_invite',
                userId: friendId,
                roomId: roomId
            };
            this.sendMessage(message);
        }
    }

    public sendTournamentInvite(friendId: string, roomId: string): void {
        if (this.isConnected && this.socket) {
            const message = {
                type: 'tourny_invite',
                userId: friendId,
                roomId: roomId
            };
            this.sendMessage(message);
        }
    }

    public async fetchFriends(): Promise<void> {
        try {
            const friendsResponse = await fetch('/social/friends', { credentials: 'include' });
            if (friendsResponse.ok) {
                const friendsData = await friendsResponse.json();
                
                this.friends = friendsData.map((friend: any) => ({
                    id: friend.id,
                    username: friend.username,
                    avatar: friend.avatar,
                    online: friend.online
                }));
                
                this.onlineUsers.clear();
                this.friends.forEach(friend => {
                    if (friend.online === 1) {
                        this.onlineUsers.add(friend.id);
                    }
                });
                
                this.notifyFriendsUpdate();
            }
        } catch (error) {
            console.error('[SOCIAL WS] Error fetching friends:', error);
        }
    }

    private handleMessage(message: SocialMessage): void {
        switch (message.type) {
            case 'user_online':
                if (message.userId) {
                    this.onlineUsers.add(message.userId);
                    this.updateFriendStatus(message.userId, 1);
                }
                break;
            
            case 'user_offline':
                if (message.userId) {
                    this.onlineUsers.delete(message.userId);
                    this.updateFriendStatus(message.userId, 0);
                }
                break;
            
            case 'friend_accepted':
                this.fetchFriends();
                break;
            
            case 'friend_removed':
                if (message.userId) {
                    this.friends = this.friends.filter(friend => friend.id !== message.userId);
                    this.onlineUsers.delete(message.userId);
                    this.notifyFriendsUpdate();
                }
                break;

            case 'private_invite':
            case 'tourny_invite':
                this.showGameInviteNotification(message);
                break;
        }

        this.messageCallbacks.forEach(callback => callback(message));
    }

    private updateFriendStatus(userId: string, online: number): void {
        const friend = this.friends.find(f => f.id === userId);
        if (friend) {
            friend.online = online;
            this.notifyFriendsUpdate();
        }
    }

    private showGameInviteNotification(message: SocialMessage): void {
        if (!message.userId || !message.roomId) return;

        // Dispatch un événement personnalisé pour que le social panel gère l'invitation
        const friend = this.friends.find(f => f.id === message.userId);
        const gameInvite = {
            id: message.userId,
            username: friend?.username || 'Unknown',
            avatar: friend?.avatar || '',
            roomId: message.roomId,
            type: message.type === 'tourny_invite' ? 'tournament' : 'game'
        };

        window.dispatchEvent(new CustomEvent('social-game-invite', { 
            detail: { invite: gameInvite } 
        }));
    }

    private scheduleReconnect(): void {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, delay);
    }

    private setupVisibilityListener(): void {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !this.isConnected) {
                this.connect();
            }
        });
    }

    private notifyStatusChange(connected: boolean): void {
        window.dispatchEvent(new CustomEvent('social-connection-status', { 
            detail: { connected } 
        }));
    }

    private notifyFriendsUpdate(): void {
        window.dispatchEvent(new CustomEvent('social-friends-updated', { 
            detail: { friends: this.friends, onlineUsers: this.onlineUsers } 
        }));
    }
}

export const socialWebSocket = new SocialWebSocketManager();
