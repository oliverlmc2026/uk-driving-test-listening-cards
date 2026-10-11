import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMastery } from '../src/mastery.js';
import { memoryAdapter } from '../src/storage.js';
import { cards, CATEGORIES, TOPICS, isSentence } from '../src/cards.js';

const right = { correct: true, usedHint: false };
const wrong = { correct: false, usedHint: false };
const hinted = { correct: true, usedHint: true };

const [a, b] = cards;
const fresh = () => createMastery({ cards, storage: memoryAdapter() });

test('連續答啱兩次先當掌握，record 回傳而家係咪已掌握', () => {
  const mastery = fresh();
  assert.equal(mastery.record(a.id, right), false);
  assert.equal(mastery.record(a.id, right), true);
});

test('答錯會將連續次數歸零', () => {
  const mastery = fresh();
  mastery.record(a.id, right);
  mastery.record(a.id, right);
  assert.equal(mastery.record(a.id, wrong), false);
  assert.equal(mastery.record(a.id, right), false);
  assert.equal(mastery.record(a.id, right), true);
});

test('用咗提示答啱唔計，仲會歸零，但唔當答錯', () => {
  const mastery = fresh();
  mastery.record(a.id, right);
  assert.equal(mastery.record(a.id, hinted), false);
  assert.equal(mastery.record(a.id, right), false);
  assert.equal(mastery.record(a.id, right), true);
});

test('記錄完會儲存，用同一個 storage 再開就接返', () => {
  const storage = memoryAdapter();
  const first = createMastery({ cards, storage });
  first.record(a.id, right);
  const second = createMastery({ cards, storage });
  assert.equal(second.record(a.id, right), true, '第二次開已經有第一次嘅啱');
});

test('讀入：壞 JSON、null、唔係 object 都當冇記錄', () => {
  for (const bad of ['{oops', null, '"text"', '123']) {
    const mastery = createMastery({ cards, storage: memoryAdapter(bad) });
    assert.equal(mastery.record(a.id, right), false, `${bad}`);
  }
});

test('讀入：格式唔啱嘅記錄忽略，其餘照用；已經唔存在嘅卡唔會冒出嚟', () => {
  const stored = JSON.stringify({
    [a.id]: { streak: 1, seen: 1, wrong: 0 },
    [b.id]: { streak: 'x', seen: 1, wrong: 0 },
    gone: { streak: 2, seen: 2, wrong: 0 },
  });
  const storage = memoryAdapter(stored);
  const mastery = createMastery({ cards, storage });
  assert.equal(mastery.record(a.id, right), true, 'a 接返之前嘅 streak 1');
  assert.equal(mastery.record(b.id, right), false, 'b 嘅壞記錄當冇');
  assert.ok(!('gone' in JSON.parse(storage.read())), '已經唔存在嘅卡唔再儲存');
});

const deck = (n) => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, topic: 'turns', category: 'directions' }));
const withDeck = (n, stored = null) => {
  const cardsOfDeck = deck(n);
  return { deck: cardsOfDeck, mastery: createMastery({ cards: cardsOfDeck, storage: memoryAdapter(stored) }) };
};

test('draw：抽夠 size 張而且冇重複', () => {
  const { deck: d, mastery } = withDeck(30);
  for (let i = 0; i < 100; i++) {
    const drawn = mastery.draw(d, 10);
    assert.equal(drawn.length, 10);
    assert.equal(new Set(drawn).size, 10);
  }
});

test('draw：卡唔夠 size 張就全部出晒', () => {
  const { deck: d, mastery } = withDeck(4);
  assert.equal(new Set(mastery.draw(d, 10)).size, 4);
});

