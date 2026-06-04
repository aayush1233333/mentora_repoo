import { useState, useRef, useCallback, useEffect } from "react";

/**
 * useVoiceInput – Web Speech API hook for the chatbot voice input.
 * Falls back gracefully when API is unavailable (Firefox, Safari iOS).
 */
export function useVoiceInput(onResult) {
  const [listening,  setListening]  = useState(false);
  const [supported,  setSupported]  = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang              = "en-US";
    rec.continuous        = false;
    rec.interimResults    = true;
    rec.maxAlternatives   = 1;

    rec.onstart  = () => setListening(true);
    rec.onend    = () => setListening(false);
    rec.onerror  = () => setListening(false);

    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(" ");
      setTranscript(text);

      if (e.results[e.results.length - 1].isFinal) {
        onResult?.(text);
        setTranscript("");
      }
    };

    recognitionRef.current = rec;
    setSupported(true);
  }, [onResult]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    setTranscript("");
    recognitionRef.current.start();
  }, [listening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    listening ? stop() : start();
  }, [listening, start, stop]);

  return { listening, supported, transcript, start, stop, toggle };
}

/**
 * speakText – Web Speech Synthesis helper for text-to-speech responses.
 */
export function speakText(text, { rate = 1.0, pitch = 1.0, lang = "en-US" } = {}) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter  = new SpeechSynthesisUtterance(text);
  utter.lang   = lang;
  utter.rate   = rate;
  utter.pitch  = pitch;
  // Pick a neutral voice if available
  const voices = window.speechSynthesis.getVoices();
  const pref   = voices.find(v => v.lang.startsWith("en") && v.localService);
  if (pref) utter.voice = pref;
  window.speechSynthesis.speak(utter);
}
