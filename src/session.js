// 練習環節：一輪或者一次模擬路試，由開始到總結。純邏輯，唔掂 DOM、localStorage 同發聲。
import { isSentence } from './cards.js';
import { buildOptions } from './options.js';
import { drawMockTest } from './mock.js';

// 一輪最多抽幾多張。
export const ROUND_SIZE = 10;

// 畫面問 session.rules 先知可以出邊啲掣；真正發聲同顯示仍然係畫面做。
const RULES = {
  round: { hint: true, replays: Infinity, chooseSpeed: true, reveals: true },
  mock: { hint: false, replays: 1, chooseSpeed: false, reveals: false },
};

// kind：'round' | 'mock'。topic 只係一輪用（null 即全部句子卡）。
// mastery：掌握記錄（見 mastery.js），用嚟抽卡同記錄每個答案。
export function createSession({ kind, cards, mastery, topic = null, random = Math.random }) {
  const queue =
    kind === 'mock'
      ? drawMockTest(cards, random)
      : mastery.draw(cards.filter(topic ? (c) => c.topic === topic : isSentence), ROUND_SIZE, random);
  const rules = RULES[kind];
  const results = [];
  let index = 0;
  let question = null;
  let usedHint = false;
  let replaysLeft = 0;

  const open = () => {
    const card = queue[index];
    question = { card, options: buildOptions(card, cards, random) };
    usedHint = false;
    replaysLeft = rules.replays;
  };
  open();

  return {
    kind,
    topic,
    rules,
    get finished() {
      return index >= queue.length;
    },
    get question() {
      return question;
    },
    // 而家第幾題（由 1 數起）。
    get number() {
      return index + 1;
    },
    get total() {
      return queue.length;
    },
    // 睇英文提示。呢題用咗，答啱都唔計入掌握。冇提示嘅環節回 false。
    useHint() {
      if (!rules.hint) return false;
      usedHint = true;
      return true;
    },
    // 想重播。仲有得重播就扣一次並回 true，真正發聲由畫面做。
    replay() {
      if (replaysLeft <= 0) return false;
      replaysLeft -= 1;
      return true;
    },
    answer(chosen) {
      const { card } = question;
      const correct = chosen === card.zh;
      const mastered = mastery.record(card.id, { correct, usedHint });
      results.push({ card, chosen, correct, usedHint, mastered });
      return rules.reveals ? { correct, usedHint, correctAnswer: card.zh } : null;
    },
    next() {
      index += 1;
      if (!this.finished) open();
    },
    summary() {
      if (!this.finished) throw new Error('環節未完，未有總結');
      // 分數：冇用提示而答啱嘅數目。
      const score = results.filter((r) => r.correct && !r.usedHint).length;
      return { score, total: results.length, results };
    },
  };
}
