const STORAGE_KEY = 'mindmate-demo-state';

export function getStoredState() {
	try {
		return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
	} catch {
		return {};
	}
}

export function saveStoredState(state) {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Local storage may be unavailable in private browsing or a preview.
	}
}
