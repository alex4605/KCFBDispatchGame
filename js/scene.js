// 現場畫面繪製
'use strict';
const scv=document.getElementById('sc'),sctx=scv.getContext('2d');
let scW=400,scH=260,wantSwap=false,isSwapped=false,scZoom=1;
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
   figure(g,px0+Math.cos(back)*c*.2,py0+Math.sin(back)*c*.2,r,'fire',{ph:9});
   if(effLines(inc)>0&&waterOK(inc)){
    g.strokeStyle='rgba(125,179,232,.55)';g.lineWidth=Math.max(1,c*.06);
    g.beginPath();g.moveTo(px0,py0);g.lineTo(cx,cy);g.stroke()}}
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
  g.fillStyle=gr;g.fillRect(0,0,scW,scH)}
 if(d.fire&&inc.work<inc.dur){
  const lit=Math.max(.2,1-inc.work/inc.dur);
  for(let i=0;i<16;i++){
   const p=(T*.3+i/16)%1,sx=cx+Math.sin(i*12.9+T*.9)*c*(.5+p*.6),sy=cy-c*.3-p*c*3;
   if(i%2){g.fillStyle='rgba(255,'+(150+i*6)+',60,'+((1-p)*.8*lit).toFixed(2)+')';
    g.beginPath();g.arc(sx,sy,Math.max(1,c*.045),0,TAU);g.fill()}
   else{g.fillStyle='rgba(120,116,110,'+((1-p)*.22*lit).toFixed(3)+')';
    g.beginPath();g.arc(sx,sy,c*(.15+p*.4),0,TAU);g.fill()}}}}
// 現場動畫第二層：射水水柱與水霧、患者心電圖、救助碎屑
// 心電圖波形（P、QRS、T），回傳 0~1 的振幅
function ecgY(q){
 if(q<.10)return 0;
 if(q<.20)return .12*Math.sin((q-.10)/.10*Math.PI);
 if(q<.28)return 0;
 if(q<.31)return -.12*Math.sin((q-.28)/.03*Math.PI);
 if(q<.35)return Math.sin((q-.31)/.04*Math.PI);
 if(q<.38)return -.22*Math.sin((q-.35)/.03*Math.PI);
 if(q<.50)return 0;
 if(q<.64)return .25*Math.sin((q-.50)/.14*Math.PI);
 return 0}
function sceneFx2(g,inc,d,crew,c,X,Y,cx,cy){
 if(c<11||!inc.rev)return;
 const T=S.t,work=crew.filter(u=>u.st==='work');
 if(!work.length)return;
 if(d.w&&inc.work<inc.dur&&waterOK(inc)){
  g.save();g.lineCap='round';g.setLineDash([c*.14,c*.1]);g.lineDashOffset=-T*c*4;
  g.strokeStyle='rgba(150,205,255,.6)';g.lineWidth=Math.max(1.5,c*.06);
  for(const u of work){if(!CODE[u.code].cap||u.code==='61')continue;
   const vx=X(u.x+(u.ox||0))+c/2,vy=Y(u.y+(u.oy||0))+c/2,sx=vx+(cx-vx)*.5,sy=vy+(cy-vy)*.5;
   g.beginPath();g.moveTo(sx,sy);g.quadraticCurveTo((sx+cx)/2,Math.min(sy,cy)-c*.45,cx,cy);g.stroke()}
  g.restore();
  g.fillStyle='rgba(200,225,255,.35)';
  for(let i=0;i<8;i++){const p=(T*.9+i/8)%1,a=i*2.4+T;
   g.beginPath();g.arc(cx+Math.cos(a)*c*.5*p,cy+Math.sin(a)*c*.3*p-p*c*.4,c*(.04+.05*p),0,TAU);g.fill()}}
 if(d.cls==='救護'&&work.some(u=>u.code==='91')){
  const w=Math.min(scW*.3,c*3),h=c*1.1,x0=scW-w-8,y0=40+h/2,flat=inc.pm&&inc.pm.ohca,hr=+(inc.pm&&inc.pm.hr)||80;
  g.fillStyle='rgba(6,14,12,.88)';scRR(g,x0-6,y0-h/2-6,w+12,h+12,5);g.fill();
  g.strokeStyle='rgba(60,110,95,.5)';g.lineWidth=1;g.strokeRect(x0-6,y0-h/2-6,w+12,h+12);
  g.strokeStyle='rgba(60,110,95,.18)';g.beginPath();
  for(let gx=0;gx<=w;gx+=w/8){g.moveTo(x0+gx,y0-h/2);g.lineTo(x0+gx,y0+h/2)}
  for(let gy=-1;gy<=1;gy++){g.moveTo(x0,y0+gy*h/2.2);g.lineTo(x0+w,y0+gy*h/2.2)}
  g.stroke();
  g.fillStyle=flat?'#e2564f':'#5dcaa5';g.font='600 11px '+FONT;g.textAlign='left';g.textBaseline='top';
  g.fillText(flat?'ASYSTOLE':'HR '+hr,x0-2,y0-h/2-4);
  g.strokeStyle=flat?'rgba(226,86,79,.9)':'rgba(93,202,165,.9)';g.lineWidth=1.4;g.beginPath();
  for(let i=0;i<=60;i++){const q=(((i/60)*3+T*hr/60)%1+1)%1;let y=0;
   if(!flat)y=-ecgY(q);
   const px=x0+w*i/60,py=y0+y*h*.42;
   if(i)g.lineTo(px,py);else g.moveTo(px,py)}
  g.stroke()}
 if(d.cls==='救助'){
  g.fillStyle='rgba(150,144,134,.28)';
  for(let i=0;i<7;i++){const p=(T*.5+i/7)%1;
   g.beginPath();g.arc(cx+Math.sin(i*7.7+T)*c*.6,cy-p*c*1.4,c*(.06+.1*p),0,TAU);g.fill()}}}
// 地圖與現場畫面交換位置：選取案件且未開採購面板時才生效
function applySwap(){
 const sw=document.getElementById('scenewrap'),mw=$('mapwrap'),m=document.querySelector('main'),r=$('right');
 const want=wantSwap&&sw.style.display!=='none'&&!shopOn;
 if(want===isSwapped)return;
 isSwapped=want;
 if(want){m.insertBefore(sw,r);r.insertBefore(mw,$('detail'))}
 else{m.insertBefore(mw,r);r.insertBefore(sw,$('detail'))}
 m.classList.toggle('sw',want);
 size();if(want)fit()}
