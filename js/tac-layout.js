// 戰術指揮：建物版面產生（房間、走廊、樓梯、門窗、開放式與走道型、單元式）
'use strict';
function tacPickV(kind){const w=TAC_CVW[kind]||{end:1};let r=Math.random()*Object.values(w).reduce((a,b)=>a+b,0);for(const k in w){r-=w[k];if(r<=0)return k}return'end'}
// 開放式採走道型的機率
const TAC_AISLE={market:.8,warehouse:.6,fact:.3,farmfire:.3,chemfire:.3,tinfire:.2,solarfire:.4,evfire:.3};
function tacLayout(T,K,kind,two){
 const R=Math.random,N=[],L={N,door:{},ent:{}},SW=.6,unit=(T.unit||TAC_UNIT[kind])&&T.lay==='corridor';let nu=0;
 const add=o=>{o.c=N.length;o.nb=[];o.wl=[];N.push(o);return o};
 const kinds=T.kinds||TAC_KINDS[kind]||['bed'];
 const room=(gx,gy,gw,gh,k)=>{const small=Math.min(gw,gh)<.75||gw*gh<.55;
  return add({ty:'room',gx,gy,gw,gh,kind:k||(small?(T.lay==='open'?(R()<.5?'office':'store'):R()<.5?'bath':'store'):kinds[Math.floor(R()*kinds.length)]),small})};
 // 把 [a,b] 隨機切成寬 lo~hi 的段落，尾段太短就併入前一段
 const cuts=(a,b,lo,hi)=>{const r=[a];let x=a;
  while(b-x>hi){const w=lo+R()*(hi-lo);if(b-x-w<lo)break;x+=w;r.push(x)}
  r.push(b);return r};
 // 樓梯核：樓梯間只佔一小塊，同一條邊的其餘空間是門廳走廊
 // （先加樓梯間：第一座樓梯一定是節點 0，其他程式以此當主樓梯）
 const core=(x,ya,yb,sy,sh)=>{add({ty:'stair',gx:x,gy:sy,gw:SW,gh:sh});
  if(sy-ya>.2)add({ty:'hall',gx:x,gy:ya,gw:SW,gh:sy-ya});
  if(yb-sy-sh>.2)add({ty:'hall',gx:x,gy:sy+sh,gw:SW,gh:yb-sy-sh})};
 // 走廊式的樓梯核：樓梯間在門廳一側（北或南），入口進門廳直通走廊，樓梯不擋在門口
 const coreL=(x,y0,y1,top)=>{
  if(top){add({ty:'stair',gx:x,gy:0,gw:SW,gh:y0});add({ty:'hall',gx:x,gy:y0,gw:SW,gh:L.GH-y0,lob:1})}
  else{add({ty:'stair',gx:x,gy:y1,gw:SW,gh:L.GH-y1});add({ty:'hall',gx:x,gy:0,gw:SW,gh:y1,lob:1})}};
 if(T.lay==='yard')tacYardLay(T,K,L,add,room,cuts,R);
 else if(T.lay==='house'&&R()<.4){ // 街屋（長條形）：前廳臨街、中段樓梯與走道、後段廚房浴室、最後是後間
  L.GW=SW+1.25;L.GH=4.2;L.hv='deep';
  add({ty:'stair',gx:0,gy:1.3,gw:SW,gh:.95});add({ty:'hall',gx:SW,gy:1.3,gw:L.GW-SW,gh:.95});
  room(0,0,L.GW,1.3,'living');
  const kw=L.GW*(.5+R()*.1);room(0,2.25,kw,.9,'kitchen');room(kw,2.25,L.GW-kw,.9,'bath');
  room(0,3.15,L.GW,L.GH-3.15,'bed')}
 else if(T.lay==='house'){ // 透天：一側樓梯，中段小走道串起前廳、後間、廚房、浴室
  L.GW=SW+1.8;L.GH=3;
  const hw=.45,y0=.9+R()*.25,y1=y0+.95;
  // 樓梯在側邊中段，前方是客廳（正門進客廳），樓梯後方隔出儲藏室或浴室
  add({ty:'stair',gx:0,gy:y0,gw:SW,gh:y1-y0});
  add({ty:'hall',gx:SW,gy:y0,gw:hw,gh:y1-y0});
  room(0,0,SW,y0,R()<.5?'store':'bath');
  const bk=R()<.5?[SW,L.GW]:[SW,SW+.75+R()*.35,L.GW];
  for(let i=0;i<bk.length-1;i++)room(bk[i],0,bk[i+1]-bk[i],y0,'bed');
  const kw=.7+R()*.25,rest=L.GW-SW-hw-kw,mid=R()<.5?[['kitchen',kw],['bath',rest]]:[['bath',rest],['kitchen',kw]];
  let x=SW+hw;for(const m of mid){room(x,y0,m[1],y1-y0,m[0]);x+=m[1]}
  if(R()<.4){const w=.5+R()*.2;room(0,y1,L.GW-w,3-y1,'living');room(L.GW-w,y1,w,3-y1,'store')}
  else room(0,y1,L.GW,3-y1,'living')}
 else if(T.lay==='open'&&(kind==='warehouse'||kind==='cargo')&&R()<.6){ // 倉儲：一個大倉儲空間（太寬時分成兩區、中間不設門），一角隔出辦公室、廁所與裝卸區
  L.GH=2.4;const we=SW+K*1.2,sy=Math.max(.3,L.GH/2-.4),ow=.9+R()*.3,oh=.95+R()*.2;L.cv='grid';
  core(0,0,L.GH,sy,.8);
  const of=room(SW,0,ow,oh,'office');of.ofc=1;
  const wc=room(SW,oh,ow*.5,.5,'bath');wc.ofc=1;room(SW+ow*.5,oh,ow*.5,.5,'office').ofc=1;
  room(SW,oh+.5,ow,L.GH-oh-.5,'dock');                                    // 裝卸區（與倉儲相通）
  const x0=SW+ow,bw=we-x0;
  if(bw>3.2){const m=x0+bw*(.45+R()*.1);room(x0,0,m-x0,L.GH,'ware').big=1;room(m,0,we-m,L.GH,'ware').big=1}
  else room(x0,0,bw,L.GH,'ware').big=1;
  L.GW=we;L.ware=1}
 else if(T.lay==='open'&&T.st!==2&&R()<(TAC_AISLE[kind]||0)){ // 走道型：一到兩條貫穿的走道，兩側一排排攤位、貨架或機台
  L.GH=2.4+R()*.4;const we=SW+K*1.2,na=R()<.5?1:2,aw=.36,rh=(L.GH-na*aw)/(na+1),sy=Math.max(.3,Math.min(L.GH-1.1,L.GH/2-.4));L.cv='aisle';
  core(0,0,L.GH,sy,.8);
  let y=0;for(let b=0;b<=na;b++){const xs=cuts(SW,we,.55,1.1);
   for(let i=0;i<xs.length-1;i++)room(xs[i],y,xs[i+1]-xs[i],rh,kinds[Math.floor(R()*kinds.length)]);
   y+=rh;if(b<na){const hs=cuts(SW,we,.9,1.4);for(let i=0;i<hs.length-1;i++)add({ty:'hall',gx:hs[i],gy:y,gw:hs[i+1]-hs[i],gh:aw});y+=aw}}
  L.GW=we}
 else if(T.lay==='open'){ // 賣場／廠區：寬窄不一的兩排相通區塊，偶有隔出的小房間；百貨東側另有樓梯
  L.GH=2.4;const we=SW+K*1.2,ym=.85+R()*.7,sy=Math.max(.3,Math.min(L.GH-1.1,ym-.4));L.cv='grid';
  core(0,0,L.GH,sy,.8);
  const xs=cuts(SW,we,.85,1.5);
  for(let i=0;i<xs.length-1;i++){const w=xs[i+1]-xs[i];
   if(R()<.22&&w>1){const sy=R()<.5;room(xs[i],0,w/2,ym,sy?'store':'office');room(xs[i]+w/2,0,w/2,ym,'store')}
   else room(xs[i],0,w,ym);
   // 百貨：中段一格是貫穿各層的挑空與電扶梯，煙熱會往上竄
   if(T.st===2&&i===Math.floor((xs.length-1)/2)&&xs.length>3)add({ty:'hall',gx:xs[i],gy:ym,gw:w,gh:L.GH-ym,atr:1});
   else if(!L.ct&&T.st!==2&&i>0&&i<xs.length-2&&R()<.22){L.ct=1;room(xs[i],ym,w,L.GH-ym,'court').court=1}
   else room(xs[i],ym,w,L.GH-ym)}
  L.GW=we;
  if(T.st===2){core(we,0,L.GH,sy,.8);L.GW+=SW}}
 else{ // 走廊式：三種型態——端部梯（梯廳在走廊一端）、中央梯廳（電梯大樓常見）、單邊外廊（宿舍、機構常見）
  const H=2.7+R()*.6;L.GH=H;const ch=.62,cv=T.cv||tacPickV(kind);L.cv=cv;L.wc=!unit&&R()<.35; // 非分戶的走廊式建物：約三分之一有天井
  let y0,y1,top;
  if(cv==='single'){const n=R()<.5;y0=n?0:H-ch;y1=y0+ch;top=!n}
  else{y0=(H-ch)/2-.3+R()*.6;y1=y0+ch;top=R()<.5}
  L.GW=SW+K;let segX;
  if(cv==='center'){const cx=.9+R()*(K-1.8);coreL(cx,y0,y1,top);segX=[[0,cx],[cx+SW,L.GW]]}
  else{coreL(0,y0,y1,top);segX=[[SW,L.GW]]}
  let br=null;
  if(cv==='end'&&R()<.55&&K>=3){br={x:SW+1+R()*(K-2.3),w:.5,north:R()<.5}}
  for(const sg of segX){const hc=cuts(sg[0],sg[1],.9,1.4);for(let i=0;i<hc.length-1;i++)add({ty:'hall',gx:hc[i],gy:y0,gw:hc[i+1]-hc[i],gh:ch})}
  if(br)add({ty:'hall',gx:br.x,gy:br.north?0:y1,gw:br.w,gh:br.north?y0:H-y1});
  // 一戶：一般為一排 2～3 間；外廊式房間很深，前排客廳（玄關）、後排臥室與衛浴
  const mkUnit=(g,ya,yb,nearTop)=>{const u=nu++;
   if(yb-ya>1.6){const fd=.9+R()*.3,fy=nearTop?ya:yb-fd,by0=nearTop?ya+fd:ya,by1=nearTop?yb:yb-fd,x0=g[0][0],x1=g[g.length-1][0]+g[g.length-1][1];
    const lv=room(x0,fy,x1-x0,fd,'living');lv.u=u;lv.uent=1;let kit=0;
    g.forEach(x=>{const k=x[1]<.62?'bath':!kit&&R()<.5?(kit=1,'kitchen'):'bed';const n=room(x[0],by0,x[1],by1-by0,k);n.u=u});return}
   const wi=g.reduce((a,x,j)=>x[1]>g[a][1]?j:a,0);let kit=0;
   g.forEach((x,j)=>{let k;if(j===wi)k='living';else if(x[1]<.62)k='bath';else if(!kit&&R()<.6){k='kitchen';kit=1}else k='bed';
    const n=room(x[0],ya,x[1],yb-ya,k);n.u=u;if(j===wi)n.uent=1})};
  // nearTop：這一排靠走廊的是上緣（走廊在這排的北邊）
  const strip=(ya,yb,isN)=>{if(yb-ya<.3)return;const nearTop=!isN;
   for(const s0 of segX){const segs=br&&br.north===isN&&br.x>=s0[0]&&br.x<s0[1]?[[s0[0],br.x],[br.x+br.w,s0[1]]]:[s0];
    for(const sg of segs){if(sg[1]-sg[0]<.35)continue;
     if(!unit){const cs=cuts(sg[0],sg[1],.6,1.4);
      for(let i=0;i<cs.length-1;i++){const w=cs[i+1]-cs[i];
       // 很深的房間有時隔成前後兩間（後間要穿過前間）
       if(yb-ya>1.6&&R()<.55){const fd=(yb-ya)*(.45+R()*.15);if(nearTop){room(cs[i],ya,w,fd);room(cs[i],ya+fd,w,yb-ya-fd)}else{room(cs[i],yb-fd,w,fd);room(cs[i],ya,w,yb-ya-fd)}}
       else if(L.wc&&!L.ct&&i>0&&i<cs.length-2&&w>=.8){L.ct=1;room(cs[i],ya,w,yb-ya,'court').court=1}
       else room(cs[i],ya,w,yb-ya)}continue}
     const cs=cuts(sg[0],sg[1],.5,1.05),rs=[];for(let i=0;i<cs.length-1;i++)rs.push([cs[i],cs[i+1]-cs[i]]);
     const gs=[];for(let i=0;i<rs.length;){let k=rs.length-i<=3?rs.length-i:R()<.5?2:3;if(rs.length-i-k===1)k--;gs.push(rs.slice(i,i+k));i+=k}
     for(const g of gs)mkUnit(g,ya,yb,nearTop)}}};
  strip(0,y0,true);strip(y1,H,false);
  // 五層以上：走廊另一端設第二座安全梯（兩方向避難）
  if(two){coreL(L.GW,y0,y1,cv==='single'?top:!top);L.GW+=SW}}
 // 隨機鏡射：同一種格局也會左右、上下顛倒（樓梯、入口、房間朝向都會不同）
 // 建物防護：格局以林地在北建立，再依火的來向轉向（東西向時轉置），另一軸仍隨機鏡射
 const fd=T.yard==='wui'?T.fdir||'n':null;
 if(fd==='e'||fd==='w'){for(const n of N){[n.gx,n.gy]=[n.gy,n.gx];[n.gw,n.gh]=[n.gh,n.gw]}[L.GW,L.GH]=[L.GH,L.GW]}
 const mx=fd?fd==='e'||((fd==='n'||fd==='s')&&R()<.5):R()<.5,my=fd?fd==='s'||((fd==='e'||fd==='w')&&R()<.5):R()<.5;
 if(mx){for(const n of N)n.gx=L.GW-n.gx-n.gw;if(L.canopy)L.canopy[0]=L.GW-L.canopy[0]-L.canopy[2]}
 if(my){for(const n of N)n.gy=L.GH-n.gy-n.gh;if(L.canopy)L.canopy[1]=L.GH-L.canopy[1]-L.canopy[3]}
 // 鄰接：共用邊長度超過 0.25 才算相鄰
 const E=1e-6,ov=(a,b)=>{
  if(Math.abs(a.gx+a.gw-b.gx)<E||Math.abs(b.gx+b.gw-a.gx)<E)return Math.min(a.gy+a.gh,b.gy+b.gh)-Math.max(a.gy,b.gy);
  if(Math.abs(a.gy+a.gh-b.gy)<E||Math.abs(b.gy+b.gh-a.gy)<E)return Math.min(a.gx+a.gw,b.gx+b.gw)-Math.max(a.gx,b.gx);
  return 0};
 L.op=new Set();   // 沒有門的開口（相通區塊之間）：永遠關不起來
 const P=[];for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++){const o=ov(N[i],N[j]);if(o>.25)P.push([N[i],N[j],o])}
 const door=(a,b)=>{a.wl=a.wl.filter(x=>x!==b.c);b.wl=b.wl.filter(x=>x!==a.c);if(!a.nb.includes(b.c)){a.nb.push(b.c);b.nb.push(a.c)}};
 const wall=(a,b)=>{a.wl.push(b.c);b.wl.push(a.c)};
 const open=T.lay==='open'||T.lay==='yard';
 for(const[a,b]of P){
  if(tacScAdj(a,b,door,wall,L))continue;
  if(a.ty!=='room'&&b.ty!=='room')door(a,b);
  else if(a.u!==undefined&&a.u===b.u)door(a,b);
  else if(a.walled||b.walled)wall(a,b);
  else if(a.ofc||b.ofc){const o=a.ofc?a:b,q=o===a?b:a;   // 倉儲辦公室：一扇門通大倉儲，其他是牆
   if(q.big&&!o.sd&&o.kind==='office'){o.sd=1;door(a,b)}else if(q.ofc&&q.kind==='office'&&o.kind==='bath')door(a,b);else wall(a,b)}
  else if(open&&!a.small&&!b.small){door(a,b);L.op.add(Math.min(a.c,b.c)*1000+Math.max(a.c,b.c))}
  else wall(a,b)}
 // 每間房開一扇門到接觸最長的走廊
 for(const r of N){if(r.ty!=='room'||r.court||(r.nb.length&&!r.uent))continue;
  const hs=P.filter(p=>(p[0]===r&&p[1].ty==='hall')||(p[1]===r&&p[0].ty==='hall')).sort((x,y)=>y[2]-x[2]);
  if(hs.length)door(r,hs[0][0]===r?hs[0][1]:hs[0][0])}
 // 客廳與廚房常常相通
 for(const[a,b]of P)if(a.ty==='room'&&b.ty==='room'&&((a.kind==='living'&&b.kind==='kitchen')||(b.kind==='living'&&a.kind==='kitchen'))&&R()<.6)door(a,b);
 // 連通：從樓梯出發還走不到的房間，開門到相鄰已走得到的空間
 for(let it=0;it<20;it++){
  const seen=new Set([0]),qu=[0];let qi=0;while(qi<qu.length){const c=qu[qi++];for(const d of N[c].nb)if(!seen.has(d)){seen.add(d);qu.push(d)}}
  if(seen.size===N.filter(n=>!n.court).length)break;
  for(const[a,b]of P){if(!a.court&&!b.court&&seen.has(a.c)!==seen.has(b.c)){door(a,b);break}}}
 // 外牆方向、對外窗
 for(const n of N){n.edge=[];
  if(n.gy<.01)n.edge.push('n');if(n.gy+n.gh>L.GH-.01)n.edge.push('s');
  if(n.gx<.01)n.edge.push('w');if(n.gx+n.gw>L.GW-.01)n.edge.push('e');
  if(n.ty==='room'&&n.edge.length){n.wins=n.edge.slice();n.win=n.wins[0]}}

 // 各側入口：優先走廊，其次樓梯間，再其次客廳或其他房間
 const pri=T.lay==='house'?n=>n.kind==='living'?0:n.ty==='hall'?1:n.ty==='stair'?2:3+(n.small?1:0):
  n=>n.lob?0:n.ty==='hall'?.5:n.ty==='stair'?1:n.kind==='living'?1.5:2+(n.small?1:0);
 for(const sd of['n','e','s','w']){
  const cand=N.filter(n=>n.edge.includes(sd)&&!n.court).sort((a,b)=>pri(a)+(a.kind==='bath'?5:0)-pri(b)-(b.kind==='bath'?5:0));const n=cand[0];if(!n)continue;
  L.ent[sd]=n.c;
  const cy=n.cy!==undefined?n.cy:n.gy+n.gh/2;
  L.door[sd]=sd==='n'?[n.gx+n.gw/2,0]:sd==='s'?[n.gx+n.gw/2,L.GH]:sd==='w'?[0,cy]:[L.GW,cy]}
 // 房號：由北往南、由西往東；分戶住宅同一戶共用門牌
 let no=0;const um={};
 N.filter(n=>n.ty==='room').sort((a,b)=>a.gy-b.gy||a.gx-b.gx).forEach(n=>{if(n.u===undefined)n.no=++no;else n.no=um[n.u]||(um[n.u]=++no)});
 N.filter(n=>n.ty==='room').sort((a,b)=>a.gy-b.gy||a.gx-b.gx).forEach((n,i)=>n.bi=i+1); // 地下室不分戶，逐區編號
 L.nu=nu;
 L.nr=N.filter(n=>n.ty==='room').length;
 return L}
