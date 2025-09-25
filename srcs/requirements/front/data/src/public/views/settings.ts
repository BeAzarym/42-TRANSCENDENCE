import { renderNavbar } from "./navbar";
import * as QRCode from 'qrcode';

let currentUserId: string | null = null;
let current2FAData: { secret: string; reset: string } | null = null;

export function renderSettings(root: HTMLElement, navigate: (path: string) => void): void {
	renderNavbar(navigate);

	const app = document.getElementById('app');
	if (app) {
		app.innerHTML = `
    <div class="flex justify-center items-center h-full w-full">
      <div class="bg-slate-200 w-full max-w-2xl mt-6 pt-6 p-6 shadow-lg rounded-md border-2 border-slate-100">

        <div id="error-message" class="hidden mb-4 p-3 rounded"></div>

        <h1 class="flex justify-center items-center text-2xl font-bold text-slate-900 mb-6">Account settings</h1>
        <div class="mb-8 p-4 bg-slate-50 shadow-md rounded">
          <h2 class="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 7C9.65685 7 11 5.65685 11 4C11 2.34315 9.65685 1 8 1C6.34315 1 5 2.34315 5 4C5 5.65685 6.34315 7 8 7Z"/>
              <path d="M14 12C14 10.3431 12.6569 9 11 9H5C3.34315 9 2 10.3431 2 12V15H14V12Z"/>
            </svg>
            Avatar Update
          </h2>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex items-center justify-center">
              <div class="relative">
                <img id="currentAvatar" alt="Current avatar"
                     class="w-40 h-40 rounded-full border-4 border-slate-300 object-cover shadow-lg">
              </div>
            </div>

            <div class="flex flex-col justify-between space-y-4">
              <div class="p-4 outline-dashed outline-slate-300 outline-2 rounded">
                <div class="text-center">
                  <p class="text-sm text-gray-600 font-medium">Formats acceptés: JPEG, PNG, GIF, WebP</p>
                  <p class="text-sm text-gray-600">Taille maximale: 5MB</p>
                </div>

                <div class="text-center mt-4">
                  <input type="file" id="avatarInput" accept="image/*" class="hidden" />
                  <button type="button" id="avatarChooseBtn"
                    class="bg-slate-600 hover:bg-slate-800 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 shadow-sm">
                    Choisir un fichier
                  </button>
                </div>

                <div class="text-center mt-3">
                  <span id="fileStatus" class="text-sm text-gray-500">Aucun fichier choisi</span>
                </div>
              </div>

              <div>
                <button type="button" id="avatarUploadBtn"
                  class="bg-slate-600 hover:bg-slate-800 w-full text-white py-2 px-4 rounded-md transition-colors duration-200 shadow-sm">
                  Upload avatar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-8 p-4 bg-slate-50 shadow-md rounded">
          <h2 class="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zM6 7h4v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7z"/>
            </svg>
            Two-Factor Authentication (2FA)
          </h2>
          
          <div id="2fa-container">
            <div id="2fa-disabled" class="hidden">
              <p class="text-slate-600 mb-4">Secure your account with two-factor authentication using an authenticator app.</p>
              <button type="button" id="enable-2fa-btn"
                class="bg-green-600 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 shadow-sm">
                Enable 2FA
              </button>
            </div>
            
            <div id="2fa-enabled" class="hidden">
              <div class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                <div class="flex items-center gap-2">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                  <span class="font-semibold">Two-factor authentication is enabled</span>
                </div>
              </div>
              
              <div class="space-y-4">
                <div>
                  <h3 class="font-semibold text-slate-700 mb-2">Recovery Code</h3>
                  <p class="text-sm text-slate-600 mb-2">Save this recovery code in a safe place. You can use it to reset your 2FA if you lose access to your authenticator:</p>
                  <div class="bg-slate-100 p-3 rounded border">
                    <code id="recovery-code" class="text-sm font-mono text-slate-800">Not available - Use Reset 2FA to generate new codes</code>
                  </div>
                </div>
                
                <div class="flex gap-4">
                  <button type="button" id="show-qr-btn" class="hidden bg-blue-600 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm">
                    Show QR Code
                  </button>
                  <button type="button" id="reset-2fa-btn"
                    class="bg-yellow-600 hover:bg-yellow-800 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm">
                    Reset 2FA
                  </button>
                  <button type="button" id="disable-2fa-btn"
                    class="bg-red-600 hover:bg-red-800 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm">
                    Disable 2FA
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-8 p-4 bg-slate-50 shadow-md rounded">
          <h2 class="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M16 5.5C16 8.53757 13.5376 11 10.5 11H7V13H5V15L4 16H0V12L5.16351 6.83649C5.0567 6.40863 5 5.96094 5 5.5C5 2.46243 7.46243 0 10.5 0C13.5376 0 16 2.46243 16 5.5ZM13 4C13 4.55228 12.5523 5 12 5C11.4477 5 11 4.55228 11 4C11 3.44772 11.4477 3 12 3C12.5523 3 13 3.44772 13 4Z"/>
            </svg>
            Security settings
          </h2>
          <form id="PasswordResetForms" class="space-y-4">
            <div>
              <input class="rounded-md w-full border-slate-900 border-2 text-base px-2 py-1 focus:outline-none focus:ring-0"
                type="password" id="currentPassword" placeholder="Current Password" name="currentPassword">
            </div>
            <div>
              <input class="rounded-md w-full border-slate-900 border-2 text-base px-2 py-1 focus:outline-none focus:ring-0"
                type="password" id="newPassword" placeholder="New Password" name="newPassword">
            </div>
            <button type="submit" id="passwordSubmit" class="w-full bg-slate-600 text-white py-2 px-4 rounded-md hover:bg-slate-800 transition-colors duration-200 shadow-sm">
              <span id="passwordSubmitText">Update password</span>
            </button>
          </form>
        </div>

      </div>
    </div>
    `;
	}

	loadUserData();
	setupListeners();
}

