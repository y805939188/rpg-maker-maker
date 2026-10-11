import {readFile,writeFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const core=await readFile('/Users/dingshinn/Library/Application Support/Steam/steamapps/common/RPG Maker MZ/RPGMZ.app/Contents/Resources/newdata/js/rmmz_core.js','utf8');
const start=core.indexOf('function Tilemap()'),end=core.indexOf('// Internal classes',start);
const T=runInNewContext(core.slice(start,end)+'\nTilemap;',{PIXI:{Container:function(){}}});
const root='artifacts/step01-ffc5300c7fb2cb94a48a';
const width=384,height=288,results={};
for(const[name,kind]of[['art_A1',4],['art_A2',16],['diagnostic_A1',6],['diagnostic_A2',17]]){
 const{data,info}=await sharp(`${root}/${name}.png`).raw().toBuffer({resolveWithObject:true});
 const states=[];
 for(let frame=0;frame<(kind<16?4:1);frame++){
  const rgba=Buffer.alloc(width*height*4);
  for(let s=0;s<48;s++){
   const ox=(s%8)*48,oy=Math.floor(s/8)*48;
   const layer={addRect(set,sx,sy,dx,dy,w,h){for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.copy(rgba,((oy+dy+y)*width+ox+dx+x)*4,((sy+y)*info.width+sx+x)*4,((sy+y)*info.width+sx+x)*4+4);}};
   T.prototype._addAutotile.call({tileWidth:48,tileHeight:48,animationFrame:frame,_isTableTile:()=>false},layer,2048+kind*48+s,0,0);
  }
  await sharp(rgba,{raw:{width,height,channels:4}}).png().toFile(`.local/reviewer/${name}-frame${frame}-301d3cd.png`);
  states.push(createHash('sha256').update(rgba).digest('hex'));
 }
 results[name]={kind,shapeCount:48,framePixelHashes:states,pingPong:kind>=16?'STATIC':states[0]!==states[1]&&states[1]!==states[2]&&states[1]===states[3]};
}
await writeFile('.local/reviewer/render-301d3cd.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
