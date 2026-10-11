import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script,runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
async function walk(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const files=await walk(root);let links=0,pages=0;
for(const file of files){
  if(file.endsWith('.js'))new Script(await readFile(file,'utf8'),{filename:file});
  if(!file.endsWith('.html'))continue;
  pages++;const html=await readFile(file,'utf8');
  for(const match of html.matchAll(/(?:href|src|poster)="(\/[^"]*)"/g)){
    const url=match[1].split(/[?#]/)[0];let target=path.join(root,url);
    assert(target.startsWith(root),`Path escapes public directory: ${url}`);
    const info=await stat(target).catch(()=>null);assert(info,`Missing ${url} in ${file}`);
    if(info.isDirectory())await stat(path.join(target,'index.html'));
    links++;
  }
}
const index=await readFile(path.join(root,'projects/index.html'),'utf8');
const tiles=[...index.matchAll(/<a class="project-row" data-tags="([^"]+)" data-featured="(true|false)" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
const markdownFiles=(await readdir(new URL('../content/projects/',import.meta.url))).filter(f=>f.endsWith('.md'));
assert.equal(tiles.length,markdownFiles.length,'Every Markdown project must have one tagged photo row');
assert(index.includes('data-filter="All"'),'Missing reset filter');
assert(index.includes('data-filter="Featured"'),'Missing Featured filter');
const featuredSlugs=[];
for(const file of markdownFiles){
  const source=await readFile(new URL('../content/projects/'+file,import.meta.url),'utf8');
  if(/^featured: true$/m.test(source))featuredSlugs.push(file.slice(0,-3));
}
assert.deepEqual(tiles.filter(tile=>tile[2]==='true').map(tile=>tile[3].split('/')[2]).sort(),featuredSlugs.sort(),'Featured selections must match project metadata');
for(const tile of tiles){
  assert.equal([...tile[4].matchAll(/<polygon /g)].length,1,'One tangram tile per project');
  assert.equal([...tile[4].matchAll(/class="project-thumb"/g)].length,1,'One photograph per current project');
}
// Exercise the production filter script using rows parsed from the built HTML.
const rows=tiles.map(tile=>({dataset:{tags:tile[1],featured:tile[2]},hidden:false}));
const buttons=[...index.matchAll(/data-filter="([^"]+)"/g)].map(match=>({
  dataset:{filter:match[1]},attributes:{},
  setAttribute(key,value){this.attributes[key]=value;},
  addEventListener(type,callback){this[type]=callback;}
}));
const bar={hidden:true,querySelectorAll:()=>buttons},status={textContent:''},listeners={};
const location={href:'https://example.test/projects/'};
const context={
  URL,location,
  history:{pushState(_state,_title,url){location.href=url.href;}},
  window:{addEventListener(type,callback){listeners[type]=callback;}},
  document:{
    querySelectorAll:()=>rows,
    querySelector:selector=>selector==='.project-filters'?bar:status
  }
};
runInNewContext(await readFile(path.join(root,'projects.js'),'utf8'),context);
assert.equal(bar.hidden,false);
assert.equal(rows.filter(row=>!row.hidden).length,tiles.length);
for(const button of buttons){
  button.click();
  const type=button.dataset.filter;
  const expected=rows.filter(row=>type==='All'||(type==='Featured'?row.dataset.featured==='true':row.dataset.tags.split(',').includes(type)));
  assert.equal(rows.filter(row=>!row.hidden).length,expected.length,'Filter count: '+type);
  assert.equal(button.attributes['aria-pressed'],'true');
}
location.href='https://example.test/projects/?type=Featured';
listeners.popstate();
assert.equal(rows.filter(row=>!row.hidden).length,featuredSlugs.length,'Featured URL and back/forward navigation');
location.href='https://example.test/projects/?type=Unknown';
listeners.popstate();
assert.equal(rows.filter(row=>!row.hidden).length,tiles.length,'Unknown filters fall back to all work');
const about=await readFile(path.join(root,'about/index.html'),'utf8');
assert(about.includes('id="about-tangram"')&&about.includes('src="/about.js"'));
console.log(`Checked ${pages} pages, ${tiles.length} tagged projects, JavaScript syntax, and ${links} local links.`);
