import { useEffect, useState } from 'react';
import { patient } from '../data/demoData';
import { getStoredState, saveStoredState } from '../services/storageService';
import { useVoice } from '../context/VoiceContext';

const moods = [
	{ id: 'happy', emoji: '😊', label: 'HAPPY', phrase: 'I feel good', color: 'yellow', response: `I'm happy you're feeling good today, ${patient.shortName}!` },
	{ id: 'okay', emoji: '😐', label: 'OKAY', phrase: 'I feel alright', color: 'blue', response: `That's okay, ${patient.shortName}. I'm here with you.` },
	{ id: 'sad', emoji: '😔', label: 'SAD', phrase: 'I feel sad', color: 'lavender', response: `I'm here with you, ${patient.shortName}.`, prompt: 'Would you like to listen to something comforting?' },
	{ id: 'worried', emoji: '😟', label: 'WORRIED', phrase: 'I feel worried', color: 'peach', response: `Don't worry, ${patient.shortName}. You are not alone.`, prompt: 'Let us choose something gentle together.' },
];

const demoHistory = [
	{ day: 'MON', mood: 'happy' },
	{ day: 'TUE', mood: 'happy' },
	{ day: 'WED', mood: 'okay' },
	{ day: 'THU', mood: 'sad' },
	{ day: 'TODAY', mood: 'happy' },
];

function getMood(moodId) {
	return moods.find((mood) => mood.id === moodId);
}

export default function MoodCheck({ navigate, initialMood }) {
	const { isListening: listening, startListening } = useVoice();
	const [selectedMood, setSelectedMood] = useState(null);
	const [history, setHistory] = useState(demoHistory);
	const [connectionOpen, setConnectionOpen] = useState(false);

	useEffect(() => {
		const stored = getStoredState();
		if (stored.moodHistory) setHistory(stored.moodHistory);
		if (initialMood) setSelectedMood(initialMood);
		else if (stored.currentMood) setSelectedMood(stored.currentMood);
	}, []);

	useEffect(() => {
		const mood = getMood(initialMood);
		if (mood) chooseMood(mood);
	}, [initialMood]);

	function chooseMood(mood) {
		const nextHistory = history.map((entry) => entry.day === 'TODAY' ? { ...entry, mood: mood.id } : entry);
		const moodRecord = { mood: mood.id, date: new Date().toISOString().slice(0, 10), timestamp: new Date().toISOString() };
		setSelectedMood(mood.id);
		setHistory(nextHistory);
		saveStoredState({ ...getStoredState(), currentMood: mood.id, moodRecord, moodHistory: nextHistory });
	}

	function handleVoiceResult(text) {
		const normalized = text.toLowerCase();
		const mood = moods.find((item) => normalized.includes(item.id) || normalized.includes(item.phrase.slice(7).toLowerCase()));
		if (mood) chooseMood(mood);
	}

	const selected = getMood(selectedMood);

	return (
		<div className="mood-check-page page-enter">
			<header className="mood-check-heading">
				<div><span className="mood-title-icon" aria-hidden="true">❤️</span><div><span className="eyebrow">A moment for you</span><h1>HOW ARE YOU FEELING TODAY?</h1><p>Your feelings matter to us, {patient.shortName}.</p></div></div>
				<span className="mood-reassurance">Every feeling is welcome <span>♡</span></span>
			</header>

			{!selected && <section className="mood-question-card"><div><span className="eyebrow">Take your time</span><h2>Choose the feeling<br />that feels closest.</h2><p>There is no right or wrong answer.</p></div><div className={`mood-voice-orb ${listening ? 'mood-voice-listening' : ''}`}><button type="button" onClick={startListening} aria-label={listening ? 'Stop listening' : 'Tell MindMate how you feel'} aria-pressed={listening}><span>🎙️</span><strong>{listening ? "I'M LISTENING" : 'TELL MINDMATE'}</strong></button></div></section>}

			<section className="mood-options-section"><div className="mood-section-heading"><div><span className="eyebrow">Your gentle check-in</span><h2>{selected ? 'You chose:' : 'How does your heart feel?'}</h2></div>{selected && <button className="mood-change-button" type="button" onClick={() => setSelectedMood(null)}>Choose another</button>}</div><div className="mood-options-grid">{moods.map((mood) => <button className={`mood-option mood-option-${mood.color} ${selectedMood === mood.id ? 'mood-option-selected' : ''}`} type="button" key={mood.id} onClick={() => chooseMood(mood)}><span className="mood-emoji">{mood.emoji}</span><strong>{mood.label}</strong><span>{mood.phrase}</span>{selectedMood === mood.id && <b className="mood-selected-mark">✓</b>}</button>)}</div></section>

			{selected && <section className={`mood-response-card mood-response-${selected.color} page-enter`}><div className="response-emoji">{selected.id === 'sad' || selected.id === 'worried' ? '💙' : selected.emoji}</div><div><span className="eyebrow">MindMate is with you</span><h2>{selected.response}</h2>{selected.prompt && <p>{selected.prompt}</p>}</div><div className="mood-response-actions">{selected.id === 'sad' && <><button type="button" onClick={() => navigate('comfort-zone', 'music')}>🎵 PLAY COMFORTING MUSIC</button><button type="button" onClick={() => setConnectionOpen(true)}>📞 TALK TO FAMILY</button></>}{selected.id === 'worried' && <><button type="button" onClick={() => navigate('comfort-zone', 'music')}>🎵 LISTEN TO MUSIC</button><button type="button" onClick={() => navigate('my-people')}>❤️ SEE MY FAMILY</button><button type="button" onClick={() => navigate('comfort-zone', 'relax')}>🌿 RELAX</button></>}</div></section>}

			<section className="mood-history-section"><div className="mood-section-heading"><div><span className="eyebrow">A gentle look back</span><h2>📅 MY FEELINGS THIS WEEK</h2></div><span>It&apos;s okay for feelings to change</span></div><div className="mood-history-list">{history.map((entry) => { const mood = getMood(entry.mood); return <div className={`mood-history-item mood-history-${mood.color}`} key={entry.day}><span>{entry.day}</span><strong>{mood.emoji}</strong><small>{mood.label}</small></div>; })}</div></section>

			{!selected && <button className={`mood-bottom-voice ${listening ? 'mood-bottom-voice-active' : ''}`} type="button" onClick={startListening}><span>🎙️</span><div><strong>{listening ? "I'm listening..." : 'Tell MindMate'}</strong><small>Say “I feel happy” or “I feel sad”</small></div><b>→</b></button>}

			{connectionOpen && <div className="mood-modal-backdrop" role="presentation" onClick={() => setConnectionOpen(false)}><div className="mood-connection-modal" role="dialog" aria-modal="true" aria-labelledby="connection-title" onClick={(event) => event.stopPropagation()}><button className="mood-modal-close" type="button" onClick={() => setConnectionOpen(false)} aria-label="Close connection message">×</button><span className="connection-icon">📞</span><h2 id="connection-title">MindMate is ready to connect you with your family.</h2><p>Someone who loves you can be close by whenever you need them.</p><button className="connection-confirm-button" type="button" onClick={() => setConnectionOpen(false)}>Okay, thank you</button></div></div>}
		</div>
	);
}