import { speak as browserFallbackSpeak, stopSpeaking as browserFallbackStopSpeaking } from './voiceService';
import { getStoredState, saveStoredState } from './storageService';

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
 */

const VOICE_SERVER_URL = 'http://127.0.0.1:8000';

let activeAudioElement = null;
let referenceSampleUrl = null;
let referenceSampleBlob = null;
let lastServerHealth = { isOnline: false, checkedAt: 0, details: null };

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
 */
export async function registerSampleWithServer(blob, filename = 'caregiver_sample.wav') {
  try {
    const formData = new FormData();
    formData.append('reference_audio', blob, filename);
    const res = await fetch(`${VOICE_SERVER_URL}/register-reference`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      console.log('[FamiliarVoice] Registered reference sample with neural voice server:', data);
      return { success: true, data };
    }
  } catch (e) {
    console.warn('[FamiliarVoice] Could not sync reference sample to server:', e);
  }
  return { success: false };
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
}

/**
 * Synthesizes dynamic arbitrary text using the local PocketTTS neural voice cloning backend.
 */
async function generateNeuralVoice(text) {
  const formData = new FormData();
  formData.append('text', text);
  
  if (referenceSampleBlob) {
    formData.append('reference_audio', referenceSampleBlob, 'caregiver_sample.wav');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for CPU neural generation

  const response = await fetch(`${VOICE_SERVER_URL}/generate-voice`, {
    method: 'POST',
    body: formData,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Voice server error: ${response.status} ${response.statusText}`);
  }

  const audioBlob = await response.blob();
  return audioBlob;
}

/**
 * CORE TTS GENERATION METHOD
 * 
 * Takes arbitrary NEW text generated by the assistant and speaks THAT text.
 * NEVER replays the recorded sample.
 * 
 * Flow:
 * 1. Tries local PocketTTS ONNX neural voice server first.
 * 2. Plays returned generated WAV audio in caregiver voice.
 * 3. If server is unreachable or fails, transparently falls back to calibrated browser SpeechSynthesis.
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
    return browserFallbackSpeak(text);
  }

  // Attempt Neural Voice Cloning via PocketTTS ONNX
  try {
    console.log(`[FamiliarVoice] Requesting neural speech synthesis for: "${text}"`);
    const audioBlob = await generateNeuralVoice(text);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    activeAudioElement = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      activeAudioElement = null;
      options.onEnd?.();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      activeAudioElement = null;
      console.warn('[FamiliarVoice] Audio playback failed, falling back to browser TTS');
      speakCalibratedFallback(text, profile, options.onEnd);
    };

    await audio.play();
    return true;
  } catch (err) {
    console.info('[FamiliarVoice] Neural voice server offline or unreachable. Using calibrated browser SpeechSynthesis fallback.', err.message);
    return speakCalibratedFallback(text, profile, options.onEnd);
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
 */
function speakCalibratedFallback(text, profile, onEnd) {
  if (!('speechSynthesis' in window)) return false;

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

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

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
