export function renderRegister(root: HTMLElement, navigate: (path: string) => void): void {
	const navbar = document.getElementById("navbar-Auth")
	if (navbar) {
		navbar.innerHTML = ``;
	}

	const app = document.getElementById('app')
	if (app)
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

        <div class="w-96 p-6 shadow-lg bg-white rounded-md">
            <h1 class="text-2xl font-bold text-slate-900 text-center mb-4">Register</h1>
            <hr class="mt-2 mb-4">

            <div id="error-message" class="hidden mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>

            <form id="register-form" class="space-y-3">
                <input
                    class="mt-1 rounded-md font-slate-900 border w-full text-base px-2 py-1 focus:outline-none focus:ring-0 focus:border-slate-800"
                    placeholder="Username" type="text" id="username-field" name="username" required>
                <input
                    class="mt-1 rounded-md font-slate-900 border w-full text-base px-2 py-1 focus:outline-none focus:ring-0 focus:border-slate-800"
                    placeholder="Email" type="email" id="email-field" name="email" required>
                <input
                    class="mt-1 rounded-md font-slate-900 border w-full text-base px-2 py-1 focus:outline-none focus:ring-0 focus:border-slate-800"
                    placeholder="Password" type="password" id="password-field" name="password" required>
                
                <button 
                    type="submit" 
                    id="register-submit-btn"
                    class="mt-4 rounded-full w-full text-base px-2 py-1 focus:outline-none focus:ring-0 text-white font-semibold bg-slate-600 hover:bg-slate-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    <span id="register-submit-text">Register</span>
                    <span id="register-loading-spinner" class="hidden">
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating account...
                    </span>
                </button>
            </form>

            <hr class="mt-6">
            <div class="flex justify-center items-center mt-3">
                <button id="login-google-btn"
						class="mt-3 font-slate-900 font-bold underline px-2 py-1 text-center text-base hover:text-slate-600 cursor-pointer">Register with google</button>
            </div>
        </div>

        <div class="w-96 text-center">
            <h2 class="text-white font-semibold mb-2">Already an account ?</h2>
            <button id="login-link" 
                class="text-white font-semibold underline px-4 py-2 text-center text-base hover:text-slate-600 transition-all cursor-pointer">Login here</button>
        </div>
    </div>
    
`;

	setupEventListeners(navigate);

}

function setupEventListeners(navigate: (path: string) => void): void {
	const backBtn = document.getElementById('back-Btn')
	if (backBtn) {
		backBtn.addEventListener('click', () => navigate('/'))
	}

	const registerForm = document.getElementById("register-form") as HTMLFormElement
	if (registerForm) {
		registerForm.addEventListener('submit', async (e) => {
			e.preventDefault();

			const formData = new FormData(registerForm);
			const username = formData.get('username') as string;
			const password = formData.get('password') as string;
			const email = formData.get('email') as string;

			if (!username || !password || !email) {
				showError('Please fill in all fields');
				return;
			}
			if (!isValidEmail(email)) {
				showError('Please enter a valid email address');
				return;
			}

			setLoadingState(true)
			hideError();

			try {
				const response = await fetch('/auth/register', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ username, password, email })
				})

				const result = await response.json()

				if (response.ok) {
					console.log('Registration successful:', result)
					showSuccess('Account created successfully!')
					setTimeout(() => navigate('/'), 1000)
				} else {
					showError(result.message || 'Registration failed');
				}

			} catch (error) {
				console.error('Registration error:', error);
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

	const loginLink = document.getElementById('login-link')
	if (loginLink) {
		loginLink.addEventListener('click', () => {
			navigate('/login')
		})
	}
}


function setLoadingState(isLoading: boolean): void {
	const submitBtn = document.getElementById('register-submit-btn') as HTMLButtonElement
	const submitText = document.getElementById('register-submit-text')
	const loadingSpinner = document.getElementById('register-loading-spinner')

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
		errorDiv.className = 'mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded'
	}
}

function showSuccess(message: string): void {
	const errorDiv = document.getElementById('error-message')
	if (errorDiv) {
		errorDiv.textContent = message
		errorDiv.classList.remove('hidden')
		errorDiv.className = 'mt-3 p-3 bg-green-100 border border-green-400 text-green-700 rounded'
	}
}

function hideError(): void {
	const errorDiv = document.getElementById('error-message')
	if (errorDiv) {
		errorDiv.classList.add('hidden')
	}
}

function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	return emailRegex.test(email)
}

