import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { PROFILE } from '../src/profile.js';
import { sha256 } from './io.js';

export interface NativeRect { set: number; sx: number; sy: number; dx: number; dy: number; w: number; h: number }
interface NativeTilemap {
  prototype: {
    _addAutotile(this: unknown, layer: unknown, tileId: number, dx: number, dy: number): void;
    update(this: unknown): void;
  };
  FLOOR_AUTOTILE_TABLE: number[][][];
}
export async function loadNativeOracle(corePath: string): Promise<NativeTilemap> {
  const bytes = await readFile(corePath);
  assert.equal(sha256(bytes),PROFILE.coreSha256,'Selected rmmz_core.js differs from pinned MZ 1.10.0 core');
  const source = bytes.toString('utf8');
  const start = source.indexOf('function Tilemap()');
  const end = source.indexOf('// Internal classes',start);
  assert.ok(start >= 0 && end > start);
  // Execute the original Tilemap definitions unmodified; no runtime code is vendored.
  return runInNewContext(source.slice(start,end)+'\nTilemap;', {
    PIXI: { Container: function Container() {} },
  },{ timeout:1000 }) as NativeTilemap;
}
export function nativeRects(native: NativeTilemap,kind: number,shape: number,frame: number): NativeRect[] {
  const rects: NativeRect[] = [];
  const tilemap = { tileWidth:48,tileHeight:48,animationFrame:frame,
    _isTableTile:()=>false };
  native.prototype._addAutotile.call(tilemap,{
    addRect: (set:number,sx:number,sy:number,dx:number,dy:number,w:number,h:number) => rects.push({set,sx,sy,dx,dy,w,h}),
  },2048+kind*48+shape,0,0);
  return rects;
}
export function nativeUpdates(native: NativeTilemap,count: number): { animationCount:number; animationFrame:number }[] {
  const tilemap = { animationCount:0,animationFrame:0,children:[] };
  const states = [{ ...tilemap }];
  for (let i=0;i<count;i++) { native.prototype.update.call(tilemap); states.push({ ...tilemap }); }
  return states;
}
