// 發聲：用機器聲線讀出考官嘅英文，管揀聲線、語速同聲線提示。
// 純邏輯，唔掂瀏覽器全域；經發聲引擎 adapter（見 speech-engine.js）同儲存 adapter（見 storage.js）。
//
// engine：{ available, voices(), speak({ text, voice, lang, rate, onStart, onEnd }), cancel(), onVoicesChanged(listener) }
// storage：{ read(), write(text) }，用嚟記住語速。

const RATES = { normal: 1, slow: 0.7 };

const langOf = (voice) => voice.lang.replace('_', '-').toLowerCase();

// 優先 en-GB；冇就退用其他英文聲線；完全冇英文就回 null。
function pickVoice(voices) {
  const british = voices.find((v) => langOf(v) === 'en-gb');
  if (british) return { voice: british, isBritish: true };
  const english = voices.find((v) => langOf(v).startsWith('en'));
  if (english) return { voice: english, isBritish: false };
  return null;
}

export function createSpeech({ engine, storage }) {
  let speed = storage.read() === 'slow' ? 'slow' : 'normal';

  return {
    // 用家設定嘅語速：'normal' | 'slow'。
    speed: () => speed,

    // 轉語速並記住，回傳轉咗之後嘅語速。
    toggleSpeed() {
      speed = speed === 'slow' ? 'normal' : 'slow';
      storage.write(speed);
      return speed;
    },

    // 讀出英文。唔傳 normalSpeed 就跟用家設定嘅語速；冇發聲能力就乜都唔做。
    say(text, { normalSpeed = false, onStart, onEnd } = {}) {
      if (!engine.available) return;
      engine.cancel();
      const picked = pickVoice(engine.voices());
      engine.speak({
        text,
        voice: picked?.voice,
        lang: picked?.voice.lang ?? 'en-GB',
        rate: RATES[normalSpeed ? 'normal' : speed],
        onStart,
        onEnd,
      });
    },

    // 而家應該顯示乜提示（聲線唔夠好），冇就 null。聲線未載入完（列表係空）暫時當冇問題。
    notice() {
      if (!engine.available) return '呢個瀏覽器唔支援發聲，聽唔到英文。';
      const voices = engine.voices();
      if (voices.length === 0) return null;
      const picked = pickVoice(voices);
      if (!picked) return '呢部機冇英文聲線，聽唔到英文。請喺系統設定加裝英文（英國）語音。';
      if (!picked.isBritish) return `呢部機冇英國口音聲線，而家用緊 ${picked.voice.name}（${picked.voice.lang}）。`;
      return null;
    },

    // 聲線列表變咗（載入完）嗰陣通知，叫返 notice() 睇新提示。回傳取消訂閱嘅 function。
    subscribe(listener) {
      return engine.onVoicesChanged(listener);
    },

    // 停止而家讀緊嘅。
    stop() {
      if (engine.available) engine.cancel();
    },
  };
}
