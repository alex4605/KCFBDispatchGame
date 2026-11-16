# KCFDDispatchCenterTheGame
Claude powered web game

高雄市消防局勤務指揮中心模擬遊戲。

## 試玩

- 線上：啟用 GitHub Pages 後開啟 https://alex4605.github.io/KCFDDispatchCenterTheGame/
- 本機：下載後直接用瀏覽器開啟 `index.html`，不需要安裝或建置任何東西。

## 檔案結構

| 檔案 | 內容 |
|---|---|
| `index.html` | 頁面骨架與 script 載入順序 |
| `css/style.css` | 樣式 |
| `js/config.js` | 畫布、常數、車種、派遣編組、分隊與醫院位置 |
| `js/equipment.js` | 車載器材、器材需求對照與需求編組產生 |
| `js/kinds.js` | 案類定義 KIND |
| `js/protocols.js` | 階段流程、階段所需器材、病況 MED、現場請求 EV |
| `js/world.js` | 全域狀態、地圖生成、路徑搜尋、車輛與開局 |
| `js/incidents.js` | 案件生成：災情參數、報案對話 |
| `js/kinds-extra.js` | 追加案類、階段表修正、各區域案件池 POOL |
| `js/spawn.js` | 案件進線 spawn() |
| `js/radio.js` | 無線電通聯文字，以及文字與現場狀態的對照規則 |
| `js/dispatch.js` | 派遣：編組比對、水源、出動、停車、到場 |
| `js/sim.js` | 每幀模擬更新 step() |
| `js/map.js` | 大地圖繪製 |
| `js/scene-kit.js` | 現場畫面：畫布、人員與擔架圖元、車組動畫、通用特效 |
| `js/scene.js` | 現場畫面主流程 drawScene()：算出共用變數後依序呼叫各 scene-*.js 的繪製函式 |
| `js/scene-surroundings.js` | 現場畫面：圍觀民眾、傷患、警戒、停車位、照明、抬頭資訊 |
| `js/scene-water.js` | 現場畫面：供水水帶、水花、水源標示、中繼水帶、分水器 |
| `js/scene-vehicles.js` | 現場畫面：車輛、警示燈光暈、雲梯、救護車裝載 |
| `js/scene-ops.js` | 現場畫面：各階段作業特效、復原區、出入口管制、氣瓶站、救護與救助動畫 |
| `js/scene-transport.js` | 現場畫面：後送路線、醫院交接、救護待命區 |
| `js/scene-agencies.js` | 現場畫面：警方人員與台電工程車 |
| `js/scene-special.js` | 現場畫面：大量傷病患與化災的專屬佈置 |
| `js/panels.js` | 車輛動態、進線案件、通聯紀錄、車輛資料、採購等面板 HTML |
| `js/panel-detail.js` | 右下案件詳情面板 detailHTML() |
| `js/main.js` | 面板更新、事件處理、主迴圈 |

各 JS 檔是一般 script（不是 ES module），共用同一個全域範圍：

- `index.html` 裡的載入順序不可更動（表格即為載入順序）。
- 新增的頂層名稱不能與其他檔案重複。
- `scene-*.js` 裡的 `sc…()` 函式由 `scene.js` 的 `drawScene()` 依序呼叫，繪製順序就是圖層順序。
