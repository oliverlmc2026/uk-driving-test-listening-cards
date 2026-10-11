# 03 發聲 module

Status: done

Blocked by: 02

Spec: `../../road-test-listening-cards/spec.md`（行為不變，今次係純重構，另外順手修一個 listener 累積）

## 背景

架構檢視候選 3。`voice.js` 只有四個細嘅純 function；真正會出事嘅行為（取消上一句、冇英國聲線退用其他、語速、提示、`canSpeak` 判斷）散喺 `app.js`，完全測唔到。`renderNotice` 每畫一個畫面就加一個 `voiceschanged` listener，從來唔移除。

## 決定咗嘅設計（逐條同用家確認）

1. 新 module `src/speech.js`（發聲）管晒讀出、停止、語速、聲線提示。畫面唔再識得 `speechSynthesis`。
2. 發聲引擎 adapter：`{ available, voices(), speak({ text, voice, lang, rate, onStart, onEnd }), cancel(), onVoicesChanged(listener) }`。瀏覽器版 `src/speech-engine.js`，測試用假引擎。冇 `speechSynthesis` 就 `available: false`，變靜音。
3. Interface：`say(text, { normalSpeed, onStart, onEnd })`、`stop()`、`speed()`、`toggleSpeed()`、`notice()`、`subscribe(listener)`（回傳取消函數）。
4. 語速由 module 管，用 `localStorageAdapter('speed')`；模擬路試傳 `normalSpeed: true`。
5. 聲線提示：`app.js` 啟動時訂閱一次，更新畫面上所有 `.notice`。
6. 取代 `voice.js` 同 `voice.test.js`，每個舊行為先有新測試先刪。
7. 名稱「發聲」（`speech`），已寫入 `CONTEXT.md`。
8. 純重構，用家見到嘅嘢唔變。

## 完成條件

- [x] `src/speech.js`、`src/speech-engine.js` 存在；`speech.js` 唔掂瀏覽器全域。
- [x] `test/speech.test.js`（15）、`test/speech-engine.test.js`（5）；舊 voice 測試嘅每個行為都有對應新測試。
- [x] `src/voice.js`、`test/voice.test.js` 已刪。
- [x] `app.js` 冇 `canSpeak`、`speechSynthesis`、`readStored`/`writeStored`、`voice.js` import。
- [x] 瀏覽器驗證。

## Comments

2026-10-01（agent）：完成。`node --test` 70 個全過。

- 瀏覽器驗證（`speak` 用 stub 數）：自動讀用 en-GB（Daniel）、正常語速 1；轉慢速後 `aria-pressed`、儲存 `slow`、讀出 0.7、再聽一次都係 0.7；慢速設定下模擬路試仍然係 1；錯題清單點聽跟用家語速、讀緊嗰陣個掣有 `speaking`、讀完移除；來回換 5 次畫面之後 `voiceschanged` 新增 listener 係 0（之前每畫一個畫面加一個）；聲線列表變成淨係中文聲線，畫面上嘅提示即時出現，回復後即時消失；冇 console 錯誤。測試用 localStorage 已清走。
- `app.js` 451 行（候選 1 前 535，候選 2 後 480）。
- `speech-engine.js` 啟動時叫一次 `getVoices()` 觸發聲線載入（原本喺 `app.js` 最底做）。
