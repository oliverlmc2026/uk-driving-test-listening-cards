// 發聲引擎 adapter：播預先生成嘅音頻檔。形狀見 speech.js。
// 用 <audio> 播，iPhone 開咗靜音都有聲（speechSynthesis 唔得）。
// 冇對應音頻檔、或者播唔到，就退用 fallback 引擎（瀏覽器聲線）。

const SRC = (id, rate) => `audio/${id}-${rate < 1 ? 'slow' : 'normal'}.m4a`;

export function audioEngine({ manifest, fallback, createAudio = () => new Audio() }) {
  // 同一個 <audio> 重用：iOS 一旦喺用家手勢入面解鎖，之後程式觸發都播得到。
  let audio = null;
  let current = null; // 而家播緊嗰次嘅 { onEnd }，確保 onEnd 只叫一次

  function finish() {
    const done = current;
    current = null;
    done?.onEnd?.();
  }

  return {
    available: true,
    voices: () => fallback.voices(),
    onVoicesChanged: (listener) => fallback.onVoicesChanged(listener),

    speak(utterance) {
      const id = manifest[utterance.text];
      if (!id) return fallback.speak(utterance);

      audio ??= createAudio();
      current = { onEnd: utterance.onEnd };
      const playing = current;
      const fail = () => {
        if (current !== playing) return;
        current = null;
        fallback.speak(utterance);
      };
      audio.onplaying = () => current === playing && utterance.onStart?.();
      audio.onended = () => current === playing && finish();
      audio.onerror = fail;
      audio.src = SRC(id, utterance.rate);
      audio.play()?.catch(fail);
    },

    cancel() {
      if (audio) {
        audio.onplaying = audio.onended = audio.onerror = null;
        audio.pause();
      }
      finish();
      fallback.cancel();
    },
  };
}
