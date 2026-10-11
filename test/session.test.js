import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, ROUND_SIZE } from '../src/session.js';
import { createMastery } from '../src/mastery.js';
import { memoryAdapter } from '../src/storage.js';
import { cards, isSentence } from '../src/cards.js';

// 用真嘅掌握記錄（記憶體儲存），同時記低 session 每次叫 record。
function tracker(stored = null) {
  const real = createMastery({ cards, storage: memoryAdapter(stored) });
  const calls = [];
  const mastery = {
    ...real,
    record(cardId, answer) {
      calls.push({ cardId, ...answer });
      return real.record(cardId, answer);
    },
  };
  return { mastery, calls };
}

const start = (kind, extra = {}) => {
  const t = tracker(extra.stored);
  const session = createSession({ kind, cards, mastery: t.mastery, ...extra });
  return { session, tracker: t };
};

const answerRight = (session) => session.answer(session.question.card.zh);

test('一輪：每題四個選項而且包含正確答案，答完最後一題先有總結', () => {
  const { session } = start('round');
  let count = 0;
  while (!session.finished) {
    const { card, options } = session.question;
    assert.equal(options.length, 4);
    assert.ok(options.includes(card.zh));
    assert.equal(session.number, count + 1);
    assert.throws(() => session.summary(), '未完唔可以攞總結');
    answerRight(session);
    session.next();
    count += 1;
  }
  assert.equal(count, ROUND_SIZE);
  assert.equal(session.summary().total, ROUND_SIZE);
});

const questionsOf = (session) => {
  const seen = [];
  while (!session.finished) {
    seen.push(session.question.card);
    answerRight(session);
    session.next();
  }
  return seen;
};

test('一輪：揀咗 topic 只出嗰個 topic 嘅卡', () => {
  const { session } = start('round', { topic: 'turns' });
  assert.ok(questionsOf(session).every((c) => c.topic === 'turns'));
});

test('一輪：冇揀 topic 只出句子卡，唔出詞彙卡', () => {
  for (let i = 0; i < 30; i++) {
    const { session } = start('round');
    assert.ok(questionsOf(session).every(isSentence));
  }
});

test('一輪：用咗提示答啱，記錄入去係用咗提示，唔計掌握', () => {
  const { session, tracker } = start('round');
  const { card } = session.question;
  assert.equal(session.useHint(), true);
  session.answer(card.zh);
  assert.deepEqual(tracker.calls, [{ cardId: card.id, correct: true, usedHint: true }]);
  // 用咗提示嗰次唔計，所以再冇用提示答啱一次都未夠兩次
  assert.equal(tracker.mastery.record(card.id, { correct: true, usedHint: false }), false);
});

test('一輪：下一題要重新計提示，唔會沿用上一題', () => {
  const { session, tracker } = start('round');
  session.useHint();
  answerRight(session);
  session.next();
  answerRight(session);
  assert.equal(tracker.calls[1].usedHint, false);
});

test('模擬路試：冇得用提示，記錄入去冇用提示', () => {
  const { session, tracker } = start('mock');
  assert.equal(session.rules.hint, false);
  assert.equal(session.useHint(), false);
  answerRight(session);
  assert.equal(tracker.calls[0].usedHint, false);
});

test('模擬路試：每句只可以重播一次，去到下一句又有返一次', () => {
  const { session } = start('mock');
  assert.equal(session.replay(), true);
  assert.equal(session.replay(), false);
  answerRight(session);
  session.next();
  assert.equal(session.replay(), true);
  assert.equal(session.replay(), false);
});

test('一輪：重播冇限制', () => {
  const { session } = start('round');
  for (let i = 0; i < 20; i++) assert.equal(session.replay(), true);
});

test('一輪：答完即時揭曉啱錯同正確答案', () => {
  const { session } = start('round');
  const { card, options } = session.question;
  const wrongOption = options.find((o) => o !== card.zh);
  assert.deepEqual(session.answer(wrongOption), { correct: false, usedHint: false, correctAnswer: card.zh });
  session.next();
  const next = session.question.card;
  assert.deepEqual(session.answer(next.zh), { correct: true, usedHint: false, correctAnswer: next.zh });
});

test('模擬路試：答完唔揭曉啱錯', () => {
  const { session } = start('mock');
  assert.equal(session.rules.reveals, false);
  assert.equal(session.answer(session.question.card.zh), null);
});

test('語速：一輪俾用家轉，模擬路試唔俾', () => {
  assert.equal(start('round').session.rules.chooseSpeed, true);
  assert.equal(start('mock').session.rules.chooseSpeed, false);
});

test('模擬路試：每個答案都記入掌握記錄，總數就係 mock 題數', () => {
  const { session, tracker } = start('mock');
  const total = session.total;
  assert.ok(total >= 20 && total <= 25);
  const ids = [];
  while (!session.finished) {
    ids.push(session.question.card.id);
    answerRight(session);
    session.next();
  }
  assert.deepEqual(tracker.calls.map((c) => c.cardId), ids);
});

test('總結：分數係冇用提示而答啱嘅數目，每張卡有齊五樣資料', () => {
  const { session } = start('round');
  // 題 1：啱；題 2：用咗提示答啱；題 3：答錯；其餘全部答啱
  let i = 0;
  const picks = [];
  while (!session.finished) {
    const { card, options } = session.question;
    if (i === 1) session.useHint();
    const chosen = i === 2 ? options.find((o) => o !== card.zh) : card.zh;
    picks.push({ card, chosen });
    session.answer(chosen);
    session.next();
    i += 1;
  }
  const summary = session.summary();
  assert.equal(summary.total, ROUND_SIZE);
  assert.equal(summary.score, ROUND_SIZE - 2);
  assert.deepEqual(summary.results[0], { card: picks[0].card, chosen: picks[0].chosen, correct: true, usedHint: false, mastered: false });
  assert.deepEqual(summary.results[1], { card: picks[1].card, chosen: picks[1].chosen, correct: true, usedHint: true, mastered: false });
  assert.equal(summary.results[2].correct, false);
  assert.equal(summary.results[2].chosen, picks[2].chosen);
});

test('總結：之前已經答啱一次，今次再冇用提示答啱嘅卡係已掌握', () => {
  const target = cards.find((c) => c.topic === 'turns');
  const stored = JSON.stringify({ [target.id]: { streak: 1, seen: 1, wrong: 0 } });
  // random 恆為 0：加權抽卡會抽中 deck 頭幾張，而 target 係 turns 第一張
  const { session } = start('round', { topic: 'turns', stored, random: () => 0 });
  while (!session.finished) {
    session.answer(session.question.card.zh);
    session.next();
  }
  const results = session.summary().results;
  const hit = results.find((r) => r.card.id === target.id);
  assert.ok(hit, 'target 要喺今輪');
  assert.equal(hit.mastered, true);
  assert.ok(results.filter((r) => r.card.id !== target.id).every((r) => r.mastered === false));
});
