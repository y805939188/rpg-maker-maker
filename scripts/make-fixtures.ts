import { mkdir, writeFile } from 'node:fs/promises';
import { blank, encodePng } from '../src/pixels.js';
import type { Pixels } from '../src/pixels.js';
import { sha256 } from './io.js';

// Independently authored artwork/diagnostics. Does not import the compiler or its layout.
const out = 'tests/fixtures';
const font: Record<string, string[]> = {
  '0': ['111','101','101','101','111'], '1': ['010','110','010','010','111'],
  '2': ['111','001','111','100','111'], '3': ['111','001','111','001','111'],
  '4': ['101','101','111','001','001'], '5': ['111','100','111','001','111'],
  '6': ['111','100','111','101','111'], '7': ['111','001','010','010','010'],
  '8': ['111','101','111','101','111'], '9': ['111','101','111','001','111'],
  'F': ['111','100','110','100','100'], 'G': ['111','100','101','101','111'],
};
type Color = readonly [number, number, number, number];
function pixel(p: Pixels, x: number, y: number, c: Color): void {
  p.data.set(c, (y * p.width + x) * 4);
}
function label(p: Pixels, x: number, y: number, text: string): void {
  [...text].forEach((char, i) => font[char]!.forEach((row, ry) => [...row].forEach((v, rx) => {
    if (v === '1') pixel(p, x + i * 4 + rx, y + ry, [255,255,255,255]);
  })));
}
function diagnostic(frame: number | null): Pixels {
  const p = blank(96,144);
  for (let qy = 0; qy < 6; qy++) for (let qx = 0; qx < 4; qx++) {
    const id = qy * 4 + qx;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const color: Color = x === 0 || y === 0 ? [255,200,60,255] :
        x === 23 || y === 23 ? [20,20,20,255] : [40+qx*42,40+qy*26,40+(frame ?? 0)*80,255];
      pixel(p,qx*24+x,qy*24+y,color);
    }
    label(p,qx*24+4,qy*24+4,id.toString().padStart(2,'0'));
    label(p,qx*24+4,qy*24+14,frame === null ? 'G' : `F${frame}`);
    // Top-left L and asymmetric bottom-right dot detect mirroring/rotation.
    pixel(p,qx*24+20,qy*24+20,[255,80,80,255]);
  }
  return p;
}
const grass: Color[] = [[78,124,58,255],[85,136,62,255],[92,146,66,255],[103,153,72,255]];
const dirt: Color = [148,115,71,255];
const sand: Color = [182,163,104,255];
const rim: Color = [36,86,95,255];
const lake: Color[] = [[42,111,145,255],[46,120,153,255],[52,130,161,255]];
function grassColor(x: number,y: number): Color {
  return grass[((x*13+y*7+Math.floor(x/3)*11) ^ (y*3)) % 4]!;
}
/** Distance from fixed bank for each independently drawn source quarter. */
function boundary(qx: number,qy: number,x: number,y: number): number {
  if (qx < 2 && qy < 2) return 100; // representative tile
  if (qy < 2) { // four concave corners around a missing diagonal
    const cx = qx === 2 ? x : 11-x;
    const cy = qy === 0 ? y : 11-y;
    return Math.sqrt(cx*cx+cy*cy);
  }
  return Math.min(qx === 0 ? x : qx === 3 ? 11-x : 100,
    qy === 2 ? y : qy === 5 ? 11-y : 100);
}
function artwork(frame: number | null): { sheet: Pixels; mask: Pixels } {
  const sheet = blank(96,144), mask = blank(96,144);
  for (let sy = 0; sy < 144; sy++) for (let sx = 0; sx < 96; sx++) {
    const qx = Math.floor(sx/24), qy = Math.floor(sy/24);
    const x = Math.floor((sx % 48)/2), y = Math.floor((sy % 48)/2);
    const d = boundary(qx,qy,Math.floor((sx%24)/2),Math.floor((sy%24)/2))*2;
    let color: Color;
    if (frame === null) color = d < 4 ? dirt : grassColor(x,y);
    else if (d < 4) color = grassColor(x,y);
    else if (d < 6) color = sand;
    else if (d < 8) color = rim;
    else {
      const wave = (x + Math.floor(y/3)*5 + frame*2) % 12;
      color = wave < 3 && y % 6 === 2 ? [97,164,183,255] : lake[(x+y+frame)%3]!;
    }
    pixel(sheet,sx,sy,color);
    pixel(mask,sx,sy,d < 8 ? [255,255,255,255] : [0,0,0,255]);
  }
  return { sheet,mask };
}

await mkdir(out, { recursive: true });
const files: Record<string,string> = {};
async function save(name: string,p: Pixels): Promise<void> {
  const bytes = await encodePng(p);
  await writeFile(`${out}/${name}`,bytes);
  files[name] = sha256(bytes);
}
await save('diagnostic-ground.png',diagnostic(null));
await save('art-ground.png',artwork(null).sheet);
for (let f = 0; f < 3; f++) {
  await save(`diagnostic-water-${f}.png`,diagnostic(f));
  await save(`art-water-${f}.png`,artwork(f).sheet);
}
await save('art-static-bank-mask.png',artwork(0).mask);
await writeFile(`${out}/provenance.json`,JSON.stringify({
  version: 'original-fixtures-v1.1', author: 'AI Tileset Studio project / Codex',
  method: 'Original authored pixel palette, integer drawing and fixed bank geometry; no AI image provider or third-party artwork',
  license: 'CC0-1.0 (these original fixture images only)',
  logicalPixelScale: 2, diagnosticQuarterSize: 24,
  visualConfirmation: 'NOT_EXECUTED_BY_USER',
  purpose: 'Compatibility art master, not a claim of V1.0 AI production quality',
  files,
},null,2)+'\n');
console.log(`Wrote ${Object.keys(files).length} reproducible fixture PNGs + provenance`);
