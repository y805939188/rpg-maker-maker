import {decodePng} from '../../dist/src/pixels.js';
import {readFile,writeFile} from 'node:fs/promises';
const violations={};
for(const name of ['art-ground.png','art-water-0.png','art-water-1.png','art-water-2.png','art-static-bank-mask.png']){
 const p=await decodePng(await readFile(`tests/fixtures/${name}`));let mismatches=0,blocks=0;
 for(let y=0;y<p.height;y+=2)for(let x=0;x<p.width;x+=2){blocks++;const pos=(y*p.width+x)*4,first=p.data.subarray(pos,pos+4);let mismatch=false;for(const[dx,dy]of[[1,0],[0,1],[1,1]]){const q=((y+dy)*p.width+x+dx)*4;if(!Buffer.from(first).equals(Buffer.from(p.data.subarray(q,q+4))))mismatch=true;}if(mismatch)mismatches++;}
 violations[name]={blocks,mismatches};
}
const frames=await Promise.all([0,1,2].map(f=>readFile(`tests/fixtures/art-water-${f}.png`).then(decodePng)));
const mask=await decodePng(await readFile('tests/fixtures/art-static-bank-mask.png'));
let staticPixels=0,changedInside=0,changedOutside=0;
for(let i=0;i<mask.data.length;i+=4){const equal=Buffer.from(frames[0].data.subarray(i,i+4)).equals(Buffer.from(frames[1].data.subarray(i,i+4)))&&Buffer.from(frames[0].data.subarray(i,i+4)).equals(Buffer.from(frames[2].data.subarray(i,i+4)));if(mask.data[i]===255){staticPixels++;if(!equal)changedOutside++;}else if(!equal)changedInside++;}
const result={commit:'301d3cdb37743a53eff6046ccf2b23aea0ab8122',violations,bank:{staticPixels,changedInside,changedOutside}};
await writeFile('.local/reviewer/pixels-301d3cd.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
