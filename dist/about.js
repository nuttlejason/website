'use strict';
(() => {
  const svg=document.querySelector('#about-tangram'),button=document.querySelector('#pause-dance');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const animations=[];let paused=false,visible=true;
  const shapes=window.TangramShapes;
  const center=points=>points.reduce((c,p)=>[c[0]+p[0]/points.length,c[1]+p[1]/points.length],[0,0]);
  const local=points=>{const c=center(points);return points.map(p=>[p[0]-c[0],p[1]-c[1]]);};
  const bases=shapes[0].pieces.map(local);
  // Match congruent vertices, allowing the parallelogram to turn over.
  // Every settled form uses rigid pieces, never a polygon morph.
  function orientation(base,target){
    const [ax,ay]=base[0];
    for(const flip of [1,-1])for(const [bx,by] of target){
      if(Math.abs(Math.hypot(ax,ay)-Math.hypot(bx,by))>1e-6)continue;
      const angle=Math.atan2(by,bx)-Math.atan2(ay,ax*flip);
      const c=Math.cos(angle),s=Math.sin(angle);
      if(base.every(([x,y])=>target.some(([u,v])=>Math.hypot(x*flip*c-y*s-u,x*flip*s+y*c-v)<1e-6)))
        return {angle:angle*180/Math.PI,flip};
    }
    throw new Error('Tangram piece is not congruent');
  }
  const poses=shapes.map(shape=>{
    const points=shape.pieces.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    const scale=Math.min(48,560/(right-left),260/(bottom-top));
    return shape.pieces.map((points,i)=>{
      const [cx,cy]=center(points);
      return {x:360+(cx-(left+right)/2)*scale,y:160+(cy-(top+bottom)/2)*scale,scale,...orientation(bases[i],local(points))};
    });
  });
  const transform=p=>`translate(${p.x}px,${p.y}px) rotate(${p.angle}deg) scale(${p.scale*p.flip},${p.scale})`;
  bases.forEach((points,i)=>{
    const group=document.createElementNS('http://www.w3.org/2000/svg','g');
    const polygon=document.createElementNS('http://www.w3.org/2000/svg','polygon');
    polygon.setAttribute('points',points.map(([x,y])=>`${x*.975},${y*.975}`).join(' '));
    polygon.setAttribute('fill',i===4?'#4a8fd8':'#e7e7e4');
    group.style.transform=transform(poses[0][i]);
    group.append(polygon);svg.append(group);
    if(typeof group.animate!=='function')return;
    const frames=[];
    poses.forEach((form,j)=>{
      const pose=form[i],next=poses[(j+1)%poses.length][i],a=i*Math.PI*2/7+j*.4;
      const at=fraction=>(j+fraction)/poses.length;
      frames.push(
        {transform:transform(pose),offset:at(0)},
        {transform:transform(pose),offset:at(.45)},
        {transform:transform({...pose,x:360+Math.cos(a)*205,y:160+Math.sin(a)*85,scale:28,angle:pose.angle+90}),offset:at(.67)},
        {transform:transform(next),offset:at(.94)},
        {transform:transform(next),offset:at(1)}
      );
    });
    animations.push(group.animate(frames,{duration:shapes.length*7000,iterations:Infinity,easing:'linear'}));
  });
  // Share a clock so all seven pieces arrive together.
  const start=document.timeline?.currentTime;
  if(start!=null)animations.forEach(animation=>{animation.startTime=start;});
  function sync(){
    button.hidden=motion.matches||!animations.length;
    button.textContent=paused?'Play motion':'Pause motion';
    animations.forEach(animation=>{
      if(motion.matches){animation.pause();animation.currentTime=0;}
      else if(paused||!visible||document.hidden)animation.pause();
      else animation.play();
    });
  }
  button.addEventListener('click',()=>{paused=!paused;sync();});
  document.addEventListener('visibilitychange',sync);
  motion.addEventListener('change',sync);
  if('IntersectionObserver' in window)new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}).observe(svg);
  sync();
})();
