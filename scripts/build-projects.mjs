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
  if(meta.featured&&!['true','false'].includes(meta.featured))throw Error('Invalid featured flag: '+file);
  projects.push({...meta,tags,featured:meta.featured==='true',slug:file.slice(0,-3),body:match[2]});
}
projects.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||Number(a.source_order||0)-Number(b.source_order||0)||a.slug.localeCompare(b.slug));
function page(title,body,script=''){
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#1d1e1e"><title>${escape(title)} · NUTTLE, JASON</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/projects.css"></head><body><header><a class="identity" href="/">NUTTLE, JASON</a></header>${body}${script}</body></html>\n`;
}
// One rigid tangram tile per project, matching the approved photo-list study.
const tilePoints=[
  '10,10 90,10 10,90','50,10 90,50 50,90 10,50',
  '10,30 50,30 90,70 50,70','10,90 90,90 90,10',
  '20,20 80,20 80,80 20,80','10,50 50,10 90,50',
  '40,10 80,50 80,90 40,50'
];
function thumbnail(project){
  // An explicit thumbnail overrides the first photograph or video poster.
  const firstImage=project.body.match(/!\[[^\]]*\]\(([^\s)]+)\)/)?.[1];
  const firstVideo=project.body.match(/\[[^\]]*\]\(([^\s)]+\.mp4)\)/)?.[1];
  const image=project.thumbnail||firstImage||firstVideo?.replace(/\.mp4$/,'.jpg');
  if(!image)return '';
  if(image.startsWith('/')&&!existsSync(path.join(root,'dist',image)))throw Error('Missing project thumbnail: '+project.slug);
  return '<img class="project-thumb" src="'+safeURL(image)+'" alt="" width="480" height="480" loading="lazy" decoding="async">';
}
const rows=projects.map((project,i)=>{
  const title=escape(project.title),year=project.date?project.date.slice(0,4):'Undated';
  return '<a class="project-row" data-tags="'+escape(project.tags.join(','))+'" data-featured="'+project.featured+'" href="/projects/'+project.slug+'/" aria-label="'+title+', '+year+'"><span class="project-number" aria-hidden="true">'+String(i+1).padStart(2,'0')+'</span><svg class="project-symbol" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><polygon points="'+tilePoints[i%tilePoints.length]+'"/></svg><span class="project-summary"><span class="project-year">'+year+'</span><span class="project-name">'+title+'</span><span class="project-types">'+escape(project.tags.slice(0,3).join(' / '))+'</span></span>'+thumbnail(project)+'</a>';
}).join('');
await mkdir(path.join(root,'dist/projects'),{recursive:true});
const filters=['Featured','All','Art','Engineering','Code','Fabrication','Interactive','Experiment'].map(tag=>'<button type="button" data-filter="'+tag+'" aria-pressed="'+(tag==='All')+'">'+(tag==='All'?'All work':tag)+'</button>').join('');
const years=projects.filter(project=>project.date).map(project=>project.date.slice(0,4));
const range=years.length?years.at(-1)+'—'+years[0]:'';
await writeFile(path.join(root,'dist/projects/index.html'),page('Projects','<main class="projects-main"><div class="projects-title-line"><h1 class="projects-heading">Projects<span class="project-count">('+projects.length+')</span></h1><span class="project-range">'+range+'</span></div><div class="projects-tools"><nav class="project-filters" aria-label="Filter projects by type" hidden>'+filters+'</nav><p id="filter-status" class="filter-status" role="status" aria-live="polite">'+projects.length+' projects</p></div><div class="project-list">'+rows+'</div></main>','<script src="/projects.js"></script>'));
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
