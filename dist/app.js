'use strict';
const shapes=window.TangramShapes;
const entries=[{label:'PROJECTS',key:'projects'},null,{label:'TANGRAM',key:'tangram'},null,{label:'ABOUT',key:'about'},{label:'INSTAGRAM',key:'instagram'},{label:'3D MODELS',key:'models'}];
const ns='http://www.w3.org/2000/svg';
const svg=document.querySelector('#tangram');
const dialog=document.querySelector('#detail');
let current=-1;let animations=[];
const content={models:{title:'3D models',html:'<p>Model files and downloads will be added here.</p>'}};
function openEntry(key){if(['projects','about','tangram'].includes(key)){window.location.assign(`/${key}/`);return;}if(key==='instagram'){window.open('https://www.instagram.com/nuttlejason/','_blank','noopener,noreferrer');return;}const c=content[key];document.querySelector('#detail-title').textContent=c.title;document.querySelector('#detail-body').innerHTML=c.html;dialog.showModal();}
function el(tag,attrs){const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;}
// Place measured labels along real sides, not at the polygon center.
// Triangle labels start/end near the right-angle corner; quadrilaterals
// center their labels along a side. All bounds remain inside the tile.
function labelPlacement(points, width, height, maxScale=1, padding=5) {
  const cx=points.reduce((v,p)=>v+p[0],0)/points.length;
  const cy=points.reduce((v,p)=>v+p[1],0)/points.length;
  const area=points.reduce((a,p,i)=>{const q=points[(i+1)%points.length];return a+p[0]*q[1]-q[0]*p[1];},0);
  const sign=Math.sign(area);
  const edges=points.map((p,i)=>{const q=points[(i+1)%points.length],dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy);return {x:p[0],y:p[1],nx:-dy/len*sign,ny:dx/len*sign};});
  let corner=-1;
  if(points.length===3){
    let error=Infinity;
    points.forEach((p,i)=>{
      const a=points[(i+1)%3],b=points[(i+2)%3];
      const dot=Math.abs(((a[0]-p[0])*(b[0]-p[0])+(a[1]-p[1])*(b[1]-p[1]))/(Math.hypot(a[0]-p[0],a[1]-p[1])*Math.hypot(b[0]-p[0],b[1]-p[1])));
      if(dot<error){error=dot;corner=i;}
    });
  }
  let best={scale:0,score:-Infinity,x:cx,y:cy,angle:0};
  const hasShallowSide=points.some((p,i)=>{
    const j=(i+1)%points.length,q=points[j];
    return (corner<0||i===corner||j===corner)&&Math.abs(q[1]-p[1])<=Math.abs(q[0]-p[0])+1e-7;
  });
  for(let i=0;i<points.length;i++){
    const j=(i+1)%points.length;
    if(corner>=0&&i!==corner&&j!==corner)continue;
    const p=points[corner>=0?corner:i];
    const q=points[corner>=0?(i===corner?j:i):j];
    const length=Math.hypot(q[0]-p[0],q[1]-p[1]);
    const ux=(q[0]-p[0])/length,uy=(q[1]-p[1])/length;
    const {nx,ny}=edges[i];
    let angle=Math.atan2(uy,ux)*180/Math.PI;
    if(angle>90)angle-=180;if(angle<-90)angle+=180;
    if(hasShallowSide&&Math.abs(angle)>45.00001)continue;
    if(hasShallowSide)angle=Math.max(-45,Math.min(45,angle));
    // Both the along-edge justification and perpendicular offset are part
    // of the scaled transform, so smaller labels sit proportionally closer.
    const baseX=corner>=0?p[0]:(p[0]+q[0])/2;
    const baseY=corner>=0?p[1]:(p[1]+q[1])/2;
    const growX=nx*(height/2+padding)+(corner>=0?ux*(width/2+padding):0);
    const growY=ny*(height/2+padding)+(corner>=0?uy*(width/2+padding):0);
    let scale=maxScale;
    for(const e of edges){
      const room=(baseX-e.x)*e.nx+(baseY-e.y)*e.ny;
      const extent=Math.abs(e.nx*ux+e.ny*uy)*width/2+Math.abs(e.nx*nx+e.ny*ny)*height/2;
      const cost=extent+padding-e.nx*growX-e.ny*growY;
      if(room<-1e-7){scale=0;break;}
      if(cost>1e-9)scale=Math.min(scale,Math.max(0,room)/cost);
    }
    const x=baseX+scale*growX,y=baseY+scale*growY;
    const score=scale*(1-Math.abs(angle)*.0005)-y*.000001;
    if(scale>0&&score>best.score)best={x,y,angle,scale,score,edge:i,corner};
  }
  return best;
}
function fitLabel(text,points){
  const b=text.getBBox();
  const fit=labelPlacement(points,b.width,b.height);
  // Center the actual glyph bounds, including baseline offsets, before rotating.
  text.setAttribute('transform',`translate(${fit.x} ${fit.y}) rotate(${fit.angle}) scale(${fit.scale}) translate(${-b.x-b.width/2} ${-b.y-b.height/2})`);
}
// Offset the actual edges inward: two 2px insets make a 4px transparent gap.
// Unlike a stroke, this cannot paint a border across another moving tile.
function insetPolygon(points,distance=2){
  const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
  const sign=Math.sign(area);
  const normals=points.map((p,i)=>{
    const q=points[(i+1)%points.length],dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy);
    return [-dy/length*sign,dx/length*sign];
  });
  return points.map((p,i)=>{
    const a=normals[(i+points.length-1)%points.length],b=normals[i];
    const factor=distance/(1+a[0]*b[0]+a[1]*b[1]);
    return [p[0]+(a[0]+b[0])*factor,p[1]+(a[1]+b[1])*factor];
  });
}
function render(animate=true){
  animations.forEach(a=>a.cancel());animations=[];
  const shape=shapes[current];
  const rect=svg.getBoundingClientRect(),width=rect.width,height=rect.height;
  if(!width||!height)return;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  let pieces=shape.pieces;
  // Preserve the book silhouettes' upright orientation on every screen.
  const all=pieces.flat(),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min((Math.min(width,780)-24)/(maxX-minX),(height-40)/(maxY-minY));
  const ox=width/2-(minX+maxX)*scale/2,oy=height/2-(minY+maxY)*scale/2;
  const focused=document.activeElement?.getAttribute('data-key');
  svg.replaceChildren();
  document.querySelector('#shape-caption').textContent=String(current+1).padStart(2,'0')+' / '+shape.name;
  pieces.forEach((points,i)=>{
    const mapped=insetPolygon(points.map(([x,y])=>[x*scale+ox,y*scale+oy]));
    const item=entries[i],g=el('g',{class:item?'tile':'tile inert'});
    g.append(el('polygon',{points:mapped.map(p=>p.join(',')).join(' ')}));
    let text;
    if(item){
      g.setAttribute('role',['instagram','projects','about','tangram'].includes(item.key)?'link':'button');
      g.setAttribute('tabindex','0');g.setAttribute('data-key',item.key);
      g.setAttribute('aria-label',item.label);
      g.setAttribute('aria-haspopup',['instagram','projects','about','tangram'].includes(item.key)?'false':'dialog');
      const title=el('title',{});title.textContent=item.label;g.append(title);
      text=el('text',{x:0,y:0});text.textContent=item.label;g.append(text);
      g.addEventListener('click',()=>openEntry(item.key));
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openEntry(item.key);}});
    }
    svg.append(g);if(text)fitLabel(text,mapped);
    if(animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      const dx=(i%2===0?-1:1)*(width+500),dy=(i%3-1)*100;
      animations.push(g.animate([{transform:`translate(${dx}px, ${dy}px)`,opacity:0},{opacity:1,offset:.2},{transform:'translate(0px, 0px)',opacity:1}],{duration:1100,delay:i*75,easing:'cubic-bezier(.22,.75,.22,1)',fill:'backwards'}));
    }
  });
  if(focused)svg.querySelector(`[data-key="${focused}"]`)?.focus();
}
function assemble(){
  if(current<0)current=Math.floor(Math.random()*shapes.length);
  else current=(current+1+Math.floor(Math.random()*(shapes.length-1)))%shapes.length;
  render();
}
let resizeFrame,lastWidth=0,lastHeight=0;
new ResizeObserver(([entry])=>{
  const {width,height}=entry.contentRect;
  if(Math.abs(width-lastWidth)<1&&Math.abs(height-lastHeight)<1)return;
  const first=lastWidth===0;lastWidth=width;lastHeight=height;
  if(first)return;
  cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>render(false));
}).observe(svg);
document.querySelector('#rearrange').addEventListener('click',assemble);document.querySelector('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});assemble();
