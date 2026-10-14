import { useEffect, useRef, useState } from 'react';
import { boundedResourceRead, processedPng, RESOURCE_READ_BUDGET } from './resource-read.js';

type Saved = { owner: string; frame: number; url: string; sha256: string };
export function ProcessedPreview({
  projectId,
  recipeId,
  frame,
  enabled,
  onBusy,
}: {
  projectId: string;
  recipeId: string;
  frame: number;
  enabled: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const owner = `${projectId}/${recipeId}`,
    target = `${owner}/${frame}`;
  const [saved, setSaved] = useState<Saved | null>(null),
    [status, setStatus] = useState(''),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const urls = useRef(new Set<string>()),
    generation = useRef(0),
    previous = useRef<Saved | null>(null);
  useEffect(
    () => () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
      urls.current.clear();
    },
    [],
  );
  useEffect(() => {
    const n = ++generation.current;
    const controller = new AbortController();
    setError('');
    if (!enabled) {
      setStatus('等待当前交付读取结束后读取处理素材。');
      onBusy(false);
      return;
    }
    onBusy(true);
    setStatus('正在读取实际处理PNG…');
    let pendingUrl: string | undefined;
    void boundedResourceRead(
      async (signal) => {
        const png = await processedPng(
          `/api/projects/${projectId}/recipes/${recipeId}/processed?frame=${frame}`,
          signal,
        );
        pendingUrl = URL.createObjectURL(png.blob);
        const image = new Image();
        const abort = () => {
          image.src = '';
        };
        signal.addEventListener('abort', abort, { once: true });
        try {
          image.src = pendingUrl;
          await image.decode();
          signal.throwIfAborted();
          if (image.naturalWidth !== 96 || image.naturalHeight !== 144)
            throw Error('处理PNG尺寸不是96×144；上一成功预览保留。');
          return { owner, frame, url: pendingUrl, sha256: png.sha256 };
        } finally {
          signal.removeEventListener('abort', abort);
        }
      },
      controller.signal,
      (attempt) =>
        setStatus(
          `处理槽忙，正在有界恢复（${attempt + 1}/${RESOURCE_READ_BUDGET.attempts}）；上一成功预览保留。`,
        ),
    )
      .then((image) => {
        if (controller.signal.aborted || n !== generation.current) {
          URL.revokeObjectURL(image.url);
          return;
        }
        urls.current.add(image.url);
        if (previous.current) {
          URL.revokeObjectURL(previous.current.url);
          urls.current.delete(previous.current.url);
        }
        previous.current = image;
        setSaved(image);
        pendingUrl = undefined;
        setStatus(`处理PNG已就绪 · 源帧${frame}`);
      })
      .catch((cause) => {
        if (pendingUrl) URL.revokeObjectURL(pendingUrl);
        if (!controller.signal.aborted && n === generation.current) {
          setError(cause instanceof Error ? cause.message : String(cause));
          setStatus('处理预览读取失败；上一成功预览保留。');
        }
      })
      .finally(() => {
        if (n === generation.current) onBusy(false);
      });
    return () => {
      controller.abort();
      if (pendingUrl) URL.revokeObjectURL(pendingUrl);
      onBusy(false);
    };
  }, [target, enabled, retry]);
  const current = saved?.owner === owner ? saved : null;
  return (
    <div className="processed-preview">
      {current && (
        <img
          src={current.url}
          alt="当前配方处理水面"
          data-project-id={projectId}
          data-recipe-id={recipeId}
          data-source-frame={current.frame}
          data-png-sha256={current.sha256}
        />
      )}
      <p role="status">
        {status}
        {current && current.frame !== frame ? ` · 显示上次成功源帧${current.frame}` : ''}
      </p>
      {error && (
        <>
          <p role="alert">{error}</p>
          <button onClick={() => setRetry((v) => v + 1)} disabled={!enabled}>
            重读处理预览
          </button>
        </>
      )}
    </div>
  );
}