function showMessage(message: string, type: "success" | "error"): void {
	const div = document.getElementById("error-message");
	if (div) {
		div.textContent = message;
		div.className = `mb-4 p-3 rounded ${type === "success" ? "bg-green-100 border border-green-400 text-green-700" : "bg-red-100 border border-red-400 text-red-700"}`;
		div.classList.remove("hidden");
		setTimeout(() => {
			div.classList.add("hidden");
		}, 5000);
	}
}

async function loadUserData(): Promise<void> {
	try {
		const response = await fetch("/auth/me", {
			method: "GET",
			credentials: "include"
		});

		if (response.ok) {
			const userData = await response.json();
			currentUserId = userData.id; // Stocker l'ID utilisateur
			const currentAvatarDiv = document.getElementById("currentAvatar") as HTMLImageElement;
			if (currentAvatarDiv)
				currentAvatarDiv.src = `/user/avatar/${userData.id}`;
		}
		
		// Vérifier le statut 2FA
		await check2FAStatus();
	} catch (error) {
		console.error("Failed to load user data:", error);
	}
}

function setupListeners(): void {
	const passwordSubmit = document.getElementById("PasswordResetForms") as HTMLFormElement;
	if (passwordSubmit) {
		passwordSubmit.addEventListener("submit", async (e) => {
			e.preventDefault();
			await handlePasswordUpdate();
		});
	}

	const fileInput = document.getElementById("avatarInput") as HTMLInputElement;
	const chooseBtn = document.getElementById("avatarChooseBtn") as HTMLButtonElement;
	const uploadBtn = document.getElementById("avatarUploadBtn") as HTMLButtonElement;
	const previewImg = document.getElementById("currentAvatar") as HTMLImageElement;
	const fileStatus = document.getElementById("fileStatus") as HTMLSpanElement;

	let selectedFile: File | null = null;

	if (chooseBtn && fileInput) {
		chooseBtn.addEventListener("click", () => {
			fileInput.click();
		});

		fileInput.addEventListener("change", (e) => {
			const target = e.target as HTMLInputElement;
			if (target.files && target.files[0]) {
				selectedFile = target.files[0];
				previewImg.src = URL.createObjectURL(selectedFile) || `/user/avatar/${currentUserId}`;
				fileStatus.textContent = selectedFile.name;
			} else {
				selectedFile = null;
				fileStatus.textContent = "Aucun fichier choisi";
			}
		});
	}

	if (uploadBtn) {
		uploadBtn.addEventListener("click", async () => {
			await handleAvatarUpdate(selectedFile, previewImg, fileStatus);
		});
	}
	
	// 2FA Event Listeners
	setup2FAListeners();
}