const SCACHE={key:'',cv:null};
function drawScene(){
 const wrap=document.getElementById('scenewrap');
 const inc=S.inc.find(i=>i.id===sel);
 if(!inc){if(wrap.style.display!=='none')wrap.style.display='none';applySwap();return}
 if(wrap.style.display==='none'){wrap.style.display='block';sizeScene()}
 applySwap();
 const g=sctx,d=KIND[inc.k],crew=onScene(inc);
 const dayT=(S.t%200)/200;
 const nf=Math.max(0,Math.min(1,(dayT-.55)/.15)-Math.min(1,Math.max(0,(dayT-.9)/.08)));
 const work=[],pumpsV=[],ambV=[],rescV=[],cmdV=[];
 for(const u of crew){
  if(u.st!=='work')continue;
  work.push(u);
  const cd=u.code;
  if(CODE[cd].cap&&cd!=='61')pumpsV.push(u);
  if(cd==='91')ambV.push(u);
  if(cd==='71'||cd==='搜')rescV.push(u);
  if(cd==='41')cmdV.push(u)}
 const safeNow=emsSafe(inc),effNow=d.w?Math.max(0,effLines(inc)-(inc.burst>0?1:0)):0,wOK=waterOK(inc);
 const ct=Math.max(12,(isSwapped?46:Math.min(scW/11,scH/7))*scZoom);
 const HW=Math.max(2,Math.ceil(scW/ct/2)),HH=Math.max(1,Math.ceil(scH/ct/2));
 const txU=crew.filter(u=>u.st==='tx'||u.st==='give'||u.st==='clean')[0];
 const fx=txU?txU.x:inc.x,fy=txU?txU.y:inc.y;
 let x0=Math.round(fx)-HW,x1=Math.round(fx)+HW;
 let y0=Math.round(fy)-HH,y1=Math.round(fy)+HH;
 const showHyd=d.w&&inc.hy&&inc.hy[0]>=x0&&inc.hy[0]<=x1&&inc.hy[1]>=y0&&inc.hy[1]<=y1;
 const cols=x1-x0+1,rows=y1-y0+1;
 const c=ct;
 const ox=(scW-c*cols)/2,oy=(scH-c*rows)/2;
 const X=v=>ox+(v-x0)*c,Y=v=>oy+(v-y0)*c;
 const tkey=x0+','+y0+','+cols+','+rows+','+c.toFixed(2)+','+scW+','+scH+','+S.mapV;
 if(SCACHE.key!==tkey){
  SCACHE.key=tkey;
  const cv=SCACHE.cv||(SCACHE.cv=document.createElement('canvas'));
  cv.width=Math.round(scW*dpr);cv.height=Math.round(scH*dpr);
  const tg=cv.getContext('2d');tg.setTransform(dpr,0,0,dpr,0,0);
  tg.fillStyle='#0b0b0a';tg.fillRect(0,0,scW,scH);
  for(let x=Math.max(0,x0);x<=Math.min(N-1,x1);x++)
   for(let y=Math.max(0,y0);y<=Math.min(N-1,y1);y++){
    const k=K(x,y),t=TR[k],r=RD[k],sh=SH[k],px=X(x),py=Y(y);
    tg.fillStyle=t===1?'#0e2436':t===2?'#18291d':t===3?'#202836':t===4?'#212327':
     (sh<.33?'#1a1a18':sh<.66?'#1f1f1c':'#232320');
    tg.fillRect(px,py,c+.6,c+.6);
    if(!r&&!t&&c>9){tg.fillStyle='rgba(0,0,0,.35)';tg.fillRect(px+c*.78,py,c*.22,c+.6)}
    if(r){tg.fillStyle=RCOL[r];tg.fillRect(px,py,c+.6,c+.6);
     if(r>=2&&r<=3&&c>13){tg.strokeStyle='rgba(255,255,255,.07)';tg.lineWidth=1;
      tg.beginPath();tg.moveTo(px,py+c/2);tg.lineTo(px+c,py+c/2);tg.stroke()}}}}
 g.drawImage(SCACHE.cv,0,0,scW,scH);
 // 建物窗光隨晝夜變化，另外疊畫（量少）
 if(c>16)for(let x=Math.max(0,x0);x<=Math.min(N-1,x1);x++)
  for(let y=Math.max(0,y0);y<=Math.min(N-1,y1);y++){
   const k=K(x,y);if(RD[k]||TR[k]||SH[k]<=.5)continue;
   g.fillStyle='rgba(255,220,150,'+(.1+nf*.25).toFixed(2)+')';
   g.fillRect(X(x)+c*.18,Y(y)+c*.2,c*.16,c*.16);g.fillRect(X(x)+c*.5,Y(y)+c*.45,c*.16,c*.16)}
 const cx=X(inc.x)+c/2,cy=Y(inc.y)+c/2;
 if(nf>0){g.fillStyle='rgba(10,16,34,'+(.5*nf).toFixed(3)+')';g.fillRect(0,0,scW,scH)}
 // 災點建物與景物
 (function(){
  const bx=X(inc.x),by=Y(inc.y),k0=K(inc.x,inc.y),t0=TR[k0];
  if(!RD[k0]&&t0!==1){
   const burnt=d.fire?Math.min(1,inc.work/inc.dur):0;
   g.fillStyle=d.fire?(burnt>.75?'#191512':'#2a221e'):'#24241f';
   g.fillRect(bx+c*.04,by+c*.04,c*.92,c*.92);
   if(burnt>.75){g.fillStyle='rgba(10,8,7,'+((burnt-.75)*1.6).toFixed(2)+')';
    g.fillRect(bx+c*.04,by+c*.04,c*.92,c*.92)}
   g.fillStyle='rgba(0,0,0,.45)';g.fillRect(bx+c*.72,by+c*.04,c*.24,c*.92);
   g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=1;
   g.strokeRect(bx+c*.04,by+c*.04,c*.92,c*.92);
   if(c>=16){
    const lit=d.fire?Math.max(.2,1-inc.work/inc.dur):0;
    for(let wx=0;wx<3;wx++)for(let wy=0;wy<3;wy++){
     const fl=d.fire?(Math.sin(S.t*7+wx*2+wy*3)*.5+.5)*lit:0;
     g.fillStyle=d.fire?'rgba(255,'+(140+fl*80|0)+',60,'+(.25+fl*.6).toFixed(2)+')':'rgba(220,214,170,'+(.12+nf*.35).toFixed(2)+')';
     g.fillRect(bx+c*(.16+wx*.26),by+c*(.16+wy*.26),c*.16,c*.16)}}}
  const K2=inc.k;
  if(KIND[K2]&&KIND[K2].road){
   const ra=(RD[K(inc.x+1,inc.y)]||RD[K(inc.x-1,inc.y)])?0:Math.PI/2;
   g.strokeStyle='rgba(20,20,20,.55)';g.lineWidth=Math.max(1.5,c*.07);
   for(let i8=-1;i8<=1;i8+=2){
    g.beginPath();
    g.moveTo(cx-Math.cos(ra)*c*1.3+Math.sin(ra)*i8*c*.14,cy-Math.sin(ra)*c*1.3-Math.cos(ra)*i8*c*.14);
    g.lineTo(cx-Math.cos(ra)*c*.25+Math.sin(ra)*i8*c*.12,cy-Math.sin(ra)*c*.25-Math.cos(ra)*i8*c*.12);
    g.stroke()}
   g.fillStyle='#e9a13b';
   for(let i8=0;i8<4;i8++){
    const px=cx-Math.cos(ra)*c*(1.5+i8*.45),py=cy-Math.sin(ra)*c*(1.5+i8*.45);
    const off=(i8+1)*c*.08;
    g.beginPath();
    g.moveTo(px+Math.sin(ra)*off,py-Math.cos(ra)*off-c*.1);
    g.lineTo(px+Math.sin(ra)*off+c*.08,py-Math.cos(ra)*off+c*.08);
    g.lineTo(px+Math.sin(ra)*off-c*.08,py-Math.cos(ra)*off+c*.08);
    g.closePath();g.fill()}
   if(inc.pol===2){
    g.strokeStyle='rgba(233,161,59,.75)';g.lineWidth=Math.max(1.4,c*.06);
    g.setLineDash([c*.18,c*.12]);
    g.beginPath();
    g.moveTo(cx+Math.cos(ra)*c*1.1+Math.sin(ra)*c*.7,cy+Math.sin(ra)*c*1.1-Math.cos(ra)*c*.7);
    g.lineTo(cx+Math.cos(ra)*c*1.1-Math.sin(ra)*c*.7,cy+Math.sin(ra)*c*1.1+Math.cos(ra)*c*.7);
    g.stroke();g.setLineDash([])}}
  if(K2==='rtc'||K2==='hiway'||K2==='polrtc'||K2==='truckfire'||K2==='carfire'){
   for(let i=0;i<2;i++){
    const a=i?0.6:-0.9;
    g.save();g.translate(cx+(i?c*.3:-c*.28),cy+(i?c*.22:-c*.18));g.rotate(a);
    g.fillStyle=i?'#5b5f66':'#6d5a52';scRR(g,-c*.22,-c*.13,c*.44,c*.26,c*.05);g.fill();
    g.fillStyle='rgba(20,20,20,.5)';g.fillRect(-c*.04,-c*.13,c*.08,c*.26);g.restore()}
   g.fillStyle='rgba(180,180,180,.5)';
   for(let i=0;i<6;i++)g.fillRect(cx+Math.sin(i*2.3)*c*.5,cy+Math.cos(i*1.7)*c*.4,c*.05,c*.05)}
  if(K2==='collapse'||K2==='slide'||K2==='crane'){
   g.fillStyle='#4a453f';
   for(let i=0;i<7;i++){
    const a=i*.9,rr=c*(.2+(i%3)*.18);
    g.beginPath();g.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr-c*.06);
    g.lineTo(cx+Math.cos(a)*rr+c*.16,cy+Math.sin(a)*rr+c*.1);
    g.lineTo(cx+Math.cos(a)*rr-c*.14,cy+Math.sin(a)*rr+c*.12);
    g.closePath();g.fill()}}
  if(K2==='drown'||K2==='flood'||K2==='ship'){
   g.strokeStyle='rgba(125,179,232,.5)';g.lineWidth=Math.max(1,c*.05);
   for(let i=0;i<3;i++){const rr=c*(.3+i*.28)+((S.t*.4)%.3)*c;
    g.beginPath();g.arc(cx,cy,rr,0,TAU);g.stroke()}}
  if(K2==='tree'){
   g.strokeStyle='#5a4a33';g.lineWidth=Math.max(2,c*.12);
   g.beginPath();g.moveTo(cx-c*.5,cy+c*.2);g.lineTo(cx+c*.45,cy-c*.1);g.stroke();
   g.fillStyle='rgba(90,130,70,.7)';
   for(let i=0;i<4;i++){g.beginPath();g.arc(cx+c*(.1+i*.12),cy-c*(.05+ (i%2)*.12),c*.13,0,TAU);g.fill()}}
  if(K2==='elec'){
   g.fillStyle='#4b4740';scRR(g,cx-c*.16,cy-c*.2,c*.32,c*.4,c*.04);g.fill();
   if((S.t*8|0)%2){g.strokeStyle='#bfe3ff';g.lineWidth=Math.max(1,c*.04);
    g.beginPath();g.moveTo(cx-c*.1,cy-c*.1);g.lineTo(cx+c*.05,cy);g.lineTo(cx-c*.03,cy+c*.06);
    g.lineTo(cx+c*.12,cy+c*.16);g.stroke()}}
  if(K2==='aircraft'){
   g.fillStyle='#8e939b';
   g.save();g.translate(cx,cy);g.rotate(.6);
   scRR(g,-c*.7,-c*.09,c*1.4,c*.18,c*.06);g.fill();
   scRR(g,-c*.12,-c*.5,c*.2,c*1.0,c*.05);g.fill();g.restore()}
  if(K2==='lift'){
   g.strokeStyle='rgba(200,200,200,.5)';g.lineWidth=Math.max(1,c*.05);
   g.strokeRect(cx-c*.18,cy-c*.3,c*.36,c*.6);
   g.fillStyle='rgba(143,184,208,.6)';g.fillRect(cx-c*.14,cy-c*.05+Math.sin(S.t)*c*.04,c*.28,c*.22)}
 })();
 // 圍觀民眾
 if(inc.rev&&(inc.calls||1)>=2&&c>=13){
  const nb2=Math.min(16,3+Math.round((inc.calls||1)*1.3));
  for(let i=0;i<nb2;i++){
   const a=(i/nb2)*TAU+1.1+Math.sin(S.t*.25+i)*.06;
   const rr=c*(1.8+(i%3)*.22);
   figure(g,cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,Math.max(1.4,c*.09),'civ',{ph:i})}}
 // 傷患
 if(inc.rev&&inc.pm.trap>0){
  const left=Math.max(0,Math.round(inc.pm.trap*(1-Math.min(1,inc.work/inc.dur))));
  for(let i=0;i<left&&i<6;i++){
   const a=TAU*i/Math.max(1,left)+1.7;
   const px=cx+Math.cos(a)*c*.42,py=cy+Math.sin(a)*c*.42;
   g.save();g.translate(px,py);g.rotate(a);
   g.fillStyle='#d7b3a6';scRR(g,-c*.16,-c*.05,c*.32,c*.1,c*.04);g.fill();
   g.beginPath();g.arc(-c*.2,0,c*.06,0,TAU);g.fill();g.restore()}}
 // 警戒圈 / 擔架動線 / 後送方向

 if(d.cls==='救助'||d.tac){
  g.strokeStyle='rgba(233,161,59,.5)';g.lineWidth=Math.max(1,c*.05);
  g.setLineDash([c*.24,c*.24]);g.lineDashOffset=-(S.t*10)%(c*.48);
  g.beginPath();g.arc(cx,cy,c*1.5,0,TAU);g.stroke();g.setLineDash([])}
 
 // 供水水帶（流動）
 if(d.w&&showHyd&&inc.hp&&inc.hp.length&&wOK&&!inc.tender){
  if(inc.supT0===undefined)inc.supT0=S.t;
  const slay=Math.min(1,(S.t-inc.supT0)/3),fpts=[[X(inc.ax)+c/2,Y(inc.ay)+c/2]];
  for(const q of inc.hp)fpts.push([X(q[0])+c/2,Y(q[1])+c/2]);
  fpts.reverse();
  let flen=0;for(let i3=1;i3<fpts.length;i3++)flen+=Math.hypot(fpts[i3][0]-fpts[i3-1][0],fpts[i3][1]-fpts[i3-1][1]);
  const hpts=[fpts[0]];let rem=flen*slay;
  for(let i3=1;i3<fpts.length&&rem>0;i3++){const A=fpts[i3-1],B=fpts[i3],sl=Math.hypot(B[0]-A[0],B[1]-A[1]);
   if(sl<=rem){hpts.push(B);rem-=sl}else{const f=rem/sl;hpts.push([A[0]+(B[0]-A[0])*f,A[1]+(B[1]-A[1])*f]);rem=0}}
  g.setLineDash([]);g.lineCap='round';g.lineJoin='round';
  g.beginPath();hpts.forEach((p,i3)=>{if(i3)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])});
  g.strokeStyle='rgba(8,18,22,.6)';g.lineWidth=Math.max(3,c*.2);g.stroke();
  g.strokeStyle='rgba(60,150,125,.65)';g.lineWidth=Math.max(2,c*.12);g.stroke();
  g.strokeStyle='#8fe3c4';g.lineWidth=Math.max(1,c*.05);
  g.setLineDash([c*.5,c*.3]);g.lineDashOffset=-(S.t*26)%(c*.8);
  g.beginPath();hpts.forEach((p,i3)=>{if(i3)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])});
  g.stroke();g.setLineDash([]);g.lineCap='butt';
  // 水帶接頭與水壓脈衝（由消防栓流向現場）
  g.fillStyle='#d6ae4a';
  hpts.forEach((p,i3)=>{if(i3%2===0){g.beginPath();g.arc(p[0],p[1],Math.max(1.5,c*.06),0,TAU);g.fill()}});
  let tot=0;const seg=[];
  for(let i3=1;i3<hpts.length;i3++){const l3=Math.hypot(hpts[i3][0]-hpts[i3-1][0],hpts[i3][1]-hpts[i3-1][1]);seg.push(l3);tot+=l3}
  if(tot>1&&slay>=1)for(let k3=0;k3<4;k3++){
   let dist=((S.t*.35+k3/4)%1)*tot,i3=0;
   while(i3<seg.length-1&&dist>seg[i3]){dist-=seg[i3];i3++}
   const f=seg[i3]?dist/seg[i3]:0,P0=hpts[i3],P1=hpts[i3+1]||P0;
   g.fillStyle='rgba(220,255,240,.85)';g.beginPath();
   g.arc(P0[0]+(P1[0]-P0[0])*f,P0[1]+(P1[1]-P0[1])*f,Math.max(1.5,c*.06),0,TAU);g.fill()}}
 if(showHyd){
  if(wOK){const pr=(S.t*.8)%1;g.strokeStyle='rgba(125,179,232,'+(.6*(1-pr)).toFixed(2)+')';g.lineWidth=1.5;
   g.beginPath();g.arc(X(inc.hy[0])+c/2,Y(inc.hy[1])+c/2,c*(.26+pr*.5),0,TAU);g.stroke()}
  g.fillStyle='#7db3e8';g.beginPath();g.arc(X(inc.hy[0])+c/2,Y(inc.hy[1])+c/2,Math.max(3,c*.26),0,TAU);g.fill();
  if(c>=15){g.fillStyle='#08131d';g.font='600 '+(c*.34)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText('栓',X(inc.hy[0])+c/2,Y(inc.hy[1])+c/2)}}
 // 出水線與噴射
 const atk=pumpsV,eff=effNow;
 for(let li=0;li<eff&&atk.length;li++){
  const a=atk[li%atk.length];
  const foam=a.code==='57'||a.code==='01';
  const ax=X(a.x+(a.ox||0))+c/2,ay=Y(a.y+(a.oy||0))+c/2;
  const mx=ax+(cx-ax)*.5+(li-eff/2)*c*.2,my=ay+(cy-ay)*.5+(li-eff/2)*c*.2,
   tgx=cx+(li-(eff-1)/2)*c*.3,tgy=cy+c*.22,st3=S.t-(a.at||0)-li*.4,lay=Math.max(0,Math.min(1,(st3-1.2)/3)),bst=inc.burst>0&&li===0,flow=lay>=1&&wOK&&!bst,
   sw3=Math.sin(S.t*4+li*1.9)*c*.05*(1+(flow?2*Math.max(0,1-(st3-4.2)/1.5):0)),qx=mx+sw3,qy=my-sw3;
  g.lineCap='round';g.setLineDash([]);
  g.beginPath();g.moveTo(ax,ay);
  for(let s3=1;s3<=16;s3++){const t3=lay*s3/16,u3=1-t3;
   g.lineTo(u3*u3*ax+2*u3*t3*qx+t3*t3*tgx,u3*u3*ay+2*u3*t3*qy+t3*t3*tgy)}
  g.shadowColor='rgba(0,0,0,.45)';g.shadowOffsetX=c*.03;g.shadowOffsetY=c*.05;g.shadowBlur=c*.05;
  g.strokeStyle='rgba(8,14,20,.55)';g.lineWidth=Math.max(2.5,c*.15);g.stroke();g.shadowColor='transparent';
  g.strokeStyle=!flow?'rgba(95,100,106,.75)':foam?'rgba(190,120,30,.7)':'rgba(70,130,190,.7)';g.lineWidth=Math.max(1.8,c*(flow?.06+.03*Math.min(1,Math.max(0,(st3-4.2)/1.2)):.06));g.stroke();
  g.strokeStyle=foam?'rgba(255,210,120,.95)':'rgba(200,230,255,.95)';g.lineWidth=Math.max(1,c*.04);
  if(flow){g.setLineDash([c*.32,c*.2]);g.lineDashOffset=-(S.t*40+li*7)%(c*.52);g.stroke();g.setLineDash([])}
  const nt=.86*lay,nx=(1-nt)*(1-nt)*ax+2*(1-nt)*nt*qx+nt*nt*tgx,ny=(1-nt)*(1-nt)*ay+2*(1-nt)*nt*qy+nt*nt*tgy;
  g.fillStyle='#d6ae4a';g.beginPath();g.arc(nx,ny,Math.max(1.6,c*.07),0,TAU);g.fill();
  if(bst){const bt=.45,bx=(1-bt)*(1-bt)*ax+2*(1-bt)*bt*qx+bt*bt*tgx,by=(1-bt)*(1-bt)*ay+2*(1-bt)*bt*qy+bt*bt*tgy;
   g.fillStyle='rgba(40,75,110,.3)';g.beginPath();g.ellipse(bx,by+c*.06,c*.45,c*.2,0,0,TAU);g.fill();
   g.fillStyle='rgba(200,228,255,.8)';
   for(let k5=0;k5<9;k5++){const p5=(S.t*1.6+k5/9)%1,an5=-Math.PI/2+(k5%3-1)*.45;
    g.beginPath();g.arc(bx+Math.cos(an5)*c*.5*p5,by+Math.sin(an5)*c*.5*p5+p5*p5*c*.55,Math.max(1,c*.04),0,TAU);g.fill()}
   g.strokeStyle='rgba(226,86,79,'+(.5+.4*Math.sin(S.t*8)).toFixed(2)+')';g.lineWidth=1.5;g.beginPath();g.arc(bx,by,c*.3,0,TAU);g.stroke()}
  if(flow){g.strokeStyle=foam?'rgba(255,225,160,.5)':'rgba(215,238,255,.5)';g.lineWidth=Math.max(1,c*.03);g.beginPath();
   for(let k4=0;k4<3;k4++){g.moveTo(nx,ny);g.lineTo(cx+Math.sin(S.t*20+k4*2+li)*c*.14,cy+Math.cos(S.t*17+k4*1.3)*c*.1)}
   g.stroke()}
  g.lineCap='butt'}
 // 射水衝擊處的水花與蒸汽
 if(d.w&&effNow>0&&wOK){
  g.fillStyle='rgba(40,75,110,.22)';g.beginPath();
  g.ellipse(cx,cy+c*.12,c*(.55+.5*Math.min(1,inc.work/inc.dur)),c*.3,0,0,TAU);g.fill();
  for(let i=0;i<5;i++){
   const ph=(S.t*1.3+i*.2)%1;
   g.fillStyle='rgba(215,235,255,'+(.4*(1-ph)).toFixed(2)+')';
   g.beginPath();g.arc(cx+Math.sin(i*2.3+S.t*3)*c*.3,cy-ph*c*.7,c*.07*(1-ph*.6),0,TAU);g.fill()}
  for(let i=0;i<4;i++){
   const ph=(S.t*.5+i*.25)%1;
   g.fillStyle='rgba(235,240,245,'+(.2*(1-ph)).toFixed(2)+')';
   g.beginPath();g.arc(cx+Math.cos(i*1.6)*c*.35,cy-ph*c*1.5,c*(.2+ph*.5),0,TAU);g.fill()}}
 // 災點：火焰與濃煙
 const sev=d.fire?Math.min(1.7,.7+(inc.pm.area||60)/300):.8;
 const prog=Math.min(1,inc.work/inc.dur);
 const wind=((inc.id*0.83)%TAU);
 const wx=Math.cos(wind),wy=Math.sin(wind);
 if(d.fire){
  const heat=Math.max(.2,1-prog*.9);
  const dark=(inc.pm.load==='極高'||inc.pm.load==='高')?1:0;
  g.fillStyle='rgba(30,16,10,'+(.22*sev*heat).toFixed(3)+')';
  g.beginPath();g.arc(cx,cy,c*1.15*sev,0,TAU);g.fill();
  for(let i=0;i<12;i++){
   const ph=(S.t*.42+i*.083)%1;
   const sp=c*(2.6*sev);
   const px=cx+wx*sp*ph+Math.sin(i*1.9+S.t*.7)*c*.25*ph;
   const py=cy+wy*sp*ph-c*.5*ph*sev;
   const rr2=c*(.2+ph*1.0)*sev;
   const al=(dark?.34:.26)*(1-ph)*heat;
   g.fillStyle=(dark?'rgba(46,44,42,':'rgba(140,138,134,')+al.toFixed(3)+')';
   g.beginPath();g.arc(px,py,rr2,0,TAU);g.fill()}
  for(let i=0;i<6;i++){
   const f=Math.sin(S.t*8.5+i*1.7)*.5+.5;
   const hgt=c*(.16+f*.3)*sev*heat;
   g.fillStyle='rgba(226,86,79,'+(.55*heat).toFixed(2)+')';
   g.beginPath();
   g.moveTo(cx+(i-2.5)*c*.15*sev-c*.09*sev,cy+c*.1*sev);
   g.lineTo(cx+(i-2.5)*c*.15*sev,cy-hgt);
   g.lineTo(cx+(i-2.5)*c*.15*sev+c*.09*sev,cy+c*.1*sev);
   g.closePath();g.fill();
   g.fillStyle='rgba(243,178,58,'+(.75*heat).toFixed(2)+')';
   g.beginPath();g.arc(cx+(i-2.5)*c*.15*sev,cy-hgt*.35,c*.07*sev*(.6+f*.5),0,TAU);g.fill()}
  spark(g,cx,cy,c*sev,'rgba(255,190,90,A)',7,S.t*1.4,c*.5);}
 else{
  const pl=.5+.5*Math.sin(S.t*4.5);
  g.fillStyle=d.col;g.globalAlpha=.16+.14*pl;
  g.beginPath();g.arc(cx,cy,c*.9,0,TAU);g.fill();g.globalAlpha=1}
 g.fillStyle=d.col;g.beginPath();g.arc(cx,cy,Math.max(5,c*.32),0,TAU);g.fill();
 g.fillStyle='#111110';g.font='600 '+Math.max(8,c*.36)+'px '+FONT;
 g.textAlign='center';g.textBaseline='middle';g.fillText(inc.rev?d.ch:'？',cx,cy);
 // 車輛
 for(const u of crew){
  if(u.st==='idle'||u.st==='oos'||u.st==='back')continue;
  const ux=X(u.x+(u.ox||0))+c/2,uy=Y(u.y+(u.oy||0))+c/2;
  g.save();g.translate(ux,uy);g.rotate(u.hd||0);
  const L=c*.66,W2=c*.34,rd=Math.max(1,c*.06);
   g.fillStyle='rgba(0,0,0,.3)';scRR(g,-L/2+c*.03,-W2/2+c*.05,L,W2,rd*1.5);g.fill();
   if(u.code!=='艇'){const mvg=u.st==='go'||u.st==='dgo';g.fillStyle='#0d0d0c';
    for(const wx of[-L*.3,L*.3]){g.fillRect(wx-c*.08,-W2/2-c*.03,c*.16,c*.05);g.fillRect(wx-c*.08,W2/2-c*.02,c*.16,c*.05)}
    if(mvg){g.fillStyle='#4a4a46';const to=(S.t*c*3)%(c*.08);
     for(const wx of[-L*.3,L*.3])for(let k6=0;k6<2;k6++){const tx=wx-c*.08+to+k6*c*.08;
      g.fillRect(tx,-W2/2-c*.03,c*.02,c*.05);g.fillRect(tx,W2/2-c*.02,c*.02,c*.05)}}}
  if(u.code==='91'){
   g.fillStyle='#f2f2ee';scRR(g,-L/2,-W2/2,L,W2,rd);g.fill();
   const nb=6,bw=L/nb,bh=W2*.34;
   for(let i2=0;i2<nb;i2++){g.fillStyle=i2%2?'#d8362f':'#f3c43b';
    g.fillRect(-L/2+i2*bw,-bh/2,bw,bh)}
   g.fillStyle='rgba(30,44,70,.55)';g.fillRect(L*.24,-W2/2,L*.12,W2);
   g.fillStyle='#d8362f';g.fillRect(-L*.06,-W2*.1,L*.12,W2*.2);
   g.fillRect(-L*.02,-W2*.22,L*.04,W2*.44)}
  else if(u.code==='艇'){
   g.fillStyle='#c8332c';
   g.beginPath();g.moveTo(-L*.48,-W2*.42);g.lineTo(L*.22,-W2*.42);
   g.lineTo(L*.5,0);g.lineTo(L*.22,W2*.42);g.lineTo(-L*.48,W2*.42);g.closePath();g.fill();
   g.fillStyle='#f3c43b';g.fillRect(-L*.48,-W2*.08,L*.8,W2*.16)}
  else{
   g.fillStyle='#c8332c';scRR(g,-L/2,-W2/2,L,W2,rd);g.fill();
   g.fillStyle='#f3c43b';g.fillRect(-L/2,-W2*.1,L,W2*.16);
   for(let i2=0;i2<3;i2++)g.fillRect(-L/2+i2*c*.055,-W2/2,c*.028,W2);
   g.fillStyle='rgba(30,44,70,.5)';g.fillRect(L*.26,-W2/2,L*.1,W2);
   if(u.code==='21'||u.code==='31'){g.fillStyle='#b9b5ac';g.fillRect(-L*.36,-W2*.12,L*.6,W2*.24)}
   if(u.code==='61'){g.fillStyle='#8fb8d0';scRR(g,-L*.3,-W2*.32,L*.5,W2*.64,rd);g.fill()}
   if(u.code==='搜'){g.fillStyle='#e9e7e0';g.fillRect(-L*.3,-W2*.3,L*.24,W2*.6)}}
  const working=u.st==='work',since=S.t-(u.at||0);
   // 頭燈（行進中夜間有光束）／危險警示燈、救護車後門、幫浦出水指示
   g.fillStyle='rgba(255,246,200,.9)';g.fillRect(L/2-c*.02,-W2*.4,c*.04,c*.07);g.fillRect(L/2-c*.02,W2*.33,c*.04,c*.07);
   if(u.code!=='艇'){g.fillStyle='rgba(255,255,255,.13)';g.fillRect(-L/2+rd,-W2/2+c*.01,L-rd*2,W2*.1);g.fillStyle='rgba(0,0,0,.16)';g.fillRect(-L/2+rd,W2*.4,L-rd*2,W2*.1)}
   if(!working){g.fillStyle='rgba(220,40,35,.8)';g.fillRect(-L/2-c*.01,-W2*.4,c*.035,c*.06);g.fillRect(-L/2-c*.01,W2*.34,c*.035,c*.06)}
   if(!working&&nf>.15){const hb=g.createLinearGradient(L/2,0,L/2+c*1.2,0);
    hb.addColorStop(0,'rgba(255,248,210,'+(.35*nf).toFixed(2)+')');hb.addColorStop(1,'rgba(255,248,210,0)');
    g.fillStyle=hb;g.beginPath();g.moveTo(L/2,-W2*.36);g.lineTo(L/2+c*1.2,-W2*1.2);g.lineTo(L/2+c*1.2,W2*1.2);g.lineTo(L/2,W2*.36);g.closePath();g.fill()}
   if(working){g.fillStyle=(S.t*3|0)%2?'#ffb02e':'rgba(120,80,20,.6)';
    g.fillRect(-L/2-c*.03,-W2*.46,c*.05,c*.06);g.fillRect(-L/2-c*.03,W2*.4,c*.05,c*.06);
     if(CODE[u.code].cap&&u.code!=='61'&&since<4.5){const ra=since*8;
      g.strokeStyle='#d6d2c6';g.lineWidth=Math.max(1,c*.025);g.beginPath();g.arc(-L*.3,0,c*.07,0,TAU);
      g.moveTo(-L*.3,0);g.lineTo(-L*.3+Math.cos(ra)*c*.07,Math.sin(ra)*c*.07);
      g.moveTo(-L*.3,0);g.lineTo(-L*.3+Math.cos(ra+2.1)*c*.07,Math.sin(ra+2.1)*c*.07);g.stroke()}
     if(u.code==='21'||u.code==='31'){const ex2=Math.min(1,since/1.2);
      g.strokeStyle='#44464a';g.lineWidth=Math.max(1.2,c*.035);g.fillStyle='#6a6d72';
      for(const sg of[-1,1])for(const lx of[-L*.2,L*.28]){const ey2=sg*(W2/2+c*.2*ex2);
       g.beginPath();g.moveTo(lx,sg*W2/2);g.lineTo(lx,ey2);g.stroke();g.fillRect(lx-c*.05,ey2-c*.03,c*.1,c*.06)}}
     if(u.code==='71'&&since>.8){g.globalAlpha=Math.min(1,(since-.8)/1);
      g.fillStyle='#2b2d30';g.fillRect(-L*.25,W2/2+c*.04,L*.5,c*.14);
      g.fillStyle='#e9a13b';g.fillRect(-L*.2,W2/2+c*.07,c*.1,c*.03);
      g.fillStyle='#d8362f';g.fillRect(-L*.02,W2/2+c*.07,c*.08,c*.03);
      g.fillStyle='#9ac95d';g.fillRect(L*.14,W2/2+c*.07,c*.07,c*.03);g.globalAlpha=1}
    if(u.code==='91'&&since>1){const op=Math.min(1,(since-1)/1.2);
     g.strokeStyle='#e8e8e4';g.lineWidth=Math.max(1,c*.05);g.lineCap='round';
     g.beginPath();g.moveTo(-L/2,-W2*.4);g.lineTo(-L/2-L*.2*op,-W2*.4-W2*.5*op);
     g.moveTo(-L/2,W2*.4);g.lineTo(-L/2-L*.2*op,W2*.4+W2*.5*op);g.stroke();g.lineCap='butt';
     g.fillStyle='rgba(255,255,230,'+(.55*op).toFixed(2)+')';g.fillRect(-L/2-c*.06,-W2*.3,c*.06,W2*.6)}
    if(d.w&&CODE[u.code].cap&&u.code!=='61'&&inc.work<inc.dur){
     g.fillStyle='rgba(125,200,255,'+(.4+.3*Math.sin(S.t*8+u.id)).toFixed(2)+')';
     g.beginPath();g.arc(-L*.08,W2*.52,c*.045,0,TAU);g.fill()}}
   // 車頂燈條（俯視）
  const blo=(S.t*11|0)%2;
  g.fillStyle='rgba(22,22,22,.85)';
  g.fillRect(L*.02,-W2*.52,c*.07,W2*1.04);
  g.fillStyle=blo?'#ff4d4d':'rgba(120,40,40,.6)';
  g.fillRect(L*.02,-W2*.52,c*.07,W2*.5);
  g.fillStyle=blo?'rgba(40,70,120,.6)':'#4da3ff';
  g.fillRect(L*.02,W2*.02,c*.07,W2*.5);
  // 後視鏡與車頂細節
  g.fillStyle='rgba(30,30,30,.7)';
  g.fillRect(L*.2,-W2*.62,c*.05,W2*.12);
  g.fillRect(L*.2,W2*.5,c*.05,W2*.12);
  g.fillStyle='rgba(255,255,255,.08)';
  g.fillRect(-L*.42,-W2*.4,L*.3,W2*.8);
  g.restore();
  if(u.st==='work'&&CODE[u.code].cap&&u.code!=='61'&&d.w&&inc.work<inc.dur){const hd3=u.hd||0;
    for(let k8=0;k8<2;k8++){const p8=(S.t*.8+k8*.5)%1;
     g.fillStyle='rgba(190,190,190,'+(.2*(1-p8)).toFixed(2)+')';
     g.beginPath();g.arc(ux-Math.cos(hd3)*c*.36+Math.sin(k8*3+S.t)*c*.03,uy-Math.sin(hd3)*c*.36-p8*c*.5,c*(.04+.07*p8),0,TAU);g.fill()}}
   if(u.st==='work'&&u.code==='41'){const pr2=(S.t*.7)%1;
    g.strokeStyle='rgba(233,161,59,'+(.5*(1-pr2)).toFixed(2)+')';g.lineWidth=1.2;
    g.beginPath();g.arc(ux,uy,c*(.2+pr2*.7),0,TAU);g.stroke()}
   if(u.st==='go'||u.st==='dgo'){const hd=u.hd||0;
    const gl=g.createRadialGradient(ux,uy,c*.1,ux,uy,c*1.1);
    gl.addColorStop(0,((S.t*5|0)%2?'rgba(255,60,50,':'rgba(70,130,255,')+'.2)');gl.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gl;g.fillRect(ux-c*1.1,uy-c*1.1,c*2.2,c*2.2);
    for(let k7=0;k7<3;k7++){const dd=c*(.4+k7*.32),ph7=(S.t*2+k7*.33)%1;
     g.fillStyle='rgba(150,140,125,'+(.22*(1-ph7)*(1-k7*.25)).toFixed(2)+')';
     g.beginPath();g.arc(ux-Math.cos(hd)*dd,uy-Math.sin(hd)*dd,c*(.08+.1*ph7+k7*.03),0,TAU);g.fill()}}
   if(u.st==='work'&&(u.code==='21'||u.code==='31')){
    const ext=Math.max(0,Math.min(1,(S.t-(u.at||0)-1)/2.5)),an=Math.atan2(cy-uy,cx-ux),
     len=Math.min(Math.hypot(cx-ux,cy-uy),c*2.2)*ext;
    if(len>c*.2){g.save();g.translate(ux,uy);g.rotate(an);
     g.strokeStyle='#cfcac0';g.lineWidth=Math.max(1,c*.035);
     g.beginPath();g.moveTo(0,-c*.05);g.lineTo(len,-c*.05);g.moveTo(0,c*.05);g.lineTo(len,c*.05);g.stroke();
     g.lineWidth=Math.max(.8,c*.02);g.beginPath();
     for(let q=c*.14;q<len;q+=c*.14){g.moveTo(q,-c*.05);g.lineTo(q,c*.05)}
     if(ext>=1){g.fillStyle='#8a867c';g.fillRect(len-c*.02,-c*.1,c*.15,c*.2);g.fillStyle='#d6d2c6';g.fillRect(len,-c*.08,c*.11,c*.16)}
     g.stroke();g.restore()}}
   if(nf>.15&&u.st==='work'){
    const an2=Math.atan2(cy-uy,cx-ux),dd=Math.min(Math.hypot(cx-ux,cy-uy),c*3),pa=an2+Math.PI/2,
     ex=ux+Math.cos(an2)*dd,ey=uy+Math.sin(an2)*dd;
    const fg=g.createLinearGradient(ux,uy,ex,ey);
    fg.addColorStop(0,'rgba(255,250,225,'+(.3*nf).toFixed(2)+')');fg.addColorStop(1,'rgba(255,250,225,0)');
    g.fillStyle=fg;g.beginPath();g.moveTo(ux,uy);
    g.lineTo(ex+Math.cos(pa)*c*.9,ey+Math.sin(pa)*c*.9);g.lineTo(ex-Math.cos(pa)*c*.9,ey-Math.sin(pa)*c*.9);
    g.closePath();g.fill()}
   const bl=blo;
  g.fillStyle=bl?'rgba(255,77,77,.14)':'rgba(77,163,255,.14)';
  g.beginPath();g.arc(ux,uy,c*.5,0,TAU);g.fill();
  if(c>=17){g.font='500 '+Math.max(8,c*.28)+'px '+FONT;
   const tw=g.measureText(u.cs).width+5;
   g.fillStyle='rgba(0,0,0,.78)';scRR(g,ux-tw/2,uy+c*.2,tw,c*.3,2);g.fill();
   g.fillStyle='#e6e3db';g.textBaseline='middle';g.fillText(u.cs,ux,uy+c*.36)}}
