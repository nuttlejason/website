import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeURL(value){return /^(https?:\/\/|\/|\.\.?\/|#)/i.test(value)&&!value.startsWith('//')?escape(value):'#';}
function inline(text){
  // Raw HTML is escaped. Links and images only accept safe URL schemes.
  const tokens=[];
  text=text.replace(/(!?)\[([^\]]*)\]\(([^\s)]+)\)/g,(_,image,label,url)=>{
    const html=image?`<img src="${safeURL(url)}" alt="${escape(label)}" loading="lazy">`:`<a href="${safeURL(url)}">${escape(label)}</a>`;
    tokens.push(html);return `\u0000${tokens.length-1}\u0000`;
  });
  return escape(text).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\u0000(\d+)\u0000/g,(_,i)=>tokens[i]);
}
function markdown(body){
  const lines=body.trim().split('\n'),out=[];let para=[],list=null,code=null;
  const flush=()=>{if(para.length){out.push(`<p>${inline(para.join(' '))}</p>`);para=[];}if(list){out.push(`</${list}>`);list=null;}};
  for(const line of lines){
    if(line.startsWith('```')){flush();if(code!==null){out.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);code=null;}else code=[];continue;}
    if(code!==null){code.push(line);continue;}
    if(!line.trim()){flush();continue;}
    const video=line.match(/^\[([^\]]+)\]\(([^\s)]+\.mp4)\)$/);
    if(video){
      flush();
      const poster=video[2].replace(/\.mp4$/,'.jpg');
      const posterAttr=poster.startsWith('/media/')&&existsSync(path.join(root,'dist',poster))?` poster="${safeURL(poster)}"`:'';
      out.push(`<video controls playsinline preload="none"${posterAttr} aria-label="${escape(video[1])}"><source src="${safeURL(video[2])}" type="video/mp4"><a href="${safeURL(video[2])}">${escape(video[1])}</a></video>`);continue;
    }
    const heading=line.match(/^(#{1,6})\s+(.+)$/),item=line.match(/^\s*(-|\d+\.)\s+(.+)$/);
    if(heading){flush();out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);}
    else if(item){const type=item[1]==='-'?'ul':'ol';if(list!==type){flush();out.push(`<${type}>`);list=type;}out.push(`<li>${inline(item[2])}</li>`);}
    else if(line.startsWith('> ')){flush();out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);}
    else{if(list)flush();para.push(line);}
  }
  flush();if(code!==null)out.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);
  return out.join('\n');
}
const projects=[];
const categories=['Engineering','Art','Code','Fabrication','Interactive','Experiment'];
for(const file of (await readdir(path.join(root,'content/projects'))).filter(f=>f.endsWith('.md'))){
  const source=await readFile(path.join(root,'content/projects',file),'utf8');
  const match=source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if(!match)throw Error(`Missing metadata: ${file}`);
  const meta=Object.fromEntries(match[1].split('\n').map(line=>{const i=line.indexOf(':');return [line.slice(0,i).trim(),line.slice(i+1).trim()];}));
  if(!meta.title||(meta.date&&(!/^\d{4}(?:-\d{2}){0,2}$/.test(meta.date)||!Number.isFinite(Date.parse(meta.date)))))throw Error(`Invalid metadata: ${file}`);
  const tags=[...new Set((meta.tags||'').split(',').map(tag=>tag.trim()).filter(Boolean))];
  if(tags.some(tag=>!categories.includes(tag)))throw Error(`Unknown project tag: ${file}`);
  projects.push({...meta,tags,slug:file.slice(0,-3),body:match[2]});
}
projects.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||Number(a.source_order||0)-Number(b.source_order||0)||a.slug.localeCompare(b.slug));
function page(title,body,script=''){
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#1d1e1e"><title>${escape(title)} · NUTTLE, JASON</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/projects.css"></head><body><header><a class="identity" href="/">NUTTLE, JASON</a></header>${body}${script}</body></html>\n`;
}
let tiles='';
// Each five-project band exactly tessellates an 800 x 200 rectangle.
// Its two 400-wide modules stack on phones without changing reading order.
const band=[
  {p:[[0,0],[200,0],[200,200],[0,200]],x:16,y:34},
  {p:[[200,0],[400,0],[400,200],[200,200]],x:216,y:34},
  {p:[[0,0],[200,0],[0,200]],x:16,y:34},
  {p:[[200,0],[400,0],[200,200],[0,200]],x:200,y:94,angle:-45,anchor:'middle'},
  {p:[[400,0],[400,200],[200,200]],x:384,y:150,anchor:'end'}
];
function inset(points,distance=2){
  const normals=points.map((p,i)=>{const q=points[(i+1)%points.length],dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy);return [-dy/len,dx/len];});
  return points.map((p,i)=>{const a=normals[(i+points.length-1)%points.length],b=normals[i],f=distance/(1+a[0]*b[0]+a[1]*b[1]);return [p[0]+f*(a[0]+b[0]),p[1]+f*(a[1]+b[1])];});
}
projects.forEach((project,i)=>{
  const kind=i%5,{p,x,y,angle=0,anchor='start'}=band[kind];
  if(kind===0||kind===2)tiles+='<svg class="project-pair" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" aria-label="Projects">';
  const points=inset(p).map(p=>p.join(',')).join(' ');
  const title=escape(project.title),year=project.date?project.date.slice(0,4):'Undated';
  // Conservative no-JavaScript fallback; the browser refines this using
  // actual glyph measurements. Font size preserves the letters' proportions.
  const fitted=` class="project-name" style="font-size:${Math.min(20,125/(project.title.length*1.03)).toFixed(3)}px"`;
  tiles+=`<a class="project-tile" data-tags="${escape(project.tags.join(','))}" href="/projects/${project.slug}/" aria-label="${title}, ${year}, ${escape(project.tags.join(', '))}"><title>${title} · ${escape(project.tags.join(' · '))}</title><polygon points="${points}"/><g transform="rotate(${angle} ${x} ${y})"><text x="${x}" y="${y}" text-anchor="${anchor}"${fitted}>${title}</text><text class="project-year" x="${x}" y="${y+26}" text-anchor="${anchor}">${year}</text></g></a>`;
  if(kind===1||kind===4||i===projects.length-1)tiles+='</svg>';
});
await mkdir(path.join(root,'dist/projects'),{recursive:true});
const filters=['All',...categories].map(tag=>`<button type="button" data-filter="${tag}" aria-pressed="${tag==='All'}">${tag}</button>`).join('');
await writeFile(path.join(root,'dist/projects/index.html'),page('Projects',`<main class="projects-main"><h1 class="projects-heading">PROJECTS</h1><nav class="project-filters" aria-label="Filter projects by type" hidden>${filters}</nav><p id="filter-status" class="filter-status" role="status" aria-live="polite"></p><div class="project-column">${tiles}</div></main>`,'<script src="/projects.js"></script>'));
for(const project of projects){
  const dir=path.join(root,'dist/projects',project.slug);await mkdir(dir,{recursive:true});
  const body=project.body.trim()?markdown(project.body):'<p class="empty-project">Project details coming soon.</p>';
  const dateLabel=escape(project.date_label||project.date?.slice(0,4)||'Undated');
  const dateHTML=project.date?`<time class="project-date" datetime="${project.date}">${dateLabel}</time>`:`<p class="project-date">${dateLabel}</p>`;
  const tagsHTML=project.tags.map(tag=>`<a href="/projects/?type=${encodeURIComponent(tag)}">${escape(tag)}</a>`).join('');
  await writeFile(path.join(dir,'index.html'),page(project.title,`<main class="project-detail"><a class="back-link" href="/projects/">← Projects</a><article><h1>${escape(project.title)}</h1>${dateHTML}<nav class="project-tags" aria-label="Project types">${tagsHTML}</nav><div class="markdown-body">${body}</div></article></main>`));
}
const about=await readFile(path.join(root,'content/about.md'),'utf8');
const aboutTitle=about.match(/^#\s+(.+)$/m)?.[1]||'About';
await mkdir(path.join(root,'dist/about'),{recursive:true});
await writeFile(path.join(root,'dist/about/index.html'),page(aboutTitle,`<main class="project-detail about-page"><a class="back-link" href="/">← Home</a><article class="markdown-body">${markdown(about)}</article><section class="about-dance" aria-label="Dancing tangram"><svg id="about-tangram" viewBox="0 0 720 320" aria-hidden="true"></svg><button id="pause-dance" type="button" hidden>Pause motion</button></section></main>`,'<script src="/tangram-shapes.js"></script><script src="/about.js"></script>'));
console.log(`Built About and ${projects.length} Markdown project pages, newest first.`);
