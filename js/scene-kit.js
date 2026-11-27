// 現場畫面：畫布、人員與擔架圖元、車組動畫、通用特效
'use strict';
const scv=document.getElementById('sc'),sctx=scv.getContext('2d');
let scW=400,scH=260,wantSwap=true,isSwapped=false,scZoom=1;
function sizeScene(){
 const w=document.getElementById('scenewrap');
 scW=Math.max(180,w.clientWidth-10);scH=isSwapped?Math.max(220,w.clientHeight-12):260;
 scv.width=Math.round(scW*dpr);scv.height=Math.round(scH*dpr);
 scv.style.height=scH+'px';sctx.setTransform(dpr,0,0,dpr,0,0)}
function scRR(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);
 g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
const PHMODE=[
 [/破壞|切割|拆解/,'work'],
 [/滅火|火線控制|翻堆降溫/,'attack'],
 [/水源中繼/,'hose'],
 [/安全評估|結構評估|登船評估|下水接觸|熱顯像|確認火點|確認火源/,'search'],
 [/集結|警戒協調|待命/,'line'],
 [/佈線|水線|佔水/,'hose'],
 [/入室|射水|火勢控制|殘火|側翼|攤位|泡沫|冷卻/,'attack'],
 [/搜索|探測|偵察|勘查|定位|查訪|查看|巡/,'search'],
 [/接觸|處置|評估|檢傷|包紮|生產|照護|溝通|生命徵象|症狀/,'medic'],
 [/搬運|後送|救出|脫困|疏散|轉交|上車|吊掛/,'carry'],
 [/排煙|通風|抽水|阻漏|除污|開挖|支撐|破壞|切除|摘除|捕捉|開門|架設|確保/,'work']];
function phMode(nm){for(const p of PHMODE)if(p[0].test(nm))return p[1];return 'work'}
function crewOf(u){
 if(u.code==='91')return u.crew||2;
 if(u.code==='搜')return 5;
 if(u.code==='41')return 2;
 if(u.code==='艇')return 3;
 return 3}
const KIT={
 fire:{coat:'#1e2c52',leg:'#16203a',stripe:'#f3c43b',helmet:'#f3c43b',skin:'#e6c0a8'},
 medic:{coat:'#f2f2ee',leg:'#d8d8d2',stripe:'#2f6fd0',helmet:'#f6f6f2',skin:'#e6c0a8',vest:'#2f6fd0'},
 rescue:{coat:'#f0c53a',leg:'#c99f22',stripe:'#c8332c',helmet:'#f6f6f2',skin:'#e6c0a8',torso:'#c8332c'},
 cmd:{coat:'#b8861b',leg:'#8f6a16',stripe:'#e9e7e0',helmet:'#f6f6f2',skin:'#e6c0a8'},
 duty:{coat:'#c8332c',leg:'#161616',stripe:null,helmet:null,skin:'#e6c0a8'},
 civ:{coat:'#6f6c66',leg:'#57554f',stripe:null,helmet:null,skin:'#d9bfae'},
 hzA:{coat:'#8bd46b',leg:'#6fb454',stripe:null,helmet:'#8bd46b',skin:'#9fe07f'},
 hzB:{coat:'#f0c53a',leg:'#c99f22',stripe:'#6f6c66',helmet:'#f0c53a',skin:'#e6c0a8'},
 hzC:{coat:'#dfe7ef',leg:'#b9c4cf',stripe:'#2f6fd0',helmet:'#dfe7ef',skin:'#e6c0a8'},
 mcmd:{coat:'#f2f2ee',leg:'#d8d8d2',stripe:'#f3c43b',helmet:'#f6f6f2',skin:'#e6c0a8',vest:'#3fae86'}};
