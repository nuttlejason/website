'use strict';
function randomProjectLayout(count,random=Math.random){
  const pick=a=>a[Math.floor(random()*a.length)];
  // An even number of modules keeps both desktop columns completely filled.
  const sizes=[];
  for(let m=2;m<=count/2;m+=2)if(count<=m*4)sizes.push(m);
  if(!sizes.length&&count>3)return null;
  const modules=sizes.length?sizes.reduce((a,b)=>Math.abs(a-count/2.5)<=Math.abs(b-count/2.5)?a:b):1;
  const counts=Array(modules).fill(2);
  for(let extra=count-modules*2;extra>0;extra--){
    const available=counts.map((n,i)=>n<4?i:-1).filter(i=>i>=0);
    counts[pick(available)]++;
  }
  const square=x=>({p:[[x,0],[x+200,0],[x+200,200],[x,200]],x:x+16,y:34});
  const triangles=x=>[
    {p:[[x,0],[x+200,0],[x,200]],x:x+16,y:34},
    {p:[[x+200,0],[x+200,200],[x,200]],x:x+184,y:150,anchor:'end'}
  ];
  if(count===0)return [];
  if(count===1)return [[square(0)]];
  if(count===2)return [[square(0),square(200)]];
  if(count===3)return [[square(0),...triangles(200)]];
  return counts.map(n=>{
    let shapes;
    if(n===2)shapes=[square(0),square(200)];
    else if(n===4)shapes=[...triangles(0),...triangles(200)];
    else shapes=pick([
      [square(0),...triangles(200)],
      [...triangles(0),square(200)],
      [{p:[[0,0],[200,0],[0,200]],x:16,y:34},
       {p:[[200,0],[400,0],[200,200],[0,200]],x:200,y:94,angle:-45,anchor:'middle'},
       {p:[[400,0],[400,200],[200,200]],x:384,y:150,anchor:'end'}]
    ]);
    const flipX=random()<.5,flipY=random()<.5;
    shapes=shapes.map(s=>{
      let p=s.p.map(([x,y])=>[flipX?400-x:x,flipY?200-y:y]);
      if(flipX!==flipY)p.reverse();
      const anchor=s.anchor||'start';
      return {...s,p,x:flipX?400-s.x:s.x,y:flipY?194-s.y:s.y,
        angle:(s.angle||0)*(flipX!==flipY?-1:1),
        anchor:flipX?(anchor==='start'?'end':anchor==='end'?'start':anchor):anchor};
    });
    // Keep project reading and keyboard order left to right within each module.
    return shapes.sort((a,b)=>a.p.reduce((n,p)=>n+p[0],0)/a.p.length-b.p.reduce((n,p)=>n+p[0],0)/b.p.length);
  });
}
function projectInset(points){
  const normals=points.map((p,i)=>{const q=points[(i+1)%points.length],dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy);return [-dy/l,dx/l];});
  return points.map((p,i)=>{const a=normals[(i+points.length-1)%points.length],b=normals[i],f=2/(1+a[0]*b[0]+a[1]*b[1]);return [p[0]+f*(a[0]+b[0]),p[1]+f*(a[1]+b[1])];});
}
function randomizeProjects(links){
  const column=document.querySelector('.project-column');
  const layout=randomProjectLayout(links.length);
  if(!layout)return;
  const fragment=document.createDocumentFragment();let index=0;
  for(const shapes of layout){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','project-pair');svg.setAttribute('viewBox','0 0 400 200');svg.setAttribute('aria-label','Projects');
    for(const {p,x,y,angle=0,anchor='start'} of shapes){
      const link=links[index++];
      link.querySelector('polygon').setAttribute('points',projectInset(p).map(p=>p.join(',')).join(' '));
      link.querySelector('g').setAttribute('transform',`rotate(${angle} ${x} ${y})`);
      link.querySelectorAll('text').forEach((text,i)=>{
        text.setAttribute('x',x);text.setAttribute('y',y+i*26);text.setAttribute('text-anchor',anchor);
      });
      svg.append(link);
    }
    fragment.append(svg);
  }
  column.replaceChildren(fragment);
}
function fitProjectNames(){
  document.querySelectorAll('.project-name').forEach(text=>{
    text.style.fontSize='20px';
    const width=text.getComputedTextLength();
    if(width>125)text.style.fontSize=`${20*125/width}px`;
  });
}
function startProjectEntrance(){
// One shared queue: only a single entrance can be active at any time.
const projectTiles=[...document.querySelectorAll('.project-tile')];
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
if(!motion.matches&&projectTiles.every(tile=>typeof tile.animate==='function')){
  // Measure ordinary HTML boxes, not animated SVG links. SVG intersection
  // reporting can leave hidden links waiting forever in mobile browsers.
  const modules=[...document.querySelectorAll('.project-pair')].map(svg=>{
    const box=document.createElement('div');box.className='project-module';
    svg.before(box);box.append(svg);
    return {box,tiles:[...svg.querySelectorAll('.project-tile')]};
  });
  const bounds=tile=>tile.closest('.project-module').getBoundingClientRect();
  const initial=new Set(projectTiles.filter(tile=>bounds(tile).top<innerHeight));
  const waiting=new Set(),shown=new Set();
  let running=false,active=null,frame=0,disabled=false;
  const reveal=tile=>{shown.add(tile);tile.style.opacity='1';};
  function showAll(){
    disabled=true;waiting.clear();active?.cancel();projectTiles.forEach(reveal);
    window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);
    window.removeEventListener('pageshow',onPageShow);
    cancelAnimationFrame(frame);
    projectTiles.forEach(tile=>{tile.onfocus=null;});
    if(motion.removeEventListener)motion.removeEventListener('change',onMotion);
    else if(motion.removeListener)motion.removeListener(onMotion);
  }
  async function drain(){
    if(running)return;
    running=true;
    try{
      while(waiting.size){
        const tile=projectTiles.find(t=>waiting.has(t));
        waiting.delete(tile);
        if(shown.has(tile))continue;
        const rect=bounds(tile);
        if(motion.matches||rect.bottom<0||rect.top>innerHeight){reveal(tile);continue;}
        reveal(tile);
        active=tile.animate([
          {transform:`translateY(${initial.has(tile)?-innerHeight:innerHeight}px)`,opacity:0},
          {transform:'translateY(0)',opacity:1}
        ],{duration:650,easing:'cubic-bezier(.22,.75,.22,1)',fill:'backwards'});
        // If a browser never settles the animation promise, finish the tile
        // after a bounded interval rather than blocking all later projects.
        let timer;
        await Promise.race([active.finished,new Promise(resolve=>{timer=setTimeout(resolve,900);})]).catch(()=>{});
        clearTimeout(timer);active?.cancel();
        active=null;
      }
    }catch(error){showAll();}finally{running=false;}
  }
  function scan(){
    frame=0;if(disabled)return;
    modules.forEach(({box,tiles})=>{
      const rect=box.getBoundingClientRect();
      if(rect.height>0&&rect.top<innerHeight)tiles.forEach(tile=>{if(!shown.has(tile))waiting.add(tile);});
    });
    drain();
  }
  function schedule(){if(!frame&&!disabled)frame=requestAnimationFrame(scan);}
  // Install listeners before hiding anything. Default/no-animation is visible.
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  const onPageShow=event=>{if(event.persisted)showAll();else schedule();};
  window.addEventListener('pageshow',onPageShow);
  projectTiles.forEach(tile=>{
    tile.style.opacity='0';
    tile.onfocus=()=>{active?.cancel();waiting.delete(tile);reveal(tile);};
  });
  const onMotion=()=>{if(motion.matches)showAll();};
  if(motion.addEventListener)motion.addEventListener('change',onMotion);
  else if(motion.addListener)motion.addListener(onMotion);
  scan();
  return showAll;
}
return ()=>{};
}

