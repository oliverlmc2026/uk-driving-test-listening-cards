import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { browserEngine } from '../src/speech-engine.js';

afterEach(() => {
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
});

// 最細嘅 speechSynthesis stub：記低 speak／cancel／listener。
function stubBrowser(voices = []) {
  const synth = {
    voices,
    spoken: [],
    cancels: 0,
    listeners: new Set(),
    getVoices() {
      synth.getVoicesCalls = (synth.getVoicesCalls ?? 0) + 1;
      return synth.voices;
    },
    speak: (u) => synth.spoken.push(u),
    cancel: () => (synth.cancels += 1),
    addEventListener: (type, fn) => type === 'voiceschanged' && synth.listeners.add(fn),
    removeEventListener: (type, fn) => type === 'voiceschanged' && synth.listeners.delete(fn),
  };
  globalThis.speechSynthesis = synth;
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  return synth;
}

test('冇 speechSynthesis：唔支援，所有操作都唔會報錯', () => {
  const engine = browserEngine();
  assert.equal(engine.available, false);
  assert.deepEqual(engine.voices(), []);
  assert.doesNotThrow(() => {
    engine.speak({ text: 'a', lang: 'en-GB', rate: 1 });
    engine.cancel();
    engine.onVoicesChanged(() => {})();
  });
});

test('有 speechSynthesis：啟動時叫 getVoices 觸發載入，voices 回傳佢嘅列表', () => {
  const synth = stubBrowser([{ name: 'UK', lang: 'en-GB' }]);
  const engine = browserEngine();
  assert.equal(engine.available, true);
  assert.ok(synth.getVoicesCalls >= 1);
  assert.equal(engine.voices()[0].name, 'UK');
});

test('speak：設好文字、語言、聲線、語速；開始同結束（包括出錯）通知畫面', () => {
  const synth = stubBrowser();
  const engine = browserEngine();
  const log = [];
  const voice = { name: 'UK', lang: 'en-GB' };
  engine.speak({ text: 'Hi', voice, lang: 'en-GB', rate: 0.7, onStart: () => log.push('s'), onEnd: () => log.push('e') });
  const [u] = synth.spoken;
  assert.deepEqual([u.text, u.lang, u.voice, u.rate], ['Hi', 'en-GB', voice, 0.7]);
  u.onstart();
  u.onend();
  u.onerror();
  assert.deepEqual(log, ['s', 'e', 'e']);
});

test('speak：冇指定聲線就唔設 voice；冇 callback 都唔會報錯', () => {
  const synth = stubBrowser();
  browserEngine().speak({ text: 'Hi', lang: 'en-GB', rate: 1 });
  const [u] = synth.spoken;
  assert.equal(u.voice, undefined);
  assert.doesNotThrow(() => {
    u.onstart();
    u.onend();
  });
});

test('cancel 同 onVoicesChanged：註冊同取消 voiceschanged listener', () => {
  const synth = stubBrowser();
  const engine = browserEngine();
  engine.cancel();
  assert.equal(synth.cancels, 1);
  const unsubscribe = engine.onVoicesChanged(() => {});
  assert.equal(synth.listeners.size, 1);
  unsubscribe();
  assert.equal(synth.listeners.size, 0);
});
