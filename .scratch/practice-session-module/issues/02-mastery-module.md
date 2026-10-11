# 02 掌握記錄 module

Status: done

Blocked by: 01

Spec: `../../road-test-listening-cards/spec.md`（行為不變，今次係純重構）

## 背景

架構檢視候選 2。`progress.js` 係一堆 function（9 個 export），掌握記錄嘅格式、讀入、儲存、重設、首頁加總全部喺 `app.js` 同 `session.js` 外面做，「答完要記得儲存」靠每個入口自己記住。

## 決定咗嘅設計（逐條同用家確認）

1. 儲存由 module 管：`createMastery({ cards, storage })`，storage 係 `{ read(), write(text) }` adapter。讀入時驗證，每次記錄同重設後自動儲存。
2. 窄 interface：`record(cardId, answer)`（回傳係咪已掌握）、`draw(pool, size, random)`、`stats()`、`toReview()`、`reset()`。原始記錄格式、`weightOf`、`isMastered`、常數唔再 export。
3. `createSession` 收 `mastery`，取代 `progress` 同 `record`。
4. `stats()` 直接回答首頁：`{ sentences: { mastered, total }, categories: [{ category, mastered, total, topics: [{ topic, mastered, learning, total }] }] }`，「句子」＝非詞彙卡。
5. 名稱「掌握記錄」（`mastery`），已寫入 `CONTEXT.md`。
6. 取代 `progress.js` 同 `progress.test.js`，每個舊行為先有新測試先刪。
7. `ROUND_SIZE` 搬入 `session.js`（係環節規則）。
8. `src/storage.js`：`localStorageAdapter(key)`（保留「存唔到都照用」）同 `memoryAdapter(initial)`。語速嗰條 key 今次唔郁，留返候選 3。
9. 純重構，用家見到嘅嘢唔變。

## 完成條件

- [x] `src/mastery.js`、`src/storage.js` 存在；`mastery.js` 唔掂 DOM 同 localStorage。
- [x] `test/mastery.test.js`（15）、`test/storage.test.js`（3）經 interface 測；舊 progress 測試嘅每個行為都有對應新測試。
- [x] `src/progress.js`、`test/progress.test.js` 已刪。
- [x] `session.js` 收 `mastery`；`app.js` 冇 `progress` 變數、冇 `saveAnswer`、冇直接叫 `recordAnswer`/`topicStats`/`cardsToReview`。
- [x] 瀏覽器驗證。

## Comments

2026-10-01（agent）：完成。`node --test` 55 個全過。

- 瀏覽器驗證：首頁統計（句子 106 ＝ 35+21+25+25，大類同細分類別）、一輪完咗 10 張入記錄、錯題清單 10 張、重新載入後記錄仍然喺、已掌握顯示（0→3）、重設（確認字眼、toast、已儲存 `{}`）、模擬路試 23 句全部入記錄；冇 console 錯誤；測試用進度已清走。
- `app.js` 480 行（原 535）。`src/progress.js` 嘅功能全部由 `mastery.js`（110 行）接手。
- 舊有行為差異：舊 `recordAnswer` 唔改原 object 呢條測試冇咗，因為記錄而家係 module 內部狀態，唔再係 interface 嘅一部分。
