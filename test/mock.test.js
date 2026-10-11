import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawMockTest, MOCK_PLAN } from '../src/mock.js';
import { cards } from '../src/cards.js';

const RUNS = 200;
const is = (category, key, value) => (c) => c.category === category && (key ? c[key] === value : true);
const isStart = is('procedure', 'stage', 'start');
const isEnd = is('procedure', 'stage', 'end');
const isTell = is('showtell', 'kind', 'tell');
const isShow = is('showtell', 'kind', 'show');

test('總數喺 20–25 句之間，冇重複', () => {
  for (let i = 0; i < RUNS; i++) {
    const mock = drawMockTest(cards);
    assert.ok(mock.length >= 20 && mock.length <= 25, `有 ${mock.length} 句`);
    assert.equal(new Set(mock.map((c) => c.id)).size, mock.length);
  }
});

test('啱啱 1 題 tell me、1 題 show me、1 個操控項目', () => {
  for (let i = 0; i < RUNS; i++) {
    const mock = drawMockTest(cards);
    assert.equal(mock.filter(isTell).length, 1);
    assert.equal(mock.filter(isShow).length, 1);
    assert.equal(mock.filter(is('manoeuvres')).length, 1);
  }
});

test('次序：開頭對白 → tell me → 行車部分 → 結果對白', () => {
  for (let i = 0; i < RUNS; i++) {
    const mock = drawMockTest(cards);
    const { start, end } = MOCK_PLAN;
    assert.ok(mock.slice(0, start).every(isStart));
    assert.ok(isTell(mock[start]));
    assert.ok(mock.slice(-end).every(isEnd));
    const driving = mock.slice(start + 1, -end);
    assert.ok(driving.every((c) => !isStart(c) && !isEnd(c) && !isTell(c)));
    assert.equal(driving[0].category, 'directions', '行車部分由方向指示開始');
    assert.ok(driving.some(isShow), 'show me 喺行車途中');
  }
});

test('開頭同結果對白保持返卡片資料嘅先後次序', () => {
  const position = new Map(cards.map((c, i) => [c.id, i]));
  for (let i = 0; i < RUNS; i++) {
    const mock = drawMockTest(cards);
    for (const group of [mock.filter(isStart), mock.filter(isEnd)]) {
      const order = group.map((c) => position.get(c.id));
      assert.deepEqual(order, [...order].sort((a, b) => a - b));
    }
  }
});

test('唔會抽到詞彙卡', () => {
  for (let i = 0; i < RUNS; i++) {
    assert.ok(drawMockTest(cards).every((c) => c.category !== 'vocab'));
  }
});

test('每次抽嘅內容會唔同', () => {
  const signatures = new Set();
  for (let i = 0; i < 20; i++) signatures.add(drawMockTest(cards).map((c) => c.id).join());
  assert.ok(signatures.size > 1);
});
