// 整四揀一嘅中文選項。純邏輯，唔掂 DOM。

export const OPTION_COUNT = 4;

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 錯選項由同一個細分類別（topic）其他卡嘅中文意思抽，唔會同正確答案同一個意思，亦唔會重複。
export function buildOptions(card, allCards, random = Math.random) {
  const distractors = new Set();
  for (const other of allCards) {
    if (other.topic === card.topic && other.zh !== card.zh) {
      distractors.add(other.zh);
    }
  }
  if (distractors.size < OPTION_COUNT - 1) {
    throw new Error(`類別 ${card.topic} 唔夠唔同嘅中文意思整 ${OPTION_COUNT} 個選項`);
  }
  const picked = shuffle([...distractors], random).slice(0, OPTION_COUNT - 1);
  return shuffle([card.zh, ...picked], random);
}
