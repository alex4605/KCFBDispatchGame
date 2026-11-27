// 消防學校（楠梓分隊旁）：三關教學，通過後玩家才能接管現場指揮權（進入戰術指揮）
// 訓練案件建在學校訓練場，由楠梓分隊（不足時就近）的車直接到場；訓練期間不進新案件、其他案件時限暫停，不影響評鑑與經費
'use strict';
const SCHOOL_ID=-7;
let SCHOOL=null;   // {p:[x,y], x:[臨路格]}
const TRAIN={pass:[0,0,0],inc:null,lv:0};
try{const v=JSON.parse(localStorage.getItem('kcfb.train')||'null');if(v&&Array.isArray(v.pass))TRAIN.pass=v.pass.slice(0,3)}catch(e){}
const tacUnlocked=()=>TRAIN.pass.every(Boolean);
function trainSave(){try{localStorage.setItem('kcfb.train',JSON.stringify({pass:TRAIN.pass}))}catch(e){}}
// 關卡：車輛、受困人數、說明與目標（每個目標回傳是否達成）
const TRAIN_LV=[
 {n:'第一關：基礎滅火',units:['11','11'],trap:0,
  brief:'兩組幫浦組。點選小組（或按 1、2），再按「入室攻擊 A」點起火房間；水線會自動從車拉到入口。把所有火點撲滅。',
  goals:[['撲滅所有火點',(inc,B)=>tacFireOut(B)]]},
 {n:'第二關：搜索救人',units:['11','11','71','91'],trap:1,
  brief:'屋內有一名受困者。以「初期搜索 S」找到受困者，救助組會把人帶出，交由救護車後送；同時以幫浦組壓制火勢掩護。',
  goals:[['找到並救出受困者',(inc,B)=>B.vtot>0&&B.resc>=B.vtot],['傷患送醫',(inc,B)=>B.vtot>0&&B.tx>=B.vtot],['撲滅所有火點',(inc,B)=>tacFireOut(B)]]},
 {n:'第三關：安全管理與指揮',units:['11','11','71','41','91'],trap:1,
  brief:'開設指揮站（右側 ICS 分頁點「指揮站」），指派安全官，以一組小組「RIT R」在入口待命，再入室救人滅火。過程不能有人員倒地。',
  goals:[['開設指揮站',(inc,B)=>!!B.st.icp],['指派安全官',(inc,B)=>!!B.role.safety],['編成 RIT',(inc,B)=>B.sq.some(q=>q.task==='rit'||q.task==='ritgo')||!!B.trRit],
   ['救出受困者並送醫',(inc,B)=>B.vtot>0&&B.tx>=B.vtot],['撲滅所有火點',(inc,B)=>tacFireOut(B)]]}];
const tacFireOut=B=>B.peak>0&&!B.cells.some(x=>x.h>.05);
// 地圖生成後：在楠梓分隊附近找一塊臨路空地設學校
function placeSchool(){
 SCHOOL=null;const s=SPOT.find(x=>x.n==='楠梓');if(!s||!s.p)return;
 for(let r=2;r<9&&!SCHOOL;r++)for(let a=-r;a<=r&&!SCHOOL;a++)for(let b=-r;b<=r;b++){if(Math.max(Math.abs(a),Math.abs(b))!==r)continue;
  const x=s.p[0]+a,y=s.p[1]+b;if(x<1||y<1||x>=N-1||y>=N-1)continue;const k=K(x,y);
  if(RD[k]||TR[k]!==0||inFacility(x,y))continue;const e=nbRoad(x,y);if(!e||RD[K(e[0],e[1])]<2)continue;
  SCHOOL={p:[x,y],x:e};break}}
function schoolHTML(){
 let h='<div class="dh"><b>🎓 消防學校（楠梓）</b></div><div class="sub" style="margin:4px 0 10px">完成三關訓練後，才能親自接管現場指揮權（進入戰術指揮）。訓練期間不會進新案件，其他案件時限暫停，訓練結果不影響評鑑與經費。</div>';
 TRAIN_LV.forEach((L,i)=>{const ok=TRAIN.pass[i],lock=i>0&&!TRAIN.pass[i-1];
  h+='<div class="trlv'+(ok?' ok':'')+'"><div class="row" style="padding:0"><b>'+(ok?'✅ ':lock?'🔒 ':'📘 ')+L.n+'</b>'+
   '<button data-train="'+(i+1)+'"'+(lock||TRAIN.inc?' disabled':'')+'>'+(ok?'再練一次':'開始')+'</button></div>'+
   '<div class="sub">'+esc(L.brief)+'</div><div class="sub">目標：'+L.goals.map(g=>g[0]).join('、')+'</div></div>'});
 h+=tacUnlocked()?'<div class="note" style="background:#24463a;color:#d9f3e8">已取得現場指揮權：建物火災類案件可「⚔ 進入戰術指揮」。</div>':
  '<div class="sub" style="margin-top:6px">進度 '+TRAIN.pass.filter(Boolean).length+' / 3</div>';
 if(TRAIN.inc)h+='<button data-trainstop="1" style="margin-top:6px">放棄目前的訓練</button>';
 return h}
