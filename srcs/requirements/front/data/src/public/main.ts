import { renderHome } from './views/home'
import { renderLogin } from './views/login'
import { renderRegister } from './views/register'
import { renderSettings } from './views/settings'
import { renderGame} from './views/game'
import { renderTournament } from './views/tournament'
import { renderLeaderboard } from './views/leaderboard'
import { renderProfile } from './views/profile'

type RouteFunction = (root: HTMLElement, navigate: (path: string) => void) => void;

const routes: { [key: string]: RouteFunction } = {
    '/': renderHome,
    '/login': renderLogin,
	'/register': renderRegister,
	'/settings': renderSettings,
	'/play' : renderGame,
	'/tournament' : renderTournament,
	'/leaderboard': renderLeaderboard,
	'/profile' : renderProfile
}

export function navigate(path: string): void { 
    window.history.pushState({}, '', path); 
    updateView();
}

function updateView(): void { 
    const path = window.location.pathname;
    let view = routes[path];
    
    if (path.indexOf('/profile/') === 0) {
        const userId = path.substring('/profile/'.length);
        view = (root: HTMLElement, navigate: (path: string) => void) => renderProfile(root, navigate, userId);
    }
    
    if (!view)
        view = renderHome;
    const root = document.getElementById('app'); 
    if (root) view(root, navigate);
}

document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && target.hasAttribute('data-link')) {
        e.preventDefault();
        const href = target.getAttribute('href');
        if (href) navigate(href);
    }
});

window.onpopstate = updateView;

document.addEventListener('DOMContentLoaded', updateView);
