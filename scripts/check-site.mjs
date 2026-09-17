import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
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
const tiles=[...index.matchAll(/class="project-tile" data-tags="([^"]+)"/g)];
const markdownFiles=(await readdir(new URL('../content/projects/',import.meta.url))).filter(f=>f.endsWith('.md'));
assert.equal(tiles.length,markdownFiles.length,'Every Markdown project must have one tagged tile');
assert(index.includes('data-filter="All"'),'Missing reset filter');
const about=await readFile(path.join(root,'about/index.html'),'utf8');
assert(about.includes('id="about-tangram"')&&about.includes('src="/about.js"'));
console.log(`Checked ${pages} pages, ${tiles.length} tagged projects, JavaScript syntax, and ${links} local links.`);
