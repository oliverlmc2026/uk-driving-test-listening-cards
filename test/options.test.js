import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOptions, OPTION_COUNT } from '../src/options.js';
import { cards, CATEGORIES } from '../src/cards.js';

const card = (id, zh, topic = 'a') => ({ id, zh, topic });

test('選項有四個、冇重複、包含正確答案', () => {
  for (const c of cards) {
    for (let i = 0; i < 50; i++) {
      const options = buildOptions(c, cards);
      assert.equal(options.length, OPTION_COUNT);
      assert.equal(new Set(options).size, OPTION_COUNT);
      assert.equal(options.filter((o) => o === c.zh).length, 1);
    }
  }
});

test('同一個中文意思嘅其他卡唔會變成錯選項', () => {
  const pool = [
    card('1', '轉右'),
    card('2', '轉右'),
    card('3', '轉左'),
    card('4', '直去'),
    card('5', '停車'),
  ];
  for (let i = 0; i < 100; i++) {
    const options = buildOptions(pool[0], pool);
    assert.deepEqual([...options].sort(), ['停車', '直去', '轉右', '轉左'].sort());
  }
});

test('錯選項只會由同類別抽', () => {
  const pool = [
    card('1', '甲'),
    card('2', '乙'),
    card('3', '丙'),
    card('4', '丁'),
    card('5', '別類', 'b'),
  ];
  for (let i = 0; i < 100; i++) {
    assert.ok(!buildOptions(pool[0], pool).includes('別類'));
  }
});

test('同類別唔夠唔同意思時報錯', () => {
  const pool = [card('1', '甲'), card('2', '乙'), card('3', '乙')];
  assert.throws(() => buildOptions(pool[0], pool));
});

test('正確答案嘅位置會變', () => {
  const positions = new Set();
  for (let i = 0; i < 200; i++) {
    positions.add(buildOptions(cards[0], cards).indexOf(cards[0].zh));
  }
  assert.equal(positions.size, OPTION_COUNT);
});
