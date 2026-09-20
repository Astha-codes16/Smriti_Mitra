import { speak as browserFallbackSpeak, stopSpeaking as browserFallbackStopSpeaking } from './voiceService';
import { getStoredState, saveStoredState } from './storageService';
import { validateWavHeader } from '../utils/audioUtils';

/**
 * FAMILIAR VOICE ARCHITECTURE
 * 
 * Target Production Architecture:
 *   Caregiver Voice Sample -> Feature Extraction / Embedding -> Neural Voice Cloning Model (Kyutai PocketTTS ONNX INT8) -> Dynamic Speech Audio
 * 
 * Hybrid Engine Architecture:
 *   1. Primary: On-Device Neural Voice Cloning via PocketTTS ONNX INT8 Server (http://127.0.0.1:8000)
 *      - Zero-shot neural voice cloning from reference audio sample
 *      - Generates NEW dynamic arbitrary speech waveforms
 *      - 100% offline, CPU-optimized INT8 ONNX inference
 *   2. Resilient Fallback: Calibrated Browser SpeechSynthesis
 *      - If the local Python server is offline or unreachable, MindMate automatically
 *        falls back to persona-calibrated SpeechSynthesis (tuned pitch, cadence, and gender)
 *      - In ALL cases: MindMate NEVER simply replays the static recorded reference sample for commands.
 *      - Whenever the fallback is used, the system explicitly communicates:
 *        "Browser TTS fallback — NOT voice cloning"
 */

const VOICE_SERVER_URL = 'http://127.0.0.1:8000';

let activeAudioElement = null;
let referenceSampleUrl = null;
let referenceSampleBlob = null;
let lastServerHealth = { isOnline: false, checkedAt: 0, details: null };

// Speech status listeners for transparent UI reporting
const statusListeners = new Set();
let currentSpeechStatus = {
  isSpeaking: false,
  provider: 'idle', // 'neural' | 'fallback' | 'idle'
  isFallback: false,
  label: '',
  fallbackReason: '',
};

export function getSpeechStatus() {
  return currentSpeechStatus;
}

export function subscribeSpeechStatus(listener) {
  statusListeners.add(listener);
  listener(currentSpeechStatus);
  return () => statusListeners.delete(listener);
}

function updateSpeechStatus(updates) {
  currentSpeechStatus = { ...currentSpeechStatus, ...updates };
  statusListeners.forEach((fn) => {
    try {
      fn(currentSpeechStatus);
    } catch {}
  });
}

const DEFAULT_PROFILE = {
  id: 'voice-anita-1',
  name: 'Anita',
  relationship: 'Daughter',
  sampleAvailable: true,
  createdAt: new Date().toISOString(),
  enabled: true,
  provider: 'neural-pocket-tts-onnx',
  note: 'Family caregiver voice profile for Ramesh Ji',
};

/**
 * Checks connectivity to the local PocketTTS neural voice server.
 */
export async function checkServerHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${VOICE_SERVER_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      lastServerHealth = {
        isOnline: true,
        checkedAt: Date.now(),
        details: data,
      };
      return lastServerHealth;
    }
  } catch (err) {
    // Server is offline or not yet started
  }
  
  lastServerHealth = {
    isOnline: false,
    checkedAt: Date.now(),
    details: null,
  };
  return lastServerHealth;
}

export function getServerStatus() {
  return lastServerHealth;
}

/**
 * Retrieves the stored voice profile metadata from local storage.
 */
export function getVoiceProfile() {
  const state = getStoredState();
  return state.familiarVoiceProfile || null;
}

/**
 * Saves or updates familiar voice profile metadata.
 */
export function saveVoiceProfile(profile) {
  const state = getStoredState();
  const updatedProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
    provider: lastServerHealth.isOnline ? 'neural-pocket-tts-onnx' : 'browser-tts-fallback',
  };
  saveStoredState({
    ...state,
    familiarVoiceProfile: updatedProfile,
  });
  return updatedProfile;
}

/**
 * Removes the configured voice profile and cleans up sample memory.
 */
export function removeVoiceProfile() {
  const state = getStoredState();
  const nextState = { ...state };
  delete nextState.familiarVoiceProfile;
  saveStoredState(nextState);
  clearVoiceSample();
  return true;
}

