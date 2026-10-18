import type { AiState } from '@tileset/contracts';
export type Region = { x: number; y: number; width: number; height: number };
/** Explicit user crop, in original candidate pixels. No semantic ROI guessing. */
export function CandidateRegion({
  candidate,
  value,
  onChange,
}: {
  candidate: AiState['candidates'][number];
  value: Region | undefined;
  onChange: (value: Region) => void;
}) {
  const { width, height, url } = candidate;
  if (!width || !height || !url) return null;
  const edge = Math.min(width, height),
    label = candidate.component === 'grass' ? '草地' : '水面';
  const rect = value ?? {
    x: Math.floor((width - edge) / 2),
    y: Math.floor((height - edge) / 2),
    width: edge,
    height: edge,
  };
  const move = (cx: number, cy: number, size = rect.width) =>
    onChange({
      x: Math.max(0, Math.min(width - size, Math.round(cx - size / 2))),
      y: Math.max(0, Math.min(height - size, Math.round(cy - size / 2))),
      width: size,
      height: size,
    });
  return (
    <fieldset aria-label={`${label}转换选区`}>
      <legend>{label}转换选区</legend>
      <label>
        {label}取样范围{' '}
        <input
          aria-label={`${label}取样范围`}
          type="range"
          min={24}
          max={edge}
          step={1}
          value={rect.width}
          onChange={(e) =>
            move(rect.x + rect.width / 2, rect.y + rect.height / 2, Number(e.target.value))
          }
        />
      </label>
      <p>
        {rect.width}×{rect.height}原像素；点击图中目标区域移动方框。键盘可通过方向按钮调整。
      </p>
      <div
        role="img"
        aria-label={`${label}取样图，点击移动选区`}
        style={{
          position: 'relative',
          width: 256,
          height: (256 * height) / width,
          cursor: 'crosshair',
        }}
        onPointerDown={(e) => {
          const bounds = e.currentTarget.getBoundingClientRect();
          move(
            ((e.clientX - bounds.left) * width) / bounds.width,
            ((e.clientY - bounds.top) * height) / bounds.height,
          );
        }}
      >
        <img
          src={url}
          alt={`${label}原始候选选区`}
          width={256}
          height={(256 * height) / width}
          style={{ imageRendering: 'pixelated', display: 'block' }}
          draggable={false}
        />
        <div
          style={{
            position: 'absolute',
            left: `${(rect.x / width) * 100}%`,
            top: `${(rect.y / height) * 100}%`,
            width: `${(rect.width / width) * 100}%`,
            height: `${(rect.height / height) * 100}%`,
            border: '2px solid #ff3434',
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}
        />
      </div>
      <div className="actions">
        {(
          [
            ['左移', -1, 0],
            ['右移', 1, 0],
            ['上移', 0, -1],
            ['下移', 0, 1],
          ] as const
        ).map(([name, x, y]) => (
          <button
            key={name}
            onClick={() => move(rect.x + rect.width / 2 + x, rect.y + rect.height / 2 + y)}
          >
            {label}
            {name}
          </button>
        ))}
        <button
          onClick={() =>
            onChange({
              x: Math.floor((width - edge) / 2),
              y: Math.floor((height - edge) / 2),
              width: edge,
              height: edge,
            })
          }
        >
          {label}恢复默认选区
        </button>
      </div>
    </fieldset>
  );
}
