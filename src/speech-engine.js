// 發聲引擎 adapter：瀏覽器嘅 speechSynthesis。形狀見 speech.js。

const silent = {
  available: false,
  voices: () => [],
  speak() {},
  cancel() {},
  onVoicesChanged: () => () => {},
};

export function browserEngine() {
  const synth = globalThis.speechSynthesis;
  if (!synth) return silent;
  synth.getVoices(); // 有啲瀏覽器要先叫一次，聲線先會載入

  return {
    available: true,
    voices: () => synth.getVoices(),
    speak({ text, voice, lang, rate, onStart, onEnd }) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.onstart = () => onStart?.();
      utterance.onend = utterance.onerror = () => onEnd?.();
      synth.speak(utterance);
    },
    cancel: () => synth.cancel(),
    onVoicesChanged(listener) {
      synth.addEventListener('voiceschanged', listener);
      return () => synth.removeEventListener('voiceschanged', listener);
    },
  };
}
