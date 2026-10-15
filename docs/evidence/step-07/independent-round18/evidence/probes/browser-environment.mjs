import { chromium } from '/Users/dingshinn/Desktop/rpg-maker-maker/.local/independent-review-step07-round18/checkout/node_modules/.pnpm/playwright@1.64.0/node_modules/playwright/index.mjs';
import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const out=resolve('.local/step07-review/independent-round18/evidence',process.argv[2]??'environment-original');
await (await import('node:fs/promises')).mkdir(out,{recursive:true});
const browser=await chromium.launch(process.argv[3] ? {channel:process.argv[3]} : {});
const page=await browser.newPage();
const errors=[]; page.on('console',m=>errors.push({type:m.type(),text:m.text()}));page.on('pageerror',e=>errors.push({error:e.message}));
await page.setContent('<button>probe</button><img>');
const png=(await readFile('tests/fixtures/art-ground.png')).toString('base64');
const result=await page.evaluate(async png=>{
 const image=document.querySelector('img');image.src='data:image/png;base64,'+png;
 const start=performance.now();
 const raf=await Promise.race([new Promise(r=>requestAnimationFrame(t=>r({ok:true,t}))),new Promise(r=>setTimeout(()=>r({ok:false}),3000))]);
 const decode=await Promise.race([image.decode().then(()=>({ok:true,w:image.naturalWidth,h:image.naturalHeight})),new Promise(r=>setTimeout(()=>r({ok:false,w:image.naturalWidth,h:image.naturalHeight}),3000))]);
 return {raf,decode,visibility:document.visibilityState,seconds:(performance.now()-start)/1000};
},png);
let screenshot;try{await page.screenshot({path:resolve(out,'browser-environment.png'),timeout:5000});screenshot='PASS';}catch(e){screenshot=e.message;}
await writeFile(resolve(out,'browser-environment.json'),JSON.stringify({version:browser.version(),result,screenshot,errors},null,2)+'\n');
console.log(JSON.stringify({version:browser.version(),result,screenshot,errors}));await browser.close();
