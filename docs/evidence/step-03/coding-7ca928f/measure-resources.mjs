import {RawSource,RgbaImage} from '@tileset/asset-core';
import {encodePng,decodeSource,codecRuntime,PNG_POLICY} from '@tileset/image-adapter';
import {createHash} from 'node:crypto';
const samples=[];
for(const kind of ['flat','high-entropy']){
 const data=new Uint8Array(768*576*4);let seed=0x31415926;
 for(let i=0;i<data.length;i+=4){for(let c=0;c<3;c++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i+c]=kind==='flat'?[1,2,3][c]:seed>>>24;}data[i+3]=255;}
 const expected=createHash('sha256').update(data).digest('hex');const start=performance.now(),parentBefore=process.memoryUsage().rss;
 const encoded=await encodePng(new RgbaImage({width:768,height:576,data}));
 const raw=new RawSource({id:'resource-sample',revision:1,role:'water',density:1,encoding:'png',bytes:encoded,provenance:{origin:'deterministic',author:'Owned resource measurement',license:'CC0-1.0',toolVersion:'normal-bounded-rgba-v1',parents:[]}});
 const decoded=await decodeSource(raw);if(decoded.status!=='validated'||decoded.source.image.pixelHash!==expected)throw Error('Resource sample failed exact pixel validation.');
 samples.push({kind,width:768,height:576,decodedBytes:data.length,encodedBytes:encoded.length,exactPixelSha256:expected,...decoded.measurement,parentRssBefore:parentBefore,parentRssAfter:process.memoryUsage().rss,wholeRoundtripMs:performance.now()-start});
}
console.log(JSON.stringify({policy:PNG_POLICY,actualRuntime:await codecRuntime(),samples,limits:'Measured RSS is not an OS native-memory hard ceiling. Producer allocations precede byte handoff; no arbitrary-media-safety claim.'},null,2));