/**
 * Checks if a familiar voice profile is configured and enabled.
 */
export function isConfigured() {
  const profile = getVoiceProfile();
  return Boolean(profile && profile.name && profile.enabled);
}

export function hasVoiceProfile() {
  return isConfigured();
}

export function isFamiliarVoiceActive() {
  return isConfigured();
}

/**
 * Returns the current engine provider status.
 */
export function getProviderStatus() {
  const profile = getVoiceProfile();
  const isOnline = lastServerHealth.isOnline;
  
  return {
    activeProvider: isOnline ? 'neural-pocket-tts-onnx' : 'browser-tts-fallback',
    providerName: isOnline 
      ? 'Neural Voice Cloning Engine (PocketTTS ONNX INT8)' 
      : 'Browser SpeechSynthesis (Calibrated Fallback)',
    isTrueCloning: isOnline,
    hasReferenceSample: Boolean(referenceSampleUrl || referenceSampleBlob),
    profile: profile || null,
    serverDetails: lastServerHealth.details,
    productionTarget: 'On-device PocketTTS ONNX Neural Engine (CPU Quantized)',
  };
}

/**
 * Store the caregiver's reference audio sample in memory.
 */
export function setVoiceSample(blobOrUrl) {
  if (referenceSampleUrl && referenceSampleUrl.startsWith('blob:')) {
    URL.revokeObjectURL(referenceSampleUrl);
  }

  if (typeof blobOrUrl === 'string') {
    referenceSampleUrl = blobOrUrl;
    referenceSampleBlob = null;
  } else if (blobOrUrl instanceof Blob) {
    referenceSampleBlob = blobOrUrl;
    referenceSampleUrl = URL.createObjectURL(blobOrUrl);
    // Asynchronously register with neural voice server if running
    registerSampleWithServer(blobOrUrl).catch(() => {});
  }
  return referenceSampleUrl;
}

export function setAudioSample(blobOrUrl) {
  return setVoiceSample(blobOrUrl);
}

export function getVoiceSampleUrl() {
  return referenceSampleUrl;
}

export function getVoiceSampleBlob() {
  return referenceSampleBlob;
}

export function getAudioSampleUrl() {
  return referenceSampleUrl;
}

export function clearVoiceSample() {
  if (referenceSampleUrl && referenceSampleUrl.startsWith('blob:')) {
    URL.revokeObjectURL(referenceSampleUrl);
  }
  referenceSampleUrl = null;
  referenceSampleBlob = null;
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement = null;
  }
}

export function clearAudioSample() {
  clearVoiceSample();
}

/**
 * Asynchronously register the audio sample with the local neural voice server.
 * Pre-validates the WAV format to ensure server compatibility.
 */
