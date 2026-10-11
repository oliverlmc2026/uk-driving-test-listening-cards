// 掌握記錄：每張卡答過幾多次、連續答啱幾多次、錯過幾多次，同埋據此判斷「已掌握」。
// 純邏輯，唔掂 DOM；儲存經 storage adapter（見 storage.js）。

import { CATEGORIES, TOPICS, isSentence } from './cards.js';

const MASTERY_STREAK = 2;

const isMastered = (record) => (record?.streak ?? 0) >= MASTERY_STREAK;

// 未掌握嘅卡出得最多，未做過次之，已掌握最少（但仍然有機會出）。
const WEIGHTS = { mastered: 1, unseen: 3, struggling: 6 };

function weightOf(record) {
  if (!record || record.seen === 0) return WEIGHTS.unseen;
  return isMastered(record) ? WEIGHTS.mastered : WEIGHTS.struggling;
}

const isCount = (value) => Number.isInteger(value) && value >= 0;

// 讀返存低嘅記錄：壞資料當冇，已經唔存在嘅卡忽略。
function load(storage, cards) {
  let stored;
  try {
    stored = JSON.parse(storage.read());
  } catch {
    return {};
  }
  if (!stored || typeof stored !== 'object') return {};
  const records = {};
  for (const { id } of cards) {
    const record = stored[id];
    if (record && isCount(record.streak) && isCount(record.seen) && isCount(record.wrong)) {
      records[id] = { streak: record.streak, seen: record.seen, wrong: record.wrong };
    }
  }
  return records;
}

// storage：{ read(), write(text) }。
export function createMastery({ cards, storage }) {
  let records = load(storage, cards);

  return {
    // 由 pool 加權抽 size 張，同一次唔重複。random 俾測試控制。
    draw(pool, size, random = Math.random) {
      const entries = pool.map((card) => ({ card, weight: weightOf(records[card.id]) }));
      const drawn = [];
      while (drawn.length < size && entries.length > 0) {
        const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
        let target = random() * total;
        let index = entries.findIndex((entry) => (target -= entry.weight) < 0);
        if (index === -1) index = entries.length - 1;
        drawn.push(entries.splice(index, 1)[0].card);
      }
      return drawn;
    },

    // 錯題清單：做過但未掌握嘅卡，次序跟卡組。未做過嘅唔計。
    toReview() {
      return cards.filter((card) => {
        const record = records[card.id];
        return record && record.seen > 0 && !isMastered(record);
      });
    },

    // 清除所有記錄。
    reset() {
      records = {};
      storage.write(JSON.stringify(records));
    },

    // 首頁用：「句子」（唔計詞彙卡）同每個大類、細分類別嘅掌握比例。
    // learning：答啱咗一次，再啱就掌握。次序跟 CATEGORIES、TOPICS。
    stats() {
      const count = (inCards) => ({
        total: inCards.length,
        mastered: inCards.filter((card) => isMastered(records[card.id])).length,
      });
      const categories = Object.keys(CATEGORIES).map((category) => {
        const topics = Object.keys(TOPICS)
          .filter((topic) => TOPICS[topic].category === category)
          .map((topic) => {
            const inTopic = cards.filter((card) => card.topic === topic);
            const learning = inTopic.filter((card) => {
              const streak = records[card.id]?.streak ?? 0;
              return streak > 0 && streak < MASTERY_STREAK;
            }).length;
            return { topic, ...count(inTopic), learning };
          });
        return { category, ...count(cards.filter((card) => TOPICS[card.topic].category === category)), topics };
      });
      return { sentences: count(cards.filter(isSentence)), categories };
    },

    // 冇用提示答啱先計入連續次數；答錯或者用咗提示就歸零。回傳呢張卡而家係咪已掌握。
    record(cardId, { correct, usedHint }) {
      const previous = records[cardId] ?? { streak: 0, seen: 0, wrong: 0 };
      records = {
        ...records,
        [cardId]: {
          streak: correct && !usedHint ? previous.streak + 1 : 0,
          seen: previous.seen + 1,
          wrong: previous.wrong + (correct ? 0 : 1),
        },
      };
      storage.write(JSON.stringify(records));
      return isMastered(records[cardId]);
    },
  };
}
