# 01 練習環節 module

Status: done

Spec: `../../road-test-listening-cards/spec.md`（行為不變，今次係純重構）

## 背景

`src/app.js`（535 行）冇測試。一輪同模擬路試嘅狀態機係兩個全域變數（`round`、`mock`），規則散落喺六個 render function 嘅 click handler 入面：用咗提示唔計掌握、模擬路試只可以重播一次、幾時完、點計分。呢啲都係 spec 寫明嘅規則，但而家只可以靠人手撳先驗證到。

## 要做咩

新增 `src/session.js`：一個**練習環節** module（用語見 `CONTEXT.md`）。畫面問佢「而家顯示乜」，話佢知「用家做咗乜」；所有環節規則喺入面。

### 決定咗嘅設計

1. **一個 module、兩套規則。** 一輪同模擬路試共用同一部狀態機，分別只係規則：

   | | 一輪 | 模擬路試 |
   |---|---|---|
   | 抽卡 | `drawRound`（揀咗 topic 就嗰個 topic，否則全部句子卡） | `drawMockTest` |
   | 提示 | 有，用咗唔計掌握 | 冇 |
   | 重播 | 無限 | 只限一次 |
   | 轉語速 | 俾 | 唔俾，一律正常 |
   | 揭曉啱錯 | 答完即時 | 完咗先講 |

2. **環節自己記入掌握記錄。** 開始環節時由 `app.js` 傳入「而家嘅進度」同「記錄答案」function（記完回傳呢張卡係咪已掌握）。答題時環節自己叫，畫面唔再叫 `saveAnswer`。
3. **環節整埋四個選項。** 「目前呢題」＝卡 + 四個選項，畫面唔再叫 `buildOptions`。
4. **提示同重播嘅限制由環節數。** 畫面報告「用家撳咗提示／重播」，環節回覆仲可唔可以用。真正發聲仍然係畫面做。
5. **幾時揭曉由環節決定。** 答題後，一輪回傳啱錯同正確答案；模擬路試唔回傳，直接去下一題。
6. **俾唔俾轉語速由環節講。** 畫面照住決定出唔出語速掣、用咩語速讀。
7. **一個統一嘅總結格式。** 分數（冇用提示而答啱嘅數目）加每張卡嘅結果：卡、揀咗乜、啱唔啱、有冇用提示、而家係咪已掌握。
8. **隨機數可以由測試傳入**，照現有 `random = Math.random` 嘅慣例。

### `app.js` 嘅改動

- 刪走 `round`、`mock` 兩個全域變數同 `attempt.usedHint`，改為持有一個目前嘅練習環節。
- `renderQuestion` 同 `renderMockQuestion` 合併成一套題目畫面；`renderSummary` 同 `renderMockResult` 合併成一套總結畫面。照環節畀嘅規則決定出唔出提示掣、語速掣、重播限制同字眼。
- 進度變數同 localStorage 讀寫留喺 `app.js`（見「唔做」）。

## 唔做

- **唔改用家見到嘅任何嘢。** 每個模式嘅畫面、字眼、行為同而家一模一樣（包括途中返首頁時已答嘅題目照樣記錄咗）。
- **唔郁掌握記錄同儲存。** `src/progress.js` 同 localStorage 嗰邊留返之後另開 issue（架構檢視候選 2）。
- **唔郁發聲。** `src/voice.js` 同 `speak` 留返之後（候選 3）。
- 一輪總結加「你揀咗乜」之類嘅介面改動，另開 issue。

## 測試

- 現有 38 個測試全部保留。
- 新增 `test/session.test.js`，淨係經環節嘅 interface 測，由開始行到總結，唔掂 DOM：
  - 一輪：用咗提示答啱，記錄入去係「用咗提示」，唔計掌握。
  - 一輪：答完即時有啱錯同正確答案。
  - 一輪：揀咗 topic 只出嗰個 topic 嘅卡；冇揀就只出句子卡。
  - 模擬路試：冇得用提示。
  - 模擬路試：每句只可以重播一次，去到下一句又有返一次。
  - 模擬路試：唔俾轉語速。
  - 模擬路試：答完唔揭曉啱錯。
  - 模擬路試：每個答案都有記入掌握記錄。
  - 兩個模式：答完最後一題先有總結；之前攞唔到。
  - 兩個模式：每題四個選項，包含正確答案。
  - 總結：分數計法，同埋每張卡嘅結果齊晒五樣資料。

## 完成條件

- [x] `src/session.js` 存在，唔掂 DOM、localStorage、speechSynthesis。
- [x] `test/session.test.js` 涵蓋上面所有情況，`node --test` 全過（舊 38 個照過）。
- [x] `app.js` 入面冇 `round`、`mock` 全域變數，冇直接叫 `buildOptions`、`drawRound`、`drawMockTest`。（原本寫埋 `recordAnswer`，但設計決定 2 係由 `app.js` 傳「記錄答案」function 入去，所以 `saveAnswer` 仍然叫 `recordAnswer`，留到掌握記錄 module 先移走。）
- [x] 瀏覽器驗證：一輪（揀 topic 同全部混合）、模擬路試、錯題清單、重設進度，行為同重構前一樣，冇 console 錯誤。

## Comments

2026-10-01（agent）：由架構檢視（improve-codebase-architecture）嘅候選 1 傾出嚟，設計決定經逐條問答同用家確認。

2026-10-01（agent）：完成。

- `src/session.js`：`createSession({ kind, cards, progress, record, topic, random })`，回傳 `question`（卡 + 四個選項）、`number`/`total`、`finished`、`rules`（`hint`、`replays`、`chooseSpeed`、`reveals`）、`useHint()`、`replay()`、`answer(chosen)`（一輪回傳 `{ correct, usedHint, correctAnswer }`，模擬路試回傳 `null`）、`next()`、`summary()`（`{ score, total, results: [{ card, chosen, correct, usedHint, mastered }] }`）。
- `test/session.test.js` 14 個測試，全部經 interface 測；`node --test` 52 個全過（舊 38 + 新 14）。
- `src/app.js`：兩個模式共用 `renderQuestion`、`reveal`、`renderSummary`，總結畫面嘅字眼同每行格式按模式放喺 `SUMMARY` 表。
- 瀏覽器驗證（headless，發聲用 stub 數過）：一輪全部混合 10 張（提示、即時揭曉、掌握記錄、總結）、「再嚟一輪」仍然係一輪、模擬路試 23 句（冇提示掣同語速掣、重播一次後停用同下一句重置、發聲語速 1、途中冇啱錯、成績頁同記錄）、冇 console 錯誤。測試用嘅進度已清走。
- 已知小分別：無（兩個模式用家見到嘅嘢同重構前一樣；模擬路試自動發聲唔亮重播掣嘅 `speaking` 狀態亦照舊）。
- 沒有驗證：慢速設定下一輪嘅語速（`rateOf()` 邏輯簡單，冇另外測）。