function figure(g,x,y,r,kit,opt){
 opt=opt||{};
 const k=(typeof kit==='string')?(KIT[kit]||KIT.civ):kit;
 const sw=Math.sin((S.t*6+(opt.ph||0))*(opt.moving?1:0))*r*.5;
 const y0=y,ph=opt.ph||0,T=S.t,mv=opt.moving?1:0;
 if(opt.face<0){g.save();g.translate(x*2,0);g.scale(-1,1)}
 g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(x,y0+r*.84,r*.64,r*.2,0,0,TAU);g.fill();
 y+=mv?-Math.abs(Math.sin(T*6+ph))*r*.08:Math.sin(T*2+ph*1.7)*r*.025;
 if(!mv&&(opt.gear==='aid'||opt.gear==='o2'))y+=r*.12;
 g.strokeStyle=k.leg;g.lineWidth=Math.max(1,r*.32);g.lineCap='round';
 g.beginPath();
 g.moveTo(x,y-r*.42);g.lineTo(x-sw*.6,y+r*.78);
 g.moveTo(x,y-r*.42);g.lineTo(x+sw*.6,y+r*.78);
 g.stroke();
 g.fillStyle='#14130f';
 g.beginPath();g.ellipse(x-sw*.6,y+r*.82,r*.22,r*.1,0,0,TAU);g.fill();
 g.beginPath();g.ellipse(x+sw*.6,y+r*.82,r*.22,r*.1,0,0,TAU);g.fill();
 g.fillStyle=k.coat;
 g.fillRect(x-r*.34,y-r*.52,r*.68,r*1.04);
 if(k.torso){g.fillStyle=k.torso;g.fillRect(x-r*.34,y-r*.52,r*.68,r*.52)}
 if(k.vest){g.fillStyle=k.vest;g.fillRect(x-r*.3,y-r*.46,r*.6,r*.62)}
 if(k.stripe){g.fillStyle=k.stripe;
  g.fillRect(x-r*.34,y-r*.06,r*.68,r*.16);
  g.fillRect(x-r*.34,y+r*.32,r*.68,r*.12)}
 let hlx,hly,hrx,hry;const gr0=opt.gear;
 if(mv){hlx=x-r*.5-sw*.2;hly=y+r*.2+sw*.5;hrx=x+r*.5+sw*.2;hry=y+r*.2-sw*.5}
 else if(kit==='cmd'){const talk=Math.sin(T*.8+ph)>.2;
  hlx=x-r*.5;hly=y+r*.22;
  if(talk){hrx=x+r*.3;hry=y-r*.82}else{hrx=x+r*1.05;hry=y-r*.38}}
 else if(gr0==='bar'||gr0==='cutter'||gr0==='spreader'||opt.hose){const p=Math.sin(T*5+ph)*r*.16;hlx=x+r*.35;hly=y+r*.05+p;hrx=x+r*.9;hry=y-r*.1-p}
 else if(gr0==='aid'||gr0==='o2'){const p=Math.sin(T*7+ph)*r*.14;hlx=x+r*.45;hly=y+r*.3+p;hrx=x+r*.75;hry=y+r*.3-p}
 else{const s2=Math.sin(T*1.8+ph)*r*.05;hlx=x-r*.5;hly=y+r*.22+s2;hrx=x+r*.5;hry=y+r*.22-s2}
 g.strokeStyle=k.coat;g.lineWidth=Math.max(1,r*.26);g.lineCap='round';
 g.beginPath();g.moveTo(x-r*.34,y-r*.38);g.lineTo(hlx,hly);g.moveTo(x+r*.34,y-r*.38);g.lineTo(hrx,hry);g.stroke();
 g.fillStyle=k.skin;g.beginPath();g.arc(hlx,hly,r*.14,0,TAU);g.fill();
 g.beginPath();g.arc(hrx,hry,r*.14,0,TAU);g.fill();
 g.fillStyle=k.skin;
 g.beginPath();g.arc(x,y-r*1.12,r*.56,0,TAU);g.fill();
 if(k.helmet&&opt.helmet!==false){g.fillStyle=k.helmet;
  g.beginPath();g.arc(x,y-r*1.18,r*.62,Math.PI,TAU);g.fill();
  g.fillRect(x-r*.74,y-r*1.24,r*1.48,r*.2)}
 if(k.helmet&&opt.helmet!==false){g.fillStyle='rgba(15,15,15,.55)';g.fillRect(x+r*.12,y-r*1.12,r*.46,r*.13)}
 else{g.fillStyle='#222';g.beginPath();g.arc(x+r*.24,y-r*1.14,r*.07,0,TAU);g.fill()}
 if(opt.scba){
  const br=Math.sin(T*(mv?7:2.2)+ph),bw=r*(.34+.015*br);
  g.fillStyle='#c9d0d8';scRR(g,x-r*.72-(bw-r*.34)/2,y-r*.5,bw,r*1.02,r*.14);g.fill();
  g.fillStyle='#8a939d';g.fillRect(x-r*.66,y-r*.62,r*.22,r*.14);
  g.fillStyle='#e8ecf0';g.fillRect(x-r*.7,y-r*.12,r*.3,r*.07);
  g.fillStyle='#1a1d22';g.beginPath();g.arc(x-r*.55,y-r*.7,r*.1,0,TAU);g.fill();
  const na=-Math.PI*.9+((T*.012+ph*.07)%1)*Math.PI*.8;
  g.strokeStyle='#ffd24a';g.lineWidth=Math.max(.7,r*.04);g.beginPath();g.moveTo(x-r*.55,y-r*.7);
  g.lineTo(x-r*.55+Math.cos(na)*r*.08,y-r*.7+Math.sin(na)*r*.08);g.stroke();
  g.strokeStyle='#2a2d33';g.lineWidth=Math.max(1,r*.09);g.lineCap='round';
  g.beginPath();g.moveTo(x-r*.55,y-r*.62);g.quadraticCurveTo(x-r*.25,y-r*1.1,x+r*.3,y-r*1);g.stroke();
  g.fillStyle='rgba(120,170,200,.55)';g.beginPath();g.ellipse(x+r*.34,y-r*1.06,r*.22,r*.2,0,0,TAU);g.fill();
  const ex=(T*1.1+ph*.37)%1;
  if(ex<.5){g.fillStyle='rgba(235,242,250,'+(.55*(1-ex*2)).toFixed(2)+')';
   g.beginPath();g.arc(x+r*.62+ex*r*.9,y-r*1-ex*r*.2,r*(.07+.14*ex),0,TAU);g.fill()}}
 const gr=opt.gear;
 if(gr==='aid'){g.fillStyle='#d8362f';scRR(g,x+r*.34,y-r*.46,r*.5,r*.6,r*.1);g.fill();
  g.fillStyle='#fff';g.fillRect(x+r*.54,y-r*.36,r*.1,r*.4);g.fillRect(x+r*.44,y-r*.21,r*.3,r*.1)}
 else if(gr==='o2'){g.fillStyle='#2f8f6a';scRR(g,x+r*.34,y-r*.52,r*.36,r*.8,r*.14);g.fill();
  g.fillStyle='#e9e7e0';g.fillRect(x+r*.42,y-r*.64,r*.2,r*.14)}
 else if(gr==='attack'){g.fillStyle='#6b7f96';scRR(g,x-r*.95,y-r*.42,r*.56,r*.62,r*.18);g.fill();
  g.strokeStyle='#c9d3e0';g.lineWidth=Math.max(.8,r*.12);
  g.beginPath();g.arc(x-r*.67,y-r*.11,r*.16,0,TAU);g.stroke()}
 else if(gr==='bar'){g.strokeStyle='#9aa1a8';g.lineWidth=Math.max(1,r*.2);g.lineCap='round';
  g.beginPath();g.moveTo(x+r*.35,y+r*.25);g.lineTo(x+r*1.25,y-r*.75);g.stroke();
  g.beginPath();g.moveTo(x+r*1.25,y-r*.75);g.lineTo(x+r*1.5,y-r*.6);g.stroke();g.lineCap='butt'}
 else if(gr==='cutter'){g.fillStyle='#e0772f';scRR(g,x+r*.35,y-r*.2,r*.55,r*.3,r*.08);g.fill();
  g.strokeStyle='#d8d4c8';g.lineWidth=Math.max(.8,r*.12);g.beginPath();g.arc(x+r*1.05,y-r*.05,r*.3,0,TAU);g.stroke()}
 else if(gr==='spreader'){g.strokeStyle='#f0c53a';g.lineWidth=Math.max(1,r*.24);g.lineCap='round';
  g.beginPath();g.moveTo(x+r*.35,y);g.lineTo(x+r*.95,y);
  g.moveTo(x+r*.95,y);g.lineTo(x+r*1.4,y-r*.28);g.moveTo(x+r*.95,y);g.lineTo(x+r*1.4,y+r*.28);g.stroke();g.lineCap='butt'}
 if(gr==='cutter'&&!mv)spark(g,x+r*1.05,y-r*.05,r*.7,'rgba(255,205,90,A)',5,T+ph,r*.5);
 if(opt.hose){g.strokeStyle='rgba(125,179,232,.95)';g.lineWidth=Math.max(1,r*.26);
  g.beginPath();g.moveTo(x,y-r*.1);g.lineTo(x+r*1.5,y+r*.2);g.stroke()}
 if(opt.carry){g.fillStyle='rgba(236,234,227,.95)';g.fillRect(x-r*.1,y-r*.15,r*2.8,r*.34);
  g.fillStyle='rgba(226,86,79,.9)';g.fillRect(x+r*.6,y-r*.34,r*1.3,r*.22)}
 if(opt.face<0)g.restore();
 g.lineCap='butt'}
