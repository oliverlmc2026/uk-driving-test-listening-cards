# 路試英語聽力卡

幫準備考英國路試（practical driving test）嘅人練英文聽力：聽考官會講嘅英文，揀返啱嘅中文意思。例如聽到 "turn right"，答案係「轉右」。

純 HTML / CSS / JS，冇 framework、冇 build 步驟，進度存喺自己部機嘅瀏覽器（localStorage），唔使登入。

## 功能

- **英國口音發聲**：用瀏覽器內置 Web Speech API 讀出英文（優先 en-GB 聲線），可以重播、切換慢速／正常速度。部機冇 en-GB 聲線時會退而用其他英文聲線，並喺畫面提示。
- **四選一**：揀返啱嘅中文意思，英文原文預設隱藏，要睇可以撳「提示」。
- **即時回饋**：揀完即刻顯示啱錯、英文原文、中文答案、重點詞彙解釋，同考官期望你做嘅動作。
- **掌握記錄**：冇用提示連續答啱兩次先算「已掌握」；答錯或未掌握嘅卡，之後出現機會更高。
- **兩種練習環節**：
  - **一輪**：按掌握程度加權抽最多 10 張卡，有提示，答完即時知啱錯。
  - **模擬路試**：按真實考試次序出題，冇提示，每句只可以重播一次，完咗先知啱錯。

## 卡片內容

分五個類別，每個類別再細分主題：

| 類別 | 例子 |
| --- | --- |
| 行車方向指示 | 轉彎同路口、迴旋處、行車線同跟路牌 |
| Show me / Tell me 問題 | DVSA 官方車輛安全問題 |
| 操控同停車指示 | 停車同起步、泊車、褪車、緊急煞車 |
| 考試流程對白 | 考試開始、行車途中、考試結束 |
| 常用詞彙 | 道路、方向位置、車內部件、動作 |

同一個意思嘅每種英文講法各自一張卡，各自記錄啱錯。卡片資料喺 [src/cards.js](src/cards.js)。

## 點跑

需要 Python 3（開發伺服器）同 Node.js（跑測試）。

### 開發伺服器

```bash
python3 dev-server.py
```

然後用瀏覽器開 <http://localhost:5173>。

`dev-server.py` 同 `python3 -m http.server` 一樣係靜態伺服器，不過會叫瀏覽器唔好快取，改完檔案重新載入就見到。

> 發聲用嘅係瀏覽器內置聲線，建議用手機或者桌面版 Chrome / Safari 試。聲線質素視乎你部機有咩聲線。

### 測試

```bash
npm test
```

用 Node 內置嘅 test runner（`node --test`），測試放喺 [test/](test/)。冇第三方依賴，唔使 `npm install`。

## 專案結構

```
index.html, styles.css   介面
src/
  app.js                 畫面同流程
  cards.js               卡片資料、類別、主題
  options.js             砌四個選項（錯選項由同主題抽）
  session.js             一輪練習環節
  mock.js                模擬路試
  mastery.js             掌握記錄同加權抽卡
  speech.js              揀聲線、語速
  speech-engine.js       Web Speech API 封裝
  storage.js             localStorage 存取
test/                    各模組嘅測試
CONTEXT.md               專案用語（領域詞彙表）
docs/                    給 agent 嘅工作流程文件
.scratch/                本地 issue 同 spec（markdown）
```

## 範圍

呢個 project 淨係做聽力：唔做 theory test、hazard perception，唔做開口講英文嘅練習，亦冇登入、多用戶或雲端同步。