test('draw：未掌握嘅卡比未做過嘅出得多，未做過嘅比已掌握嘅出得多', () => {
  const stored = JSON.stringify({
    c0: { streak: 0, seen: 3, wrong: 3 },
    c1: { streak: 2, seen: 2, wrong: 0 },
  });
  const { deck: d, mastery } = withDeck(3, stored); // c2 未做過
  const counts = { c0: 0, c1: 0, c2: 0 };
  for (let i = 0; i < 3000; i++) for (const card of mastery.draw(d, 1)) counts[card.id]++;
  assert.ok(counts.c0 > counts.c2 && counts.c2 > counts.c1, JSON.stringify(counts));
  assert.ok(counts.c1 > 0, '已掌握嘅卡仍然有機會出');
});

test('draw：隨機數可以由測試控制', () => {
  const { deck: d, mastery } = withDeck(10);
  const first = mastery.draw(d, 3, () => 0);
  const second = mastery.draw(d, 3, () => 0);
  assert.deepEqual(first, second);
});

test('toReview：只包做過但未掌握嘅卡，次序跟卡組', () => {
  const stored = JSON.stringify({
    c0: { streak: 0, seen: 1, wrong: 1 },
    c1: { streak: 1, seen: 1, wrong: 0 },
    c2: { streak: 2, seen: 2, wrong: 0 },
  });
  const { mastery } = withDeck(4, stored); // c3 未做過
  assert.deepEqual(mastery.toReview().map((c) => c.id), ['c0', 'c1']);
});

test('toReview：答錯會入清單，連啱兩次之後消失', () => {
  const { mastery } = withDeck(1);
  mastery.record('c0', wrong);
  assert.equal(mastery.toReview().length, 1);
  mastery.record('c0', right);
  assert.equal(mastery.toReview().length, 1);
  mastery.record('c0', right);
  assert.equal(mastery.toReview().length, 0);
});

test('reset：清晒所有記錄，而且已經儲存', () => {
  const storage = memoryAdapter();
  const d = deck(2);
  const mastery = createMastery({ cards: d, storage });
  mastery.record('c0', wrong);
  mastery.record('c1', right);
  mastery.reset();
  assert.equal(mastery.toReview().length, 0);
  assert.equal(createMastery({ cards: d, storage }).toReview().length, 0, '再開都係空');
});

test('stats：冇記錄時全部係 0，次序跟 CATEGORIES 同 TOPICS，每個類別都出現', () => {
  const { sentences, categories } = fresh().stats();
  assert.deepEqual(categories.map((c) => c.category), Object.keys(CATEGORIES));
  assert.deepEqual(
    categories.flatMap((c) => c.topics.map((t) => t.topic)),
    Object.keys(TOPICS),
  );
  assert.deepEqual(sentences, { mastered: 0, total: cards.filter(isSentence).length });
  for (const c of categories) {
    assert.equal(c.mastered, 0);
    for (const t of c.topics) assert.deepEqual([t.mastered, t.learning], [0, 0]);
  }
});

test('stats：掌握同「答啱咗一次」按細分類別、大類、句子計', () => {
  const mastery = fresh();
  const turns = cards.filter((c) => c.topic === 'turns');
  const vocab = cards.find((c) => c.category === 'vocab');
  mastery.record(turns[0].id, right);
  mastery.record(turns[0].id, right); // 已掌握
  mastery.record(turns[1].id, right); // 答啱一次
  mastery.record(vocab.id, right);
  mastery.record(vocab.id, right); // 詞彙卡已掌握，但唔計入「句子」

  const { sentences, categories } = mastery.stats();
  const directions = categories.find((c) => c.category === 'directions');
  const turnsStat = directions.topics.find((t) => t.topic === 'turns');
  assert.deepEqual(turnsStat, { topic: 'turns', total: turns.length, mastered: 1, learning: 1 });
  assert.equal(directions.mastered, 1);
  assert.equal(directions.total, cards.filter((c) => c.category === 'directions').length);
  assert.equal(sentences.mastered, 1, '詞彙卡唔計入句子');
  assert.equal(categories.find((c) => c.category === 'vocab').mastered, 1);
});