function stryker(g,x,y,ang,c,loaded){
 g.save();g.translate(x,y);g.rotate(ang);
 const L=c*.56,W=c*.2;
 g.fillStyle='#1b1b1b';
 for(const wx of [-L*.42,L*.42])for(const wy of [-W*.62,W*.62]){g.beginPath();g.arc(wx,wy,c*.03,0,TAU);g.fill()}
 g.fillStyle='#f2c21b';scRR(g,-L/2,-W/2,L,W,c*.04);g.fill();
 g.fillStyle='#262626';scRR(g,-L/2+c*.03,-W/2+c*.025,L-c*.06,W-c*.05,c*.03);g.fill();
 g.fillStyle='#f2c21b';g.fillRect(L*.26,-W/2,c*.03,W);
 g.fillRect(-L/2-c*.05,-W*.35,c*.05,W*.7);
 if(loaded){
  g.fillStyle='#2f6fd0';scRR(g,-L*.36,-W*.32,L*.56,W*.64,c*.03);g.fill();
  g.fillStyle='#e6c0a8';g.beginPath();g.arc(L*.3,0,W*.26,0,TAU);g.fill();
  g.fillStyle='#f2c21b';g.fillRect(-L*.1,-W*.42,c*.025,W*.84);g.fillRect(L*.08,-W*.42,c*.025,W*.84)}
 g.restore()}