// 車輛警示燈地面光暈
 for(const u of crew){
  if(u.st!=='work')continue;
  const vx=X(u.x+(u.ox||0))+c/2,vy=Y(u.y+(u.oy||0))+c/2;
  const bl=(S.t*9|0)%2;
  g.fillStyle=bl?'rgba(226,86,79,'+(.12+nf*.22).toFixed(2)+')':'rgba(90,168,255,'+(.12+nf*.22).toFixed(2)+')';
  g.beginPath();g.ellipse(vx,vy,c*.75,c*.42,u.hd||0,0,TAU);g.fill()}
 // 階段專屬作業特效
 const pn=inc.rev&&inc.ph>=0?inc.phs[inc.ph]:'';
 if(/破壞|脫困|切除|開挖|支撐|開門/.test(pn)){
  for(let i=0;i<6;i++){
   const ph2=(S.t*2.2+i*.17)%1,a2=i*1.05+S.t*.4;
   g.fillStyle='rgba(255,214,120,'+(.85*(1-ph2)).toFixed(2)+')';
   g.beginPath();g.arc(cx+Math.cos(a2)*(c*.3+ph2*c*.5),cy+Math.sin(a2)*(c*.3+ph2*c*.5)-ph2*c*.15,c*.035,0,TAU);g.fill()}}
 if(/排煙|通風|換氣/.test(pn)){
  const wa=((inc.id*0.83)%TAU);
  for(let i=0;i<7;i++){
   const ph2=(S.t*.85+i*.14)%1;
   g.fillStyle='rgba(200,206,214,'+(.3*(1-ph2)).toFixed(2)+')';
   g.beginPath();g.arc(cx+Math.cos(wa)*ph2*c*2.2+Math.sin(i*2)*c*.15,cy+Math.sin(wa)*ph2*c*2.2,c*(.1+ph2*.35),0,TAU);g.fill()}}
 if(/抽水|排水/.test(pn)){
  for(let i=0;i<8;i++){
   const ph2=(S.t*1.1+i*.125)%1;
   g.fillStyle='rgba(125,179,232,'+(.55*(1-ph2)).toFixed(2)+')';
   g.beginPath();g.arc(cx+(X(inc.ax)+c/2-cx)*ph2,cy+(Y(inc.ay)+c/2-cy)*ph2,c*.06,0,TAU);g.fill()}}
 if(/檢傷|分區救護|後送分流/.test(pn)){
  const cols=['#e2564f','#e9a13b','#5dcaa5'];
  for(let i=0;i<9;i++){
   const px=cx+((i%3)-1)*c*.34+c*1.15,py=cy+(Math.floor(i/3)-1)*c*.32;
   g.fillStyle=cols[Math.floor(i/3)];
   g.beginPath();g.moveTo(px,py-c*.1);g.lineTo(px+c*.09,py+c*.07);g.lineTo(px-c*.09,py+c*.07);
   g.closePath();g.fill()}}
 if(/除污|洗消/.test(pn)){
  const dx=cx-c*1.35,dy=cy+c*.2;
  g.fillStyle='rgba(175,169,236,.55)';scRR(g,dx-c*.3,dy-c*.3,c*.6,c*.6,c*.08);g.fill();
  for(let i=0;i<5;i++){
   const ph2=(S.t*1.6+i*.2)%1;
   g.fillStyle='rgba(215,235,255,'+(.5*(1-ph2)).toFixed(2)+')';
   g.beginPath();g.arc(dx+Math.sin(i*2)*c*.2,dy-ph2*c*.4,c*.05,0,TAU);g.fill()}}
 if(/搜索|探測/.test(pn)&&c>=14){
  const sw=(S.t*.6)%1;
  g.strokeStyle='rgba(207,176,245,.32)';g.lineWidth=Math.max(1,c*.05);
  g.beginPath();g.arc(cx,cy,c*(.5+sw*1.4),0,TAU);g.stroke()}
 if(d.w&&effNow>0){
  const atk0=pumpsV;
  g.strokeStyle='rgba(150,190,230,.32)';g.lineWidth=Math.max(1.5,c*.1);g.lineCap='round';
  for(const a2 of atk0){g.beginPath();
   g.moveTo(X(a2.x+(a2.ox||0))+c/2,Y(a2.y+(a2.oy||0))+c/2);g.lineTo(cx,cy);g.stroke()}
  g.lineCap='butt'}
 // 雲梯架設
 for(const u of crew){
  if(u.st!=='work'||(u.code!=='21'&&u.code!=='31'))continue;
  const vx=X(u.x+(u.ox||0))+c/2,vy=Y(u.y+(u.oy||0))+c/2;
  const ext=Math.min(1,Math.max(0,(S.t-((u.at||0)+2))/6));
  if(ext<=0)continue;
  const ang=Math.atan2(cy-vy,cx-vx);
  const len=Math.hypot(cx-vx,cy-vy)*.85*ext;
  g.strokeStyle='#d8d4c8';g.lineWidth=Math.max(1.6,c*.09);
  g.beginPath();g.moveTo(vx,vy);g.lineTo(vx+Math.cos(ang)*len,vy+Math.sin(ang)*len);g.stroke();
  g.strokeStyle='rgba(216,212,200,.6)';g.lineWidth=Math.max(1,c*.04);
  for(let r2=c*.25;r2<len;r2+=c*.22){
   const px=vx+Math.cos(ang)*r2,py=vy+Math.sin(ang)*r2;
   g.beginPath();g.moveTo(px-Math.sin(ang)*c*.07,py+Math.cos(ang)*c*.07);
   g.lineTo(px+Math.sin(ang)*c*.07,py-Math.cos(ang)*c*.07);g.stroke()}
  if(ext>.9&&c>=14)figure(g,vx+Math.cos(ang)*len,vy+Math.sin(ang)*len,Math.max(1.5,c*.1),'fire',{})}
 // 救護車尾門與擔架裝載
 if(inc.rev&&inc.ph>=0&&/搬運|後送|轉交|上車/.test(inc.phs[inc.ph])){
  for(const u of crew){
   if(u.code!=='91'||u.st!=='work')continue;
   const vx=X(u.x+(u.ox||0))+c/2,vy=Y(u.y+(u.oy||0))+c/2;
   const a=(u.hd||0)+Math.PI;
   g.fillStyle='rgba(236,234,227,.55)';
   g.fillRect(vx+Math.cos(a)*c*.32-c*.06,vy+Math.sin(a)*c*.32-c*.12,c*.12,c*.24)}}
 // 警戒帶與三角錐
 if(inc.pk&&inc.pk.arms){
  for(const arm of inc.pk.arms){
   for(let i2=1;i2<=2;i2++){
    const q=arm.cells[Math.min(arm.cells.length-1,i2)];
    if(!q)continue;
    const px=X(q[0])+c/2,py=Y(q[1])+c/2;
    g.fillStyle='#e9a13b';
    g.beginPath();g.moveTo(px,py-c*.12);g.lineTo(px+c*.08,py+c*.08);g.lineTo(px-c*.08,py+c*.08);
    g.closePath();g.fill()}}}
 // 受困人員標記
 if(inc.rev&&inc.pm.trap>0){
  const left=Math.max(0,Math.round(inc.pm.trap*(1-prog)));
  for(let i=0;i<left&&i<6;i++){
   const a=TAU*i/Math.max(1,left)+S.t*.2;
   const px=cx+Math.cos(a)*c*.28,py=cy+Math.sin(a)*c*.28;
   g.fillStyle=(S.t*2|0)%2?'#ffe08a':'#ffb347';
   g.beginPath();g.moveTo(px,py-c*.13);g.lineTo(px+c*.1,py+c*.09);g.lineTo(px-c*.1,py+c*.09);
   g.closePath();g.fill()}}
