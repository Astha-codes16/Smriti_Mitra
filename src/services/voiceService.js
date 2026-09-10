export function isSpeechRecognitionSupported() {
	return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function speak(text) {
	if (!('speechSynthesis' in window)) return false;

	window.speechSynthesis.cancel();
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.rate = 0.8;
	utterance.pitch = 1.05;
	const voice = window.speechSynthesis.getVoices().find((item) => item.lang?.toLowerCase().startsWith('en'));
	if (voice) utterance.voice = voice;
	window.speechSynthesis.speak(utterance);
	return true;
}

export function stopSpeaking() {
	window.speechSynthesis?.cancel();
}

export function createRecognition({ onStart, onEnd, onInterim, onResult, onError }) {
	const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
	if (!Recognition) return null;

	const recognition = new Recognition();
	recognition.lang = 'en-IN';
	recognition.continuous = false;
	recognition.interimResults = true;
	recognition.maxAlternatives = 1;
	recognition.onstart = () => {
		console.log('🎙️ APP VOICE: STARTED');
		onStart?.();
	};
	recognition.onspeechstart = () => console.log('🗣️ APP VOICE: SPEECH STARTED');
	recognition.onspeechend = () => console.log('🗣️ APP VOICE: SPEECH ENDED');
	recognition.onend = () => {
		console.log('🛑 APP VOICE: ENDED');
		onEnd?.();
	};
	recognition.onresult = (event) => {
		let finalTranscript = '';
		let interimTranscript = '';
		console.log('📝 APP VOICE: RESULT', event);
		for (let index = event.resultIndex; index < event.results.length; index += 1) {
			const transcript = event.results[index][0].transcript;
			if (event.results[index].isFinal) finalTranscript += `${transcript} `;
			else interimTranscript += `${transcript} `;
		}
		const combinedInterim = `${finalTranscript} ${interimTranscript}`.replace(/\s+/g, ' ').trim();
		if (combinedInterim) onInterim?.(combinedInterim);
		if (finalTranscript.trim()) {
			console.log('FINAL VOICE COMMAND:', finalTranscript.trim());
			onResult(finalTranscript.replace(/\s+/g, ' ').trim());
		}
	};
	recognition.onerror = (event) => {
		console.log('❌ APP VOICE ERROR:', event.error);
		onError?.(event);
	};
	return recognition;
}

export function startListening(handlers) {
	const recognition = createRecognition(handlers);
	if (!recognition) return null;
	recognition.start();
	return recognition;
}

export function stopListening(recognition) {
	recognition?.stop();
}
