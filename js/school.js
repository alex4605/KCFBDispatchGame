// 消防學校（楠梓分隊旁）：三關教學，通過後玩家才能接管現場指揮權（進入戰術指揮）
// 訓練案件建在學校訓練場，由楠梓分隊（不足時就近）的車直接到場；訓練期間不進新案件、其他案件時限暫停，不影響評鑑與經費
'use strict';
const SCHOOL_ID=-7;
// SCHOOL：{x0,y0,w,h,cells,set, p:園區中心, burn:火災模擬屋格, x:模擬屋臨路格, side:臨路側}（園區 2×2 格）
let SCHOOL=null;
// 園區設施（CROP 代碼）：13 訓練塔、14 教室與宿舍、15 操場、16 報廢消防車停車場、17 火災模擬屋
const SCH_N={13:'訓練塔',14:'教室與宿舍',15:'操場',16:'報廢消防車停車場',17:'火災模擬屋'};
const TRAIN={pass:[0,0,0],inc:null,lv:0};
try{const v=JSON.parse(localStorage.getItem('kcfb.train')||'null');if(v&&Array.isArray(v.pass))TRAIN.pass=v.pass.slice(0,3)}catch(e){}
const tacUnlocked=()=>TRAIN.pass.every(Boolean);
// 跳過教學：三關視為通過
function trainSkip(){TRAIN.pass=[1,1,1];trainSave();msg='已跳過教學，取得現場指揮權；之後仍可回消防學校練習。';dirty()}
function trainSave(){try{localStorage.setItem('kcfb.train',JSON.stringify({pass:TRAIN.pass}))}catch(e){}}
// 關卡：車輛、受困人數、說明與目標（每個目標回傳是否達成）
const TRAIN_LV=[
 {n:'第一關：基礎滅火',units:['11','11','16'],trap:0,
  brief:'三組幫浦組（訓中11、訓中12、訓中16）與一組訓中義（人力組，可做外圍、破壞進入、殘火處理）。點選小組（或按 1、2），再按「入室攻擊 A」點起火房間；水線會自動從車拉到入口。把所有火點撲滅。',
  goals:[['撲滅所有火點',(inc,B)=>tacFireOut(B)]]},
 {n:'第二關：搜索救人',units:['11','11','16','71','91'],trap:1,
  brief:'屋內有一名受困者。以「初期搜索 S」找到受困者，救助組會把人帶出，交由救護車後送；同時以幫浦組壓制火勢掩護。',
  goals:[['找到並救出受困者',(inc,B)=>B.vtot>0&&B.resc>=B.vtot],['傷患送醫',(inc,B)=>B.vtot>0&&B.tx>=B.vtot],['撲滅所有火點',(inc,B)=>tacFireOut(B)]]},
 {n:'第三關：安全管理與指揮',units:['11','11','16','71','41','91'],trap:1,
  brief:'開設指揮站（右側 ICS 分頁點「指揮站」），指派安全官，以一組小組「RIT R」在入口待命，再入室救人滅火。過程不能有人員倒地。',
  goals:[['開設指揮站',(inc,B)=>!!B.st.icp],['指派安全官',(inc,B)=>!!B.role.safety],['編成 RIT',(inc,B)=>B.sq.some(q=>q.task==='rit'||q.task==='ritgo')||!!B.trRit],
   ['救出受困者並送醫',(inc,B)=>B.vtot>0&&B.tx>=B.vtot],['撲滅所有火點',(inc,B)=>tacFireOut(B)]]}];
