// 回歸測試（Playwright，無頭 Chromium）：node tests/regress.js [all|lint|load|map|normal|tac|handoff|school]
// 需要可 require('playwright') 的環境；直接開啟 index.html，不需要伺服器
'use strict';
const path=require('path'),{chromium}=require('playwright');
const URL='file://'+path.resolve(__dirname,'..','index.html');
const which=process.argv[2]||'all';
let fail=0;
const ok=(name,cond,info)=>{console.log((cond?'PASS ':'FAIL ')+name+(info?'  '+JSON.stringify(info):''));if(!cond)fail++};
async function page(b){const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];
 p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto(URL);await p.waitForTimeout(300);return{p,errs}}
// 指定案類的建物火災，派二級火警編組並由戰術 AI 指揮到結案
const TAC_RUN=`(k)=>{S.spawn=999;for(const z in POOL)for(const lv in POOL[z])POOL[z][lv]=[k];for(const z in POOLB)for(const lv in POOLB[z])POOLB[z][lv]=[k];
 for(let i=0;i<9&&!S.inc.length;i++)spawn();const inc=S.inc[0];if(!inc)return{k,none:1};sendLv(inc,2);reindex();auto(inc);
 let n=0;while(!inc.rev&&n<20000&&S.inc.includes(inc)){step(.05);n++}
 if(!S.inc.includes(inc))return{k,early:1};
 tacInit(inc);let t=0;for(;t<24000&&S.inc.includes(inc);t++){step(.05);if(inc.req&&t%20===0)answer(inc,true,false)}
 return{k,closed:!S.inc.includes(inc),t:Math.round(t*.05)}}`;
// 靜態檢查：程式裡產生的每個按鈕 data-* 屬性，都要在某個點擊處理的清單或選擇器裡（避免新按鈕按了沒反應）
function lint(){const fs=require('fs'),dir=path.resolve(__dirname,'..','js'),src={};
 for(const f of fs.readdirSync(dir))if(f.endsWith('.js'))src[f]=fs.readFileSync(path.join(dir,f),'utf8');
 const all=Object.values(src).join('\n'),used=new Set([...all.matchAll(/data-([a-z0-9]+)=/g)].map(m=>m[1]));
 const handled=new Set();
 for(const m of all.matchAll(/(?:MAIN_CLICK|TAC_CLICK)=\[([^\]]*)\]/g))for(const k of m[1].matchAll(/'([a-z0-9]+)'/g))handled.add(k[1]);
 for(const m of all.matchAll(/closest\('([^']*)'\)/g))for(const k of m[1].matchAll(/\[data-([a-z0-9]+)\]/g))handled.add(k[1]);
 const SECONDARY=['mode','wfs','wft','keep'];   // 搭配主要屬性一起使用，或不是按鈕
 // AI 通話設定面板（#aipanel）以 closest('button') 處理所有按鈕，屬性皆以 ai 開頭
 const miss=[...used].filter(k=>!handled.has(k)&&!SECONDARY.includes(k)&&!/^ai/.test(k));
 ok('按鈕屬性都有點擊處理',!miss.length,miss)}
