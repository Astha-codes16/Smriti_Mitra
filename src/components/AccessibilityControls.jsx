import { useState } from 'react';

export default function AccessibilityControls() {
	const [largeText, setLargeText] = useState(false);

	function toggleText() {
		setLargeText((enabled) => !enabled);
		document.documentElement.classList.toggle('large-text', !largeText);
	}

	return (
		<div className="accessibility-controls" aria-label="Accessibility controls">
			<button type="button" onClick={toggleText} aria-pressed={largeText}>A<sup>+</sup><span>{largeText ? 'Normal text' : 'Larger text'}</span></button>
		</div>
	);
}