const tacFireOut=B=>B.peak>0&&!B.cells.some(x=>x.h>.05);
// 地圖生成後：在楠梓分隊附近找一塊沒有道路、一側臨一般道路或幹道的 2×2 陸地，設訓練中心園區
// 前排（臨路）：除役消防車停車場、火災模擬屋；後排：操場、訓練塔
function placeSchool(){
 SCHOOL=null;const s=SPOT.find(x=>x.n==='楠梓');if(!s||!s.p)return;
 const land=(x,y)=>{if(x<1||y<1||x>=N-1||y>=N-1)return false;const k=K(x,y);return!RD[k]&&!HWL[k]&&(TR[k]===0||TR[k]===5)&&!inFacility(x,y)&&!SPOT.some(z=>z.p&&z.p[0]===x&&z.p[1]===y)};
 const road=(x,y)=>{const r=cls(x,y);return r===2||r===3};
 for(const [W,H] of[[2,2]]){let best=null,bd=1e9;
  for(let x0=s.p[0]-26;x0<=s.p[0]+26;x0++)for(let y0=s.p[1]-26;y0<=s.p[1]+26;y0++){
   const d=Math.hypot(x0+W/2-s.p[0],y0+H/2-s.p[1]);if(d>=bd)continue;
   let ok=true;for(let i=0;i<W&&ok;i++)for(let j=0;j<H;j++)if(!land(x0+i,y0+j)){ok=false;break}
   if(!ok)continue;
   // 臨路側：該側外緣至少一半是一般道路或幹道
   const sides={n:0,s:0,w:0,e:0};
   for(let i=0;i<W;i++){if(road(x0+i,y0-1))sides.n++;if(road(x0+i,y0+H))sides.s++}
   for(let j=0;j<H;j++){if(road(x0-1,y0+j))sides.w++;if(road(x0+W,y0+j))sides.e++}
   const side=Object.keys(sides).sort((a,b)=>sides[b]-sides[a])[0];
   if(sides[side]<((side==='n'||side==='s')?W:H)/2)continue;
   bd=d;best={x0,y0,w:W,h:H,side}}
  if(best){SCHOOL=best;break}}
 if(!SCHOOL)return;
 const S0=SCHOOL,cells=[],set=new Set();
 // 以臨路側為「前排」：i 沿臨路方向、j 由前往後
 const hz=S0.side==='n'||S0.side==='s',L=hz?S0.w:S0.h,D=hz?S0.h:S0.w;
 const at=(i,j)=>hz?[S0.x0+i,S0.side==='n'?S0.y0+j:S0.y0+S0.h-1-j]:[S0.side==='w'?S0.x0+j:S0.x0+S0.w-1-j,S0.y0+i];
 const out=(i)=>hz?[S0.x0+i,S0.side==='n'?S0.y0-1:S0.y0+S0.h]:[S0.side==='w'?S0.x0-1:S0.x0+S0.w,S0.y0+i];
 const bi=Math.floor(L/2);
 for(let i=0;i<L;i++)for(let j=0;j<D;j++){const [x,y]=at(i,j),k=K(x,y);TR[k]=0;cells.push([x,y]);set.add(k);
  CROP[k]=j===0?(i===bi?17:16):j>=D-2&&D>=4?14:(i===L-1&&j===1?13:15)}
 S0.cells=cells;S0.set=set;S0.burn=at(bi,0);S0.x=out(bi);if(!road(S0.x[0],S0.x[1]))S0.x=nbRoad(S0.burn[0],S0.burn[1])||S0.x;
 S0.p=[S0.x0+(S0.w-1)/2,S0.y0+(S0.h-1)/2]}
function schoolHTML(){
 let h='<div class="dh"><b>🎓 消防學校（楠梓）</b></div><div class="sub" style="margin:4px 0 10px">完成三關訓練後，才能親自接管現場指揮權（進入戰術指揮）。訓練期間不會進新案件，其他案件時限暫停，訓練結果不影響評鑑與經費。</div>';
 TRAIN_LV.forEach((L,i)=>{const ok=TRAIN.pass[i],lock=i>0&&!TRAIN.pass[i-1];
  h+='<div class="trlv'+(ok?' ok':'')+'"><div class="row" style="padding:0"><b>'+(ok?'✅ ':lock?'🔒 ':'📘 ')+L.n+'</b>'+
   '<button data-train="'+(i+1)+'"'+(lock||TRAIN.inc?' disabled':'')+'>'+(ok?'再練一次':'開始')+'</button></div>'+
   '<div class="sub">'+esc(L.brief)+'</div><div class="sub">目標：'+L.goals.map(g=>g[0]).join('、')+'</div></div>'});
 h+=tacUnlocked()?'<div class="note" style="background:#24463a;color:#d9f3e8">已取得現場指揮權：建物火災類案件可「⚔ 進入戰術指揮」。</div>':
  '<div class="sub" style="margin-top:6px">進度 '+TRAIN.pass.filter(Boolean).length+' / 3</div>';
 if(TRAIN.inc)h+='<button data-trainstop="1" style="margin-top:6px">放棄目前的訓練</button>';
 if(!tacUnlocked()&&!TRAIN.inc)h+='<button data-trainskip="1" style="margin-top:6px" title="不經訓練直接取得現場指揮權（之後仍可回來練習）">⏭ 跳過教學，直接取得指揮權</button>';
 return h}
