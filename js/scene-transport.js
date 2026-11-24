// 現場畫面：後送路線、醫院交接、救護待命區
// 由 drawScene() 依序呼叫；參數皆為 drawScene 內算好的區域變數
'use strict';
function scTxRoute(g,crew,c,X,Y){
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
  g.lineTo(X(hb3.p[0])+c/2,Y(hb3.p[1])+c/2);g.stroke();g.setLineDash([])})();}
function scHospital(g,crew,nf,x0,x1,y0,y1,c,X,Y){
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
     g.fillText('整檢補給',ux0,uy0-c*.45)}}}}}
function scEmsStaging(inc,g,ambV,cmdV,c,X,Y){
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
  if(c>=40){g.fillStyle='#5dcaa5';g.font='600 '+(c*.24)+'px '+FONT;g.textAlign='center';
   g.fillText('救護待命區',sx,sy-c*.6)}})();}
function scTxPath(inc,g,ambV,c,X,Y,cx,cy){
 // 後送動線
 if(inc.rev&&inc.pm.trap>=3){
  const amb2=ambV[0];
  if(amb2){const tx2=cx+c*1.2,ty2=cy-c*.9;
   g.strokeStyle='rgba(93,202,165,.45)';g.lineWidth=Math.max(1,c*.06);
   g.setLineDash([c*.2,c*.16]);g.lineDashOffset=-(S.t*14)%(c*.36);
   g.beginPath();g.moveTo(tx2,ty2);g.lineTo(X(amb2.x+(amb2.ox||0))+c/2,Y(amb2.y+(amb2.oy||0))+c/2);
   g.stroke();g.setLineDash([])}}}
