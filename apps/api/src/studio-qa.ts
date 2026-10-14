import type { RgbaImage } from '@tileset/asset-core';
import type { QaSchema } from '@tileset/contracts';
import type { z } from 'zod';
export function visualRisks(images: readonly RgbaImage[]) {
  const risks: z.infer<typeof QaSchema>['risks'] = [];
  const add = (
    code: string,
    location: string,
    metric: number,
    threshold: number,
    message: string,
  ) => risks.push({ code, location, metric, threshold, message });
  const lum = (b: Uint8Array, i: number) =>
    0.2126 * b[i]! + 0.7152 * b[i + 1]! + 0.0722 * b[i + 2]!;
  for (const [n, image] of images.entries()) {
    const b = image.bytes();
    let seam = 0,
      count = 0;
    const colors = new Set<string>();
    for (let y = 0; y < image.height; y++) {
      const a = y * image.width * 4,
        c = (y * image.width + image.width - 1) * 4;
      seam += Math.abs(lum(b, a) - lum(b, c));
      count++;
    }
    for (let x = 0; x < image.width; x++) {
      seam += Math.abs(lum(b, x * 4) - lum(b, ((image.height - 1) * image.width + x) * 4));
      count++;
    }
    for (let i = 0; i < b.length; i += 4) {
      colors.add(`${b[i]},${b[i + 1]},${b[i + 2]}`);
    }
    seam /= count;
    if (seam > 32)
      add(
        'SEAM',
        `处理素材 ${n}`,
        seam,
        32,
        '源样板外边亮度差较高；该启发式不区分设计岸线与纹理接缝，请在边角场景核对。',
      );
    if (colors.size <= 4)
      add(
        'REPETITION',
        `处理素材 ${n}`,
        colors.size,
        4,
        '可见颜色很少，大片铺设可能单调；低接缝差不代表美术质量。',
      );
    if (n > 0) {
      const prev = images[n - 1]!.bytes();
      let diff = 0,
        delta = 0;
      for (let i = 0; i < b.length; i += 4) {
        if (b[i] !== prev[i] || b[i + 1] !== prev[i + 1] || b[i + 2] !== prev[i + 2]) diff++;
        delta += Math.abs(lum(b, i) - lum(prev, i));
      }
      const ratio = diff / (image.width * image.height),
        jump = delta / (image.width * image.height);
      if (ratio < 0.01)
        add(
          'LOW_ANIMATION',
          `水面源帧 ${n - 1}→${n}`,
          ratio,
          0.01,
          '可见变化少于 1%，水波可能几乎不动。',
        );
      if (jump > 24)
        add(
          'FLICKER',
          `水面源帧 ${n - 1}→${n}`,
          jump,
          24,
          '平均亮度跳变超过 24/255，播放时可能闪烁。',
        );
      const rgb = [0, 0, 0],
        previousRgb = [0, 0, 0];
      for (let i = 0; i < b.length; i += 4)
        for (let c = 0; c < 3; c++) {
          rgb[c]! += b[i + c]!;
          previousRgb[c]! += prev[i + c]!;
        }
      const colorDelta =
        rgb.reduce((n, v, c) => n + Math.abs(v - previousRgb[c]!), 0) /
        (image.width * image.height * 3);
      if (colorDelta > 16)
        add(
          'COLOR_SHIFT',
          `水面源帧 ${n - 1}→${n}`,
          colorDelta,
          16,
          '全帧 RGB 均值变化超过 16/255，请核对色变。',
        );
    }
  }
  return risks;
}
