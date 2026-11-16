# KCFDDispatchCenterTheGame
Claude powered web game

高雄市消防局勤務指揮中心模擬遊戲。

## 執行

直接用瀏覽器開啟 `index.html` 即可，不需要安裝或建置任何東西。

## 檔案結構

| 檔案 | 內容 |
|---|---|
| `index.html` | 頁面骨架與 script 載入順序 |
| `css/style.css` | 樣式 |
| `js/config.js` | 畫布、常數、車種、派遣編組、車載器材 |
| `js/kinds.js` | 案類定義 `KIND` |
| `js/protocols.js` | 階段流程、階段所需器材、病況、現場請求 |
| `js/world.js` | 全域狀態、地圖生成、路徑搜尋、車輛與開局 |
| `js/incidents.js` | 案件生成：災情參數、報案對話、進線 |
| `js/radio.js` | 無線電通聯文字，以及文字與現場狀態的對照規則 |
| `js/dispatch.js` | 派遣：編組比對、水源、出動、停車、到場 |
| `js/sim.js` | 每幀模擬更新 `step()` |
| `js/map.js` | 大地圖繪製 |
| `js/scene.js` | 現場畫面繪製 |
| `js/panels.js` | 側欄面板 HTML 產生 |
| `js/main.js` | 面板更新、事件處理、主迴圈 |

各 JS 檔是一般 script（不是 ES module），共用同一個全域範圍，所以載入順序不可更動，
新增的頂層名稱也不能與其他檔案重複。