async function handlePasswordUpdate(): Promise<void> {
	const form = document.getElementById("PasswordResetForms") as HTMLFormElement;
	const data = new FormData(form);

	const current = data.get("currentPassword") as string;
	const newPassword = data.get("newPassword") as string;

	if (!current || !newPassword) {
		showMessage("You must fill all fields.", "error");
		return;
	}

	if (current === newPassword) {
		showMessage("You can't reuse same password.", "error");
		return;
	}

	if (newPassword.length < 7) {
		showMessage("New password must be at least 7 characters long", "error");
		return;
	}

	try {
		const response = await fetch("/auth/updatePassword", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			body: JSON.stringify({
				current,
				newPassword
			})
		});

		const result = await response.json();

		if (response.ok) {
			showMessage("Password modified successfully!", "success");
			form.reset();
		}
		else {
			showMessage(result.message || "Failed to modify password.", "error");
		}
	} catch (error) {
		console.error("[ERROR] Password Handler failed: ", error);
		showMessage("Network error. Please try again.", "error");
	}
}

async function handleAvatarUpdate(selectedFile: File | null, previewImg: HTMLImageElement, fileStatus: HTMLSpanElement): Promise<void> {
	if (!selectedFile) {
		showMessage("No such file.", "error");
		return;
	}

	if (selectedFile.size > 5 * 1024 * 1024) {
		showMessage("File size is limited to 5MB.", "error");
		return;
	}

	const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
	if (!validTypes.includes(selectedFile.type)) {
		showMessage("File format must be jpeg / png / gif / webp.", "error");
		return;
	}

	const formData = new FormData();
	formData.append("file", selectedFile);

	try {
		const res = await fetch("/auth/updateAvatar", {
			method: "POST",
			body: formData,
			credentials: "include",
		});

		const data = await res.json();

		if (res.ok && data.success) {
			showMessage("Avatar mis à jour avec succès", "success");
			previewImg.src = `/user/avatar/${currentUserId}`;
			fileStatus.textContent = selectedFile.name;

			const navbarAvatar = document.querySelector('#auth-buttons img') as HTMLImageElement | null;
			if (navbarAvatar && currentUserId) {
				navbarAvatar.src = `/user/avatar/${currentUserId}`;
			}
		} else {
			showMessage(data.message || "An error occurred during the download.", "error");
		}
	} catch (err) {
		console.error(err);
		showMessage("Network error. Please try again", "error");
	}
}

// === 2FA Functions ===

async function check2FAStatus(): Promise<void> {
	try {
		const response = await fetch("/auth/2fa/status", {
			method: "GET",
			credentials: "include"
		});
		
		if (response.ok) {
			const data = await response.json();
			if (data.data.enabled) {
				show2FAEnabledState();
			} else {
				show2FADisabledState();
			}
		} else {
			console.error("Failed to check 2FA status:", response.status);
			show2FADisabledState();
		}
	} catch (error) {
		console.error("Failed to check 2FA status:", error);
		show2FADisabledState();
	}
}

function show2FADisabledState(): void {
	const disabledDiv = document.getElementById("2fa-disabled");
	const enabledDiv = document.getElementById("2fa-enabled");
	
	if (disabledDiv) disabledDiv.classList.remove("hidden");
	if (enabledDiv) enabledDiv.classList.add("hidden");
}

