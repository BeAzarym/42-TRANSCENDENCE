import { socialWebSocket } from '../utils/socialWebSocket';
import { createSocialPanel, destroySocialPanel } from '../components/socialPanel';

let isLoggedOut = false;

export function renderNavbar(navigate: (path: string) => void): void {
	const navbar = document.getElementById('navbar-Auth')
	if (navbar)
		navbar.innerHTML = `
        <div class="bg-white shadow-lg h-screen w-20 hover:w-56 fixed left-0 top-0 z-10 transition-all duration-300 overflow-hidden mr-8">
            <nav class="flex flex-col h-full">
                <div class="font-bold text-xl text-slate-800 px-4 py-4 flex items-center gap-3 hover:text-slate-950 cursor-pointer whitespace-nowrap" id="home-link">
                    <svg class="w-8 h-8 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11 3C11 4.30622 10.1652 5.41746 9 5.82929V11H11V9H12L15 12V15H1V12L4 9H7V5.82929C5.83481 5.41746 5 4.30622 5 3C5 1.34315 6.34315 0 8 0C9.65685 0 11 1.34315 11 3Z"/>
                    </svg>
                    <span class="nav-text">Transcendence</span>
                </div>
                
                <div class="flex-1">
				<ul class="flex flex-col gap-8 py-8">
						<li>
							<a class="flex items-center text-xl font-bold text-slate-600 hover:text-slate-950 cursor-pointer whitespace-nowrap transition-all duration-300 nav-item"
								href="/play" data-link>
								<svg class="w-8 h-8 flex-shrink-0 mx-auto nav-svg" viewBox="0 0 16 16" fill="currentColor">
									<path fill-rule="evenodd" clip-rule="evenodd" d="M0 13L3 14L6 11H10L13 14L16 13L15.248 4.7284C15.1076 3.18316 13.812 2 12.2604 2H3.73964C2.18803 2 0.89244 3.18316 0.751964 4.72839L0 13ZM12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6ZM12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8ZM5 8C6.10457 8 7 7.10457 7 6C7 4.89543 6.10457 4 5 4C3.89543 4 3 4.89543 3 6C3 7.10457 3.89543 8 5 8Z"/>
								</svg>
								<span class="nav-text ml-3">Play</span>
							</a>
						</li>
						<li>
							<a class="flex items-center text-xl font-bold text-slate-600 hover:text-slate-950 cursor-pointer whitespace-nowrap transition-all duration-300 nav-item"
								href="/tournament" data-link>
								<svg class="w-8 h-8 flex-shrink-0 mx-auto nav-svg" viewBox="0 0 16 16" fill="currentColor">
									<path d="M3 0L6.58579 3.58579L3.58579 6.58579L0 3V0H3Z"/>
									<path d="M6.70711 12.2929L8.20711 13.7929L6.79289 15.2071L4.5 12.9142L2.99771 14.4165C2.99923 14.4441 3 14.472 3 14.5C3 15.3284 2.32843 16 1.5 16C0.671573 16 0 15.3284 0 14.5C0 13.6716 0.671573 13 1.5 13C1.52802 13 1.55586 13.0008 1.5835 13.0023L3.08579 11.5L0.792893 9.20711L2.20711 7.79289L3.70711 9.29289L13 0H16V3L6.70711 12.2929Z"/>
									<path d="M14.5 16C13.6716 16 13 15.3284 13 14.5C13 14.472 13.0008 14.4441 13.0023 14.4165L10.0858 11.5L13.7929 7.79289L15.2071 9.20711L12.9142 11.5L14.4165 13.0023C14.4441 13.0008 14.472 13 14.5 13C15.3284 13 16 13.6716 16 14.5C16 15.3284 15.3284 16 14.5 16Z"/>
								</svg>
								<span class="nav-text ml-3">Tournament</span>
							</a>
						</li>
						<li>
							<a class="flex items-center text-xl font-bold text-slate-600 hover:text-slate-950 cursor-pointer whitespace-nowrap transition-all duration-300 nav-item"
								href="/leaderboard" data-link>
								<svg class="w-8 h-8 flex-shrink-0 mx-auto nav-svg" viewBox="0 0 16 16" fill="currentColor">
									<path fill-rule="evenodd" clip-rule="evenodd" d="M4 0H12V2H16V4C16 6.45641 14.2286 8.49909 11.8936 8.92038C11.5537 10.3637 10.432 11.5054 9 11.874V14H12V16H4V14H7V11.874C5.56796 11.5054 4.44628 10.3637 4.1064 8.92038C1.77136 8.49909 0 6.45641 0 4V2H4V0ZM12 6.82929V4H14C14 5.30622 13.1652 6.41746 12 6.82929ZM4 4H2C2 5.30622 2.83481 6.41746 4 6.82929V4Z"/>
								</svg>
								<span class="nav-text ml-3">Leaderboard</span>
							</a>
						</li>
                        <li>
                            <a class="flex items-center text-xl font-bold text-slate-600 hover:text-slate-950 cursor-pointer whitespace-nowrap transition-all duration-300 nav-item"
                                href="/profile" data-link>
								<svg class="w-8 h-8 flex-shrink-0 mx-auto nav-svg" viewBox="0 0 16 16" fill="currentColor">
									<path d="M8 7C9.65685 7 11 5.65685 11 4C11 2.34315 9.65685 1 8 1C6.34315 1 5 2.34315 5 4C5 5.65685 6.34315 7 8 7Z"/>
									<path d="M14 12C14 10.3431 12.6569 9 11 9H5C3.34315 9 2 10.3431 2 12V15H14V12Z"/>
								</svg>
                                <span class="nav-text ml-3">Profile</span>
                            </a>
                        </li>
                        <li>
                            <a class="flex items-center text-xl font-bold text-slate-600 hover:text-slate-950 cursor-pointer whitespace-nowrap transition-all duration-300 nav-item"
                                href="/settings" data-link>
								<svg class="w-8 h-8 flex-shrink-0 mx-auto nav-svg" viewBox="0 0 16 16" fill="currentColor">
									<path fill-rule="evenodd" clip-rule="evenodd" d="M6.50001 0H9.50001L10.0939 2.37548C10.7276 2.6115 11.3107 2.95155 11.8223 3.37488L14.1782 2.70096L15.6782 5.29904L13.9173 7.00166C13.9717 7.32634 14 7.65987 14 8C14 8.34013 13.9717 8.67366 13.9173 8.99834L15.6782 10.701L14.1782 13.299L11.8223 12.6251C11.3107 13.0484 10.7276 13.3885 10.0939 13.6245L9.50001 16H6.50001L5.90614 13.6245C5.27242 13.3885 4.68934 13.0484 4.17768 12.6251L1.82181 13.299L0.321808 10.701L2.08269 8.99834C2.02831 8.67366 2.00001 8.34013 2.00001 8C2.00001 7.65987 2.02831 7.32634 2.08269 7.00166L0.321808 5.29904L1.82181 2.70096L4.17768 3.37488C4.68934 2.95155 5.27241 2.6115 5.90614 2.37548L6.50001 0ZM8.00001 10C9.10458 10 10 9.10457 10 8C10 6.89543 9.10458 6 8.00001 6C6.89544 6 6.00001 6.89543 6.00001 8C6.00001 9.10457 6.89544 10 8.00001 10Z"/>
								</svg>
                                <span class="nav-text ml-3">Settings</span>
                            </a>
                        </li>
                        <li class="relative">
                            <div class="flex items-center text-xl font-bold text-slate-600 hover:text-slate-950 cursor-pointer whitespace-nowrap transition-all duration-300 nav-item">
								<svg class="w-8 h-8 flex-shrink-0 mx-auto nav-svg" viewBox="0 0 16 16" fill="currentColor">
									<path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
								</svg>
                                <div class="nav-text ml-3 w-44 relative search-container" style="opacity: 0;">
                                    <input type="text" id="user-search" placeholder="Search users..." 
                                           class="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                                    <div id="search-results" class="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto hidden mt-1"></div>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
                <div class="py-4" id="auth-buttons"> </div>
            </nav>
        </div>
    `; 

	checkAuthAndUpdateNavbar();
	setupEventListeners(navigate);
	setupNavbarHoverEffects();

	function setupNavbarHoverEffects(): void {
		const navbarContainer = document.querySelector('.bg-white.shadow-lg') as HTMLElement;
		const navTexts = document.querySelectorAll('.nav-text');
		const navItems = document.querySelectorAll('.nav-item');
		const navSvgs = document.querySelectorAll('.nav-svg');
		const searchContainer = document.querySelector('.search-container') as HTMLElement;
		
		if (navbarContainer) {
			navTexts.forEach(text => {
				(text as HTMLElement).style.opacity = '0';
				(text as HTMLElement).style.transition = 'opacity 0.3s ease';
			});

			navItems.forEach(item => {
				(item as HTMLElement).style.padding = '0 16px';
			});

			navSvgs.forEach(svg => {
				(svg as HTMLElement).style.transition = 'margin 0.3s ease';
			});

			if (searchContainer) {
				searchContainer.style.opacity = '0';
				searchContainer.style.transition = 'opacity 0.3s ease';
			}

			navbarContainer.addEventListener('mouseenter', () => {
				const currentNavTexts = document.querySelectorAll('.nav-text');
				const currentNavSvgs = document.querySelectorAll('.nav-svg');
				const currentSearchContainer = document.querySelector('.search-container') as HTMLElement;
				
				currentNavTexts.forEach(text => {
					(text as HTMLElement).style.opacity = '1';
				});

				currentNavSvgs.forEach(svg => {
					(svg as HTMLElement).style.marginLeft = '0';
					(svg as HTMLElement).style.marginRight = '0';
				});

				if (currentSearchContainer) {
					currentSearchContainer.style.opacity = '1';
				}
			});

			navbarContainer.addEventListener('mouseleave', () => {
				const currentNavTexts = document.querySelectorAll('.nav-text');
				const currentNavSvgs = document.querySelectorAll('.nav-svg');
				const currentSearchContainer = document.querySelector('.search-container') as HTMLElement;
				
				currentNavTexts.forEach(text => {
					(text as HTMLElement).style.opacity = '0';
				});

				currentNavSvgs.forEach(svg => {
					(svg as HTMLElement).style.marginLeft = 'auto';
					(svg as HTMLElement).style.marginRight = 'auto';
				});

				if (currentSearchContainer) {
					currentSearchContainer.style.opacity = '0';
					const searchInput = document.getElementById('user-search') as HTMLInputElement;
					if (searchInput) {
						searchInput.value = '';
					}
					const searchResults = document.getElementById('search-results');
					if (searchResults) {
						searchResults.classList.add('hidden');
					}
				}
			});
		}
	}


	function setupEventListeners(navigate: (path: string) => void): void {
		const loginBtn = document.getElementById('login-btn');
		if (loginBtn) {
			loginBtn.addEventListener('click', () => navigate('/login'));
		}

		const registerBtn = document.getElementById('register-btn');
		if (registerBtn) {
			registerBtn.addEventListener('click', () => navigate('/register'));
		}

		const homeLink = document.getElementById('home-link');
		if (homeLink) {
			homeLink.addEventListener('click', () => navigate('/home'));
		}

		setupSearchFunctionality(navigate);

		document.addEventListener('click', async (e) => {
			const target = e.target as HTMLElement;
			if (target.id === 'logout-btn') {
				try {
					socialWebSocket.disconnect();
					destroySocialPanel();
					
					const res = await fetch('/auth/logout', {
						method: 'POST',
						credentials: 'include',
					});
					if (res.ok) {
						isLoggedOut = true;
						navigate('/')
					}
				}
				catch (error) {
					console.error('logout error:', error);
				}
			}

		})

		const links = document.querySelectorAll('a[data-link]');
		links.forEach(link => {
			link.addEventListener('click', (e) => {
				e.preventDefault();
				const href = link.getAttribute('href');
				if (href && href !== '#') {
					navigate(href);
				}
			});
		});
	}

	function setupSearchFunctionality(navigate: (path: string) => void): void {
		const searchInput = document.getElementById('user-search') as HTMLInputElement;
		const searchResults = document.getElementById('search-results');
		
		let searchTimeout: number;

		if (searchInput && searchResults) {
			searchInput.addEventListener('input', (e) => {
				const query = (e.target as HTMLInputElement).value.trim();
				
				clearTimeout(searchTimeout);
				
				if (query.length < 2) {
					searchResults.classList.add('hidden');
					return;
				}

				searchTimeout = window.setTimeout(async () => {
					try {
						const response = await fetch(`/social/searchUser?name=${encodeURIComponent(query)}`, {
							method: 'GET',
							credentials: 'include'
						});

						if (response.ok) {
							const users = await response.json();
							displaySearchResults(users, searchResults, navigate);
						} else {
							console.error('Search failed:', response.statusText);
						}
					} catch (error) {
						console.error('Search error:', error);
					}
				}, 300);
			});

			searchInput.addEventListener('blur', () => {
				setTimeout(() => {
					searchResults.classList.add('hidden');
				}, 200);
			});

			searchInput.addEventListener('focus', () => {
				if (searchInput.value.trim().length >= 2) {
					searchResults.classList.remove('hidden');
				}
			});
		}
	}

	function displaySearchResults(users: any[], searchResults: HTMLElement, navigate: (path: string) => void): void {
		if (!searchResults) return;

		if (users.length === 0) {
			searchResults.innerHTML = '<div class="p-4 text-gray-500 text-base text-center">No users found</div>';
			searchResults.classList.remove('hidden');
			return;
		}

		const resultsHtml = users.map(user => `
			<button class="w-full p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3 text-left"
					data-user-id="${user.id}">
				<div class="relative">
					<img src="/user/avatar/${user.id}" alt="Avatar" class="w-8 h-8 rounded-full flex-shrink-0">
					<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${user.online !== 0 ? 'bg-green-500' : 'bg-gray-400'}"></div>
				</div>
				<div class="text-sm font-medium text-gray-900">${user.username}</div>
			</button>
		`).join('');

		searchResults.innerHTML = resultsHtml;
		searchResults.classList.remove('hidden');

		searchResults.querySelectorAll('[data-user-id]').forEach(button => {
			button.addEventListener('click', () => {
				const userId = button.getAttribute('data-user-id');
				if (userId) {
					navigate(`/profile/${userId}`);
					const searchInput = document.getElementById('user-search') as HTMLInputElement;
					if (searchInput) {
						searchInput.value = '';
					}
					searchResults.classList.add('hidden');
				}
			});
		});
	}

	async function displaylogged(): Promise<void> {
		try {
			const res = await fetch("/auth/me", {
				method: "GET",
				credentials: 'include'
			});
			if (res.ok) {
				const data = await res.json();
				console.log(data)
				const authButtons = document.getElementById('auth-buttons');
				if (authButtons) {
					authButtons.innerHTML = `
				<div class="flex flex-col gap-3 px-4">
					<div class="flex items-center gap-3 whitespace-nowrap">
						<img src="/user/avatar/${data.id}" alt="Profile" class="w-10 h-10 rounded-full flex-shrink-0">
						<span class="text-xl font-bold text-slate-800 nav-text">${data.username}</span>
					</div>
					<button id="logout-btn" class="flex items-center gap-3 text-red-800 font-bold text-xl hover:text-red-700 cursor-pointer whitespace-nowrap">
						<svg class="w-8 h-8 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
							<path d="M11 4V7L5 7V9H11V12H12L16 8L12 4L11 4Z"/>
							<path d="M0 1L3.41715e-07 15H8V13H2L2 3H8L8 1L0 1Z"/>
						</svg>
						<span class="nav-text">Logout</span>
					</button>
				</div>`;
					setupNavbarHoverEffects();
				}
				
				socialWebSocket.connect();
				createSocialPanel();
			}
			else {
				console.error("Erreur navbar res not ok");
			}

		}
		catch (error) {
			console.error("Erreur navbar displaylogged:", error);
		}
	}

	async function displayUnlogged(): Promise<void> {

		const authButtons = document.getElementById('auth-buttons');
		if (authButtons) {
			authButtons.innerHTML = `
				<div class="flex flex-col gap-2 px-4">
					<button class="text-slate-600 font-bold text-xl hover:text-slate-950 cursor-pointer nav-text whitespace-nowrap"
						id="login-btn">Login</button>
					<button class="text-xl bg-slate-500 text-white py-2 font-bold rounded-full hover:bg-slate-700 cursor-pointer nav-text whitespace-nowrap"
						id="register-btn">Sign up</button>
				</div>`;
			setupNavbarHoverEffects();
		}
		const loginBtn = document.getElementById('login-btn');
		if (loginBtn) {
			loginBtn.addEventListener('click', () => navigate('/login'));
		}

		const registerBtn = document.getElementById('register-btn');
		if (registerBtn) {
			registerBtn.addEventListener('click', () => navigate('/register'));
		}
		
		socialWebSocket.disconnect();
		destroySocialPanel();
	}

	async function checkAuthAndUpdateNavbar(): Promise<void> {
		if (isLoggedOut) {
			isLoggedOut = false;
			displayUnlogged();
			return;
		}

		try {
			const res = await fetch("/auth/checkAuth", {
				method: "GET",
				credentials: "include"

			});
			if (res.ok) {
				const isAuthenticated = await res.json();
				if (!isAuthenticated)
					displayUnlogged()
				else
					displaylogged()
			}
		} catch (error) {
			console.log("Erreur navbar:", error);
		}
	}
}
export function setLoggedOut(value: boolean): void {
	isLoggedOut = value;
}