// 開始訓練：在訓練場建立一件民宅火警，楠梓分隊（不足時就近）的車直接到場
function trainStart(lv){
 if(TRAIN.inc||!SCHOOL)return;const L=TRAIN_LV[lv-1];if(!L)return;
 const inc=makeInc('mfire',SCHOOL.burn,SCHOOL.x,'city',true,{ax:SCHOOL.x[0],ay:SCHOOL.x[1]});
 inc.train=lv;inc.nm='消防學校訓練（'+L.n.split('：')[0]+'）';inc.addr='楠梓消防學校訓練場';inc.pay=0;inc.pen=0;inc.left=inc.max=99999;
 inc.pm.trap=L.trap;inc.pm.special=false;inc.calls=1;
 // 教學用的火勢較小：燃燒面積與火警分級壓低
 inc.pm.area=Math.min(inc.pm.area||40,40+lv*15);inc.pm.lvl=1;
 inc.log=[{w:'台',s:'消防學校'+L.n+'：'+L.brief,t:0},{w:'台',s:'本關由訓練假想單位「訓中」（新進人員組成的菜鳥救災團隊，訓中11、訓中12、訓中16…，另有訓中義人力組）出動，車輛為訓練中心的除役消防車。',t:0}];
 TRAIN.inc=inc.id;TRAIN.lv=lv;
 // 訓練假想單位：訓中11、訓中12、訓中16…（新進人員；車輛為除役消防車），訓練結束即解散
 const st=SPOT.findIndex(s=>s.n==='楠梓'),cnt={};
 for(const code of L.units){
  const n=parseInt(code,10)+(cnt[code]||0);cnt[code]=(cnt[code]||0)+1;
  addU(st,code);const u=S.units[S.units.length-1];u.cs='訓中'+n;u.trainee=1;u.x=SCHOOL.x[0];u.y=SCHOOL.x[1];
  if(code==='91')u.tp=1;
  if(send(inc,u,code==='91'?'ALS':null)){u.x=inc.ax;u.y=inc.ay;u.path=[[inc.ax,inc.ay]]}}
 reindex();sel=inc.id;msg='開始'+L.n+'：車輛到場後自動進入戰術指揮。';dirty()}
// 結束訓練（通過、失敗或放棄）：移除訓練案件，車輛返隊
function trainEnd(why){
 const inc=S.inc.find(i=>i.id===TRAIN.inc);
 if(TAC.open&&TAC.id===TRAIN.inc)tacClose(why);
 if(inc){release(inc,0);S.inc.splice(S.inc.indexOf(inc),1)}
 for(const u of S.units)if(u.trainee){u.gone=1;u.inc=null;u.st='idle';u.path=[]}
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
// ===== 地圖繪製：園區細節（放大時）與動畫（地圖現場模式） =====
function schoolDetail(k,cp,px,py,c){
 if(cp===16){// 報廢消防車：褪色、鏽斑，兩排停放
  ctx.fillStyle='#3a3936';ctx.fillRect(px,py,c+.6,c+.6);ctx.strokeStyle='rgba(230,220,180,.35)';ctx.lineWidth=1;
  for(let i=0;i<=3;i++){ctx.beginPath();ctx.moveTo(px+c*i/3,py+c*.04);ctx.lineTo(px+c*i/3,py+c*.96);ctx.stroke()}
  for(let i=0;i<3;i++)for(let j=0;j<2;j++){if(hsh(k,i*2+j)<.15)continue;const x=px+c*(i/3+.04),y=py+c*(.06+j*.5),w=c*.25,h=c*.4;
   ctx.fillStyle=['#8a3f37','#7a4038','#954a3c','#6e3a34'][hsh(k,i+j*3+9)*4|0];ctx.fillRect(x,y,w,h);
   ctx.fillStyle='rgba(60,50,40,.5)';ctx.fillRect(x+w*.1,y+h*(.3+.4*hsh(k,i+j+20)),w*.5,h*.15);
   ctx.fillStyle='rgba(20,30,40,.6)';ctx.fillRect(x+w*.12,y+h*.04,w*.76,h*.16)}
  return}
 if(cp===17){// 火災模擬屋：水泥屋、燻黑窗口
  ctx.fillStyle='#55504a';ctx.fillRect(px+c*.1,py+c*.1,c*.8,c*.8);ctx.fillStyle='#2a2522';
  for(const [a,b] of[[.2,.2],[.6,.2],[.2,.6],[.6,.6]])ctx.fillRect(px+c*a,py+c*b,c*.2,c*.16);
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(px+c*.18,py+c*.12,c*.25,c*.08);return}
 if(cp===13){// 訓練塔：多層水泥塔、外掛梯
  ctx.fillStyle='#6a6660';ctx.fillRect(px+c*.18,py+c*.18,c*.64,c*.64);ctx.fillStyle='#4a4742';ctx.fillRect(px+c*.28,py+c*.28,c*.44,c*.44);
  ctx.strokeStyle='#c8c0a8';ctx.lineWidth=Math.max(1,c*.02);for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(px+c*.84,py+c*(.2+i*.15));ctx.lineTo(px+c*.94,py+c*(.2+i*.15));ctx.stroke()}return}
 if(cp===14){// 教室與宿舍：長條建物
  ctx.fillStyle='#3f4a58';ctx.fillRect(px+c*.04,py+c*.15,c*.92,c*.7);ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(px+c*.04,py+c*.15,c*.92,c*.08);
  ctx.fillStyle='rgba(180,200,230,.25)';for(let i=0;i<5;i++)ctx.fillRect(px+c*(.1+i*.17),py+c*.4,c*.08,c*.1);return}
 if(cp===15){// 操場：柏油、白線、消防栓
  ctx.fillStyle='#34343a';ctx.fillRect(px,py,c+.6,c+.6);ctx.strokeStyle='rgba(235,235,230,.35)';ctx.lineWidth=Math.max(1,c*.02);
  ctx.strokeRect(px+c*.08,py+c*.08,c*.84,c*.84);ctx.beginPath();ctx.moveTo(px+c*.5,py+c*.08);ctx.lineTo(px+c*.5,py+c*.92);ctx.stroke();
  if(hsh(k,4)>.5){ctx.fillStyle='#c8332c';ctx.beginPath();ctx.arc(px+c*.15,py+c*.15,c*.05,0,TAU);ctx.fill()}}}
