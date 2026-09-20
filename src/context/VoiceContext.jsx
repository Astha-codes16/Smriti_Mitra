import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createRecognition, isSpeechRecognitionSupported } from '../services/voiceService';
import {
  speakWithFamiliarVoice,
  stopSpeaking as stopFamiliarSpeaking,
  getVoiceProfile,
  isFamiliarVoiceActive,
  subscribeSpeechStatus,
  getSpeechStatus,
} from '../services/familiarVoiceService';
import { processVoiceCommand } from '../utils/voiceCommandProcessor';
import { getStoredState, saveStoredState } from '../services/storageService';

const VoiceContext = createContext(null);

export function VoiceProvider({ children, onCommand }) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState('');
  const [speechStatus, setSpeechStatus] = useState(() => getSpeechStatus());
  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const pendingResponseRef = useRef('');
  const commandHandlerRef = useRef(onCommand);
  const processCommandRef = useRef(null);

  useEffect(() => {
    return subscribeSpeechStatus((status) => {
      setSpeechStatus(status);
    });
  }, []);

  commandHandlerRef.current = onCommand;

  function processCommand(command) {
    console.log('SENDING TO COMMAND PROCESSOR:', command);
    setRecognizedText(command);
    setInterimText('');
    setIsProcessing(true);
    const result = processVoiceCommand(command);
    const storedState = getStoredState();
    const voiceHistory = storedState.voiceHistory || [];
    saveStoredState({
      ...storedState,
      voiceHistory: [...voiceHistory, {
        timestamp: new Date().toISOString(),
        command,
        intent: result.intent,
        success: result.intent !== 'UNKNOWN',
      }].slice(-100),
    });
    if (result.intent === 'STOP') {
      stopFamiliarSpeaking();
      pendingResponseRef.current = '';
      setResponseText('');
      setIsProcessing(false);
      return result;
    }
    const commandResponse = commandHandlerRef.current?.(result);
    const response = commandResponse || result.response;
    setResponseText(response);
    pendingResponseRef.current = response;
    setIsProcessing(false);
    return result;
  }

  processCommandRef.current = processCommand;

  useEffect(() => {
    if (!isSpeechRecognitionSupported()) return undefined;

    recognitionRef.current = createRecognition({
      onStart: () => {
        listeningRef.current = true;
        setIsListening(true);
        setError('');
      },
      onEnd: () => {
        listeningRef.current = false;
        setIsListening(false);
        setInterimText('');
        const response = pendingResponseRef.current;
        pendingResponseRef.current = '';
        if (response) speakWithFamiliarVoice(response);
      },
      onInterim: (text) => setInterimText(text),
      onResult: (text) => processCommandRef.current?.(text),
      onError: (event) => {
        listeningRef.current = false;
        setIsListening(false);
        setInterimText('');
        setError(event.error === 'not-allowed' ? 'Microphone access is needed to hear you.' : event.error === 'no-speech' ? "I couldn't hear you clearly. The microphone is ready to try again." : 'I could not hear that clearly. Please try again.');
      },
    });

    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function startListening() {
    if (listeningRef.current) return;
    setError('');
    if (!isSpeechRecognitionSupported()) {
      setError('Voice recognition is not supported in this browser.');
      return;
    }
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (startError) {
      console.log('❌ APP VOICE ERROR:', startError.name);
      setError('The microphone is getting ready. Please try again.');
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    listeningRef.current = false;
    setIsListening(false);
  }

  const familiarProfile = getVoiceProfile();
  const isFamiliarActive = isFamiliarVoiceActive();

  return (
    <VoiceContext.Provider
      value={{
        isListening,
        isProcessing,
        recognizedText,
        interimText,
        responseText,
        error,
        startListening,
        stopListening,
        processCommand,
        speak: speakWithFamiliarVoice,
        stopSpeaking: stopFamiliarSpeaking,
        familiarProfile,
        isFamiliarActive,
        speechStatus,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoice must be used inside VoiceProvider');
  return context;
}