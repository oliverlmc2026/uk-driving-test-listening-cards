import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audioEngine } from '../src/audio-engine.js';

// 假 <audio>：play 可以設成失敗，事件由測試手動觸發。
function fakeAudio({ playFails = false } = {}) {
  const audio = {
    src: null,
    pauses: 0,
    plays: 0,
    pause: () => (audio.pauses += 1),
    play: () => {
      audio.plays += 1;
      return playFails ? Promise.reject(new Error('blocked')) : Promise.resolve();
    },
  };
  return audio;
}

function fakeFallback() {
  const f = { spoken: [], cancels: 0, voices: () => ['v'], speak: (u) => f.spoken.push(u), cancel: () => (f.cancels += 1), onVoicesChanged: () => () => {} };
  return f;
}

const manifest = { 'Next right, please.': 'dir-next-right-short' };

test('有音頻檔：按語速揀 normal／slow，播放開始同結束通知畫面', () => {
  const audio = fakeAudio();
  const fallback = fakeFallback();
  const engine = audioEngine({ manifest, fallback, createAudio: () => audio });
  const log = [];
  engine.speak({ text: 'Next right, please.', rate: 1, onStart: () => log.push('s'), onEnd: () => log.push('e') });
  assert.equal(audio.src, 'audio/dir-next-right-short-normal.m4a');
  audio.onplaying();
  audio.onended();
  audio.onended();
  assert.deepEqual(log, ['s', 'e']);
  engine.speak({ text: 'Next right, please.', rate: 0.7 });
  assert.equal(audio.src, 'audio/dir-next-right-short-slow.m4a');
  assert.deepEqual(fallback.spoken, []);
});

test('冇對應音頻檔：退用 fallback 引擎', () => {
  const fallback = fakeFallback();
  const engine = audioEngine({ manifest, fallback, createAudio: fakeAudio });
  engine.speak({ text: 'Something else.', rate: 1 });
  assert.equal(fallback.spoken.length, 1);
});

test('播放被擋或者檔案載入失敗：退用 fallback，而且只退一次', async () => {
  const audio = fakeAudio({ playFails: true });
  const fallback = fakeFallback();
  const engine = audioEngine({ manifest, fallback, createAudio: () => audio });
  engine.speak({ text: 'Next right, please.', rate: 1 });
  await Promise.resolve();
  await Promise.resolve();
  audio.onerror();
  assert.equal(fallback.spoken.length, 1);
});

test('cancel：停低音頻、通知結束一次、同時取消 fallback', () => {
  const audio = fakeAudio();
  const fallback = fakeFallback();
  const engine = audioEngine({ manifest, fallback, createAudio: () => audio });
  const log = [];
  engine.speak({ text: 'Next right, please.', rate: 1, onEnd: () => log.push('e') });
  engine.cancel();
  assert.equal(audio.pauses, 1);
  assert.equal(fallback.cancels, 1);
  assert.deepEqual(log, ['e']);
  assert.doesNotThrow(() => engine.cancel());
});

test('voices 同 onVoicesChanged 交俾 fallback', () => {
  const engine = audioEngine({ manifest, fallback: fakeFallback(), createAudio: fakeAudio });
  assert.deepEqual(engine.voices(), ['v']);
  assert.equal(typeof engine.onVoicesChanged(() => {}), 'function');
});