function spark(g,x,y,r,col,n,t,spread){
 for(let i=0;i<n;i++){
  const ph=(t*.9+i*.37)%1;
  g.fillStyle=col.replace('A',(1-ph).toFixed(2));
  g.beginPath();g.arc(x+Math.sin(i*2.7+t)*spread*ph,y-ph*r*2.4,r*(.3-ph*.18),0,TAU);g.fill()}}
function emsSafe(inc){
 const d=KIND[inc.k];
 if(d.tac&&inc.clr>0)return false;
 if(d.pol&&inc.pol<2)return false;
 if(d.fire)return inc.ph>=3;
 if(d.k==='hazmat')return inc.ph>=3;
 return true}
function drawCrew(g,inc,c,X,Y,cx,cy,mode){
 const safe=emsSafe(inc);
 if(c<11)return;
 let cp=null;const crew=[];
 for(const u of onScene(inc))if(u.st==='work'){crew.push(u);if(!cp&&u.code==='41')cp=u}
 const interior=KIND[inc.k].fire&&inc.rev&&inc.ph>=0&&/入室|搜索|逐房|樓層/.test(inc.phs[inc.ph]);
 const ENTRY=4;
 let slotN=0;
 const r=Math.max(1.8,c*.12);
 for(const u of crew){
  const vx=X(u.x+(u.ox||0))+c/2,vy=Y(u.y+(u.oy||0))+c/2;
  const n=crewOf(u),code=u.code;
  let mm=mode;
  if(code==='91'&&(mm==='attack'||mm==='hose'||mm==='search'))mm='medic';
  if(code==='91'&&!safe)mm='stage';
  const ritN=(KIND[inc.k].fire&&(code==='71'||code==='搜'))?Math.min(2,n-1):0;
  if((code==='11'||code==='16'||code==='57'||code==='61'||code==='01')&&mm==='medic')mm='pump';
  const isDuty=KIND[inc.k].cls==='公務';
  if(code==='41'&&!isDuty)mm='cmd';
  const kit=KIND[inc.k].cls==='公務'?'duty':code==='91'?'medic':(code==='71'||code==='搜'||code==='履')?'rescue':code==='41'?'cmd':'fire';
  const isPump=!!CODE[code].cap;
  if(isPump&&S.t>(u.at||0)+1){
   const back=(u.hd||0)+Math.PI;
   const px0=vx+Math.cos(back)*c*.42,py0=vy+Math.sin(back)*c*.42;
   g.save();g.translate(px0,py0);g.rotate(u.hd||0);
   g.fillStyle='rgba(40,38,34,.9)';scRR(g,-c*.12,-c*.13,c*.24,c*.26,c*.03);g.fill();
   const on=(S.t*4|0)%2;
   g.fillStyle=on?'#8fe3c4':'#3fae86';g.fillRect(-c*.07,-c*.08,c*.05,c*.05);
   g.fillStyle='#f3c43b';g.fillRect(c*.01,-c*.08,c*.05,c*.05);
   g.fillStyle='rgba(200,215,230,.8)';g.fillRect(-c*.07,c*.01,c*.13,c*.03);
   g.restore();
   figure(g,px0+Math.cos(back)*c*.2,py0+Math.sin(back)*c*.2,r,'fire',{ph:9})}
  const phFrac=inc.ph>=0?(inc.work/inc.dur*inc.phs.length-inc.ph):0;
  const curPh=inc.ph>=0?inc.phs[inc.ph]:'';
  // 交接／後送／收整才是善後；脫困、救出、吊掛屬主動救援
  const handover=/轉交|後送|上車|搬運|現場復原/.test(curPh)||inc.wrap>0;
  const carryPh=handover||(code==='91'&&curPh==='次評處置'&&phFrac>.6);
  if(!carryPh&&mm==='carry')mm=code==='91'?'medic':'work';
  if(carryPh&&code==='91'&&!isDuty){
   const tri=(S.t*.2+(u.id%5)*.13)%1,go=tri<.5,t4=go?tri*2:2-tri*2;
   const sx=cx+(vx-cx)*t4,sy=cy+(vy-cy)*t4,ang=Math.atan2(vy-cy,vx-cx);
   stryker(g,sx,sy,ang,c,go);
   const hx=sx-Math.cos(ang)*c*.36,hy=sy-Math.sin(ang)*c*.36;
   const fx=sx+Math.cos(ang)*c*.36,fy=sy+Math.sin(ang)*c*.36;
   figure(g,go?hx:fx,go?hy:fy,r,'medic',{ph:1,moving:1,gear:'aid'});
   figure(g,go?fx:hx,go?fy:hy,r,'medic',{ph:3,moving:1,gear:'o2'});
   if(n>2)figure(g,sx+Math.sin(ang)*c*.3,sy-Math.cos(ang)*c*.3,r,'medic',{ph:5,moving:1});
   continue}
  if(carryPh&&code!=='91')mm='packup';
  for(let i=0;i<n;i++){
   const born=(u.at||0)+.5+i*.5;
   if(S.t<born)continue;
   const ph=(S.t*.3+i*.29+(u.id%7)*.13)%1;
   let px=vx,py=vy,mv=0;
   const inMode=(mm==='attack'||mm==='search');
   if(interior&&inMode&&!(ritN&&i<ritN)){
    const gidx=slotN++;
    const rot=Math.floor(S.t/26);
    if(((gidx+rot)%Math.max(ENTRY,slotN+2))>=ENTRY){
     const base=cp||u;
     const ax7=X(base.x+(base.ox||0))+c/2,ay7=Y(base.y+(base.oy||0))+c/2;
     const a8=(base.hd||0)-Math.PI/2;
     const rx=ax7+Math.cos(a8)*c*.95+((gidx%3)-1)*c*.22;
     const ry=ay7+Math.sin(a8)*c*.95+(Math.floor(gidx/3)%2)*c*.22;
     g.strokeStyle='#8f8b82';g.lineWidth=Math.max(1,r*.3);
     g.beginPath();g.moveTo(rx,ry+r*.3);g.lineTo(rx+r*.5,ry+r*.75);g.stroke();
     figure(g,rx,ry,r*.92,kit,{ph:i,helmet:false});
     continue}}
   if(ritN&&i<ritN){
    const ea=Math.atan2(Y(inc.ay)+c/2-cy,X(inc.ax)+c/2-cx);
    px=cx+Math.cos(ea)*c*.95+(i-(ritN-1)/2)*Math.cos(ea+Math.PI/2)*c*.28;
    py=cy+Math.sin(ea)*c*.95+(i-(ritN-1)/2)*Math.sin(ea+Math.PI/2)*c*.28;
    px+=Math.sin(S.t*.9+i)*c*.02;py+=Math.cos(S.t*.8+i)*c*.02;
    figure(g,px,py,r,'rescue',{ph:i*2.2,helmet:c>=15,scba:c>=16});
    if(i===0&&c>=17){g.fillStyle='rgba(200,60,50,.85)';
     scRR(g,px-c*.24,py-c*.62,c*.48,c*.22,c*.04);g.fill();
     g.fillStyle='#fff';g.font='600 '+(c*.17)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
     g.fillText('RIT',px,py-c*.51)}
    continue}
   if(mm==='packup'){
    const side=(u.hd||0)+Math.PI/2;
    if(i%3===0){
     const ph5=(S.t*.25+i*.3+(u.id%4)*.2)%1,tr5=ph5<.5?ph5*2:2-ph5*2;
     const ox5=vx+(cx-vx)*.55,oy5=vy+(cy-vy)*.55;
     px=vx+Math.cos(side)*c*.35+(ox5-vx)*tr5;py=vy+Math.sin(side)*c*.35+(oy5-vy)*tr5;
     figure(g,px,py,r,kit,{ph:i,moving:1,helmet:c>=15});
     g.fillStyle='#5b5f66';scRR(g,px+r*.3,py-r*.35,r*.9,r*.55,r*.1);g.fill();
     g.fillStyle='#f0c53a';g.fillRect(px+r*.45,py-r*.3,r*.6,r*.1);
     continue}
    px=vx+Math.cos(side)*c*.42+((i%3)-1)*Math.cos(u.hd||0)*c*.24+Math.sin(S.t*1.4+i)*c*.02;
    py=vy+Math.sin(side)*c*.42+((i%3)-1)*Math.sin(u.hd||0)*c*.24+Math.cos(S.t*1.2+i)*c*.02}
   else if(mm==='stage'){
    const anchor=cp?{x:X(cp.x+(cp.ox||0))+c/2,y:Y(cp.y+(cp.oy||0))+c/2}:{x:vx,y:vy};
    const a6=(u.hd||0)+Math.PI/2;
    px=anchor.x+Math.cos(a6)*c*.5+(i-(n-1)/2)*c*.2;
    py=anchor.y+Math.sin(a6)*c*.5+Math.sin(S.t*.8+i)*c*.03}
   else if(mm==='line'){
    const a=(u.hd||0)+Math.PI/2;
    px=vx+Math.cos(a)*c*.45+(i-(n-1)/2)*Math.cos(u.hd||0)*c*.26;
    py=vy+Math.sin(a)*c*.45+(i-(n-1)/2)*Math.sin(u.hd||0)*c*.26}
   else if(mm==='pump'){
    px=vx+Math.cos((u.hd||0)+Math.PI/2)*c*.4;
    py=vy+Math.sin((u.hd||0)+Math.PI/2)*c*.4}
   else if(mm==='cmd'){
    px=vx+Math.cos((u.hd||0)+Math.PI/2)*c*.55+(i?c*.18:-c*.18);
    py=vy+Math.sin((u.hd||0)+Math.PI/2)*c*.55}
   else if(mm==='hose'||mm==='carry'){
    const tri=ph<.5?ph*2:2-ph*2;
    px=vx+(cx-vx)*tri;py=vy+(cy-vy)*tri;mv=1}
   else if(mm==='search'){
    const a=S.t*.6+i*2.1+(u.id%5);
    px=cx+Math.cos(a)*c*(.65+.25*Math.sin(S.t*.5+i));
    py=cy+Math.sin(a)*c*(.6+.2*Math.cos(S.t*.4+i));mv=1}
   else{
    const a=(i/n)*TAU+(u.id%9)*.3,rad=c*(mm==='attack'?.6:.45);
    px=cx+Math.cos(a)*rad+Math.sin(S.t*2+i*1.7)*c*.04;
    py=cy+Math.sin(a)*rad+Math.cos(S.t*2.3+i*1.3)*c*.04}
   let gear=null;
   if(!isDuty){
    if(code==='91')gear=i%2===0?'aid':'o2';
    else if(kit==='rescue')gear=(mm==='work'||mm==='carry'||mm==='attack')?(i%2===0?'spreader':'cutter'):null;
    else if(kit==='fire'&&(mm==='attack'||mm==='search'||mm==='work'||mm==='hose')){
     if(i===1)gear='attack';
     else if(i===2&&(u.id%3)!==0)gear=(u.id%2)?'bar':'cutter'}}
   figure(g,px,py,r,(u.lead&&i===0&&!isDuty)?'cmd':kit,{gear:gear,ph:i*1.9,moving:mv,helmet:c>=15,face:cx<px?-1:1,
    scba:c>=16&&(mm==='attack'||mm==='search')&&code!=='91',
    hose:c>=15&&mm==='attack'&&(code==='11'||code==='16'||code==='57'),
    carry:mm==='carry'&&i===0&&n>1})}
  if(code==='搜'&&S.t>(u.at||0)+1){
   const a=S.t*1.1+(u.id%4);
   const dx=cx+Math.cos(a)*c*.9,dy=cy+Math.sin(a)*c*.85;
   g.fillStyle='#caa46a';g.fillRect(dx-r*.7,dy-r*.3,r*1.4,r*.55);
   g.beginPath();g.arc(dx+r*.78,dy-r*.34,r*.34,0,TAU);g.fill();
   g.fillRect(dx-r*.9,dy-r*.5,r*.3,r*.3);
   const da=S.t*1.5+(u.id%3);
   g.fillStyle='rgba(207,176,245,.9)';
   g.beginPath();g.arc(cx+Math.cos(da)*c*1.25,cy+Math.sin(da)*c*1.1,Math.max(1.2,c*.07),0,TAU);g.fill();
   if((S.t*5|0)%2){g.fillStyle='rgba(255,90,90,.95)';
    g.beginPath();g.arc(cx+Math.cos(da)*c*1.25,cy+Math.sin(da)*c*1.1,Math.max(.8,c*.035),0,TAU);g.fill()}}
  if(code==='41'&&!isDuty&&S.t>(u.at||0)+1.5){
   const a=(u.hd||0)+Math.PI/2;
   const sx=vx+Math.cos(a)*c*.68,sy=vy+Math.sin(a)*c*.68;
   g.fillStyle='rgba(243,196,122,.92)';
   scRR(g,sx-c*.24,sy-c*.17,c*.48,c*.32,c*.05);g.fill();
   g.fillStyle='rgba(20,18,14,.55)';g.fillRect(sx-c*.16,sy-c*.08,c*.32,c*.14);
   g.strokeStyle='rgba(243,196,122,.85)';g.lineWidth=Math.max(1,c*.04);
   g.beginPath();g.moveTo(sx+c*.22,sy-c*.17);g.lineTo(sx+c*.22,sy-c*.5);g.stroke();
   if((S.t*3|0)%2){g.fillStyle='#ffd27a';
    g.beginPath();g.arc(sx+c*.22,sy-c*.52,Math.max(1,c*.05),0,TAU);g.fill()}
   if(c>=22){g.fillStyle='#120f0e';g.font='600 '+(c*.17)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
    g.fillText('指揮站',sx,sy+c*.02)}}}}