(async()=>{if(which==='all'||which==='lint')lint();
 if(which==='lint'){console.log(fail?fail+' 項失敗':'全部通過');process.exit(fail?1:0)}
 const b=await chromium.launch();
 if(which==='all'||which==='load'){const {p,errs}=await page(b);ok('載入無錯誤',!errs.length,errs.slice(0,3));await p.close()}
 if(which==='all'||which==='map'){const {p,errs}=await page(b);
  const r=await p.evaluate(()=>{const f=baseF(SPOT[0],0);const un=SPOT.filter(s=>f.D[K(s.x[0],s.x[1])]===INF).map(s=>s.n);
   let bad=0;const pairs=[['岡山','林園'],['左營','旗山'],['旗津','美濃'],['燕巢','小港']];
   for(const [a,c] of pairs){const A=SPOT.find(s=>s.n===a),B=SPOT.find(s=>s.n===c),fb=field(B.x[0],B.x[1],0),pa=chase(fb,{x:A.x[0],y:A.x[1]});if(!pa){bad++;continue}
    const full=[[A.x[0],A.x[1]],...pa];for(let i=1;i<full.length-1;i++){const k=K(...full[i]),kp=K(...full[i-1]),kn=K(...full[i+1]);
     if(HWL[k]&&(RD[kp]===4&&RD[kn]&&RD[kn]!==4&&RD[kn]!==7&&!HWL[kn]||RD[kn]===4&&RD[kp]&&RD[kp]!==4&&RD[kp]!==7&&!HWL[kp]))bad++}}
   return{un,bad,routes:ROUTES.length}});
  ok('所有分隊可達',!r.un.length,r.un);ok('國道不在交會格轉換層',!r.bad,r);ok('地圖無錯誤',!errs.length,errs.slice(0,3));await p.close()}
 if(which==='all'||which==='normal'){const {p,errs}=await page(b);
  const r=await p.evaluate(()=>{S.day=4;for(let i=0;i<12000;i++){step(.05);if(i%50===0){reindex();for(const inc of S.inc)if(!onScene(inc).length)auto(inc)}}
   return{t:Math.round(S.t),solved:S.solved,rep:Math.round(S.rep)}});
  ok('一般玩法 600 秒',r.solved>3&&!errs.length,{...r,errs:errs.slice(0,3)});await p.close()}
 if(which==='all'||which==='tac'){let closed=0,n=0;
  for(const k of['mfire','hifire','fact','tinfire','nursing','skyscraper','wastefire','mfire']){const {p,errs}=await page(b);
   const r=await p.evaluate(eval(TAC_RUN),k);n++;if(r.closed||r.early)closed++;console.log('  ',JSON.stringify(r),errs.slice(0,2).join(' | '));
   if(errs.length)fail++;await p.close()}
  ok('戰術 AI 結案率',closed>=n-1,{closed,n})}
 if(which==='all'||which==='handoff'){const {p,errs}=await page(b);
  const r=await p.evaluate(()=>{const k='mfire';S.spawn=999;for(const z in POOL)for(const lv in POOL[z])POOL[z][lv]=[k];for(const z in POOLB)for(const lv in POOLB[z])POOLB[z][lv]=[k];
   for(let i=0;i<9&&!S.inc.length;i++)spawn();const inc=S.inc[0];sendLv(inc,2);reindex();auto(inc);let n=0;while(!inc.rev&&n<20000){step(.05);n++}
   tacInit(inc);const B=inc.tac;let t=0;for(;t<24000&&!B.hOK&&S.inc.includes(inc);t++)step(.05);if(!B.hOK)return{skip:1};
   tacOpen(inc);tacHandoff(inc,B);const left=onScene(inc).length;let t2=0;for(;t2<6000&&S.inc.includes(inc);t2++)step(.05);
   return{left,closed:!S.inc.includes(inc),open:TAC.open}});
  ok('交給轄區分隊善後',r.skip||(r.left<=2&&r.closed&&!r.open)&&!errs.length,r);await p.close()}
 if(which==='all'||which==='school'){const {p,errs}=await page(b);
  // 確定性測試：訓練隊出動並自動進入戰術畫面後，直接撲滅火勢，驗證目標判定、通過、解散與解鎖流程
  const r=await p.evaluate(()=>{localStorage.removeItem('kcfb.train');TRAIN.pass=[0,0,0];const lock=!tacUnlocked();trainStart(1);
   const inc=S.inc.find(i=>i.id===TRAIN.inc),crew=onScene(inc).map(u=>u.cs);let t=0;for(;t<400&&!TAC.open;t++){step(.05);trainStep()}
   const B=inc.tac;if(!B)return{lock,crew,noTac:1};
   for(let i=0;i<40;i++){step(.05);trainStep()}for(const x of B.cells){x.h=0;x.emb=0}for(let i=0;i<40&&TRAIN.inc;i++){step(.05);trainStep()}
   return{lock,crew,open:TAC.open,pass1:TRAIN.pass[0],trainee:S.units.filter(u=>u.trainee&&!u.gone).length,msg}});
  ok('消防學校第一關（訓練隊出動、判定通過、解散）',r.lock&&r.pass1&&!r.open&&!r.trainee&&r.crew.every(c=>/^高雄/.test(c))&&!errs.length,r);await p.close()}
 await b.close();console.log(fail?fail+' 項失敗':'全部通過');process.exit(fail?1:0)})();
