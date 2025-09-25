import { socialWebSocket } from '../utils/socialWebSocket';

export function renderLogin(root: HTMLElement, navigate: (path: string) => void): void {
	const navbar = document.getElementById("navbar-Auth")
	if (navbar) {
		navbar.innerHTML = ``;
	}

	const app = document.getElementById("app")
	if (app) {
		app.innerHTML = `
		<div class="flex flex-col justify-center items-center h-full w-full space-y-10">
		<div class="flex justify-center item-center px-4">
			<button id="back-Btn" 
				class="fixed top-4 left-4 z-50 bg-white rounded-full shadow-lg p-2 hover:bg-slate-200 transition"
				aria-label="Retour à l'accueil">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24"
					stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
		</div>
		<div class="flex justify-center items-center w-screen">
		<div class="w-96 p-6 shadow-lg bg-white rounded-md">
				<h1 class="text-2xl font-bold font-slate-900 text-center">Login</h1>
				<hr class="mt-3">

				<div id="error-message" class="hidden mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>
				
				<div>
					<form id="login-form" class="place-items-center items-center p-2">
						<input
							class="mt-3 rounded-md font-slate-900 border w-full text-base px-2 py-1 focus:outline-none focus:ring-0 focus:border-slate-800"
							placeholder="Username" type="text" id="username" name="username" required>
						<input
							class="mt-3 rounded-md font-slate-900 border w-full text-base px-2 py-1 focus:outline-none focus:ring-0 focus:border-slate-800"
							placeholder="Password" type="password" id="password" name="password" required>
						<button 
							type="submit" 
							id="login-submit-btn"
							class="mt-6 rounded-full w-full text-base px-2 py-1 focus:outline-none focus:ring-0 focus:border-slate-800 text-white text-bold bg-slate-600 hover:bg-slate-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
							<span id="submit-text">Login</span>
							<span id="loading-spinner" class="hidden">
								<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Logging in...
							</span>
						</button>
					</form>
				</div>
				<hr class="mt-6">
				<div class="flex justify-center items-center">
					<button 
						id="login-google-btn"
						class="mt-3 font-slate-900 font-bold underline px-2 py-1 text-center text-base hover:text-slate-600 cursor-pointer">Log in with google</button>
				</div>
			</div>
		</div>
		<div class="flex justify-center items-center">
			<div class="w-96 font-bold text-center text-white">
				<h2>New here ?</h2>
				<button
					id="register-link"
					class="mt-3 font-slate-900 font-bold underline px-2 py-1 text-center text-base hover:text-slate-600 cursor-pointer">Create an account here</button>
			</div>
		</div>
	</div>`;
		
}
setupEventListeners(navigate);


}
	

	function setupEventListeners(navigate: (path: string) => void): void {
		const backBtn = document.getElementById('back-Btn')
		if (backBtn) {
			backBtn.addEventListener('click', () => navigate('/'))
		}

		const loginForm = document.getElementById('login-form') as HTMLFormElement
		if (loginForm) {
			loginForm.addEventListener('submit', async (e) => {
				e.preventDefault()
				
				const formData = new FormData(loginForm)
				const username = formData.get('username') as string
				const password = formData.get('password') as string
				
				if (!username || !password) {
					showError('Please fill in all fields')
					return
				}
				
				setLoadingState(true)
				hideError()
				
				try {
					const response = await fetch('/auth/login', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ username, password })
					})
					
					const result = await response.json()
					
					if (response.ok) {
						if (result.type === '2fa_required') {
							show2FAOverlay(navigate);
						} else {
							console.log('Login successful:', result);
							socialWebSocket.connect();
							navigate('/');
						}
					} else {
						showError(result.message || 'Login failed');
					}
					
				} catch (error) {
					console.error('Login error:', error);
					showError('Network error. Please try again.');
				} finally {
					setLoadingState(false)
				}
			})
		}

	

		const loginGoogleBtn = document.getElementById('login-google-btn')
		if (loginGoogleBtn) {
			loginGoogleBtn.addEventListener('click', () => {
				window.location.href = '/auth/google'
			})
		}

		const registerLink = document.getElementById('register-link')
		if (registerLink) {
			registerLink.addEventListener('click', () => {
				navigate('/register')
			})
		}
	}


	function setLoadingState(isLoading: boolean): void {
		const submitBtn = document.getElementById('login-submit-btn') as HTMLButtonElement
		const submitText = document.getElementById('submit-text')
		const loadingSpinner = document.getElementById('loading-spinner')
		
		if (submitBtn && submitText && loadingSpinner) {
			submitBtn.disabled = isLoading
			
			if (isLoading) {
				submitText.classList.add('hidden')
				loadingSpinner.classList.remove('hidden')
			} else {
				submitText.classList.remove('hidden')
				loadingSpinner.classList.add('hidden')
			}
		}
	}

	function showError(message: string): void {
		const errorDiv = document.getElementById('error-message')
		if (errorDiv) {
			errorDiv.textContent = message
			errorDiv.classList.remove('hidden')
		}
	}

	function hideError(): void {
		const errorDiv = document.getElementById('error-message')
		if (errorDiv) {
			errorDiv.classList.add('hidden')
		}
	}

	function show2FAOverlay(navigate: (path: string) => void): void {
		const overlay = document.createElement("div");
		overlay.id = "2fa-overlay";
		overlay.className = "fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50";
		
		overlay.innerHTML = `
			<div class="bg-slate-200 p-8 rounded-lg max-w-lg w-full mx-4 shadow-2xl border-2 border-slate-100">
				<div class="text-center mb-6">
					<div class="mx-auto w-16 h-16 bg-slate-600 rounded-full flex items-center justify-center mb-4">
						<svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
						</svg>
					</div>
					<h2 class="text-2xl font-bold text-slate-900 mb-4">Two-Factor Authentication</h2>
				</div>
				
				<div id="2fa-error-message" class="hidden mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>
				
				<!-- Authenticator Code Section -->
				<div class="mb-6 p-4 bg-slate-50 shadow-md rounded border">
					<h3 class="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
						</svg>
						Authenticator App Code
					</h3>
					<p class="text-slate-600 text-sm mb-3">Enter the 6-digit code from your authenticator app:</p>
					<form id="totp-form" class="space-y-3">
						<input type="text" id="totp-code" 
							class="text-center text-2xl font-mono w-full px-4 py-3 border-2 border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 tracking-widest"
							placeholder="000000" maxlength="6" pattern="[0-9]{6}" 
							autocomplete="one-time-code" />
						<button type="submit" id="verify-totp-btn"
							class="w-full bg-slate-600 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
							<span id="verify-totp-text">Verify Code</span>
							<span id="verify-totp-spinner" class="hidden">
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Verifying...
							</span>
						</button>
					</form>
				</div>
				
				<!-- Divider -->
				<div class="flex items-center my-6">
					<div class="flex-grow border-t border-slate-300"></div>
					<span class="flex-shrink-0 px-4 text-slate-500 text-sm font-medium">OR</span>
					<div class="flex-grow border-t border-slate-300"></div>
				</div>
				
				<!-- Recovery Code Section -->
				<div class="mb-6 p-4 bg-slate-50 shadow-md rounded border">
					<h3 class="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd"></path>
						</svg>
						Recovery Code
					</h3>
					<p class="text-slate-600 text-sm mb-3">Lost access to your authenticator? Use your 12-character recovery code:</p>
					<form id="recovery-form" class="space-y-3">
						<input type="text" id="recovery-code" 
							class="text-center text-lg font-mono w-full px-4 py-3 border-2 border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 tracking-wider uppercase"
							placeholder="XXXX-XXXX-XXXX" maxlength="12" 
							autocomplete="off" />
						<button type="submit" id="verify-recovery-btn"
							class="w-full bg-yellow-600 hover:bg-yellow-800 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
							<span id="verify-recovery-text">Use Recovery Code</span>
							<span id="verify-recovery-spinner" class="hidden">
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Verifying...
							</span>
						</button>
					</form>
				</div>
				
				<div class="pt-4 border-t border-slate-300">
					<button id="cancel-2fa" class="w-full text-slate-500 hover:text-slate-700 font-medium py-2 transition-colors duration-200">
						Cancel and return to login
					</button>
				</div>
			</div>
		`;
		
		document.body.appendChild(overlay);
		
		const totpForm = document.getElementById('totp-form') as HTMLFormElement;
		const recoveryForm = document.getElementById('recovery-form') as HTMLFormElement;
		const totpInput = document.getElementById('totp-code') as HTMLInputElement;
		const recoveryInput = document.getElementById('recovery-code') as HTMLInputElement;
		const cancelBtn = document.getElementById('cancel-2fa');
		const verifyTotpBtn = document.getElementById('verify-totp-btn') as HTMLButtonElement;
		const verifyRecoveryBtn = document.getElementById('verify-recovery-btn') as HTMLButtonElement;
		
		if (totpInput) {
			totpInput.focus();
		}
		
		if (totpInput) {
			totpInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				target.value = target.value.replace(/[^0-9]/g, '');
			});
		}
		
		if (recoveryInput) {
			recoveryInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				target.value = target.value.replace(/[^0-9A-Z]/g, '').toUpperCase();
			});
		}
		
		if (totpForm) {
			totpForm.addEventListener('submit', async (e) => {
				e.preventDefault();
				
				const code = totpInput?.value?.trim();
				if (!code) {
					show2FAError('Please enter the 6-digit code');
					return;
				}
				
				if (code.length !== 6 || !/^\d{6}$/.test(code)) {
					show2FAError('Code must be 6 digits');
					return;
				}
				
				await verify2FACode(code, 'totp');
			});
		}
		
		if (recoveryForm) {
			recoveryForm.addEventListener('submit', async (e) => {
				e.preventDefault();
				
				const code = recoveryInput?.value?.trim();
				if (!code) {
					show2FAError('Please enter the recovery code');
					return;
				}
				
				if (code.length !== 12) {
					show2FAError('Recovery code must be 12 characters');
					return;
				}
				
				await verify2FACode(code, 'recovery');
			});
		}
		
		if (cancelBtn) {
			cancelBtn.addEventListener('click', () => {
				document.body.removeChild(overlay);
			});
		}
		
		async function verify2FACode(code: string, type: 'totp' | 'recovery'): Promise<void> {
			const isTotpVerification = type === 'totp';
			set2FALoadingState(isTotpVerification, true);
			hide2FAError();
			
			try {
				const response = await fetch('/auth/2fa', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					credentials: 'include',
					body: JSON.stringify({ code })
				});
				
				const result = await response.json();
				
				if (response.ok) {
					document.body.removeChild(overlay);
					console.log('2FA verification successful:', result);
					socialWebSocket.connect();
					navigate('/');
				} else {
					show2FAError(result.message || '2FA verification failed');
				}
				
			} catch (error) {
				console.error('2FA verification error:', error);
				show2FAError('Network error. Please try again.');
			} finally {
				set2FALoadingState(isTotpVerification, false);
			}
		}
		
		function show2FAError(message: string): void {
			const errorDiv = document.getElementById('2fa-error-message');
			if (errorDiv) {
				errorDiv.textContent = message;
				errorDiv.classList.remove('hidden');
			}
		}
		
		function hide2FAError(): void {
			const errorDiv = document.getElementById('2fa-error-message');
			if (errorDiv) {
				errorDiv.classList.add('hidden');
			}
		}
		
		function set2FALoadingState(isTotpVerification: boolean, isLoading: boolean): void {
			if (isTotpVerification) {
				const verifyText = document.getElementById('verify-totp-text');
				const verifySpinner = document.getElementById('verify-totp-spinner');
				
				if (verifyTotpBtn && verifyText && verifySpinner) {
					verifyTotpBtn.disabled = isLoading;
					
					if (isLoading) {
						verifyText.classList.add('hidden');
						verifySpinner.classList.remove('hidden');
					} else {
						verifyText.classList.remove('hidden');
						verifySpinner.classList.add('hidden');
					}
				}
			} else {
				const verifyText = document.getElementById('verify-recovery-text');
				const verifySpinner = document.getElementById('verify-recovery-spinner');
				
				if (verifyRecoveryBtn && verifyText && verifySpinner) {
					verifyRecoveryBtn.disabled = isLoading;
					
					if (isLoading) {
						verifyText.classList.add('hidden');
						verifySpinner.classList.remove('hidden');
					} else {
						verifyText.classList.remove('hidden');
						verifySpinner.classList.add('hidden');
					}
				}
			}
		}
	}


