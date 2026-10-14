import { useEffect, useRef, useState } from 'react';
import { Application, Texture, Sprite } from 'pixi.js';
import 'pixi.js/unsafe-eval';
import { LogicalClock } from './clock.js';
export function SourceAnimation({
  urls,
  animation,
}: {
  urls: readonly string[];
  animation: { sequence: readonly number[]; updatesPerState: number };
}) {
  const host = useRef<HTMLDivElement>(null),
    clock = useRef(new LogicalClock(animation.updatesPerState, animation.sequence)),
    draw = useRef<(frame: number) => void>(() => {}),
    [state, setState] = useState(0),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let disposed = false,
      initialized = false,
      raf = 0;
    const app = new Application(),
      textures: Texture[] = [];
    clock.current = new LogicalClock(animation.updatesPerState, animation.sequence);
    const hidden = () => clock.current.suspend();
    document.addEventListener('visibilitychange', hidden);
    setState(0);
    setPlaying(false);
    setError('');
    void (async () => {
      for (const url of urls) {
        const image = new Image();
        image.src = url;
        await image.decode();
        const t = Texture.from(image);
        t.source.scaleMode = 'nearest';
        textures.push(t);
      }
      if (disposed) {
        textures.forEach((t) => t.destroy(true));
        return;
      }
      await app.init({
        width: 192,
        height: 288,
        resolution: 1,
        antialias: false,
        backgroundAlpha: 0,
        autoStart: false,
        preference: 'webgl',
        preserveDrawingBuffer: true,
      });
      initialized = true;
      if (disposed) {
        app.destroy(true);
        textures.forEach((t) => t.destroy(true));
        return;
      }
      const sprite = new Sprite(textures[0]);
      sprite.scale.set(2);
      app.stage.addChild(sprite);
      host.current?.replaceChildren(app.canvas);
      app.canvas.setAttribute('aria-label', '创作源水面动画');
      draw.current = (n) => {
        sprite.texture = textures[n]!;
        app.renderer.render(app.stage);
      };
      draw.current(0);
      const tick = (time: number) => {
        if (disposed) return;
        const c = clock.current,
          old = c.state;
        if (document.hidden) c.suspend();
        else c.sample(time);
        if (old !== c.state) {
          draw.current(c.sourceFrame);
          setState(c.state);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })().catch((e) => {
      if (!disposed) setError(e instanceof Error ? e.message : '源预览读取失败');
    });
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', hidden);
      cancelAnimationFrame(raf);
      draw.current = () => {};
      if (initialized) app.destroy(true, { children: true });
      textures.forEach((t) => t.destroy(true));
    };
  }, [urls, animation.updatesPerState, animation.sequence.join(',')]);
  return (
    <div>
      <h3>创作源水面动画 · 原始 PNG</h3>
      <div ref={host} className="source-canvas" />
      <div className="toolbar">
        <button
          onClick={() => {
            if (playing) clock.current.pause();
            else clock.current.play();
            setPlaying(!playing);
          }}
        >
          {playing ? '暂停源水面' : '播放源水面'}
        </button>
        <button
          onClick={() => {
            clock.current.step();
            setPlaying(false);
            setState(clock.current.state);
            draw.current(clock.current.sourceFrame);
          }}
        >
          下一源播放状态
        </button>
      </div>
      <p>
        播放状态 {state} · 源帧 {animation.sequence[state]} · 固定逻辑时钟。{error}
      </p>
    </div>
  );
}
