"use client";

import { useEffect, useState } from "react";

type ActiveSpeech = {
  questionId: string;
  utterance: SpeechSynthesisUtterance;
  onError?: (message: string) => void;
};

let activeSpeech: ActiveSpeech | null = null;
let scheduledCancel: number | null = null;

export function speakQuestion(questionId: string, text: string, onError?: (message: string) => void) {
  if (scheduledCancel !== null) {
    window.clearTimeout(scheduledCancel);
    scheduledCancel = null;
  }
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    onError?.("A leitura por voz não está disponível neste navegador.");
    return false;
  }
  if (activeSpeech?.questionId === questionId) {
    activeSpeech.onError = onError;
    return true;
  }

  if (activeSpeech) {
    activeSpeech.utterance.onend = null;
    activeSpeech.utterance.onerror = null;
  }
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((item) => item.lang.toLowerCase() === "pt-br")
    ?? voices.find((item) => item.lang.toLowerCase().startsWith("pt"));
  if (voice) utterance.voice = voice;

  const speech: ActiveSpeech = { questionId, utterance, onError };
  activeSpeech = speech;
  utterance.onend = () => {
    if (activeSpeech === speech) activeSpeech = null;
  };
  utterance.onerror = (event) => {
    if (activeSpeech !== speech) return;
    activeSpeech = null;
    if (event.error !== "canceled" && event.error !== "interrupted") {
      speech.onError?.("Não foi possível reproduzir a pergunta neste dispositivo.");
    }
  };
  window.speechSynthesis.speak(utterance);
  return true;
}

function cancelQuestionSpeech(questionId: string) {
  if (activeSpeech?.questionId !== questionId) return;
  activeSpeech.utterance.onend = null;
  activeSpeech.utterance.onerror = null;
  activeSpeech = null;
  window.speechSynthesis.cancel();
}

function scheduleCancelQuestionSpeech(questionId: string) {
  if (scheduledCancel !== null) window.clearTimeout(scheduledCancel);
  scheduledCancel = window.setTimeout(() => {
    scheduledCancel = null;
    cancelQuestionSpeech(questionId);
  }, 0);
}

export function QuestionSpeech({ questionId, text }: { questionId: string; text: string }) {
  const [message, setMessage] = useState<{ questionId: string; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    speakQuestion(questionId, text, (messageText) => {
      if (active) setMessage({ questionId, text: messageText });
    });
    return () => {
      active = false;
      scheduleCancelQuestionSpeech(questionId);
    };
  }, [questionId, text]);

  const visibleMessage = message?.questionId === questionId ? message.text : "";
  return visibleMessage ? <p className="question-speech-status" role="status" aria-live="polite">{visibleMessage}</p> : null;
}