const allProjects=[...document.querySelectorAll('.project-tile')];
const filterBar=document.querySelector('.project-filters');
const filterButtons=[...filterBar.querySelectorAll('[data-filter]')];
let stopEntrance=()=>{};
function filterProjects(type,updateURL=false){
  if(!filterButtons.some(button=>button.dataset.filter===type))type='All';
  stopEntrance();
  const links=allProjects.filter(link=>type==='All'||link.dataset.tags.split(',').includes(type));
  links.forEach(link=>{link.style.opacity='1';});
  randomizeProjects(links);
  fitProjectNames();
  filterButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===type)));
  document.querySelector('#filter-status').textContent=`${links.length} ${links.length===1?'project':'projects'}${type==='All'?'':' · '+type}`;
  stopEntrance=startProjectEntrance();
  if(updateURL){const url=new URL(location.href);if(type==='All')url.searchParams.delete('type');else url.searchParams.set('type',type);history.pushState(null,'',url);}
}
filterBar.hidden=false;
filterButtons.forEach(button=>button.addEventListener('click',()=>filterProjects(button.dataset.filter,true)));
window.addEventListener('popstate',()=>filterProjects(new URL(location.href).searchParams.get('type')||'All'));
filterProjects(new URL(location.href).searchParams.get('type')||'All');
