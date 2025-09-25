import { renderNavbar } from "./navbar";

export function renderHome(root: HTMLElement, navigate: (path: string) => void): void {
	
	renderNavbar(navigate);
	
	const app = document.getElementById("app")
	if (app)
		app.innerHTML = ``;
}