function show2FAEnabledState(): void {
	const disabledDiv = document.getElementById("2fa-disabled");
	const enabledDiv = document.getElementById("2fa-enabled");
	
	if (disabledDiv) disabledDiv.classList.add("hidden");
	if (enabledDiv) enabledDiv.classList.remove("hidden");
}

function setup2FAListeners(): void {
	const enable2FABtn = document.getElementById("enable-2fa-btn");
	const showQRBtn = document.getElementById("show-qr-btn");
	const reset2FABtn = document.getElementById("reset-2fa-btn");
	const disable2FABtn = document.getElementById("disable-2fa-btn");
	
	if (enable2FABtn) {
		enable2FABtn.addEventListener("click", handle2FAActivation);
	}
	
	if (showQRBtn) {
		showQRBtn.addEventListener("click", showQRCodeModal);
	}
	
	if (reset2FABtn) {
		reset2FABtn.addEventListener("click", show2FAResetModal);
	}
	
	if (disable2FABtn) {
		disable2FABtn.addEventListener("click", show2FADisableModal);
	}
}

async function handle2FAActivation(): Promise<void> {
	try {
		const response = await fetch("/auth/2fa/register", {
			method: "GET",
			credentials: "include"
		});
		
		if (response.ok) {
			const data = await response.json();
			current2FAData = {
				secret: data.data.secret,
				reset: data.data.reset
			};
			
			const recoveryCodeElement = document.getElementById("recovery-code");
			if (recoveryCodeElement) {
				recoveryCodeElement.textContent = current2FAData.reset;
			}
			
			const showQRBtn = document.getElementById("show-qr-btn");
			if (showQRBtn) {
				showQRBtn.classList.remove("hidden");
			}
			
			show2FAEnabledState();
			showMessage("2FA has been activated successfully! Please save your recovery code.", "success");
			
			await showQRCodeModal();
			
		} else {
			const errorData = await response.json();
			showMessage(errorData.message || "Failed to activate 2FA", "error");
		}
	} catch (error) {
		console.error("Error activating 2FA:", error);
		showMessage("Network error. Please try again.", "error");
	}
}

