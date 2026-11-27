// 機場場內配置（座標以機場範圍左上角 AP.x0,AP.y0 為原點，所以地圖位移後仍成立）：
// 兩條跑道（RUN）、平行滑行道與跑道聯絡道、中央滑行道（車輛可行駛，等級「滑行道」）、
// 機場聯絡道（服務道路，由西側兩個管制門接環場道路；兩門同側，一般車輛不會穿越機場）、
// 航廈、停機坪、塔台、貨運站、修護棚廠、油庫、機場消防隊
'use strict';
const AL={
 runways:[5,19],rx:[6,23],              // 跑道列、跑道起訖欄
 twys:[7,17],                            // 平行滑行道列
 links:[7,14,22],                        // 跑道與平行滑行道之間的聯絡滑行道欄
 ctwy:6,                                 // 中央滑行道（連接南北平行滑行道，貼著停機坪）
 term:[1,2,9,15],apron:[3,5,9,15],      // 航廈欄 1～2、停機坪欄 3～5，列 9～15
 tower:[1,7],arff:[2,2],
 cargo:[9,12,21,22],hangar:[14,19,21,22],fuel:[21,23,21,22]};
// 基礎地圖生成時呼叫（AP 已設定、場內道路已清除）
function airportLayout(){
 const A=AP,W=A.x1-A.x0+1,H=A.y1-A.y0+1,at=(i,j)=>K(A.x0+i,A.y0+j),road=(i,j,g)=>{if(i<0||j<0||i>=W||j>=H)return;const k=at(i,j);RD[k]=2;RGF[k]=g};
 for(const r of AL.runways)for(let i=AL.rx[0];i<=AL.rx[1];i++)RUN[at(i,r)]=1;
 for(const r of AL.twys)for(let i=AL.ctwy;i<=AL.rx[1];i++)road(i,r,RGK.TWY);
 for(const c of AL.links){for(let j=AL.runways[0]+1;j<AL.twys[0];j++)road(c,j,RGK.TWY);for(let j=AL.twys[1]+1;j<AL.runways[1];j++)road(c,j,RGK.TWY)}
 for(let j=AL.twys[0];j<=AL.twys[1];j++)road(AL.ctwy,j,RGK.TWY);
 // 機場聯絡道：北門（列 1）與南門（列 H-2）由環場道路進來，沿欄 3 接到南北平行滑行道
 const n=1,s=H-2;
 for(let i=0;i<=3;i++){road(i,n,RGK.AIRS);road(i,s,RGK.AIRS)}
 for(let j=n;j<=AL.twys[0];j++)road(3,j,RGK.AIRS);for(let j=AL.twys[1];j<=s;j++)road(3,j,RGK.AIRS);
 for(let i=3;i<AL.ctwy;i++){road(i,AL.twys[0],RGK.AIRS);road(i,AL.twys[1],RGK.AIRS)}
 // 南側建物區（貨運站、棚廠、油庫）前的聯絡道
 for(let i=3;i<=AL.rx[1];i++)road(i,s,RGK.AIRS);
 for(const c of[AL.links[1],AL.links[2]])for(let j=AL.runways[1]+1;j<s;j++)road(c,j,RGK.AIRS)}
// 繪製用：航廈 10、停機坪 11、塔台 12、貨運站 19、修護棚廠 20、油庫 21
function airportCrops(){
 const A=AP;if(!A)return;const set=(i0,i1,j0,j1,v)=>{for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const k=K(A.x0+i,A.y0+j);if(!RD[k])CROP[k]=v}};
 set(AL.term[0],AL.term[1],AL.term[2],AL.term[3],10);set(AL.apron[0],AL.apron[1],AL.apron[2],AL.apron[3],11);
 set(AL.tower[0],AL.tower[0],AL.tower[1],AL.tower[1],12);
 set(...AL.cargo,19);set(...AL.hangar,20);set(...AL.fuel,21)}
