// 現場畫面：大量傷病患與化災的專屬佈置
// 由 drawScene() 依序呼叫；參數皆為 drawScene 內算好的區域變數
'use strict';
function scMci(inc,g,d,c,X,Y,cx,cy){
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
   g.fillText('醫療指揮官',mx3,my3-c*.52)}}}
function scHazmat(inc,g,d,crew,fx,fy,c,X,Y,cx,cy){
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
    g.fillText('A 級',cx,cy+c*.95)}}}}
