/**
 * useTTS.ts
 * Guaranteed Indian language audio via Google Translate TTS proxy.
 *
 * Strategy:
 *   1. Call /api/tts?text=...&lang=hi  (Google TTS proxy — works on all devices)
 *   2. Play returned MP3 audio via HTMLAudioElement
 *   3. Fallback to Web Speech API if proxy fails
 *
 * Bug fixes:
 *   - Fixed stale closure in setTimeout fallback (was always reading isLoading=false)
 *   - Use isLoadingRef (useRef) to reliably track loading state inside callbacks
 *   - Improved error handling for long-text TTS URLs
 */

import { useState, useCallback, useEffect, useRef } from 'react';

const LANG_BCP47: Record<string, string> = {
  en: 'en-US', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN',
  te: 'te-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN',
  ml: 'ml-IN', pa: 'pa-IN', or: 'or-IN', ur: 'ur-IN',
};

interface UseTTSReturn {
  isSpeaking: boolean;
  isLoadingBhashini: boolean; // kept for prop compatibility
  speak: (text: string, lang?: string) => void;
  stop: () => void;
  supported: boolean;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [isPaused,    setIsPaused]    = useState(false);
  // Ref mirrors isLoading state — readable inside stale closures (setTimeout, event handlers)
  const isLoadingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTextRef = useRef<string>('');
  const currentLangRef = useRef<string>('en');
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const setLoadingState = (val: boolean) => {
    isLoadingRef.current = val;
    setIsLoading(val);
  };

  // Full stop with reset — used when starting new text or cleaning up
  const fullStop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (supported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setLoadingState(false);
  }, [supported]);

  // Pause current playback (preserve position for resume)
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (supported) window.speechSynthesis.pause?.();
    setIsSpeaking(false);
    setIsPaused(true);
  }, [supported]);

  // Resume from pause
  const resume = useCallback(() => {
    if (audioRef.current && isPaused) {
      audioRef.current.play().catch(() => {
        setIsSpeaking(false);
        speakWebSpeechFallback(currentTextRef.current, currentLangRef.current, setIsSpeaking);
      });
      setIsSpeaking(true);
      setIsPaused(false);
    } else if (supported && isPaused) {
      window.speechSynthesis.resume?.();
      setIsSpeaking(true);
      setIsPaused(false);
    }
  }, [supported, isPaused]);

  // Exposed stop function - toggles between pause/resume
  const stop = useCallback(() => {
    if (isSpeaking) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      fullStop();
    }
  }, [isSpeaking, isPaused, pause, resume, fullStop]);

  const speak = useCallback((text: string, lang = 'en') => {
    // If same text is paused, just resume
    if (isPaused && text === currentTextRef.current && lang === currentLangRef.current) {
      resume();
      return;
    }

    // Different text - do full stop first
    fullStop();
    currentTextRef.current = text;
    currentLangRef.current = lang;

    // For English use Web Speech directly (faster, no proxy needed)
    if (lang === 'en') {
      speakWebSpeech(text, 'en-US', setIsSpeaking);
      return;
    }

    // For all Indian languages — use Google TTS proxy
    setLoadingState(true);

    // Truncate text to avoid excessively long URLs (proxy handles chunking internally)
    const safeText = text.length > 500 ? text.slice(0, 500) : text;
    const params = new URLSearchParams({ text: safeText, lang });
    const audioUrl = `/api/tts?${params.toString()}`;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Fallback to Web Speech if proxy hasn't responded in 8 seconds.
    // FIX: use isLoadingRef.current (not stale isLoading state) inside the closure.
    timeoutRef.current = setTimeout(() => {
      if (isLoadingRef.current) {
        fullStop();
        speakWebSpeechFallback(text, lang, setIsSpeaking);
      }
    }, 8000);

    audio.oncanplaythrough = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoadingState(false);
      setIsSpeaking(true);
      setIsPaused(false);
      audio.play().catch(() => {
        setIsSpeaking(false);
        speakWebSpeechFallback(text, lang, setIsSpeaking);
      });
    };

    audio.onended = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    audio.onerror = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoadingState(false);
      setIsSpeaking(false);
      speakWebSpeechFallback(text, lang, setIsSpeaking);
    };

    audio.load();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullStop, isPaused, resume]);

  useEffect(() => () => { fullStop(); }, [fullStop]);

  return {
    isSpeaking,
    isLoadingBhashini: isLoading, // alias for ResultsScreen prop
    speak,
    stop,
    supported,
  };
}

// Web Speech with Indian language voice
function speakWebSpeechFallback(
  text: string,
  lang: string,
  setIsSpeaking: (v: boolean) => void,
) {
  if (!window.speechSynthesis) return;
  const bcp47  = LANG_BCP47[lang] || 'en-US';
  const voices = window.speechSynthesis.getVoices();
  const voice  = voices.find(v => v.lang === bcp47)
              || voices.find(v => v.lang.startsWith(bcp47.slice(0, 2)))
              || null;
  speakWebSpeech(text, bcp47, setIsSpeaking, voice || undefined);
}

function speakWebSpeech(
  text: string,
  bcp47: string,
  setIsSpeaking: (v: boolean) => void,
  voice?: SpeechSynthesisVoice,
) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u    = new SpeechSynthesisUtterance(text);
  u.lang     = bcp47;
  u.rate     = 0.82;
  u.pitch    = 1.0;
  u.volume   = 1;
  if (voice) u.voice = voice;
  u.onstart  = () => setIsSpeaking(true);
  u.onend    = () => setIsSpeaking(false);
  u.onerror  = () => setIsSpeaking(false);
  window.speechSynthesis.speak(u);
}