export async function registerSampleWithServer(blob, filename = 'caregiver_sample.wav') {
  // Fix 2: Verify the reference audio is genuine WAV before sending
  const validation = await validateWavHeader(blob);
  if (!validation.valid) {
    console.error('[FamiliarVoice] Pre-flight reference audio validation failed:', validation.error);
    return { success: false, error: validation.error };
  }

  console.log('[FamiliarVoice] Registering verified WAV reference sample with neural engine:', {
    filename,
    sizeBytes: blob.size,
    format: 'RIFF PCM',
    sampleRate: validation.details?.sampleRate,
    channels: validation.details?.numChannels,
  });

  try {
    const formData = new FormData();
    formData.append('reference_audio', blob, filename);
    const res = await fetch(`${VOICE_SERVER_URL}/register-reference`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      console.log('[FamiliarVoice] Neural voice server registered reference successfully:', {
        httpStatus: res.status,
        filename: data.filename,
        extractionTime: data.extraction_time_seconds,
      });
      return { success: true, data };
    } else {
      const errorText = await res.text().catch(() => '');
      console.error('[FamiliarVoice] Neural server reference registration rejected:', {
        httpStatus: res.status,
        error: errorText,
      });
      return { success: false, error: `Server returned ${res.status}: ${errorText}` };
    }
  } catch (e) {
    console.warn('[FamiliarVoice] Could not sync reference sample to server:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * ONLY plays the caregiver's raw reference sample when explicitly requested
 * in settings (e.g. "Listen to my recording").
 * This is NEVER called for assistant commands.
 */
export function playReferenceSample(onEnd) {
  stopSpeaking();
  if (!referenceSampleUrl) return false;

  try {
    const audio = new Audio(referenceSampleUrl);
    activeAudioElement = audio;
    audio.onended = () => {
      activeAudioElement = null;
      onEnd?.();
    };
    audio.onerror = () => {
      activeAudioElement = null;
      onEnd?.();
    };
    audio.play().catch(() => onEnd?.());
    return true;
  } catch {
    return false;
  }
}

/**
 * Stops any speech currently in progress (both neural audio and fallback TTS).
 */
export function stopSpeaking() {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
  browserFallbackStopSpeaking();
  updateSpeechStatus({ isSpeaking: false, provider: 'idle', isFallback: false, label: '' });
}

/**
 * Synthesizes dynamic arbitrary text using the local PocketTTS neural voice cloning backend.
 */
async function generateNeuralVoice(text) {
  console.log(`[FamiliarVoice] Starting neural voice synthesis request for: "${text}"`, {
    textLength: text.length,
    hasSessionReference: Boolean(referenceSampleBlob),
    referenceBytes: referenceSampleBlob?.size,
  });

  const formData = new FormData();
  formData.append('text', text);
  
  if (referenceSampleBlob) {
    // Validate WAV format before transmission
    const validation = await validateWavHeader(referenceSampleBlob);
    if (!validation.valid) {
      console.error('[FamiliarVoice] Reference audio failed WAV pre-flight check:', validation.error);
      throw new Error(`Invalid reference audio: ${validation.error}`);
    }
    formData.append('reference_audio', referenceSampleBlob, 'caregiver_sample.wav');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout for CPU neural generation

  const response = await fetch(`${VOICE_SERVER_URL}/generate-voice`, {
    method: 'POST',
    body: formData,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  const modelHeader = response.headers.get('X-Model-Name');
  const genTimeHeader = response.headers.get('X-Generation-Time');
  const durationHeader = response.headers.get('X-Audio-Duration');

  console.log('[FamiliarVoice] Neural voice server HTTP response received:', {
    status: response.status,
    statusText: response.statusText,
    modelName: modelHeader || 'unknown',
    generationTimeSeconds: genTimeHeader || 'unknown',
    audioDurationSeconds: durationHeader || 'unknown',
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.error('[FamiliarVoice] Neural generation HTTP error:', {
      status: response.status,
      body: errorBody,
    });
    throw new Error(`Voice server error (${response.status}): ${errorBody || response.statusText}`);
  }

  const audioBlob = await response.blob();
  console.log('[FamiliarVoice] Neural synthesis audio received successfully:', {
    blobSize: audioBlob.size,
    type: audioBlob.type,
    model: modelHeader,
  });

  return {
    audioBlob,
    modelName: modelHeader,
    genTime: genTimeHeader,
    duration: durationHeader,
  };
}

/**
 * CORE TTS GENERATION METHOD
 * 
 * Takes arbitrary NEW text generated by the assistant and speaks THAT text.
 * NEVER replays the recorded sample.
 * 
 * Flow:
 * 1. Tries local PocketTTS ONNX neural voice server first.
 * 2. If successful, plays returned generated WAV audio in caregiver voice.
 *    UI Status: "Caregiver Voice Active"
 * 3. If server is unreachable or fails, transparently falls back to calibrated browser SpeechSynthesis.
 *    UI Status: "Browser TTS fallback — NOT voice cloning"
 * 
 * @param {string} text - The dynamic text to be spoken (e.g. "It is time to take your medicine.")
 * @param {object} options - Callbacks like onEnd
 */
export async function generateSpeech(text, options = {}) {
  stopSpeaking();

  if (!text || typeof text !== 'string') return false;

  const profile = getVoiceProfile();
  const isEnabled = profile?.enabled ?? false;

  // If familiar voice is disabled, use standard default voice
  if (!isEnabled || !profile) {
    updateSpeechStatus({
      isSpeaking: true,
      provider: 'standard',
      isFallback: false,
      label: 'Standard Voice',
    });
    return browserFallbackSpeak(text);
  }

  // Attempt Neural Voice Cloning via PocketTTS ONNX
  try {
    updateSpeechStatus({
      isSpeaking: true,
      provider: 'neural',
      isFallback: false,
      label: 'Synthesizing with Caregiver Voice...',
      fallbackReason: '',
    });

    const { audioBlob } = await generateNeuralVoice(text);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    activeAudioElement = audio;

    // Neural synthesis succeeded! Set honest active status
    updateSpeechStatus({
      isSpeaking: true,
      provider: 'neural',
      isFallback: false,
      label: 'Caregiver Voice Active',
      fallbackReason: '',
    });

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      activeAudioElement = null;
      updateSpeechStatus({
        isSpeaking: false,
        provider: 'idle',
        isFallback: false,
        label: '',
        fallbackReason: '',
      });
      options.onEnd?.();
    };

    audio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl);
      activeAudioElement = null;
      console.warn('[FamiliarVoice] Audio playback failed. Activating fallback.', e);
      speakCalibratedFallback(text, profile, 'Audio element playback failed', options.onEnd);
    };

    await audio.play();
    return true;
  } catch (err) {
    console.warn('[FamiliarVoice] Neural voice synthesis failed. Activating fallback.', {
      error: err.message,
      reason: 'Server unreachable or processing error',
    });
    return speakCalibratedFallback(text, profile, err.message, options.onEnd);
  }
}

export function speakWithFamiliarVoice(text, options = {}) {
  return generateSpeech(text, options);
}

export function speak(text, options = {}) {
  return generateSpeech(text, options);
}

/**
 * Fallback synthesizer that generates speech for the EXACT text passed in,
 * calibrating pitch and rate according to the familiar voice profile.
 * 
 * IMPORTANT: Fix 3 & Fix 4 - Clearly identifies itself as browser fallback.
 */
function speakCalibratedFallback(text, profile, reason = '', onEnd) {
  if (!('speechSynthesis' in window)) return false;

  console.warn('[FamiliarVoice] Fallback activated:', {
    provider: 'Browser SpeechSynthesis',
    isVoiceCloning: false,
    reason: reason || 'Neural synthesis unavailable',
    text,
  });

  // Explicitly inform UI that this is fallback TTS and NOT voice cloning
  updateSpeechStatus({
    isSpeaking: true,
    provider: 'fallback',
    isFallback: true,
    label: 'Browser TTS fallback — NOT voice cloning',
    fallbackReason: reason || 'Neural voice server unavailable',
  });

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  const name = (profile?.name || '').toLowerCase();
  const relationship = (profile?.relationship || '').toLowerCase();
  const isFemale = name.includes('anita') || name.includes('sita') || relationship.includes('daughter') || relationship.includes('wife');

  // Calibrate speech rate and pitch to match the familiar persona
  utterance.rate = 0.82; // Gentle, comforting cadence for elderly comprehension
  utterance.pitch = isFemale ? 1.22 : 0.92;

  // Select the closest matching system voice
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const matchingVoice = voices.find((v) => {
      const vName = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      if (!lang.startsWith('en')) return false;
      if (isFemale) {
        return vName.includes('female') || vName.includes('zira') || vName.includes('samantha') || vName.includes('natural') || vName.includes('google');
      }
      return vName.includes('male') || vName.includes('david') || vName.includes('george');
    }) || voices.find((v) => v.lang.toLowerCase().startsWith('en'));

    if (matchingVoice) utterance.voice = matchingVoice;
  }

  const handleEnd = () => {
    updateSpeechStatus({
      isSpeaking: false,
      provider: 'idle',
      isFallback: false,
      label: '',
      fallbackReason: '',
    });
    onEnd?.();
  };

  utterance.onend = handleEnd;
  utterance.onerror = handleEnd;

  window.speechSynthesis.speak(utterance);
  return true;
}

/**
 * Tests dynamic speech generation with a given test message.
 * Generates NEW speech for the test phrase (does NOT replay the sample).
 */
export function testFamiliarVoice(customText) {
  const profile = getVoiceProfile();
  const personName = profile?.name || 'Anita';
  const testText = customText || `Hello Ramesh Ji! It is ${personName}. It is time to take your medicine.`;
  return generateSpeech(testText);
}

export { DEFAULT_PROFILE };
