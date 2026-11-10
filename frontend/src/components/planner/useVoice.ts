import { useCallback, useEffect, useRef, useState } from 'react';
import { campusAPI } from '../../services/api';
import { LangCode } from '../../i18n/translations';

const BCP47: Record<LangCode, string> = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN' };
const MAX_MS = 15000;

type Engine = 'browser' | 'whisper' | 'none';
export type VoiceState = 'idle' | 'listening' | 'transcribing';

const getRecognitionCtor = (): any =>
  typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;

const canRecord = () =>
  typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof (window as any).MediaRecorder !== 'undefined';

/**
 * Voice input for the planner.
 * 1) Browser speech recognition (Chrome/Edge/Safari) — instant, free, no key.
 * 2) Fallback: record a short clip and transcribe on our server with Groq Whisper (same Groq key).
 */
export function useVoiceInput(lang: LangCode, onFinal: (text: string) => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const [engine, setEngine] = useState<Engine>(() => (getRecognitionCtor() ? 'browser' : canRecord() ? 'whisper' : 'none'));
  const recRef = useRef<any>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const finalRef = useRef('');
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const clearTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const startWhisper = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => (window as any).MediaRecorder.isTypeSupported?.(t)) || '';
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearTimer();
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 1500) {
          setState('idle');
          setError('I didn’t catch that — hold the mic a bit longer.');
          return;
        }
        setState('transcribing');
        try {
          const { text } = await campusAPI.transcribe(blob, lang);
          setState('idle');
          if (text) onFinalRef.current(text);
          else setError('I couldn’t hear any words. Please try again.');
        } catch (e: any) {
          setState('idle');
          setError(e.message || 'Transcription failed');
        }
      };
      mediaRef.current = rec;
      rec.start();
      setState('listening');
      timerRef.current = window.setTimeout(() => rec.state === 'recording' && rec.stop(), MAX_MS);
    } catch (e: any) {
      setState('idle');
      setError(e?.name === 'NotAllowedError' ? 'Microphone permission was blocked. Allow it in the browser address bar.' : 'Could not access the microphone.');
    }
  }, [lang]);

  const startBrowser = useCallback(() => {
    const Ctor = getRecognitionCtor();
    const rec = new Ctor();
    rec.lang = BCP47[lang];
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    finalRef.current = '';
    rec.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setInterim(text);
      if (e.results[e.results.length - 1].isFinal) finalRef.current = text;
    };
    rec.onerror = (e: any) => {
      clearTimer();
      if (e.error === 'network' || e.error === 'service-not-allowed' || e.error === 'language-not-supported') {
        // Browser speech service unavailable (e.g. Brave, offline) → switch to Whisper
        if (canRecord()) {
          setEngine('whisper');
          setError('Switched to cloud voice recognition — tap the mic again.');
        } else setError('Voice recognition is not available in this browser.');
      } else if (e.error === 'not-allowed') setError('Microphone permission was blocked. Allow it in the browser address bar.');
      else if (e.error !== 'aborted' && e.error !== 'no-speech') setError(`Voice error: ${e.error}`);
      setState('idle');
    };
    rec.onend = () => {
      clearTimer();
      setState('idle');
      const text = (finalRef.current || '').trim();
      setInterim('');
      if (text) onFinalRef.current(text);
    };
    recRef.current = rec;
    rec.start();
    setState('listening');
    timerRef.current = window.setTimeout(() => rec.stop(), MAX_MS);
  }, [lang]);

  const start = useCallback(() => {
    setError('');
    setInterim('');
    if (engine === 'browser') startBrowser();
    else if (engine === 'whisper') startWhisper();
    else setError('Voice input is not supported in this browser.');
  }, [engine, startBrowser, startWhisper]);

  const stop = useCallback(() => {
    clearTimer();
    if (recRef.current && state === 'listening' && engine === 'browser') recRef.current.stop();
    if (mediaRef.current && mediaRef.current.state === 'recording') mediaRef.current.stop();
  }, [state, engine]);

  useEffect(() => () => {
    clearTimer();
    try { recRef.current?.abort(); } catch (_) {}
    try { if (mediaRef.current?.state === 'recording') mediaRef.current.stop(); } catch (_) {}
  }, []);

  return { state, interim, error, engine, supported: engine !== 'none', start, stop };
}

/** Read text aloud with the browser's built-in voices (free, offline-capable). */
export function speak(text: string, lang: LangCode) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = BCP47[lang];
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => v.lang === BCP47[lang]) || voices.find((v) => v.lang.toLowerCase().startsWith(lang));
  if (voice) u.voice = voice;
  u.rate = 1;
  u.pitch = 1.1;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