// 開始訓練：在訓練場建立一件民宅火警，楠梓分隊（不足時就近）的車直接到場
function trainStart(lv){
 if(TRAIN.inc||!SCHOOL)return;const L=TRAIN_LV[lv-1];if(!L)return;
 const inc=makeInc('mfire',SCHOOL.p,SCHOOL.x,'city',true,{ax:SCHOOL.x[0],ay:SCHOOL.x[1]});
 inc.train=lv;inc.nm='消防學校訓練（'+L.n.split('：')[0]+'）';inc.addr='楠梓消防學校訓練場';inc.pay=0;inc.pen=0;inc.left=inc.max=99999;
 inc.pm.trap=L.trap;inc.pm.special=false;inc.calls=1;
 inc.log=[{w:'台',s:'消防學校'+L.n+'：'+L.brief,t:0}];
 TRAIN.inc=inc.id;TRAIN.lv=lv;
 const st=SPOT.findIndex(s=>s.n==='楠梓'),used=new Set();
 for(const code of L.units){
  const pool=S.units.filter(u=>u.st==='idle'&&u.code===code&&!used.has(u.id)).sort((a,b)=>(a.si===st?0:1)-(b.si===st?0:1)||Math.hypot(SPOT[a.si].p[0]-SCHOOL.p[0],SPOT[a.si].p[1]-SCHOOL.p[1])-Math.hypot(SPOT[b.si].p[0]-SCHOOL.p[0],SPOT[b.si].p[1]-SCHOOL.p[1]));
  const u=pool[0];if(!u)continue;used.add(u.id);
  if(send(inc,u,code==="91"?(u.tp?"ALS":"BLS"):null)){u.x=inc.ax;u.y=inc.ay;u.path=[[inc.ax,inc.ay]]}}
 reindex();sel=inc.id;msg='開始'+L.n+'：車輛到場後自動進入戰術指揮。';dirty()}
// 結束訓練（通過、失敗或放棄）：移除訓練案件，車輛返隊
function trainEnd(why){
 const inc=S.inc.find(i=>i.id===TRAIN.inc);
 if(TAC.open&&TAC.id===TRAIN.inc)tacClose(why);
 if(inc){release(inc,0);S.inc.splice(S.inc.indexOf(inc),1)}
 TRAIN.inc=null;TRAIN.lv=0;sel=SCHOOL_ID;msg=why;dirty()}
// 每幀：車到場後自動進入戰術指揮、檢查目標、失敗條件
function trainStep(){
 if(!TRAIN.inc)return;const inc=S.inc.find(i=>i.id===TRAIN.inc);
 if(!inc){TRAIN.inc=null;return}
 if(!inc.tac||!inc.tac.played){if(inc.rev&&!TAC.open)tacOpen(inc);return}
 const B=inc.tac,L=TRAIN_LV[TRAIN.lv-1];
 if(B.sq.some(q=>q.task==='rit'||q.task==='ritgo'))B.trRit=1;
 if(!TAC.open){trainEnd('已離開訓練場，訓練中止。');return}
 if(B.lost||B.lodd||B.sq.some(q=>q.down)){trainEnd('訓練未通過：'+(B.lost?'受困者罹難':'有隊員倒地（MAYDAY）')+'。請再試一次。');return}
 if(L.goals.every(g=>g[1](inc,B))){TRAIN.pass[TRAIN.lv-1]=1;trainSave();
  trainEnd('🎉 '+L.n+' 通過！'+(tacUnlocked()?'已取得現場指揮權，建物火災可以進入戰術指揮。':'繼續下一關。'))}}
// 戰術側欄上方：訓練目標清單
function trainGoalsHTML(inc){
 if(!inc.train)return'';const B=inc.tac,L=TRAIN_LV[inc.train-1];
 return'<div class="note" style="background:#1f3346;color:#d6e6f6"><b>🎓 '+L.n+'</b><br>'+esc(L.brief)+'<br>'+L.goals.map(g=>(g[1](inc,B)?'✅ ':'⬜ ')+g[0]).join('<br>')+'</div>'}
