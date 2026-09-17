import {mkdir,readdir,cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
if(!process.argv[2])throw Error('Usage: npm run export:github -- /absolute/path/to/empty-folder');
const destination=path.resolve(process.argv[2]);
if(destination===root||destination.startsWith(root+path.sep))throw Error('Choose an export folder outside this checkout.');
await mkdir(destination,{recursive:true});
if((await readdir(destination)).length)throw Error('Export folder must be empty.');
// Export tracked working files, without Git credentials/history or Sites identity.
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
for(const file of files){
  if(file.startsWith('.openai/'))continue;
  await mkdir(path.dirname(path.join(destination,file)),{recursive:true});
  await cp(path.join(root,file),path.join(destination,file));
}
console.log(`Exported portable source to ${destination}`);
