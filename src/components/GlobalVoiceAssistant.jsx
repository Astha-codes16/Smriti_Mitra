import { useVoice } from '../context/VoiceContext';

export default function GlobalVoiceAssistant() {
  const { isListening, isProcessing, recognizedText, interimText, responseText, error, startListening, stopListening, familiarProfile, isFamiliarActive } = useVoice();
  const label = isListening
    ? 'Listening...'
    : isProcessing
    ? 'SmritiMitra is understanding...'
    : responseText
    ? (isFamiliarActive && familiarProfile?.name ? `${familiarProfile.name} speaking...` : 'SmritiMitra replied')
    : 'Tap to speak';

  return (
    <aside className={`global-voice-assistant ${isListening ? 'global-voice-listening' : ''} ${isProcessing ? 'global-voice-processing' : ''}`} aria-live="polite">
      <div className="global-voice-copy">
        <span className="eyebrow">
          SmritiMitra voice {isFamiliarActive && familiarProfile?.name && <span className="familiar-tag">· 🎙️ {familiarProfile.name}&apos;s Familiar Voice</span>}
        </span>
        <strong>{label}</strong>
        {isListening && interimText && <small className="global-voice-interim"><b>You are saying:</b> “{interimText}”</small>}
        {recognizedText && !isListening && <small><b>You said:</b> “{recognizedText}”</small>}
        {responseText && (
          <small className="global-voice-response">
            {isFamiliarActive && familiarProfile?.name ? <b>{familiarProfile.name}: </b> : null}
            {responseText}
          </small>
        )}
        {error && <small className="global-voice-error">{error}</small>}
      </div>
      <button type="button" onClick={startListening} aria-label={isListening ? 'Listening' : 'Tap to speak'} aria-pressed={isListening}>
        <span>{isProcessing ? '🧠' : responseText && !isListening ? '🔊' : '🎙️'}</span>
      </button>
      {isListening && <button className="global-voice-stop" type="button" onClick={stopListening} aria-label="Stop listening">■</button>}
    </aside>
  );
}