// 地圖現場模式：學員在操場跑步與操演水帶、訓練塔偶爾冒煙
function schoolLive(c){
 if(!SCHOOL||c<34)return;const T=S.t,yard=SCHOOL.cells.filter(q=>CROP[K(q[0],q[1])]===15);if(!yard.length)return;
 const xs=yard.map(q=>q[0]),ys=yard.map(q=>q[1]),x0=Math.min(...xs)*c+c*.15,y0=Math.min(...ys)*c+c*.15,x1=(Math.max(...xs)+1)*c-c*.15,y1=(Math.max(...ys)+1)*c-c*.15;
 const per=2*((x1-x0)+(y1-y0)),r=Math.max(2.5,c*.05);
 for(let i=0;i<10;i++){let d=((T*c*.25+i*per/10)%per+per)%per,x,y;
  if(d<x1-x0){x=x0+d;y=y0}else if((d-=x1-x0)<y1-y0){x=x1;y=y0+d}else if((d-=y1-y0)<x1-x0){x=x1-d;y=y1}else{d-=x1-x0;x=x0;y=y1-d}
  ctx.fillStyle='#1e2c52';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.fillStyle='#f3c43b';ctx.beginPath();ctx.arc(x,y,r*.6,0,TAU);ctx.fill()}
 // 水帶操演：一組三人拉線射水
 const q=yard[Math.min(1,yard.length-1)],hx=q[0]*c+c*.2,hy=q[1]*c+c*.6,ph=(T*.4)%1;
 ctx.strokeStyle='rgba(125,179,232,.85)';ctx.lineWidth=Math.max(1.5,c*.03);ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(hx+c*.5*Math.min(1,ph*2),hy);ctx.stroke();
 for(let i=0;i<3;i++){ctx.fillStyle='#f3c43b';ctx.beginPath();ctx.arc(hx+c*(.15+i*.15)*Math.min(1,ph*2),hy-c*.06,r*.8,0,TAU);ctx.fill()}
 if(ph>.5){ctx.fillStyle='rgba(200,225,250,.5)';for(let i=0;i<6;i++){const p2=((T*2+i/6)%1);ctx.beginPath();ctx.arc(hx+c*.55+p2*c*.35,hy-p2*c*.2,r*(.5+p2),0,TAU);ctx.fill()}}
 const tw=SCHOOL.cells.find(q=>CROP[K(q[0],q[1])]===13);
 if(tw&&Math.sin(T*.3)>.3){for(let i=0;i<4;i++){const p2=(T*.5+i/4)%1;ctx.fillStyle='rgba(150,150,155,'+(.4*(1-p2)).toFixed(2)+')';ctx.beginPath();ctx.arc(tw[0]*c+c*.5+p2*c*.3,tw[1]*c+c*.3-p2*c*.6,c*(.08+p2*.15),0,TAU);ctx.fill()}}}
