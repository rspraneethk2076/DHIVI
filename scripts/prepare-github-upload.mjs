import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const realRoot=fs.realpathSync(root);
function checkedPath(file) {
  const absolute=path.resolve(root,file);
  const relative=path.relative(root,absolute);
  if(!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Path is outside application');
  let current=root;
  for(const part of relative.split(path.sep)) {
    current=path.join(current,part);
    if(fs.lstatSync(current).isSymbolicLink()) throw new Error(`Symbolic link is not uploadable: ${file}`);
  }
  const realRelative=path.relative(realRoot,fs.realpathSync(absolute));
  if(realRelative.startsWith('..') || path.isAbsolute(realRelative) || !fs.statSync(absolute).isFile()) throw new Error(`Invalid application file: ${file}`);
  return absolute;
}
const result=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'});
if(result.status!==0) throw new Error('Cannot enumerate application files');
const files=[...new Set(result.stdout.split('\0').filter(Boolean))].sort();
const blocked=files.filter(file=>/(?:^|\/)(?:\.git|\.netlify|node_modules|dist|\.local|qa)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|\.(?:sqlite|db|pem|key|log)$/i.test(file));
if(blocked.length) throw new Error(`Excluded local file is tracked: ${blocked.join(', ')}`);
const records=files.map(file=>{
  const absolute=checkedPath(file);
  const content=fs.readFileSync(absolute);
  if(!/\.(?:png|jpe?g|webp|gif)$/i.test(file) && /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{30,}\b|\bsk-proj-[A-Za-z0-9_-]{30,}\b/.test(content.toString('utf8'))) throw new Error(`Potential secret in ${file}`);
  const sha=createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
  return {path:file,bytes:content.length,sha};
});
if(process.argv.includes('--read')) {
  const index=process.argv.indexOf('--read');
  const file=process.argv[index+1];
  if(!records.some(record=>record.path===file)) throw new Error('File is not in the reviewed upload list');
  const offset=Number(process.argv[index+2]||0),length=Number(process.argv[index+3]||24576);
  if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(length)||length<1||length>24576) throw new Error('Invalid chunk bounds');
  process.stdout.write(fs.readFileSync(checkedPath(file)).subarray(offset,offset+length).toString('base64'));
} else {
  console.log(JSON.stringify({files:records,totalBytes:records.reduce((sum,file)=>sum+file.bytes,0)}));
}