// 現場畫面特效：等待時的雷達圈、到場後紅藍警示光、火警的火星與煙霧
function sceneFx(g,inc,d,crew,c,cx,cy){
 const T=S.t;
 if(!crew.length){const p=(T*.8)%1;
  g.strokeStyle='rgba(233,161,59,'+(.7*(1-p)).toFixed(2)+')';g.lineWidth=2;
  g.beginPath();g.arc(cx,cy,c*(.4+p*1.6),0,TAU);g.stroke()}
 else{const a=.1+.05*Math.sin(T*12),on=(T*4|0)%2;
  const gr=g.createRadialGradient(cx,cy,c*.3,cx,cy,c*4.5);
  gr.addColorStop(0,(on?'rgba(255,60,50,':'rgba(70,130,255,')+(a*2).toFixed(3)+')');
  gr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=gr;g.fillRect(cx-c*4.5,cy-c*4.5,c*9,c*9)}
 if(d.fire&&inc.work<inc.dur){
  const lit=Math.max(.2,1-inc.work/inc.dur);
  for(let i=0;i<16;i++){
   const p=(T*.3+i/16)%1,sx=cx+Math.sin(i*12.9+T*.9)*c*(.5+p*.6),sy=cy-c*.3-p*c*3;
   if(i%2){g.fillStyle='rgba(255,'+(150+i*6)+',60,'+((1-p)*.8*lit).toFixed(2)+')';
    g.beginPath();g.arc(sx,sy,Math.max(1,c*.045),0,TAU);g.fill()}
   else{g.fillStyle='rgba(120,116,110,'+((1-p)*.22*lit).toFixed(3)+')';
    g.beginPath();g.arc(sx,sy,c*(.15+p*.4),0,TAU);g.fill()}}}}
// 現場動畫第二層：救助碎屑
function sceneFx2(g,inc,d,crew,c,X,Y,cx,cy){
 if(c<11||!inc.rev)return;
 const T=S.t;
 if(!crew.some(u=>u.st==='work'))return;
 if(d.cls==='救助'){
  g.fillStyle='rgba(150,144,134,.28)';
  for(let i=0;i<7;i++){const p=(T*.5+i/7)%1;
   g.beginPath();g.arc(cx+Math.sin(i*7.7+T)*c*.6,cy-p*c*1.4,c*(.06+.1*p),0,TAU);g.fill()}}}
// 地圖與現場畫面交換位置：選取案件且未開採購面板時才生效
