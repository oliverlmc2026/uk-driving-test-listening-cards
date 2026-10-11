import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpeech } from '../src/speech.js';
import { memoryAdapter } from '../src/storage.js';

const voice = (name, lang) => ({ name, lang });

// 假引擎：記低讀過乜、取消過幾多次，聲線列表可以中途改。
function fakeEngine({ available = true, voices = [] } = {}) {
  const engine = {
    available,
    spoken: [],
    cancels: 0,
    listeners: new Set(),
    voices: () => voices,
    speak: (utterance) => engine.spoken.push(utterance),
    cancel: () => {
      engine.cancels += 1;
    },
    onVoicesChanged: (listener) => {
      engine.listeners.add(listener);
      return () => engine.listeners.delete(listener);
    },
    setVoices(next) {
      voices = next;
      for (const listener of [...engine.listeners]) listener();
    },
  };
  return engine;
}

const setup = ({ voices = [voice('UK', 'en-GB')], available = true, stored = null } = {}) => {
  const engine = fakeEngine({ available, voices });
  const storage = memoryAdapter(stored);
  return { engine, storage, speech: createSpeech({ engine, storage }) };
};

test('讀出英文：用 en-GB 聲線，讀之前先取消上一句', () => {
  const { speech, engine } = setup({ voices: [voice('US', 'en-US'), voice('HK', 'zh-HK'), voice('UK', 'en-GB')] });
  speech.say('Turn right.');
  assert.equal(engine.cancels, 1);
  assert.equal(engine.spoken.length, 1);
  const [u] = engine.spoken;
  assert.equal(u.text, 'Turn right.');
  assert.equal(u.voice.name, 'UK');
  assert.equal(u.lang, 'en-GB');
  assert.equal(u.rate, 1);
});

test('en_GB 底線寫法都認得', () => {
  const { speech, engine } = setup({ voices: [voice('US', 'en-US'), voice('UK', 'en_GB')] });
  speech.say('Hello.');
  assert.equal(engine.spoken[0].voice.name, 'UK');
  assert.equal(speech.notice(), null, '認到係英國聲線，唔使提示');
});

test('冇 en-GB 就退用其他英文聲線，lang 跟返嗰個聲線', () => {
  const { speech, engine } = setup({ voices: [voice('HK', 'zh-HK'), voice('US', 'en-US')] });
  speech.say('Hello.');
  assert.equal(engine.spoken[0].voice.name, 'US');
  assert.equal(engine.spoken[0].lang, 'en-US');
});

test('完全冇英文聲線，照樣叫引擎讀，用 en-GB，唔指定聲線', () => {
  for (const voices of [[voice('HK', 'zh-HK')], []]) {
    const { speech, engine } = setup({ voices });
    speech.say('Hello.');
    assert.equal(engine.spoken.length, 1);
    assert.equal(engine.spoken[0].voice, undefined);
    assert.equal(engine.spoken[0].lang, 'en-GB');
  }
});

test('冇發聲能力：say 乜都唔做，亦唔會叫 callback', () => {
  const { speech, engine } = setup({ available: false });
  let called = false;
  speech.say('Hello.', { onStart: () => (called = true), onEnd: () => (called = true) });
  speech.stop();
  assert.deepEqual([engine.spoken.length, engine.cancels, called], [0, 0, false]);
});

test('onStart、onEnd 交畀引擎，引擎叫佢哋就通知到畫面', () => {
  const { speech, engine } = setup();
  const log = [];
  speech.say('Hello.', { onStart: () => log.push('start'), onEnd: () => log.push('end') });
  engine.spoken[0].onStart();
  engine.spoken[0].onEnd();
  assert.deepEqual(log, ['start', 'end']);
});

test('語速：預設正常，轉一次變慢，再轉返正常', () => {
  const { speech } = setup();
  assert.equal(speech.speed(), 'normal');
  assert.equal(speech.toggleSpeed(), 'slow');
  assert.equal(speech.speed(), 'slow');
  assert.equal(speech.toggleSpeed(), 'normal');
});

test('語速：慢速讀得慢過正常；normalSpeed 忽略用家設定', () => {
  const { speech, engine } = setup();
  speech.say('a');
  speech.toggleSpeed();
  speech.say('b');
  speech.say('c', { normalSpeed: true });
  const [normal, slow, forcedNormal] = engine.spoken.map((u) => u.rate);
  assert.ok(slow < normal);
  assert.equal(forcedNormal, normal);
});

test('語速：記住，再開都係慢；壞值當正常', () => {
  const { speech, storage, engine } = setup();
  speech.toggleSpeed();
  assert.equal(createSpeech({ engine, storage }).speed(), 'slow');
  for (const bad of ['garbage', null, '']) {
    assert.equal(setup({ stored: bad }).speech.speed(), 'normal', String(bad));
  }
});

test('提示：有英國聲線就冇提示', () => {
  assert.equal(setup().speech.notice(), null);
});

test('提示：聲線未載入完（列表係空）暫時冇提示', () => {
  assert.equal(setup({ voices: [] }).speech.notice(), null);
});

test('提示：瀏覽器唔支援發聲', () => {
  const notice = setup({ available: false }).speech.notice();
  assert.match(notice, /唔支援發聲/);
});

test('提示：完全冇英文聲線', () => {
  const notice = setup({ voices: [voice('HK', 'zh-HK')] }).speech.notice();
  assert.match(notice, /冇英文聲線/);
});

test('提示：冇英國口音，會講而家用緊邊個聲線', () => {
  const notice = setup({ voices: [voice('Samantha', 'en-US')] }).speech.notice();
  assert.match(notice, /冇英國口音/);
  assert.match(notice, /Samantha/);
  assert.match(notice, /en-US/);
});

test('subscribe：聲線列表變咗就通知，提示跟住變；取消之後唔再通知', () => {
  const { speech, engine } = setup({ voices: [] });
  let notified = 0;
  const unsubscribe = speech.subscribe(() => notified++);
  assert.equal(speech.notice(), null);
  engine.setVoices([voice('HK', 'zh-HK')]);
  assert.equal(notified, 1);
  assert.match(speech.notice(), /冇英文聲線/);
  unsubscribe();
  engine.setVoices([voice('UK', 'en-GB')]);
  assert.equal(notified, 1);
  assert.equal(engine.listeners.size, 0, '取消後引擎唔再留住 listener');
});
