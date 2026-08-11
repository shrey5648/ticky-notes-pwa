'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { language = 'en-US', continuous = true, interimResults = true, onResult } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isListeningRequestedRef = useRef(false);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);
      } else {
        setIsSupported(false);
      }
    }
  }, []);

  const createAndStartRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let accumulatedText = '';
      let isLastFinal = false;

      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0].transcript;
        accumulatedText += (accumulatedText ? ' ' : '') + text;
        if (i === event.results.length - 1 && res.isFinal) {
          isLastFinal = true;
        }
      }

      const cleanText = accumulatedText.trim();
      if (cleanText) {
        setTranscript(cleanText);
        setInterimTranscript(cleanText);
        if (onResultRef.current) {
          onResultRef.current(cleanText, isLastFinal);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      const errType = event.error;

      if (errType === 'no-speech' || errType === 'aborted') {
        return;
      }
      if (errType === 'not-allowed' || errType === 'service-not-allowed') {
        setError('Microphone access blocked or restricted by browser settings.');
        isListeningRequestedRef.current = false;
        setIsListening(false);
      } else if (errType === 'network') {
        setError('Speech service network connection lost.');
      }
    };

    recognition.onend = () => {
      if (isListeningRequestedRef.current) {
        setTimeout(() => {
          if (isListeningRequestedRef.current) {
            createAndStartRecognition();
          }
        }, 150);
      } else {
        setIsListening(false);
        setInterimTranscript('');
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
    }
  }, [continuous, interimResults, language]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    isListeningRequestedRef.current = true;

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      } catch (micErr: any) {
        console.warn('Microphone stream error:', micErr);
        setError('Microphone permission blocked by browser settings.');
        isListeningRequestedRef.current = false;
        return;
      }
    }

    createAndStartRecognition();
  }, [createAndStartRecognition]);

  const stopListening = useCallback(() => {
    isListeningRequestedRef.current = false;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping speech recognition:', err);
      }
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      isListeningRequestedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
  };
}
