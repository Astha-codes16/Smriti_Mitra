/**
 * Audio Conversion and Validation Utility
 * Converts any browser-recorded audio (WebM, OGG, MP4, etc.) to genuine
 * 16-bit linear PCM mono RIFF WAV at 24,000 Hz for PocketTTS neural synthesis.
 */

function writeAsciiString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Validates whether a given ArrayBuffer or Blob contains a valid RIFF/WAVE header
 * with 16-bit linear PCM data.
 * 
 * @param {Blob|ArrayBuffer} blobOrBuffer
 * @returns {Promise<{ valid: boolean, error?: string, details?: object }>}
 */
export async function validateWavHeader(blobOrBuffer) {
  try {
    let arrayBuffer;
    if (blobOrBuffer instanceof Blob) {
      if (blobOrBuffer.size < 44) {
        return { valid: false, error: 'Audio file is too small to contain a valid WAV header.' };
      }
      arrayBuffer = await blobOrBuffer.slice(0, 80).arrayBuffer();
    } else if (blobOrBuffer instanceof ArrayBuffer) {
      if (blobOrBuffer.byteLength < 44) {
        return { valid: false, error: 'Audio buffer is too small to contain a valid WAV header.' };
      }
      arrayBuffer = blobOrBuffer.slice(0, 80);
    } else {
      return { valid: false, error: 'Invalid input: expected Blob or ArrayBuffer.' };
    }

    const view = new DataView(arrayBuffer);

    // 1. Check 'RIFF' chunk descriptor (bytes 0-3)
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (riff !== 'RIFF') {
      return { valid: false, error: `Invalid WAV file: missing 'RIFF' header (found '${riff}').` };
    }

    // 2. Check 'WAVE' format (bytes 8-11)
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    if (wave !== 'WAVE') {
      return { valid: false, error: `Invalid WAV file: missing 'WAVE' format identifier (found '${wave}').` };
    }

    // 3. Search for 'fmt ' subchunk
    let offset = 12;
    let foundFmt = false;
    let audioFormat = 0;
    let numChannels = 0;
    let sampleRate = 0;
    let bitsPerSample = 0;

    while (offset + 8 <= view.byteLength) {
      const subchunkId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      const subchunkSize = view.getUint32(offset + 4, true);

      if (subchunkId === 'fmt ') {
        foundFmt = true;
        audioFormat = view.getUint16(offset + 8, true);
        numChannels = view.getUint16(offset + 10, true);
        sampleRate = view.getUint32(offset + 12, true);
        bitsPerSample = view.getUint16(offset + 22, true);
        break;
      }
      offset += 8 + subchunkSize;
    }

    if (!foundFmt) {
      return { valid: false, error: "Invalid WAV file: missing 'fmt ' subchunk." };
    }

    if (audioFormat !== 1) {
      return {
        valid: false,
        error: `Unsupported WAV compression format (${audioFormat}). Expected uncompressed PCM (format 1).`,
      };
    }

    return {
      valid: true,
      details: {
        audioFormat,
        numChannels,
        sampleRate,
        bitsPerSample,
        isMono: numChannels === 1,
        is24kHz: sampleRate === 24000,
      },
    };
  } catch (err) {
    return { valid: false, error: `WAV validation error: ${err.message}` };
  }
}

/**
 * Converts any browser audio Blob (e.g. MediaRecorder WebM/Opus, MP3, etc.)
 * into a genuine 16-bit linear PCM mono RIFF WAV Blob resampled to targetSampleRate (default 24,000 Hz).
 * 
 * @param {Blob} audioBlob - Input recording blob
 * @param {number} targetSampleRate - Desired sample rate (default: 24000 Hz for PocketTTS)
 * @returns {Promise<{ blob: Blob, duration: number, sampleRate: number }>}
 */
export async function convertAudioBlobToWav(audioBlob, targetSampleRate = 24000) {
  if (!audioBlob || !(audioBlob instanceof Blob)) {
    throw new Error('convertAudioBlobToWav requires a valid Blob.');
  }

  const arrayBuffer = await audioBlob.arrayBuffer();

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API (AudioContext) is not supported in this browser.');
  }

  const audioCtx = new AudioContextClass();
  let decodedBuffer;
  try {
    decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    if (audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  }

  const duration = decodedBuffer.duration;
  const numTargetSamples = Math.max(1, Math.ceil(duration * targetSampleRate));

  // Resample and downmix to 1 channel (mono) using OfflineAudioContext
  const OfflineAudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineAudioContextClass) {
    throw new Error('OfflineAudioContext is not supported in this browser.');
  }

  const offlineCtx = new OfflineAudioContextClass(1, numTargetSamples, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = decodedBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const resampledBuffer = await offlineCtx.startRendering();
  const channelData = resampledBuffer.getChannelData(0);

  // Encode Float32 PCM to 16-bit signed integer linear PCM WAV
  const dataByteLength = channelData.length * 2;
  const wavBuffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(wavBuffer);

  // 1. "RIFF" chunk
  writeAsciiString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true); // ChunkSize
  writeAsciiString(view, 8, 'WAVE');

  // 2. "fmt " subchunk
  writeAsciiString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);             // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);              // AudioFormat (1 = Linear PCM)
  view.setUint16(22, 1, true);              // NumChannels (1 = Mono)
  view.setUint32(24, targetSampleRate, true);// SampleRate (24000 Hz)
  view.setUint32(28, targetSampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample / 8)
  view.setUint16(32, 2, true);              // BlockAlign (NumChannels * BitsPerSample / 8)
  view.setUint16(34, 16, true);             // BitsPerSample (16 bits)

  // 3. "data" subchunk
  writeAsciiString(view, 36, 'data');
  view.setUint32(40, dataByteLength, true); // Subchunk2Size

  // 4. PCM Samples
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    const int16 = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7FFF);
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

  // Post-conversion integrity self-test
  const check = await validateWavHeader(wavBlob);
  if (!check.valid) {
    throw new Error(`WAV encoding failed verification: ${check.error}`);
  }

  return {
    blob: wavBlob,
    duration,
    sampleRate: targetSampleRate,
    channels: 1,
    bitsPerSample: 16,
    byteSize: wavBlob.size,
  };
}
