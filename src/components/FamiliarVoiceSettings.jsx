import { useState, useRef, useEffect } from 'react';
import { family } from '../data/demoData';
import {
  getVoiceProfile,
  saveVoiceProfile,
  removeVoiceProfile,
  setVoiceSample,
  getVoiceSampleUrl,
  clearVoiceSample,
  playReferenceSample,
  generateSpeech,
  stopSpeaking,
  getProviderStatus,
  checkServerHealth,
  registerSampleWithServer,
  DEFAULT_PROFILE,
} from '../services/familiarVoiceService';

export default function FamiliarVoiceSettings({ onVoiceChange }) {
  const [profile, setProfile] = useState(() => getVoiceProfile() || DEFAULT_PROFILE);
  const [isSaved, setIsSaved] = useState(() => Boolean(getVoiceProfile()));
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(() => {
    const existing = getVoiceProfile();
    return existing ? existing.name : 'Anita';
  });
  const [relationship, setRelationship] = useState(() => {
    const existing = getVoiceProfile();
    return existing ? existing.relationship : 'Daughter';
  });
  const [enabled, setEnabled] = useState(() => {
    const existing = getVoiceProfile();
    return existing ? existing.enabled : true;
  });

  // Server health state
  const [serverOnline, setServerOnline] = useState(false);
  const [serverDetails, setServerDetails] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [activeTestText, setActiveTestText] = useState('');

  // Reference recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [sampleUrl, setSampleUrl] = useState(() => getVoiceSampleUrl());
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const healthCheckIntervalRef = useRef(null);

  useEffect(() => {
    // Initial and periodic server health poll
    async function checkHealth() {
      const res = await checkServerHealth();
      setServerOnline(res.isOnline);
      setServerDetails(res.details);
    }
    checkHealth();
    healthCheckIntervalRef.current = setInterval(checkHealth, 5000);

    return () => {
      if (healthCheckIntervalRef.current) clearInterval(healthCheckIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      stopSpeaking();
    };
  }, []);

  function showStatus(msg) {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 5000);
  }

  function handlePersonChange(e) {
    const name = e.target.value;
    setSelectedPerson(name);
    const found = family.find((f) => f.name === name);
    if (found) {
      setRelationship(found.relationship);
    }
  }

  // Start recording voice reference sample from microphone
  async function startRecording() {
    setErrorMessage('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Audio recording is not supported in this browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = setVoiceSample(audioBlob);
        setSampleUrl(url);
        stream.getTracks().forEach((track) => track.stop());
        showStatus('Caregiver reference voice sample registered successfully!');
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access was denied. Please allow microphone access to record.');
      } else {
        setErrorMessage('Could not start audio recording. You can also upload a sample or use the preset.');
      }
    }
  }

  // Stop recording
  function stopRecording() {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }

  // Handle file upload
  async function handleFileUpload(event) {
    setErrorMessage('');
    const file = event.target.files?.[0];
    if (!file) return;

    const isAudio = file.type.startsWith('audio/') || Boolean(file.name.match(/\.(wav|mp3|m4a|aac|ogg|webm|flac)$/i));
    if (!isAudio) {
      setErrorMessage('Please upload a valid audio file (WAV, MP3, M4A, OGG, WebM).');
      return;
    }

    setUploadedFileName(file.name);
    const url = setVoiceSample(file);
    setSampleUrl(url);
    showStatus(`Uploading "${file.name}" to neural voice engine...`);

    const result = await registerSampleWithServer(file, file.name);
    if (result && result.success) {
      showStatus(`Caregiver voice sample "${file.name}" registered successfully with neural engine!`);
    } else {
      showStatus(`Caregiver voice sample "${file.name}" loaded successfully.`);
    }
  }

  // Pre-load demo preset
  function handleLoadDemoPreset() {
    clearVoiceSample();
    setSampleUrl(null);
    setSelectedPerson('Anita');
    setRelationship('Daughter');
    setEnabled(true);
    showStatus('Anita (Daughter) profile loaded with calibrated voice settings.');
  }

  // Explicitly listen to the original recorded reference clip
  function handleTogglePlayReference() {
    if (!sampleUrl) return;

    if (isPlayingReference) {
      stopSpeaking();
      setIsPlayingReference(false);
    } else {
      setIsPlayingReference(true);
      playReferenceSample(() => setIsPlayingReference(false));
    }
  }

  // Delete sample
  function handleDeleteSample() {
    clearVoiceSample();
    setSampleUrl(null);
    showStatus('Reference voice sample cleared.');
  }

  // Save profile
  function handleSaveProfile() {
    const newProfile = {
      id: `voice-${selectedPerson.toLowerCase()}`,
      name: selectedPerson,
      relationship,
      sampleAvailable: Boolean(sampleUrl) || true,
      hasCustomAudio: Boolean(sampleUrl),
      enabled,
      provider: serverOnline ? 'neural-pocket-tts-onnx' : 'browser-tts-fallback',
      createdAt: profile?.createdAt || new Date().toISOString(),
    };

    saveVoiceProfile(newProfile);
    setProfile(newProfile);
    setIsSaved(true);
    showStatus(`Familiar Voice Profile for ${selectedPerson} (${relationship}) saved!`);
    onVoiceChange?.(newProfile);
  }

  // Remove profile
  function handleRemoveProfile() {
    removeVoiceProfile();
    setProfile(null);
    setIsSaved(false);
    setSampleUrl(null);
    showStatus('Familiar voice profile reset. MindMate will use standard voice.');
    onVoiceChange?.(null);
  }

  // Test dynamic generation of specific NEW sentences (never replays the recording)
  async function handleTestDynamicSentence(sentence) {
    stopSpeaking();
    setIsSynthesizing(true);
    setActiveTestText(sentence);
    showStatus(`Synthesizing new speech: "${sentence}"`);

    await generateSpeech(sentence, {
      onEnd: () => {
        setIsSynthesizing(false);
        setActiveTestText('');
      },
    });
    // Fallback reset if onEnd wasn't fired
    setTimeout(() => {
      setIsSynthesizing(false);
      setActiveTestText('');
    }, 15000);
  }

  const providerStatus = getProviderStatus();

  return (
    <section className="care-section care-panel-modern familiar-voice-panel">
      <div className="care-section-title">
        <div>
          <span className="eyebrow">Zero-Shot Neural Speech Synthesis</span>
          <h2>🎙️ FAMILIAR VOICE ASSISTANT</h2>
        </div>
        <span className={`voice-status-pill ${isSaved && enabled ? 'voice-status-active' : 'voice-status-inactive'}`}>
          {isSaved && enabled ? `✓ Active Profile: ${selectedPerson}` : '○ Standard Voice'}
        </span>
      </div>

      <p className="familiar-voice-desc">
        Configure a familiar family caregiver persona to speak MindMate&apos;s guidance, reminders, and activities. Every command generates <b>new speech dynamically</b> in the caregiver&apos;s voice.
      </p>

      {/* Real-time Server & Engine Status Badge */}
      <div style={{
        background: serverOnline ? 'rgba(34, 197, 94, 0.08)' : 'rgba(234, 179, 8, 0.08)',
        border: `1px solid ${serverOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <span style={{ fontSize: '20px' }}>{serverOnline ? '🟢' : '🟡'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <strong style={{ color: serverOnline ? '#15803d' : '#a16207', fontSize: '14px' }}>
              {serverOnline
                ? 'Neural Voice Server Online (PocketTTS ONNX INT8)'
                : 'Offline Fallback Mode Active (Browser SpeechSynthesis)'}
            </strong>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: serverOnline ? '#dcfce7' : '#fef9c3', color: serverOnline ? '#166534' : '#854d0e', fontWeight: 600 }}>
              {serverOnline ? '100% Offline CPU Neural Inference' : 'Zero-Setup Fallback'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
            {serverOnline ? (
              <>
                Zero-shot neural voice cloning is operational at <code>http://127.0.0.1:8000</code>. Sentences are synthesized dynamically via quantized ONNX CPU models from the caregiver&apos;s audio reference prompt.
              </>
            ) : (
              <>
                The neural voice engine server is currently stopped. MindMate is seamlessly speaking using calibrated browser speech synthesis. To launch the full neural cloning engine, run: <code>py -3.12 voice-server\server.py</code>
              </>
            )}
          </p>
        </div>
      </div>

      {statusMessage && <div className="familiar-voice-alert success" role="status">✅ {statusMessage}</div>}
      {errorMessage && <div className="familiar-voice-alert error" role="alert">⚠️ {errorMessage}</div>}

      <div className="familiar-voice-form">
        {/* Family Member Selection */}
        <div className="form-row-two">
          <div className="form-group">
            <label htmlFor="family-member-select">Family Caregiver</label>
            <select
              id="family-member-select"
              className="care-select"
              value={selectedPerson}
              onChange={handlePersonChange}
            >
              {family.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.relationship})
                </option>
              ))}
              <option value="Custom">Other Family Member</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="relationship-input">Relationship</label>
            <input
              id="relationship-input"
              type="text"
              className="care-input"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Daughter, Grandson"
            />
          </div>
        </div>

        {/* Enable / Disable Toggle */}
        <div className="familiar-voice-toggle-row">
          <label className="toggle-label" htmlFor="enable-voice-toggle">
            <input
              id="enable-voice-toggle"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Enable {selectedPerson}&apos;s familiar voice persona for Ramesh Ji</span>
          </label>
        </div>

        {/* Reference Voice Sample Registration */}
        <div className="voice-sample-box">
          <div className="voice-sample-header">
            <div>
              <strong>Caregiver Voice Reference Sample</strong>
              <small>Provide a 3-5 second sample (e.g., &ldquo;Hello beta, how are you today?&rdquo;) to extract voice characteristics.</small>
              {uploadedFileName && (
                <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '4px', fontWeight: 500 }}>
                  📄 Active Sample File: <b>{uploadedFileName}</b>
                </div>
              )}
            </div>
            {sampleUrl && <span className="sample-badge">Sample Registered ✓</span>}
          </div>

          <div className="voice-sample-actions">
            {!isRecording ? (
              <button
                type="button"
                className="care-action-btn record-btn"
                onClick={startRecording}
              >
                🔴 Record Reference Sample
              </button>
            ) : (
              <button
                type="button"
                className="care-action-btn stop-recording-btn"
                onClick={stopRecording}
              >
                ⏹ Stop Recording ({recordingSeconds}s)
              </button>
            )}

            <label className="care-action-btn upload-btn">
              📁 Upload Audio Clip
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>

            <button
              type="button"
              className="care-action-btn demo-sample-btn"
              onClick={handleLoadDemoPreset}
              title="Quickly set Anita (Daughter) profile"
            >
              ⚡ Use Anita Preset
            </button>
          </div>

          {/* Reference audio playback (ONLY to review the registered sample) */}
          {sampleUrl && (
            <div className="sample-playback-row">
              <button
                type="button"
                className="sample-play-btn"
                onClick={handleTogglePlayReference}
              >
                {isPlayingReference ? '⏸ Stop Reference Audio' : '▶ Review Original Recording'}
              </button>
              <button
                type="button"
                className="sample-delete-btn"
                onClick={handleDeleteSample}
              >
                🗑 Delete Sample
              </button>
              <small style={{ color: '#7a8e83', alignSelf: 'center', marginLeft: 'auto', fontSize: '11px' }}>
                Note: This original recording is never replayed for assistant commands.
              </small>
            </div>
          )}
        </div>

        {/* Dynamic TTS Testing Buttons (Testing NEW sentences) */}
        <div className="dynamic-test-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="eyebrow">Dynamic Voice Synthesis Test (New Sentences)</span>
            {isSynthesizing && (
              <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>
                ⏳ Synthesizing &amp; Playing: &ldquo;{activeTestText}&rdquo;...
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px' }}>
            Click any sentence below to verify that MindMate generates <b>new speech</b> rather than replaying the prompt:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              className="care-small-action"
              style={{ minHeight: '42px', padding: '0 14px', fontSize: '13px' }}
              disabled={isSynthesizing}
              onClick={() => handleTestDynamicSentence('It is time to take your medicine.')}
            >
              🔊 &ldquo;It is time to take your medicine.&rdquo;
            </button>
            <button
              type="button"
              className="care-small-action"
              style={{ minHeight: '42px', padding: '0 14px', fontSize: '13px' }}
              disabled={isSynthesizing}
              onClick={() => handleTestDynamicSentence('Would you like to play a memory game?')}
            >
              🔊 &ldquo;Would you like to play a memory game?&rdquo;
            </button>
            <button
              type="button"
              className="care-small-action"
              style={{ minHeight: '42px', padding: '0 14px', fontSize: '13px' }}
              disabled={isSynthesizing}
              onClick={() => handleTestDynamicSentence('I will help you find your glasses.')}
            >
              🔊 &ldquo;I will help you find your glasses.&rdquo;
            </button>
          </div>
        </div>

        {/* Save & Reset Actions */}
        <div className="familiar-voice-footer">
          <button
            type="button"
            className="save-voice-btn"
            onClick={handleSaveProfile}
          >
            💾 Save Familiar Voice Profile
          </button>

          {isSaved && (
            <button
              type="button"
              className="remove-voice-btn"
              onClick={handleRemoveProfile}
            >
              Reset to Default
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
