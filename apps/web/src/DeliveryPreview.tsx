import { useEffect, useRef, useState } from 'react';
import { Application, Texture, Sprite, Rectangle } from 'pixi.js';
import 'pixi.js/unsafe-eval';
import type { RenderDescriptor } from '@tileset/contracts';
import { LogicalClock } from './clock.js';
export function DeliveryPreview({ descriptor }: { descriptor: RenderDescriptor }) {
  const host = useRef<HTMLDivElement>(null),
    clock = useRef(new LogicalClock(descriptor.updatesPerState, descriptor.sequence)),
    draw = useRef<(state: number) => void>(() => {});
  const [status, setStatus] = useState('读取交付 PNG…'),
    [state, setState] = useState(0),
    [playing, setPlaying] = useState(false),
    [scale, setScale] = useState(1);
  useEffect(() => {
    const app = new Application();
    let disposed = false,
      initialized = false,
      raf = 0;
    const textures: Texture[] = [];
    clock.current = new LogicalClock(descriptor.updatesPerState, descriptor.sequence);
    setState(0);
    setPlaying(false);
    setStatus('读取交付 PNG…');
    const images = async () => {
      const load = async (url: string) => {
        const i = new Image();
        i.src = url;
        await i.decode();
        return i;
      };
      const [a1, a2, manifest, profile] = await Promise.all([
        load(descriptor.png.A1),
        load(descriptor.png.A2),
        fetch(descriptor.manifestUrl).then(async (r) => {
          if (!r.ok) throw Error('清单读取失败');
          const bytes = await r.arrayBuffer();
          const digest = await crypto.subtle.digest('SHA-256', bytes);
          if (
            [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('') !==
            descriptor.manifestSha
          )
            throw Error('导出清单哈希不匹配');
          return JSON.parse(new TextDecoder().decode(bytes)) as {
            buildId: string;
            identity: { profile: unknown; profileHash: string };
          };
        }),
        fetch(descriptor.profileUrl).then(async (r) => {
          if (!r.ok) throw Error('Profile 读取失败');
          return r.json() as Promise<unknown>;
        }),
      ]);
      if (
        manifest.buildId !== descriptor.exportBuildId ||
        manifest.identity.profileHash !== descriptor.profileHash ||
        JSON.stringify(manifest.identity.profile) !== JSON.stringify(profile)
      )
        throw Error('选定导出与 Profile 不一致');
      return { A1: Texture.from(a1), A2: Texture.from(a2) };
    };
    void (async () => {
      const atlases = await images();
      atlases.A1.source.scaleMode = 'nearest';
      atlases.A2.source.scaleMode = 'nearest';
      textures.push(atlases.A1, atlases.A2);
      if (disposed) {
        textures.forEach((t) => t.destroy(true));
        return;
      }
      await app.init({
        width: descriptor.width * scale,
        height: descriptor.height * scale,
        resolution: 1,
        antialias: false,
        backgroundAlpha: 0,
        preference: 'webgl',
        autoStart: false,
        preserveDrawingBuffer: true,
      });
      initialized = true;
      if (disposed) {
        app.destroy(true, { children: true });
        textures.forEach((t) => t.destroy(true));
        return;
      }
      app.canvas.setAttribute('aria-label', '交付拼接预览');
      app.canvas.dataset['buildId'] = descriptor.buildId;
      app.canvas.dataset['scene'] = descriptor.scene;
      app.canvas.dataset['group'] = descriptor.group;
      app.canvas.dataset['exportId'] = descriptor.exportBuildId;
      host.current?.replaceChildren(app.canvas);
      app.stage.scale.set(scale);
      draw.current = (n: number) => {
        for (const child of app.stage.removeChildren()) {
          if (child instanceof Sprite) child.texture.destroy();
          child.destroy();
        }
        for (const tile of descriptor.states[n]!)
          for (const r of tile.rects) {
            const sprite = new Sprite(
              new Texture({
                source: atlases[tile.atlas].source,
                frame: new Rectangle(r.sx, r.sy, r.width, r.height),
              }),
            );
            sprite.position.set(r.dx, r.dy);
            app.stage.addChild(sprite);
          }
        app.renderer.render(app.stage);
        app.canvas.dataset['state'] = String(n);
      };
      draw.current(0);
      setStatus('画布已就绪 · 实际导出图集');
      const tick = (now: number) => {
        if (disposed) return;
        const c = clock.current,
          old = c.state;
        if (document.hidden) c.suspend();
        else c.sample(now);
        if (old !== c.state) {
          draw.current(c.state);
          setState(c.state);
        }
        app.canvas.dataset['updates'] = String(c.updates);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })().catch((e) => {
      if (!disposed) setStatus(e instanceof Error ? e.message : '交付预览失败');
    });
    const hidden = () => clock.current.suspend();
    document.addEventListener('visibilitychange', hidden);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', hidden);
      draw.current = () => {};
      if (initialized) app.destroy(true, { children: true });
      textures.forEach((t) => t.destroy(true));
    };
  }, [descriptor, scale]);
  const choose = (n: number) => {
    clock.current.select(n);
    setPlaying(false);
    setState(n);
    draw.current(n);
  };
  return (
    <div className="delivery">
      <div className="preview-controls">
        <button
          onClick={() => {
            if (playing) clock.current.pause();
            else clock.current.play();
            setPlaying(!playing);
          }}
        >
          {playing ? '暂停' : '播放'}
        </button>
        <button
          onClick={() => {
            clock.current.step();
            setPlaying(false);
            setState(clock.current.state);
            draw.current(clock.current.state);
          }}
        >
          下一播放状态
        </button>
        <label>
          整数缩放
          <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
        </label>
        {descriptor.sequence.map((source, n) => (
          <button key={n} aria-pressed={state === n} onClick={() => choose(n)}>
            状态 {n} · 源帧 {source}
          </button>
        ))}
      </div>
      <div className="canvas-scroll" ref={host} />
      <p role="status">
        {status} · 播放状态 {state} / 源帧 {descriptor.sequence[state]}
      </p>
      <p className="muted">
        60 固定逻辑更新/秒，每 30
        次推进一状态（0→1→2→1）。暂停保留位置；隐藏页面冻结，恢复时不追赶。卡顿单次最多计入 250ms。
      </p>
    </div>
  );
}