async function showQRCodeModal(): Promise<void> {
	if (!current2FAData?.secret) {
		showMessage("2FA secret not available", "error");
		return;
	}

	try {
		const userResponse = await fetch("/auth/me", {
			method: "GET",
			credentials: "include"
		});
		
		let username = "user";
		if (userResponse.ok) {
			const userData = await userResponse.json();
			username = userData.username || "user";
		}

		const issuer = "Transcendence";
		const totpUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(username)}?secret=${current2FAData.secret}&issuer=${encodeURIComponent(issuer)}`;
		
		const qrCodeDataURL = await QRCode.toDataURL(totpUrl);
		
		const modal = document.createElement("div");
		modal.className = "fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50";
		modal.innerHTML = `
			<div class="bg-white p-6 rounded-lg max-w-md w-full mx-4 shadow-xl">
				<div class="flex justify-between items-center mb-4">
					<h3 class="text-xl font-semibold text-slate-800">Setup 2FA</h3>
					<button id="close-modal" class="text-slate-500 hover:text-slate-700 text-2xl">&times;</button>
				</div>
				
				<div class="text-center mb-4">
					<p class="text-slate-600 mb-4">Scan this QR code with your authenticator app:</p>
					<img src="${qrCodeDataURL}" alt="2FA QR Code" class="mx-auto mb-4 border rounded" />
					
					<p class="text-sm text-slate-600">
						Use apps like Google Authenticator, Authy, or Microsoft Authenticator.
					</p>
				</div>
				
				<div class="flex justify-end">
					<button id="done-modal" class="bg-slate-600 hover:bg-slate-800 text-white py-2 px-4 rounded-lg transition-colors duration-200">
						Done
					</button>
				</div>
			</div>
		`;
		
		document.body.appendChild(modal);
		
		const closeBtn = document.getElementById("close-modal");
		const doneBtn = document.getElementById("done-modal");
		
		const closeModal = () => {
			document.body.removeChild(modal);
		};
		
		if (closeBtn) closeBtn.addEventListener("click", closeModal);
		if (doneBtn) doneBtn.addEventListener("click", closeModal);
		
		modal.addEventListener("click", (e) => {
			if (e.target === modal) closeModal();
		});
		
	} catch (error) {
		console.error("Error generating QR code:", error);
		showMessage("Failed to generate QR code", "error");
	}
}

function show2FAResetModal(): void {
	const modal = document.createElement("div");
	modal.className = "fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50";
	modal.innerHTML = `
		<div class="bg-white p-6 rounded-lg max-w-md w-full mx-4 shadow-xl">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-xl font-semibold text-slate-800">Reset 2FA</h3>
				<button id="close-reset-modal" class="text-slate-500 hover:text-slate-700 text-2xl">&times;</button>
			</div>
			
			<div class="mb-4">
				<p class="text-slate-600 mb-4">Enter your 12-character recovery code to reset your 2FA:</p>
				<input type="text" id="reset-code-input" 
					class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
					placeholder="Enter recovery code" maxlength="12" />
			</div>
			
			<div id="reset-error-message" class="hidden mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>
			
			<div class="flex justify-end gap-3">
				<button id="cancel-reset" class="bg-slate-300 hover:bg-slate-400 text-slate-700 py-2 px-4 rounded-lg transition-colors duration-200">
					Cancel
				</button>
				<button id="confirm-reset" class="bg-red-600 hover:bg-red-800 text-white py-2 px-4 rounded-lg transition-colors duration-200">
					Reset 2FA
				</button>
			</div>
		</div>
	`;
	
	document.body.appendChild(modal);
	
	const closeBtn = document.getElementById("close-reset-modal");
	const cancelBtn = document.getElementById("cancel-reset");
	const confirmBtn = document.getElementById("confirm-reset");
	const resetInput = document.getElementById("reset-code-input") as HTMLInputElement;
	
	const closeModal = () => {
		document.body.removeChild(modal);
	};
	
	if (closeBtn) closeBtn.addEventListener("click", closeModal);
	if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
	
	if (confirmBtn) {
		confirmBtn.addEventListener("click", async () => {
			const resetCode = resetInput?.value?.trim();
			if (!resetCode) {
				showResetError("Please enter a recovery code");
				return;
			}
			
			if (resetCode.length !== 12) {
				showResetError("Recovery code must be 12 characters long");
				return;
			}
			
			await handle2FAReset(resetCode, closeModal);
		});
	}
	
	modal.addEventListener("click", (e) => {
		if (e.target === modal) closeModal();
	});
	
	function showResetError(message: string): void {
		const errorDiv = document.getElementById("reset-error-message");
		if (errorDiv) {
			errorDiv.textContent = message;
			errorDiv.classList.remove("hidden");
		}
	}
}

async function handle2FAReset(resetCode: string, closeModal: () => void): Promise<void> {
	try {
		const response = await fetch("/auth/2fa/reset", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			body: JSON.stringify({
				reset_code: resetCode
			})
		});
		
		if (response.ok) {
			const data = await response.json();
			current2FAData = {
				secret: data.data.secret,
				reset: data.data.reset
			};
			
			const recoveryCodeElement = document.getElementById("recovery-code");
			if (recoveryCodeElement) {
				recoveryCodeElement.textContent = current2FAData.reset;
			}
			
			const showQRBtn = document.getElementById("show-qr-btn");
			if (showQRBtn) {
				showQRBtn.classList.remove("hidden");
			}
			
			closeModal();
			showMessage("2FA has been reset successfully! New recovery code generated.", "success");
			
			setTimeout(() => showQRCodeModal(), 500);
			
		} else {
			const errorData = await response.json();
			const errorDiv = document.getElementById("reset-error-message");
			if (errorDiv) {
				errorDiv.textContent = errorData.message || "Failed to reset 2FA";
				errorDiv.classList.remove("hidden");
			}
		}
	} catch (error) {
		console.error("Error resetting 2FA:", error);
		const errorDiv = document.getElementById("reset-error-message");
		if (errorDiv) {
			errorDiv.textContent = "Network error. Please try again.";
			errorDiv.classList.remove("hidden");
		}
	}
}

function show2FADisableModal(): void {
	const modal = document.createElement("div");
	modal.className = "fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50";
	modal.innerHTML = `
		<div class="bg-white p-6 rounded-lg max-w-md w-full mx-4 shadow-xl">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-xl font-semibold text-slate-800">Disable 2FA</h3>
				<button id="close-disable-modal" class="text-slate-500 hover:text-slate-700 text-2xl">&times;</button>
			</div>
			
			<div class="mb-6">
				<div class="flex items-center mb-4">
					<svg class="w-8 h-8 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
					</svg>
					<div>
						<p class="text-slate-800 font-semibold">Warning!</p>
						<p class="text-slate-600">This will completely disable two-factor authentication on your account.</p>
					</div>
				</div>
				<p class="text-slate-600 text-sm">Your account will be less secure without 2FA protection. Are you sure you want to continue?</p>
			</div>
			
			<div id="disable-error-message" class="hidden mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>
			
			<div class="flex justify-end gap-3">
				<button id="cancel-disable" class="bg-slate-300 hover:bg-slate-400 text-slate-700 py-2 px-4 rounded-lg transition-colors duration-200">
					Cancel
				</button>
				<button id="confirm-disable" class="bg-red-600 hover:bg-red-800 text-white py-2 px-4 rounded-lg transition-colors duration-200">
					<span id="disable-text">Disable 2FA</span>
					<span id="disable-spinner" class="hidden">
						<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Disabling...
					</span>
				</button>
			</div>
		</div>
	`;
	
	document.body.appendChild(modal);
	
	const closeBtn = document.getElementById("close-disable-modal");
	const cancelBtn = document.getElementById("cancel-disable");
	const confirmBtn = document.getElementById("confirm-disable");
	
	const closeModal = () => {
		document.body.removeChild(modal);
	};
	
	if (closeBtn) closeBtn.addEventListener("click", closeModal);
	if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
	
	if (confirmBtn) {
		confirmBtn.addEventListener("click", async () => {
			await handle2FADisable(closeModal);
		});
	}
	
	modal.addEventListener("click", (e) => {
		if (e.target === modal) closeModal();
	});
}

async function handle2FADisable(closeModal: () => void): Promise<void> {
	const disableText = document.getElementById("disable-text");
	const disableSpinner = document.getElementById("disable-spinner");
	const confirmBtn = document.getElementById("confirm-disable") as HTMLButtonElement;
	
	if (disableText) disableText.classList.add("hidden");
	if (disableSpinner) disableSpinner.classList.remove("hidden");
	if (confirmBtn) confirmBtn.disabled = true;
	
	try {
		const response = await fetch("/auth/2fa/disable", {
			method: "DELETE",
			credentials: "include"
		});
		
		if (response.ok) {
			closeModal();
			showMessage("2FA has been disabled successfully.", "success");
			
			show2FADisabledState();
			current2FAData = null;
			
			const showQRBtn = document.getElementById("show-qr-btn");
			if (showQRBtn) {
				showQRBtn.classList.add("hidden");
			}
			
		} else {
			const errorData = await response.json();
			const errorDiv = document.getElementById("disable-error-message");
			if (errorDiv) {
				errorDiv.textContent = errorData.message || "Failed to disable 2FA";
				errorDiv.classList.remove("hidden");
			}
		}
	} catch (error) {
		console.error("Error disabling 2FA:", error);
		const errorDiv = document.getElementById("disable-error-message");
		if (errorDiv) {
			errorDiv.textContent = "Network error. Please try again.";
			errorDiv.classList.remove("hidden");
		}
	} finally {
		if (disableText) disableText.classList.remove("hidden");
		if (disableSpinner) disableSpinner.classList.add("hidden");
		if (confirmBtn) confirmBtn.disabled = false;
	}
}