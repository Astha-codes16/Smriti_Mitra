import { useVoice } from '../context/VoiceContext';

export default function GlobalVoiceAssistant() {
  const {
    isListening,
    isProcessing,
    recognizedText,
    interimText,
    responseText,
    error,
    startListening,
    stopListening,
    familiarProfile,
    isFamiliarActive,
    speechStatus,
  } = useVoice();

  const isSpeaking = speechStatus?.isSpeaking;
  const isFallback = speechStatus?.isFallback;
  const isNeuralActive = speechStatus?.provider === 'neural';

  let voiceTag = null;
  if (isFallback) {
    voiceTag = (
      <span
        className="fallback-warning-tag"
        style={{
          color: '#b91c1c',
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          padding: '1px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        ⚠️ Browser TTS fallback — NOT voice cloning
      </span>
    );
  } else if (isNeuralActive) {
    voiceTag = (
      <span
        className="familiar-tag"
        style={{
          color: '#15803d',
          background: '#dcfce7',
          border: '1px solid #bbf7d0',
          padding: '1px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        🎙️ Caregiver Voice Active
      </span>
    );
  } else if (isFamiliarActive && familiarProfile?.name) {
    voiceTag = (
      <span className="familiar-tag">
        · {familiarProfile.name}&apos;s Profile Ready
      </span>
    );
  }

  const label = isListening
    ? 'Listening...'
    : isProcessing
    ? 'SmritiMitra is understanding...'
    : isFallback
    ? 'Browser TTS fallback — NOT voice cloning'
    : isSpeaking && isNeuralActive
    ? 'Caregiver Voice Active'
    : responseText
    ? 'SmritiMitra replied'
    : 'Tap to speak';

  return (
    <aside
      className={`global-voice-assistant ${isListening ? 'global-voice-listening' : ''} ${isProcessing ? 'global-voice-processing' : ''}`}
      aria-live="polite"
    >
      <div className="global-voice-copy">
        <span
          className="eyebrow"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
        >
          <span>SmritiMitra voice</span>
          {voiceTag}
        </span>
        <strong style={{ color: isFallback ? '#b91c1c' : undefined }}>{label}</strong>
        {isListening && interimText && (
          <small className="global-voice-interim">
            <b>You are saying:</b> “{interimText}”
          </small>
        )}
        {recognizedText && !isListening && (
          <small>
            <b>You said:</b> “{recognizedText}”
          </small>
        )}
        {responseText && (
          <small className="global-voice-response">
            {isNeuralActive ? (
              <b>{familiarProfile?.name || 'Caregiver'}: </b>
            ) : isFallback ? (
              <b style={{ color: '#b91c1c' }}>[Fallback TTS]: </b>
            ) : null}
            {responseText}
          </small>
        )}
        {error && <small className="global-voice-error">{error}</small>}
      </div>
      <button
        type="button"
        onClick={startListening}
        aria-label={isListening ? 'Listening' : 'Tap to speak'}
        aria-pressed={isListening}
      >
        <span>{isProcessing ? '🧠' : responseText && !isListening ? '🔊' : '🎙️'}</span>
      </button>
      {isListening && (
        <button
          className="global-voice-stop"
          type="button"
          onClick={stopListening}
          aria-label="Stop listening"
        >
          ■
        </button>
      )}
    </aside>
  );
}