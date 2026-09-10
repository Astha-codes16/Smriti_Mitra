import { useVoice } from '../context/VoiceContext';

export default function VoiceAssistant({ listening: providedListening, onToggle: providedToggle }) {
	const voice = useVoice();
	const listening = providedListening ?? voice.isListening;
	const onToggle = providedToggle || (listening ? voice.stopListening : voice.startListening);
	return (
		<section className={`voice-assistant ${listening ? 'voice-listening' : ''}`}>
			<div className="voice-copy">
				<span className="eyebrow">Your gentle helper</span>
				<h2>MindMate is ready</h2>
				<p>{listening ? 'I am listening...' : 'Tap and speak'}</p>
			</div>
			<button className="mic-button" type="button" onClick={onToggle} aria-label={listening ? 'Stop listening' : 'Start voice assistant'} aria-pressed={listening}>
				<span className="mic-pulse" />
				<span className="mic-symbol" aria-hidden="true">🎙️</span>
			</button>
			<span className="voice-hint">Try saying “What is next?”</span>
		</section>
	);
}
