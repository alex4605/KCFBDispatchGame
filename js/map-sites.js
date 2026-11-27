// 大地圖放大（每格 34 像素以上）時的設施俯視圖：分隊（車庫、待命車）、醫院（急診、救護車位、直升機坪）、機場（航廈空橋、飛機、塔台、滑行道）
'use strict';
// 俯視消防車（長 L、寬 W，車頭朝 +x）；褪色用於除役車
function siteTruck(x,y,a,L,W,col,u){
 ctx.save();ctx.translate(x,y);ctx.rotate(a);
 ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(-L/2+1,-W/2+1.5,L,W);
 ctx.fillStyle=col;ctx.fillRect(-L/2,-W/2,L,W);
 ctx.fillStyle='rgba(20,30,40,.65)';ctx.fillRect(L/2-L*.2,-W/2+1,L*.14,W-2);
 const on=u&&(S.t*3+u.id)%1<.5;
 if(u&&u.st!=='idle'){ctx.fillStyle=on?'#ff4a3a':'#4a8aff';ctx.fillRect(L/2-L*.26,-W/2,L*.05,W)}
 ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(-L/2+L*.08,-W*.12,L*.6,W*.24);
 ctx.restore()}
// 分隊：一格。屋舍在後、車庫門朝向臨路側，待命車停在車庫前坪；旗桿與隊名
function stationSite(s,i,c){
 const cx=(s.p[0]+.5)*c,cy=(s.p[1]+.5)*c,ax=s.x[0]-s.p[0],ay=s.x[1]-s.p[1];
 const a=Math.atan2(ay,ax)-Math.PI/2;      // 旋轉後 +y 朝向道路
 const us=S.ix?S.ix.bySt[i].filter(u=>!u.ma&&!u.trainee):[],idle=us.filter(u=>u.st==='idle');
 ctx.save();ctx.translate(cx,cy);ctx.rotate(a);
 const h=c/2;
 ctx.fillStyle='#3a3833';ctx.fillRect(-h,-h,c,c);                        // 場區鋪面
 ctx.fillStyle=s.n==='機場'?'#6a5a2a':'#7a3428';ctx.fillRect(-h*.92,-h*.92,c*.92,c*.5);   // 屋頂
 ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(-h*.92,-h*.92,c*.92,c*.08);
 const n=Math.max(2,Math.min(4,Math.ceil(us.length/2))),dw=c*.86/n;
 for(let k=0;k<n;k++){const open=us[k]&&us[k].st!=='idle';
  ctx.fillStyle=open?'#14120f':'#8a8a84';ctx.fillRect(-h*.86+k*dw+dw*.08,-h*.92+c*.5-c*.06,dw*.84,c*.06);
  if(!open){ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=1;for(let j=1;j<3;j++){ctx.beginPath();ctx.moveTo(-h*.86+k*dw+dw*.08,-h*.92+c*.5-c*.06+j*c*.02);ctx.lineTo(-h*.86+k*dw+dw*.92,-h*.92+c*.5-c*.06+j*c*.02);ctx.stroke()}}}
 // 前坪：待命車車頭朝路
 const show=idle.slice(0,n);
 show.forEach((u,k)=>{const col=u.code==='91'?'#efefe9':u.code==='機'?'#d8b83a':CODE[u.code].col==='#d8b83a'?'#d8b83a':'#c8332c';
  siteTruck(-h*.86+k*dw+dw/2,h*.32,Math.PI/2,c*.34,Math.min(dw*.7,c*.16),col,u)});
 // 旗桿
 ctx.fillStyle='#ddd';ctx.fillRect(h*.82,-h*.2,c*.015,c*.3);ctx.fillStyle='#c8332c';ctx.fillRect(h*.83,-h*.2,c*.08,c*.05);
 ctx.restore();
 // 局本部辦公大樓（成功分隊第二格）
 if(s.cells&&s.cells[1]){const bx=s.cells[1][0]*c,by=s.cells[1][1]*c;
  ctx.fillStyle='#3a3833';ctx.fillRect(bx,by,c,c);ctx.fillStyle='#5d6a7a';ctx.fillRect(bx+c*.06,by+c*.06,c*.88,c*.88);
  ctx.fillStyle='#7d8a9a';for(let r=0;r<4;r++)for(let q=0;q<4;q++)ctx.fillRect(bx+c*.12+q*c*.2,by+c*.12+r*c*.2,c*.12,c*.12);
  ctx.fillStyle='#c8332c';ctx.fillRect(bx+c*.4,by+c*.4,c*.2,c*.2);
  ctx.fillStyle='#fff';ctx.font='600 '+Math.max(9,c*.14)+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('局本部',bx+c/2,by+c/2)}
 ctx.fillStyle='rgba(10,10,9,.75)';const lb=(ST_FULL[s.n]||s.n+'分隊')+' · 待命 '+idle.length;ctx.font='600 11px '+FONT;
 const tw=ctx.measureText(lb).width+10;rr(cx-tw/2,cy-h-17,tw,15,3);ctx.fill();
 ctx.fillStyle='#f0c8b8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(lb,cx,cy-h-9.5)}
// 醫院：主建物（中庭）、屋頂紅十字、直升機坪、臨路的急診雨遮與救護車位
function hospSite(H,c){
 const x=H.p[0]*c,y=H.p[1]*c,w=(H.w||1)*c,h=(H.h||1)*c;
 ctx.fillStyle='#3a3a3e';ctx.fillRect(x,y,w,h);
 ctx.fillStyle='#d8dde2';ctx.fillRect(x+w*.06,y+h*.08,w*.88,h*.62);
 ctx.fillStyle='#9aa4ad';ctx.fillRect(x+w*.3,y+h*.25,w*.4,h*.28);            // 中庭
 ctx.fillStyle='#c8332c';const cs=Math.min(w,h)*.16;ctx.fillRect(x+w*.18-cs/2,y+h*.2-cs*.17,cs,cs*.34);ctx.fillRect(x+w*.18-cs*.17,y+h*.2-cs/2,cs*.34,cs);
 // 直升機坪
 const hx=x+w*.8,hy=y+h*.3,hr=Math.min(w,h)*.14;ctx.fillStyle='#4a4e54';ctx.beginPath();ctx.arc(hx,hy,hr,0,TAU);ctx.fill();
 ctx.strokeStyle='#f0d060';ctx.lineWidth=Math.max(1,c*.02);ctx.beginPath();ctx.arc(hx,hy,hr*.8,0,TAU);ctx.stroke();
 ctx.fillStyle='#fff';ctx.font='700 '+Math.max(9,hr)+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('H',hx,hy+1);
 // 急診雨遮與救護車位（正在交接、清消的救護車畫在這裡）
 ctx.fillStyle='#b8332c';ctx.fillRect(x+w*.06,y+h*.72,w*.5,h*.06);
 ctx.fillStyle='#fff';ctx.font='600 '+Math.max(9,c*.13)+'px '+FONT;ctx.fillText('急診',x+w*.31,y+h*.75);
 const amb=S.units.filter(u=>(u.st==='give'||u.st==='clean')&&Math.hypot(u.x-(H.p[0]+(H.w||1)/2),u.y-(H.p[1]+(H.h||1)/2))<4);
 amb.slice(0,4).forEach((u,k)=>siteTruck(x+w*(.12+k*.12),y+h*.88,-Math.PI/2,c*.22,c*.1,'#efefe9',u));
 ctx.strokeStyle='rgba(240,240,230,.35)';ctx.lineWidth=1;for(let k=0;k<=4;k++){ctx.beginPath();ctx.moveTo(x+w*(.06+k*.12),y+h*.8);ctx.lineTo(x+w*(.06+k*.12),y+h*.97);ctx.stroke()}
 ctx.fillStyle='rgba(10,10,9,.75)';ctx.font='600 11px '+FONT;const tw=ctx.measureText(H.n).width+10;rr(x+w/2-tw/2,y-16,tw,15,3);ctx.fill();
 ctx.fillStyle='#cfe2f5';ctx.fillText(H.n,x+w/2,y-8.5)}
// 機場：航廈登機門與空橋、停機坪上的飛機、塔台、滑行道連接線、跑道編號
function airportSite(c,x0,x1,y0,y1){
 const A=AP;if(!A||A.x1<x0||A.x0>x1||A.y1<y0||A.y0>y1)return;
 const X=i=>(A.x0+i)*c,Y=j=>(A.y0+j)*c;
 // 跑道編號與跑道中線燈
 ctx.fillStyle='rgba(240,240,232,.85)';ctx.font='700 '+Math.max(10,c*.3)+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
 AL.runways.forEach((r,i)=>{ctx.save();ctx.translate(X(AL.rx[0])+c*1.5,Y(r)+c/2);ctx.rotate(Math.PI/2);ctx.fillText(i?'09L':'09R',0,0);ctx.restore();
  ctx.save();ctx.translate(X(AL.rx[1])-c*.5,Y(r)+c/2);ctx.rotate(-Math.PI/2);ctx.fillText(i?'27R':'27L',0,0);ctx.restore()});
 // 登機門與空橋、停機坪上的客機
 for(let j=AL.apron[2];j<=AL.apron[3];j+=2){const gx=X(AL.apron[0]),gy=Y(j)+c/2;
  ctx.fillStyle='#8a8f96';ctx.fillRect(gx-c*.1,gy-c*.05,c*.5,c*.1);
  if(hsh(K(A.x0,A.y0+j),5)>.2){ctx.save();ctx.translate(gx+c*1.35,gy);ctx.fillStyle='#e6e8ea';
   ctx.beginPath();ctx.ellipse(0,0,c*.85,c*.11,0,0,TAU);ctx.fill();
   ctx.beginPath();ctx.moveTo(-c*.1,0);ctx.lineTo(c*.2,-c*.75);ctx.lineTo(c*.38,-c*.75);ctx.lineTo(c*.22,0);ctx.lineTo(c*.38,c*.75);ctx.lineTo(c*.2,c*.75);ctx.closePath();ctx.fill();
   ctx.beginPath();ctx.moveTo(c*.62,0);ctx.lineTo(c*.78,-c*.26);ctx.lineTo(c*.86,-c*.26);ctx.lineTo(c*.8,0);ctx.lineTo(c*.86,c*.26);ctx.lineTo(c*.78,c*.26);ctx.closePath();ctx.fill();
   ctx.fillStyle=['#1a5aa8','#c8332c','#2a8a5a'][hsh(K(A.x0,A.y0+j),6)*3|0];ctx.fillRect(c*.72,-c*.03,c*.14,c*.06);ctx.restore()}}
 // 設施名稱（中倍率以上）
 const lab=(s,i,j)=>{ctx.font='600 11px '+FONT;const tw=ctx.measureText(s).width+10;ctx.fillStyle='rgba(10,10,9,.75)';rr(X(i)-tw/2,Y(j)-8,tw,15,3);ctx.fill();ctx.fillStyle='#e8dca8';ctx.fillText(s,X(i),Y(j))};
 lab('高雄國際機場 航廈',(AL.term[0]+AL.term[1]+1)/2,AL.term[2]-.6);
 lab('塔台',AL.tower[0]+.5,AL.tower[1]-.3);
 lab('貨運站',(AL.cargo[0]+AL.cargo[1]+1)/2,AL.cargo[2]-.4);lab('修護棚廠',(AL.hangar[0]+AL.hangar[1]+1)/2,AL.hangar[2]-.4);lab('油庫',(AL.fuel[0]+AL.fuel[1]+1)/2,AL.fuel[2]-.4)}
function siteOverlay(c,x0,x1,y0,y1){
 airportSite(c,x0,x1,y0,y1);
 for(const H of HOSP){if(H.p[0]>x1+1||H.p[0]+(H.w||1)<x0-1||H.p[1]>y1+1||H.p[1]+(H.h||1)<y0-1)continue;hospSite(H,c)}
 for(let i=0;i<S.nst;i++){const s=SPOT[i];if(!s.p||s.p[0]<x0-1||s.p[0]>x1+1||s.p[1]<y0-1||s.p[1]>y1+1)continue;stationSite(s,i,c)}}
