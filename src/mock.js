// 模擬路試抽題。純邏輯，唔掂 DOM。
import { shuffle } from './options.js';

// 每部分抽幾多句，加埋 23 句。
export const MOCK_PLAN = { start: 4, tell: 1, directions: 11, show: 1, manoeuvre: 1, drive: 2, end: 3 };

// 抽 count 張，保持返卡片資料入面嘅原本次序（流程對白先後有意思）。
function sampleInDeckOrder(pool, count, random) {
  const chosen = new Set(shuffle(pool, random).slice(0, count));
  return pool.filter((card) => chosen.has(card));
}

// 將 extras 插入 base，唔會插喺最頭，等行車部分一定由方向指示開始。
function insertAfterFirst(base, extras, random) {
  const result = [...base];
  for (const extra of extras) {
    const position = 1 + Math.floor(random() * result.length);
    result.splice(position, 0, extra);
  }
  return result;
}

// 次序跟真實考試：開頭流程對白 → tell me → 行車（方向指示，中間穿插 show me、操控、行車中對白）→ 結果。
export function drawMockTest(cards, random = Math.random) {
  const where = (test) => cards.filter(test);
  const procedure = (stage) => where((c) => c.category === 'procedure' && c.stage === stage);
  const showtell = (kind) => where((c) => c.category === 'showtell' && c.kind === kind);
  const pick = (pool, count) => shuffle(pool, random).slice(0, count);

  const driving = insertAfterFirst(
    pick(where((c) => c.category === 'directions'), MOCK_PLAN.directions),
    [
      ...pick(showtell('show'), MOCK_PLAN.show),
      ...pick(where((c) => c.category === 'manoeuvres'), MOCK_PLAN.manoeuvre),
      ...pick(procedure('drive'), MOCK_PLAN.drive),
    ],
    random,
  );

  return [
    ...sampleInDeckOrder(procedure('start'), MOCK_PLAN.start, random),
    ...pick(showtell('tell'), MOCK_PLAN.tell),
    ...driving,
    ...sampleInDeckOrder(procedure('end'), MOCK_PLAN.end, random),
  ];
}
