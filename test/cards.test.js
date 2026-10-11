import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cards, CATEGORIES, TOPICS, isSentence } from '../src/cards.js';

test('句子卡 80–120 張，詞彙卡 30–50 張', () => {
  const sentences = cards.filter(isSentence).length;
  const words = cards.length - sentences;
  assert.ok(sentences >= 80 && sentences <= 120, `句子卡有 ${sentences} 張`);
  assert.ok(words >= 30 && words <= 50, `詞彙卡有 ${words} 張`);
});

test('必填欄位齊、id 唔重複、類別合法', () => {
  const ids = new Set();
  for (const c of cards) {
    assert.ok(!ids.has(c.id), `id 重複：${c.id}`);
    ids.add(c.id);
    assert.ok(c.category in CATEGORIES, `${c.id} 類別唔合法`);
    for (const field of ['en', 'zh', 'action']) {
      assert.ok(c[field], `${c.id} 缺少 ${field}`);
    }
    if (isSentence(c)) assert.ok(c.vocab.length > 0, `${c.id} 缺少 vocab`);
    else assert.ok(c.example, `${c.id} 缺少 example`);
    for (const item of c.vocab) assert.ok(item.en && item.zh, `${c.id} vocab 唔完整`);
  }
});

test('英文句子唔重複', () => {
  const seen = new Set();
  for (const c of cards) {
    assert.ok(!seen.has(c.en), `英文重複：${c.en}`);
    seen.add(c.en);
  }
});

test('每個細分類別至少有 5 個唔同嘅中文意思', () => {
  for (const topic of Object.keys(TOPICS)) {
    const meanings = new Set(cards.filter((c) => c.topic === topic).map((c) => c.zh));
    assert.ok(meanings.size >= 5, `${topic} 只有 ${meanings.size} 個意思`);
  }
});

test('每張卡嘅 topic 合法，而且 category 同 topic 所屬一致', () => {
  for (const c of cards) {
    assert.ok(c.topic in TOPICS, `${c.id} topic 唔合法`);
    assert.equal(c.category, TOPICS[c.topic].category, c.id);
  }
  for (const { category } of Object.values(TOPICS)) assert.ok(category in CATEGORIES);
});

test('show me / tell me 卡有 kind 同參考答案', () => {
  const showtell = cards.filter((c) => c.category === 'showtell');
  for (const c of showtell) {
    assert.ok(['show', 'tell'].includes(c.kind), `${c.id} kind 唔合法`);
    assert.ok(c.answerEn && c.answerZh, `${c.id} 缺少參考答案`);
  }
  assert.equal(showtell.filter((c) => c.kind === 'tell').length, 14);
  assert.equal(showtell.filter((c) => c.kind === 'show').length, 7);
});

test('流程對白卡有 stage，三個階段都有', () => {
  const stages = new Set();
  for (const c of cards.filter((c) => c.category === 'procedure')) {
    assert.ok(['start', 'drive', 'end'].includes(c.stage), `${c.id} stage 唔合法`);
    stages.add(c.stage);
  }
  assert.equal(stages.size, 3);
});