// 後送路線
 (function(){
  const tx2=crew.filter(u=>u.st==='tx')[0];
  if(!tx2)return;
  let hb3=null,hd4=1e9;
  for(const h of HOSP){const dd=Math.abs(h.p[0]-tx2.x)+Math.abs(h.p[1]-tx2.y);if(dd<hd4){hd4=dd;hb3=h}}
  if(!hb3)return;
  g.strokeStyle='rgba(125,179,232,.5)';g.lineWidth=Math.max(1.4,c*.07);
  g.setLineDash([c*.3,c*.22]);g.lineDashOffset=-(S.t*18)%(c*.52);
  g.beginPath();g.moveTo(X(tx2.x)+c/2,Y(tx2.y)+c/2);
  g.lineTo(X(hb3.p[0])+c/2,Y(hb3.p[1])+c/2);g.stroke();g.setLineDash([])})();
 // 醫院與交接動畫
 for(const h of HOSP){
  if(h.p[0]+(h.w||1)<x0-1||h.p[0]>x1+1||h.p[1]+(h.h||1)<y0-1||h.p[1]>y1+1)continue;
  const hw=h.w||1,hh=h.h||1;
  const hx4=X(h.p[0]),hy4=Y(h.p[1]);
  const hcx=hx4+c*hw/2,hcy=hy4+c*hh/2;
  g.fillStyle='#1a3552';g.fillRect(hx4+c*.05,hy4+c*.05,c*hw-c*.1,c*hh-c*.1);
  g.fillStyle='rgba(220,230,245,'+(.06+nf*.18).toFixed(2)+')';
  for(let a=0;a<hw;a++)for(let b2=0;b2<hh;b2++){
   g.fillRect(hx4+c*(a+.14),hy4+c*(b2+.14),c*.3,c*.14);
   g.fillRect(hx4+c*(a+.56),hy4+c*(b2+.14),c*.3,c*.14)}
  g.fillStyle='rgba(140,160,190,.35)';g.fillRect(hx4+c*.05,hy4+c*.05,c*hw-c*.1,c*.08);
  g.fillStyle='#e9edf2';g.fillRect(hcx-c*.08,hcy-c*.26,c*.16,c*.52);
  g.fillRect(hcx-c*.26,hcy-c*.08,c*.52,c*.16);
  g.fillStyle='rgba(125,179,232,'+(.3+nf*.25).toFixed(2)+')';
  g.fillRect(hx4+c*.12,hy4+c*hh-c*.28,c*hw-c*.24,c*.2);
  g.fillStyle='rgba(236,234,227,.55)';
  for(let i7=0;i7<Math.max(3,hw*3);i7++)g.fillRect(hx4+c*(.2+i7*.24),hy4+c*hh-c*.26,c*.04,c*.16);
  if(c>=15){g.fillStyle='#e2564f';g.font='600 '+(c*.18)+'px '+FONT;g.textAlign='center';
   g.fillText('急診',hcx,hy4+c*hh-c*.34)}
  if(c>=17){g.fillStyle='#9fc4e8';g.font='600 '+(c*.2)+'px '+FONT;g.textAlign='center';
   g.fillText(h.n,hcx,hy4-c*.1)}
  const atH=crew.filter(u=>(u.st==='give'||u.st==='clean')&&
   Math.abs(u.x-h.x[0])<2.4&&Math.abs(u.y-h.x[1])<2.4);
  if(atH.length){
   const u0=atH[0],ux0=X(u0.x)+c/2,uy0=Y(u0.y)+c/2;
   const tr2=(S.t*.6)%1;
   const dx0=ux0+(hcx-ux0)*tr2,dy0=uy0+(hcy-uy0)*tr2;
   if(u0.st==='give'){
    stryker(g,dx0,dy0,Math.atan2(hcy-uy0,hcx-ux0),c,true);
    figure(g,dx0-c*.24,dy0,Math.max(1.5,c*.1),'medic',{ph:1,moving:1});
    figure(g,dx0+c*.24,dy0,Math.max(1.5,c*.1),
     {coat:'#f2f2ee',leg:'#d8d8d2',stripe:'#7db3e8',helmet:null,skin:'#e6c0a8'},{ph:3,moving:1});
    if(c>=17){g.fillStyle='#7db3e8';g.font='600 '+(c*.2)+'px '+FONT;g.textAlign='center';
     g.fillText('交接中',(ux0+hcx)/2,(uy0+hcy)/2-c*.35)}}
   else{
    figure(g,ux0+c*.3,uy0,Math.max(1.5,c*.1),'medic',{ph:2});
    g.fillStyle='rgba(236,234,227,.8)';g.fillRect(ux0+c*.42,uy0-c*.1,c*.12,c*.2);
    if(c>=17){g.fillStyle='#9d9a92';g.font='600 '+(c*.2)+'px '+FONT;g.textAlign='center';
     g.fillText('整檢補給',ux0,uy0-c*.45)}}}}
 // Rehab 人員復原區
 if(d.fire&&inc.rev&&crew.length){
  const base=cmdV[0]||work[0];
  if(base){
   const a9=(base.hd||0)-Math.PI/2;
   const rx2=X(base.x+(base.ox||0))+c/2+Math.cos(a9)*c*.95;
   const ry2=Y(base.y+(base.oy||0))+c/2+Math.sin(a9)*c*.95;
   g.fillStyle='rgba(93,202,165,.14)';scRR(g,rx2-c*.55,ry2-c*.42,c*1.1,c*.84,c*.06);g.fill();
   g.strokeStyle='rgba(93,202,165,.45)';g.lineWidth=1;
   g.strokeRect(rx2-c*.55,ry2-c*.42,c*1.1,c*.84);
   g.fillStyle='rgba(143,184,208,.8)';g.fillRect(rx2+c*.34,ry2-c*.3,c*.14,c*.24);
   if(c>=17){g.fillStyle='#5dcaa5';g.font='600 '+(c*.22)+'px '+FONT;g.textAlign='center';
    g.fillText('Rehab 復原區',rx2,ry2-c*.5)}}}
 // 火場出入口管制
 if(d.fire&&inc.rev&&crew.length){
  const ea=Math.atan2(Y(inc.ay)+c/2-cy,X(inc.ax)+c/2-cx);
  const ex2=cx+Math.cos(ea)*c*.72,ey2=cy+Math.sin(ea)*c*.72;
  g.fillStyle='rgba(243,196,122,.85)';
  scRR(g,ex2-c*.1,ey2-c*.1,c*.2,c*.2,c*.03);g.fill();
  g.strokeStyle='rgba(243,196,122,.6)';g.lineWidth=1;
  g.setLineDash([c*.1,c*.1]);g.beginPath();g.arc(cx,cy,c*.72,ea-.5,ea+.5);g.stroke();g.setLineDash([]);
  if(c>=18){g.fillStyle='#f3c47a';g.font='600 '+(c*.2)+'px '+FONT;g.textAlign='center';
   g.fillText('出入口管制',ex2,ey2-c*.2)}
  if(c>=20&&inc.ph>=0&&/入室|搜索|逐房|樓層/.test(inc.phs[inc.ph])){
   const inside=Math.min(4,work.filter(u=>u.code!=='91'&&u.code!=='41').length*2);
   g.fillStyle='rgba(20,18,14,.8)';scRR(g,ex2-c*.3,ey2+c*.12,c*.6,c*.2,c*.03);g.fill();
   g.fillStyle='#f3c47a';g.font='600 '+(c*.16)+'px '+FONT;
   g.fillText('入室 '+inside+' 人',ex2,ey2+c*.23)}}
 // 空氣瓶更換站
 for(const u of crew){
  if(u.st!=='work'||(u.code!=='71'&&u.code!=='搜'))continue;
  const a7=(u.hd||0)-Math.PI/2;
  const bx2=X(u.x+(u.ox||0))+c/2+Math.cos(a7)*c*.55,by2=Y(u.y+(u.oy||0))+c/2+Math.sin(a7)*c*.55;
  for(let i5=0;i5<3;i5++){
   g.fillStyle=i5%2?'#d8d8d2':'#9fb6c8';
   g.fillRect(bx2-c*.12+i5*c*.09,by2-c*.1,c*.06,c*.2)}
  break}
 // 救護待命區
 (function(){
  if(!inc.rev)return;
  const amb=ambV[0];
  if(!amb)return;
  const safe=(function(){const dd=KIND[inc.k];
   if(dd.tac&&inc.clr>0)return false;
   if(dd.pol&&inc.pol<2)return false;
   if(dd.fire)return inc.ph>=3;return true})();
  if(safe)return;
  const cpv=cmdV[0]||amb;
  const sx=X(cpv.x+(cpv.ox||0))+c/2,sy=Y(cpv.y+(cpv.oy||0))+c/2;
  g.strokeStyle='rgba(93,202,165,.5)';g.lineWidth=Math.max(1,c*.05);
  g.setLineDash([c*.18,c*.14]);g.strokeRect(sx-c*.8,sy-c*.5,c*1.6,c*1.0);g.setLineDash([]);
  if(c>=17){g.fillStyle='#5dcaa5';g.font='600 '+(c*.24)+'px '+FONT;g.textAlign='center';
   g.fillText('救護待命區',sx,sy-c*.6)}})();
 // 水源區標示與流量
 if(showHyd&&c>=15){
  const hx3=X(inc.hy[0])+c/2,hy3=Y(inc.hy[1])+c/2;
  g.strokeStyle='rgba(125,179,232,.45)';g.lineWidth=1;
  g.setLineDash([c*.14,c*.12]);g.beginPath();g.arc(hx3,hy3,c*.5,0,TAU);g.stroke();g.setLineDash([]);
  g.fillStyle='#7db3e8';g.font='600 '+(c*.22)+'px '+FONT;g.textAlign='center';
  g.fillText((inc.hin||480)+' L/s',hx3,hy3-c*.6)}
 // 中繼水帶（佔水車→攻擊車）
 if(d.w&&inc.relay>0){
  const ps=pumpsV;
  for(let i4=0;i4+1<ps.length&&i4<inc.relay;i4++){
   const a1=ps[i4],a2=ps[i4+1];
   const sx=X(a1.x+(a1.ox||0))+c/2,sy=Y(a1.y+(a1.oy||0))+c/2,ex=X(a2.x+(a2.ox||0))+c/2,ey=Y(a2.y+(a2.oy||0))+c/2,
     mx2=(sx+ex)/2+(ey-sy)*.12,my2=(sy+ey)/2-(ex-sx)*.12;
    g.lineCap='round';g.setLineDash([]);
    g.beginPath();g.moveTo(sx,sy);g.quadraticCurveTo(mx2,my2,ex,ey);
    g.strokeStyle='rgba(8,18,22,.6)';g.lineWidth=Math.max(3,c*.2);g.stroke();
    g.strokeStyle='rgba(60,150,125,.7)';g.lineWidth=Math.max(2,c*.12);g.stroke();
    g.strokeStyle='#8fe3c4';g.lineWidth=Math.max(1,c*.045);
    g.setLineDash([c*.4,c*.24]);g.lineDashOffset=-(S.t*22)%(c*.64);g.stroke();g.setLineDash([]);
    g.fillStyle='#d6ae4a';g.beginPath();g.arc(sx,sy,Math.max(1.5,c*.06),0,TAU);g.fill();
    g.beginPath();g.arc(ex,ey,Math.max(1.5,c*.06),0,TAU);g.fill();
   g.setLineDash([]);g.lineCap='butt'}}
 // 後送動線
 if(inc.rev&&inc.pm.trap>=3){
  const amb2=ambV[0];
  if(amb2){const tx2=cx+c*1.2,ty2=cy-c*.9;
   g.strokeStyle='rgba(93,202,165,.45)';g.lineWidth=Math.max(1,c*.06);
   g.setLineDash([c*.2,c*.16]);g.lineDashOffset=-(S.t*14)%(c*.36);
   g.beginPath();g.moveTo(tx2,ty2);g.lineTo(X(amb2.x+(amb2.ox||0))+c/2,Y(amb2.y+(amb2.oy||0))+c/2);
   g.stroke();g.setLineDash([])}}
 // 停車位標線
 if(inc.pk&&inc.pk.arms&&c>=14){
  g.strokeStyle='rgba(255,255,255,.10)';g.lineWidth=1;
  for(const arm of inc.pk.arms)for(const q of arm.cells.slice(0,4)){
   if(q[0]<x0||q[0]>x1||q[1]<y0||q[1]>y1)continue;
   g.strokeRect(X(q[0])+c*.12,Y(q[1])+c*.2,c*.76,c*.6)}}
 if(inc.rev&&inc.ph>=0&&/集結|協調|待命/.test(inc.phs[inc.ph])&&crew.length){
  const u0=crew[0],sx=X(u0.x)+c/2,sy=Y(u0.y)+c/2;
  g.strokeStyle='rgba(233,161,59,.55)';g.lineWidth=Math.max(1,c*.05);
  g.setLineDash([c*.2,c*.16]);g.strokeRect(sx-c*.9,sy-c*.55,c*1.8,c*1.1);g.setLineDash([]);
  if(c>=17){g.fillStyle='#e9a13b';g.font='600 '+(c*.26)+'px '+FONT;g.textAlign='center';
   g.fillText('集結區',sx,sy-c*.66)}}
 if(showHyd&&wOK&&c>=14){
  const hx2=X(inc.hy[0])+c/2,hy2=Y(inc.hy[1])+c/2;
  figure(g,hx2+c*.34,hy2,Math.max(1.4,c*.09),'fire',{ph:2});
  g.strokeStyle='rgba(150,190,230,.5)';g.lineWidth=Math.max(1,c*.05);
  g.beginPath();g.arc(hx2-c*.3,hy2+c*.2,c*.14,0,TAU);g.stroke()}
 for(const u of crew){
  if(u.st!=='work'||(u.code!=='71'&&u.code!=='搜'))continue;
  const a3=(u.hd||0)+Math.PI/2;
  const gx=X(u.x+(u.ox||0))+c/2+Math.cos(a3)*c*.6,gy=Y(u.y+(u.oy||0))+c/2+Math.sin(a3)*c*.6;
  g.fillStyle='rgba(60,58,52,.8)';scRR(g,gx-c*.24,gy-c*.16,c*.48,c*.32,c*.04);g.fill();
  g.fillStyle='#f0c53a';
  for(let i3=0;i3<3;i3++)g.fillRect(gx-c*.18+i3*c*.13,gy-c*.09,c*.08,c*.18)}
 if(inc.rev&&inc.pm.trap>=3&&c>=14){
  const tx=cx+c*1.2,ty=cy-c*.9;
  g.fillStyle='rgba(93,202,165,.22)';scRR(g,tx-c*.5,ty-c*.35,c*1.0,c*.7,c*.06);g.fill();
  g.strokeStyle='rgba(93,202,165,.6)';g.lineWidth=1;g.strokeRect(tx-c*.5,ty-c*.35,c*1.0,c*.7);
  if(c>=18){g.fillStyle='#5dcaa5';g.font='600 '+(c*.24)+'px '+FONT;g.textAlign='center';
   g.fillText('傷患集中',tx,ty-c*.44)}}
 // 救護處置動畫
 if(ambV.length&&inc.rev&&safeNow){
  const pn2=inc.ph>=0?inc.phs[inc.ph]:'';
  if(inc.pm.ohca&&/處置|接觸|評估/.test(pn2)){
   const bob=Math.abs(Math.sin(S.t*5.2))*c*.1;
   figure(g,cx-c*.22,cy-bob,Math.max(1.6,c*.11),'medic',{ph:1});
   g.strokeStyle='rgba(143,227,196,.8)';g.lineWidth=Math.max(1,c*.05);
   g.beginPath();g.moveTo(cx-c*.14,cy-bob+c*.05);g.lineTo(cx-c*.02,cy);g.stroke();
   if(c>=17){g.fillStyle='#8fe3c4';g.font='600 '+(c*.2)+'px '+FONT;g.textAlign='center';
    g.fillText('CPR',cx-c*.22,cy-c*.46)}}
  if(/處置|管路|給藥|照護/.test(pn2)){
   g.fillStyle='rgba(236,234,227,.9)';g.fillRect(cx+c*.26,cy-c*.42,c*.1,c*.16);
   g.strokeStyle='rgba(236,234,227,.7)';g.lineWidth=Math.max(1,c*.03);
   g.beginPath();g.moveTo(cx+c*.31,cy-c*.26);g.lineTo(cx+c*.08,cy);g.stroke();
   const bp=(S.t*2|0)%2;
   g.fillStyle=bp?'#5dcaa5':'rgba(93,202,165,.35)';
   g.fillRect(cx+c*.3,cy+c*.1,c*.16,c*.12)}
  }
 // 救助作業動畫
 if(rescV.length&&inc.rev){
  const pn3=inc.ph>=0?inc.phs[inc.ph]:'';
  if(/脫困|破壞|撐/.test(pn3)){
   const op=Math.abs(Math.sin(S.t*2.4))*c*.12;
   g.strokeStyle='#f0c53a';g.lineWidth=Math.max(1.4,c*.07);
   g.beginPath();g.moveTo(cx-c*.3,cy+c*.05);g.lineTo(cx-c*.05,cy-op);
   g.moveTo(cx-c*.3,cy+c*.05);g.lineTo(cx-c*.05,cy+op+c*.1);g.stroke()}
  if(/支撐|Shoring|固定/.test(pn3)){
   const bn=Math.min(4,1+Math.floor((S.t-(inc.t0||0))/8)%5);
   g.fillStyle='#b08a52';
   for(let i6=0;i6<bn;i6++)g.fillRect(cx-c*.36+i6*c*.19,cy-c*.05,c*.08,c*.42)}
  if(/探測|搜索/.test(pn3)){
   const sa=S.t*.9;
   g.fillStyle='rgba(207,176,245,.18)';
   g.beginPath();g.moveTo(cx,cy);
   g.arc(cx,cy,c*1.25,sa-.45,sa+.45);g.closePath();g.fill()}
  if(/確保|繩索|吊掛|下降/.test(pn3)){
   g.strokeStyle='rgba(216,212,200,.85)';g.lineWidth=Math.max(1,c*.05);
   g.beginPath();
   g.moveTo(cx-c*.3,cy+c*.35);g.lineTo(cx,cy-c*.4);g.lineTo(cx+c*.3,cy+c*.35);g.stroke();
   const dz=(S.t*.35)%1;
   g.fillStyle='#f0c53a';g.fillRect(cx-c*.05,cy-c*.35+dz*c*.6,c*.1,c*.1)}}
 // 分水器
 if(d.w&&effNow>0&&wOK){
  const atk1=pumpsV[0];
  if(atk1){
   const mx2=(X(atk1.x+(atk1.ox||0))+c/2+cx)/2,my2=(Y(atk1.y+(atk1.oy||0))+c/2+cy)/2;
   g.fillStyle='#f0c53a';scRR(g,mx2-c*.08,my2-c*.06,c*.16,c*.12,c*.02);g.fill();
   g.strokeStyle='rgba(240,197,58,.7)';g.lineWidth=1;g.strokeRect(mx2-c*.08,my2-c*.06,c*.16,c*.12)}}
 // ===== 台電：斷電確認後，工程車停靠、人員作業 =====
 if(inc.pow===2&&c>=12){
  const pkS2=(inc.pk&&inc.pk.spots)||[];
  const used2=new Set();for(const u of onScene(inc))if(u.arm)used2.add(u.arm);
  const sp=pkS2.filter(q=>!used2.has(q.key))[Math.min(1,pkS2.length-1)]||null;
  let tx,ty,ta;
  if(sp){tx=X(sp.x)+c/2;ty=Y(sp.y)+c/2;ta=Math.atan2(sp.dir[1],sp.dir[0])}
  else{tx=cx+c*1.8;ty=cy-c*1.2;ta=0}
  g.save();g.translate(tx,ty);g.rotate(ta);
  const L=c*.7,W=c*.34;
  g.fillStyle='#f2c21b';scRR(g,-L/2,-W/2,L,W,c*.05);g.fill();
  g.fillStyle='#1d4fa3';g.fillRect(-L/2,-W*.12,L,W*.24);
  g.fillStyle='rgba(30,44,70,.6)';g.fillRect(L*.24,-W/2,L*.12,W);
  g.fillStyle='#8a939d';g.fillRect(-L*.4,-W*.34,L*.5,W*.14);
  g.fillStyle=(S.t*4|0)%2?'#ffb02e':'#8a5a00';g.fillRect(L*.05,-W*.5,c*.06,W);
  g.restore();
  if(c>=17){g.fillStyle='#1d4fa3';g.font='700 '+(c*.16)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText('台電',tx,ty)}
  const TPC={coat:'#2f5fb3',leg:'#161616',stripe:null,helmet:'#f2c21b',skin:'#e6c0a8',vest:'#d8362f'};
  const rT=Math.max(1.8,c*.12);
  figure(g,tx+Math.cos(ta+Math.PI/2)*c*.42,ty+Math.sin(ta+Math.PI/2)*c*.42,rT,TPC,{ph:2});
  const wa=S.t*.4;
  figure(g,cx+Math.cos(wa)*c*.5,cy+Math.sin(wa)*c*.45,rT,TPC,{ph:5});
  if(c>=17){const lx=tx+Math.cos(ta+Math.PI/2)*c*.42,ly=ty+Math.sin(ta+Math.PI/2)*c*.42;
   g.fillStyle='rgba(20,30,60,.85)';scRR(g,lx-c*.3,ly-c*.62,c*.6,c*.2,c*.03);g.fill();
   g.fillStyle='#ffd27a';g.font='600 '+(c*.15)+'px '+FONT;g.fillText('台電人員',lx,ly-c*.52)}}
 // ===== 台電：斷電完成後工程車進駐 =====
 if(inc.pow===2&&c>=12){
  const spots=(inc.pk&&inc.pk.spots)||[];
  const used=new Set();for(const u of onScene(inc))if(u.arm)used.add(u.arm);
  const fr=spots.filter(sp=>!used.has(sp.key));
  const sp=fr[Math.min(fr.length-1,Math.floor(fr.length/2))];
  let tx,ty,ta;
  if(sp){tx=X(sp.x)+c/2;ty=Y(sp.y)+c/2;ta=Math.atan2(sp.dir[1],sp.dir[0])}
  else{tx=cx-c*2.2;ty=cy+c*1.2;ta=0}
  g.save();g.translate(tx,ty);g.rotate(ta);
  const L=c*.68,W=c*.34;
  g.fillStyle='#f2c21b';scRR(g,-L/2,-W/2,L,W,c*.05);g.fill();
  g.fillStyle='#e9e7e0';g.fillRect(-L*.42,-W*.34,L*.5,W*.68);
  g.fillStyle='#2f5fb3';g.fillRect(-L*.36,-W*.1,L*.38,W*.2);
  g.fillStyle='rgba(30,44,70,.6)';g.fillRect(L*.24,-W/2,L*.1,W);
  const ab=(S.t*3|0)%2;g.fillStyle=ab?'#ffb020':'#8a5a00';g.fillRect(L*.06,-W*.5,c*.06,W);
  g.restore();
  const TP={coat:'#2f5fb3',leg:'#161616',stripe:null,helmet:'#f2c21b',skin:'#e6c0a8',vest:'#d8362f'};
  const rr5=Math.max(1.8,c*.12);
  for(let i=0;i<2;i++){
   const a=ta+Math.PI/2+(i?.5:-.5);
   figure(g,tx+Math.cos(a)*c*.5,ty+Math.sin(a)*c*.5,rr5,TP,{ph:i*2,helmet:true})}
  if(c>=17){g.fillStyle='rgba(20,20,20,.8)';scRR(g,tx-c*.2,ty-c*.52,c*.4,c*.2,c*.03);g.fill();
   g.fillStyle='#f2c21b';g.font='600 '+(c*.15)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText('台電',tx,ty-c*.42)}}
 // ===== 警方人員：依案件性質分層 =====
 (function(){
  if(!(inc.pol===2||d.police)||c<12)return;
  const r4=Math.max(1.8,c*.12),skin='#e6c0a8';
  const PAT={coat:'#2b3550',leg:'#1d2439',stripe:'#c9d3e6',helmet:'#2b3550',skin};
  const VEST={coat:'#2b3550',leg:'#1d2439',stripe:null,helmet:'#2b3550',skin,vest:'#141414'};
  const TRAF={coat:'#2b3550',leg:'#1d2439',stripe:'#f2f2ee',helmet:'#f2f2ee',skin,vest:'#c8f04a'};
  const RIOT={coat:'#1f2638',leg:'#161b28',stripe:null,helmet:'#0f0f10',skin,vest:'#101010'};
  const SWAT={coat:'#151515',leg:'#0d0d0d',stripe:null,helmet:'#0b0b0b',skin:'#3a3a3a',vest:'#262626'};
  const gun=(x,y,a)=>{g.strokeStyle='#0a0a0a';g.lineWidth=Math.max(1,r4*.35);
   g.beginPath();g.moveTo(x,y-r4*.1);g.lineTo(x+Math.cos(a)*r4*1.6,y-r4*.1+Math.sin(a)*r4*1.6);g.stroke()};
  const shield=(x,y,a)=>{g.save();g.translate(x+Math.cos(a)*r4*.9,y+Math.sin(a)*r4*.9-r4*.2);g.rotate(a);
   g.fillStyle='rgba(185,205,235,.55)';scRR(g,-r4*.18,-r4*.85,r4*.36,r4*1.7,r4*.12);g.fill();
   g.strokeStyle='rgba(230,240,255,.8)';g.lineWidth=1;g.stroke();g.restore()};
  const PSY=['psych','crisis','suicall','selfharm','overdose','drunk'];
  // 警用車輛：停在消救車輛外側的停車點
  const pkS=(inc.pk&&inc.pk.spots)||[];
  const usedS=new Set();for(const u of onScene(inc))if(u.arm)usedS.add(u.arm);
  const freeS=pkS.filter(sp=>!usedS.has(sp.key)).slice().reverse();
  let vi=0;
  const polVeh=(type)=>{
   let px,py,ang;
   const sp=freeS[vi++];
   if(sp){px=X(sp.x)+c/2;py=Y(sp.y)+c/2;ang=Math.atan2(sp.dir[1],sp.dir[0]);
    const perp=[sp.dir[1],sp.dir[0]];px+=perp[0]*c*.26*(vi%2?1:-1);py+=perp[1]*c*.26*(vi%2?1:-1)}
   else{const a=vi*1.1+.5;px=cx+Math.cos(a)*c*2.4;py=cy+Math.sin(a)*c*2.2;ang=a+Math.PI/2}
   const bl=(S.t*9|0)%2;
   g.save();g.translate(px,py);g.rotate(ang);
   if(type==='moto'){
    g.fillStyle='#f2f2ee';scRR(g,-c*.16,-c*.06,c*.32,c*.12,c*.04);g.fill();
    g.fillStyle='#1d4fa3';g.fillRect(-c*.06,-c*.06,c*.12,c*.12);
    g.fillStyle='#111';g.beginPath();g.arc(-c*.14,0,c*.04,0,TAU);g.arc(c*.14,0,c*.04,0,TAU);g.fill();
    g.fillStyle=bl?'#ff4d4d':'#4da3ff';g.fillRect(c*.1,-c*.03,c*.04,c*.06)}
   else if(type==='van'){
    const L=c*.74,W=c*.36;
    g.fillStyle='#1d2c55';scRR(g,-L/2,-W/2,L,W,c*.05);g.fill();
    g.fillStyle='#e9e7e0';g.fillRect(-L/2,-W*.08,L,W*.16);
    g.fillStyle='rgba(30,44,70,.6)';g.fillRect(L*.26,-W/2,L*.1,W);
    g.fillStyle=bl?'#ff4d4d':'#4da3ff';g.fillRect(L*.04,-W*.5,c*.07,W*.5);
    g.fillStyle=bl?'#4da3ff':'#ff4d4d';g.fillRect(L*.04,0,c*.07,W*.5)}
   else{
    const L=c*.6,W=c*.3;
    g.fillStyle='#f2f2ee';scRR(g,-L/2,-W/2,L,W,c*.06);g.fill();
    g.fillStyle='#1d4fa3';g.fillRect(-L/2,-W*.1,L,W*.2);
    g.fillStyle='rgba(30,44,70,.6)';g.fillRect(L*.2,-W/2,L*.12,W);g.fillRect(-L*.32,-W/2,L*.1,W);
    g.fillStyle=bl?'#ff4d4d':'#4da3ff';g.fillRect(-c*.02,-W*.5,c*.07,W*.5);
    g.fillStyle=bl?'#4da3ff':'#ff4d4d';g.fillRect(-c*.02,0,c*.07,W*.5)}
   g.restore()};
  if(d.tac){
   if(['armedfight','tactical','lonewolf'].indexOf(inc.k)>=0){polVeh('car');polVeh('car');polVeh('car');polVeh('car');polVeh('van')}
   else{for(let v2=0;v2<4;v2++)polVeh('car');if(inc.id%2===0)for(let m2=0;m2<4+2*(inc.id%3);m2++)polVeh('moto')}}
  else if(PSY.indexOf(inc.k)>=0)polVeh('car');
  else{polVeh('moto');polVeh('moto')}
  if(d.tac){
   // 快打部隊：內圈半圓隊形，頭盔、盾牌、槍
   const n5=inc.k==='brawl'?8:12;
   for(let i=0;i<n5;i++){
    const a=Math.PI*.15+i*(Math.PI*.7/(n5-1))+Math.sin(S.t*.6+i)*.03;
    const rr=n5>8&&i%2?1.4:1,px=cx+Math.cos(a)*c*1.05*rr,py=cy+Math.sin(a)*c*.95*rr,face=a+Math.PI;
    figure(g,px,py,r4,RIOT,{ph:i});
    if(i%2===0)shield(px,py,face);else gun(px,py,face)}
   // SWAT 四人縱隊：淨空前朝建物推進，淨空後於側翼警戒
   if(['armedfight','tactical','lonewolf'].indexOf(inc.k)>=0){
    const cleared=!(inc.clr>0);
    const base=Math.atan2(Y(inc.ay)+c/2-cy,X(inc.ax)+c/2-cx)-Math.PI/2;
    const adv=cleared?1.6:(1.9-((S.t*.12)%1)*1.0);
    for(let i=0;i<4;i++){
     const dd=adv+i*.26;
     const px=cx+Math.cos(base)*c*dd,py=cy+Math.sin(base)*c*dd;
     figure(g,px,py,r4,SWAT,{ph:i*1.3,moving:cleared?0:1});
     gun(px,py,base+Math.PI)}
    if(c>=17){const lx=cx+Math.cos(base)*c*(adv+1.25),ly=cy+Math.sin(base)*c*(adv+1.25);
     g.fillStyle='rgba(12,12,12,.85)';scRR(g,lx-c*.22,ly-c*.12,c*.44,c*.22,c*.03);g.fill();
     g.fillStyle='#e6e3db';g.font='600 '+(c*.15)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
     g.fillText('SWAT',lx,ly)}}
   return}
  if(PSY.indexOf(inc.k)>=0){
   // 精神急症：警察進入內圈，著防彈背心
   for(let i=0;i<2;i++){
    const a=.8+i*1.4+Math.sin(S.t*.5+i)*.05;
    figure(g,cx+Math.cos(a)*c*.55,cy+Math.sin(a)*c*.5,r4,VEST,{ph:i*2})}
   return}
  if(d.road){
   // 交通事故：交通隊反光背心，指揮車流
   const ra=(RD[K(inc.x+1,inc.y)]||RD[K(inc.x-1,inc.y)])?0:Math.PI/2;
   for(let i=0;i<2;i++){
    const sgn=i?1:-1;
    const px=cx+Math.cos(ra)*c*1.9*sgn,py=cy+Math.sin(ra)*c*1.9*sgn;
    figure(g,px,py,r4,TRAF,{ph:i*3});
    const wv=Math.sin(S.t*5+i)*.7;
    g.strokeStyle='#ff9a3c';g.lineWidth=Math.max(1.2,r4*.35);
    g.beginPath();g.moveTo(px+r4*.4,py-r4*.3);g.lineTo(px+r4*.4+Math.cos(wv-1)*r4*1.4,py-r4*.3+Math.sin(wv-1)*r4*1.4);g.stroke()}
   return}
  // 一般案件：外圍警戒
  for(let i=0;i<2;i++){
   const a4=1.9+i*1.5+Math.sin(S.t*.3+i)*.05;
   figure(g,cx+Math.cos(a4)*c*1.6,cy+Math.sin(a4)*c*1.5,r4,PAT,{ph:i*3})}
 })();
 // ===== 台電工程車與人員（斷電確認後到場） =====
 if(inc.pow===2&&c>=12){
  const spots=(inc.pk&&inc.pk.spots)||[],used=new Set();
  for(const u of onScene(inc))if(u.arm)used.add(u.arm);
  const free=spots.filter(sp=>!used.has(sp.key));
  const sp=free.length?free[Math.floor(free.length/2)]:null;
  let px,py,ang;
  if(sp){px=X(sp.x)+c/2;py=Y(sp.y)+c/2;ang=Math.atan2(sp.dir[1],sp.dir[0])}
  else{px=cx-c*2.2;py=cy+c*1.6;ang=0}
  g.save();g.translate(px,py);g.rotate(ang);
  const L=c*.72,W=c*.34;
  g.fillStyle='#f2c21b';scRR(g,-L/2,-W/2,L,W,c*.05);g.fill();
  g.fillStyle='#c79a10';g.fillRect(L*.18,-W/2,L*.32,W);
  g.fillStyle='rgba(30,44,70,.6)';g.fillRect(L*.36,-W/2,L*.1,W);
  g.strokeStyle='#8a939d';g.lineWidth=Math.max(1.5,c*.07);
  g.beginPath();g.moveTo(-L*.3,0);g.lineTo(L*.05,-W*.05);g.stroke();
  g.fillStyle='#d8d4c8';g.fillRect(-L*.46,-W*.2,c*.12,W*.4);
  const bl2=(S.t*5|0)%2;g.fillStyle=bl2?'#ff9a3c':'#8a5a1a';g.fillRect(L*.2,-W*.5,c*.07,W);
  g.restore();
  if(c>=17){g.fillStyle='rgba(20,20,20,.8)';scRR(g,px-c*.2,py-c*.5,c*.4,c*.18,c*.03);g.fill();
   g.fillStyle='#f2c21b';g.font='600 '+(c*.14)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText('台電',px,py-c*.41)}
  const TPC={coat:'#2c5fb5',leg:'#161616',stripe:null,helmet:'#f3c43b',skin:'#e6c0a8',vest:'#d8362f'};
  const rT=Math.max(1.8,c*.12),side=ang+Math.PI/2;
  for(let i=0;i<2;i++){
   const wx=px+Math.cos(side)*c*.42+Math.cos(ang)*(i?c*.2:-c*.2)+Math.sin(S.t*.8+i)*c*.02;
   const wy=py+Math.sin(side)*c*.42+Math.sin(ang)*(i?c*.2:-c*.2)+Math.cos(S.t*.7+i)*c*.02;
   figure(g,wx,wy,rT,TPC,{ph:i*2})}}
 // 照明燈塔
 for(const u of crew){
  if(u.st!=='work'||(u.code!=='75'&&u.code!=='41'&&u.code!=='搜'))continue;
  const a5=(u.hd||0)-Math.PI/2;
  const lx=X(u.x+(u.ox||0))+c/2+Math.cos(a5)*c*.4,ly=Y(u.y+(u.oy||0))+c/2+Math.sin(a5)*c*.4;
  g.strokeStyle='rgba(180,176,168,.8)';g.lineWidth=Math.max(1,c*.04);
  g.beginPath();g.moveTo(lx,ly);g.lineTo(lx,ly-c*.5);g.stroke();
  g.fillStyle='rgba(255,246,210,.9)';g.fillRect(lx-c*.07,ly-c*.58,c*.14,c*.08);
  g.fillStyle='rgba(255,246,210,'+(.10+nf*.22).toFixed(2)+')';
  g.beginPath();g.moveTo(lx,ly-c*.54);g.lineTo(cx-c*.6,cy+c*.4);g.lineTo(cx+c*.6,cy+c*.4);
  g.closePath();g.fill()}
 // 視野外車輛的邊緣指標
 for(const u of crew){
  if(u.x>=x0-.5&&u.x<=x1+.5&&u.y>=y0-.5&&u.y<=y1+.5)continue;
  const an=Math.atan2(u.y-inc.y,u.x-inc.x);
  const ex=Math.max(6,Math.min(scW-6,cx+Math.cos(an)*scW*.46));
  const ey=Math.max(24,Math.min(scH-6,cy+Math.sin(an)*scH*.44));
  g.fillStyle=CODE[u.code].col;
  g.save();g.translate(ex,ey);g.rotate(an);
  g.beginPath();g.moveTo(6,0);g.lineTo(-4,4);g.lineTo(-4,-4);g.closePath();g.fill();g.restore();
  if(c>=14){g.fillStyle='rgba(0,0,0,.6)';g.font='500 9px '+FONT;g.textAlign='center';
   g.fillText(u.cs,ex,ey-7);g.fillStyle='#cfcbc2';g.fillText(u.cs,ex,ey-8)}}
 // ===== 大量傷病患：檢傷帆布、檢傷組、醫療指揮官 =====
 if(d.mci&&inc.rev&&inc.ph>=1&&c>=12){
  const ea=Math.atan2(Y(inc.ay)+c/2-cy,X(inc.ax)+c/2-cx)+Math.PI/2;
  const bx0=cx+Math.cos(ea)*c*1.75,by0=cy+Math.sin(ea)*c*1.75;
  const prog=Math.min(1,inc.work/inc.dur);
  const sev=['buscrash','airlanding','gasblast','pileup','majorind','lonewolf'].indexOf(inc.k)>=0;
  const tarps=[['#d8362f','紅',2],['#f3c43b','黃',3],['#3fae86','綠',4],['#262626','黑',sev?1:0]];
  tarps.forEach((tp,i)=>{
   if(!tp[2]&&i===3)return;
   const tx=bx0+((i%2)-.5)*c*.82,ty=by0+(Math.floor(i/2)-.5)*c*.62;
   g.fillStyle=tp[0];g.globalAlpha=.85;scRR(g,tx-c*.36,ty-c*.24,c*.72,c*.48,c*.04);g.fill();g.globalAlpha=1;
   g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.strokeRect(tx-c*.36,ty-c*.24,c*.72,c*.48);
   const left=i===3?tp[2]:Math.max(0,Math.round(tp[2]*(1-prog*.9)));
   for(let j=0;j<left;j++){
    const px=tx-c*.24+(j%2)*c*.26,py=ty-c*.1+Math.floor(j/2)*c*.14;
    g.fillStyle=i===3?'#8f8b82':'#d7b3a6';scRR(g,px-c*.1,py-c*.03,c*.2,c*.06,c*.02);g.fill();
    g.beginPath();g.arc(px-c*.13,py,c*.035,0,TAU);g.fill()}
   if(c>=18){g.fillStyle=i===3?'#bdb9b0':'#111110';g.font='600 '+(c*.16)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
    g.fillText(tp[1],tx+c*.26,ty-c*.16)}});
  // 檢傷組：往返災點與帆布區
  for(let i=0;i<3;i++){
   const ph3=(S.t*.28+i*.33)%1,tri=ph3<.5?ph3*2:2-ph3*2;
   const tx=bx0+((i%2)-.5)*c*.6,ty=by0;
   figure(g,cx+(tx-cx)*tri,cy+(ty-cy)*tri,Math.max(1.5,c*.1),'medic',{ph:i*2,moving:1,carry:i===0})}
  // 醫療指揮官
  const mx3=bx0+Math.cos(ea)*c*.75,my3=by0+Math.sin(ea)*c*.75;
  figure(g,mx3,my3,Math.max(1.6,c*.11),'mcmd',{ph:4});
  if(c>=17){g.fillStyle='rgba(20,40,30,.85)';scRR(g,mx3-c*.34,my3-c*.62,c*.68,c*.2,c*.03);g.fill();
   g.fillStyle='#8fe3c4';g.font='600 '+(c*.15)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText('醫療指揮官',mx3,my3-c*.52)}}
 // ===== 化災：區劃、插旗、除污走廊、A/B/C 級防護 =====
 if(d.hz&&inc.rev&&c>=12){
  const zones=[[1.3,'#e2564f','熱區'],[2.2,'#e9a13b','暖區'],[3.0,'#5dcaa5','冷區']];
  zones.forEach((z,i)=>{
   g.strokeStyle=z[1];g.globalAlpha=.6;g.lineWidth=Math.max(1,c*.05);
   g.setLineDash([c*.2,c*.14]);g.beginPath();g.arc(cx,cy,c*z[0],0,TAU);g.stroke();g.setLineDash([]);g.globalAlpha=1;
   for(let a=0;a<4;a++){
    const an=a*Math.PI/2+.4+i*.3,fx=cx+Math.cos(an)*c*z[0],fy=cy+Math.sin(an)*c*z[0];
    g.strokeStyle='#d8d4c8';g.lineWidth=Math.max(1,c*.03);
    g.beginPath();g.moveTo(fx,fy);g.lineTo(fx,fy-c*.3);g.stroke();
    const fl=Math.sin(S.t*4+a+i)*c*.03;
    g.fillStyle=z[1];g.beginPath();g.moveTo(fx,fy-c*.3);g.lineTo(fx+c*.18,fy-c*.24+fl);g.lineTo(fx,fy-c*.18);g.closePath();g.fill()}
   if(c>=18){g.fillStyle=z[1];g.font='600 '+(c*.17)+'px '+FONT;g.textAlign='center';
    g.fillText(z[2],cx,cy-c*z[0]-c*.08)}});
  // 除污走廊：由暖區朝進場口延伸
  const ea2=Math.atan2(Y(inc.ay)+c/2-cy,X(inc.ax)+c/2-cx);
  g.save();g.translate(cx,cy);g.rotate(ea2);
  g.fillStyle='rgba(175,169,236,.18)';g.fillRect(c*1.35,-c*.28,c*1.3,c*.56);
  g.strokeStyle='rgba(175,169,236,.75)';g.lineWidth=Math.max(1,c*.04);
  g.beginPath();g.moveTo(c*1.35,-c*.28);g.lineTo(c*2.65,-c*.28);g.moveTo(c*1.35,c*.28);g.lineTo(c*2.65,c*.28);g.stroke();
  for(let i=0;i<3;i++){
   const sx=c*(1.55+i*.42);
   g.fillStyle='#afa9ec';g.fillRect(sx-c*.05,-c*.3,c*.1,c*.08);
   for(let k2=0;k2<3;k2++){const ph4=(S.t*1.8+k2*.33+i*.2)%1;
    g.fillStyle='rgba(215,235,255,'+(.6*(1-ph4)).toFixed(2)+')';
    g.beginPath();g.arc(sx+Math.sin(k2*2+i)*c*.06,-c*.22+ph4*c*.4,c*.03,0,TAU);g.fill()}}
  g.restore();
  if(c>=17){const lx2=cx+Math.cos(ea2)*c*2,ly2=cy+Math.sin(ea2)*c*2;
   g.fillStyle='#c9c4f5';g.font='600 '+(c*.16)+'px '+FONT;g.textAlign='center';g.fillText('除污走廊',lx2,ly2-c*.36)}
  // 防護人員：需化災車到場
  if(onScene(inc).some(u=>u.st==='work'&&(u.code==='51'||u.code==='01'))){
   const r3=Math.max(1.6,c*.11);
   for(let i=0;i<2;i++){const an=S.t*.5+i*Math.PI;
    figure(g,cx+Math.cos(an)*c*.7,cy+Math.sin(an)*c*.6,r3*1.1,'hzA',{ph:i,moving:1})}
   for(let i=0;i<2;i++){const sx=c*(1.6+i*.5);
    figure(g,cx+Math.cos(ea2)*sx-Math.sin(ea2)*c*.14,cy+Math.sin(ea2)*sx+Math.cos(ea2)*c*.14,r3,'hzB',{ph:i*2})}
   figure(g,cx+Math.cos(ea2)*c*2.85,cy+Math.sin(ea2)*c*2.85,r3,'hzC',{ph:5});
   if(c>=18){g.fillStyle='#9fe07f';g.font='600 '+(c*.15)+'px '+FONT;g.textAlign='center';
    g.fillText('A 級',cx,cy+c*.95)}}}
 drawCrew(g,inc,c,X,Y,cx,cy,inc.rev&&inc.ph>=0?phMode(inc.phs[inc.ph]):'line');
 sceneFx(g,inc,d,crew,c,cx,cy);sceneFx2(g,inc,d,crew,c,X,Y,cx,cy);
 // 抬頭資訊
 g.fillStyle='rgba(10,10,9,.72)';g.fillRect(0,0,scW,20);
 g.fillStyle='#e9e7e0';g.font='500 12px '+FONT;g.textAlign='left';g.textBaseline='middle';
 const txN=crew.filter(u=>u.st==='tx').length;
 g.fillText((inc.nm||d.n)+(inc.rev&&inc.ph>=0?'　'+inc.phs[inc.ph]:'　受理中')+(txN?'　後送途中':''),8,10);
 g.textAlign='right';g.fillStyle='#9d9a92';
 if(!emsSafe(inc)&&crew.some(u=>u.code==='91')){g.fillStyle='#e9a13b';
  g.fillText('救護組待命中',scW-8,10);g.fillStyle='#9d9a92';g.textAlign='right'}
 else g.fillText((nf>.4?'夜間　':'')+crew.length+' 車在場'+(eff?'　出水 '+eff+' 線':'')+(inc.wrap>0?'　收整中':''),scW-8,10)}
