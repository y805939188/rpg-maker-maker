import { useEffect, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';
// Pixi's static shader/uniform polyfill keeps production CSP free of unsafe-eval.
import 'pixi.js/unsafe-eval';

export function CanvasShell() {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('初始化画布');
  useEffect(() => {
    const app = new Application();
    let disposed = false;
    let initialized = false;
    void app
      .init({
        width: 576,
        height: 192,
        background: 0x182b28,
        preference: 'webgl',
        antialias: false,
        resolution: 1,
      })
      .then(() => {
        initialized = true;
        if (disposed) {
          app.destroy(true, { children: true });
          return;
        }
        const grid = new Graphics();
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 12; x++)
            grid
              .rect(x * 48, y * 48, 48, 48)
              .fill((x + y) % 2 ? 0x29433a : 0x243d34)
              .stroke({ width: 1, color: 0x3e5b4c });
        app.stage.addChild(grid);
        host.current?.append(app.canvas);
        app.canvas.setAttribute('aria-label', '素材预览画布占位');
        setStatus('画布已就绪');
      })
      .catch(() => {
        if (!disposed) setStatus('当前浏览器无法初始化画布');
      });
    return () => {
      disposed = true;
      if (initialized) app.destroy(true, { children: true });
    };
  }, []);
  return (
    <div className="canvas-shell">
      <div ref={host} />
      <p role="status">{status} · 图块与动画预览将在后续步骤接入</p>
    </div>
  );
}
