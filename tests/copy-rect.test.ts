import { describe,it,expect } from 'vitest';
import { copyRect } from '../src/pixels.js';

// Explicit pixel grids are independent of copyRect's row implementation.
const rgba = (values:readonly number[]) => values.flatMap(v=>[v,v+10,v+20,128]);
describe('P2-01: Buffer overlap snapshots',()=>{
  it.each([
    {name:'down two rows',sx:0,sy:0,w:1,h:2,dx:0,dy:1,width:1,height:3,initial:[1,2,3],expected:[1,1,2]},
    {name:'up two rows',sx:0,sy:1,w:1,h:2,dx:0,dy:0,width:1,height:3,initial:[1,2,3],expected:[2,3,3]},
    {name:'diagonal down-right',sx:0,sy:0,w:2,h:2,dx:1,dy:1,width:3,height:3,initial:[1,2,3,4,5,6,7,8,9],expected:[1,2,3,4,1,2,7,4,5]},
    {name:'horizontal right across two rows',sx:0,sy:0,w:2,h:2,dx:1,dy:0,width:3,height:2,initial:[1,2,3,4,5,6],expected:[1,1,2,4,4,5]},
    {name:'horizontal left across two rows',sx:1,sy:0,w:2,h:2,dx:0,dy:0,width:3,height:2,initial:[1,2,3,4,5,6],expected:[2,3,3,5,6,6]},
    {name:'identical rectangle including boundary',sx:0,sy:0,w:2,h:2,dx:0,dy:0,width:2,height:2,initial:[1,2,3,4],expected:[1,2,3,4]},
  ])('$name',c=>{
    const p={width:c.width,height:c.height,data:Buffer.from(rgba(c.initial))};
    copyRect(p,p,c.sx,c.sy,c.w,c.h,c.dx,c.dy);
    expect([...p.data]).toEqual(rgba(c.expected));
  });
  it.each(['buffer','uint8'] as const)('copies across distinct overlapping Buffer / %s views with nonzero byte offsets',targetType=>{
    const backing=Buffer.from(rgba([1,2,3,4,5,6,7,8]));
    const source={width:2,height:3,data:Buffer.from(backing.buffer,backing.byteOffset,24)};
    const targetBytes=targetType==='buffer'?Buffer.from(backing.buffer,backing.byteOffset+8,24):
      new Uint8Array(backing.buffer,backing.byteOffset+8,24);
    copyRect(source,{width:2,height:3,data:targetBytes},0,0,2,2,0,0);
    expect([...backing]).toEqual(rgba([1,2,1,2,3,4,7,8]));
  });
  it('retains non-overlapping copies, source pixels and unrelated target bytes',()=>{
    const source={width:2,height:2,data:Buffer.from(rgba([1,2,3,4]))};
    const target={width:3,height:3,data:Buffer.from(rgba([5,6,7,8,9,10,11,12,13]))};
    copyRect(source,target,0,0,2,2,1,1);
    expect([...source.data]).toEqual(rgba([1,2,3,4]));
    expect([...target.data]).toEqual(rgba([5,6,7,8,1,2,11,3,4]));
  });
});
