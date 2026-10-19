const fs = require('fs'); const path = require('path');
const roots = ['backend','frontend','database','scripts']; const exts = new Set(['.js','.ts','.html','.css','.scss']); let failed = false; const all=[];
function walk(dir){ if(!fs.existsSync(dir))return; for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name); if(e.isDirectory()&&!['node_modules','dist'].includes(e.name))walk(p); else if(e.isFile()&&exts.has(path.extname(p))){const n=fs.readFileSync(p,'utf8').split(/\r?\n/).length;all.push([n,p]);if(n>500){console.error(`Más de 500 líneas: ${p} (${n})`);failed=true}}}}
roots.forEach(walk); console.log(all.sort((a,b)=>b[0]-a[0]).slice(0,12).map(([n,p])=>`${n}\t${p}`).join('\n')); process.exitCode=failed?1:0;
