import { useEffect, useRef, useState } from 'react';
import {
  AiStateSchema,
  AiCreatedSchema,
  AiAppliedSchema,
  AiReferenceSchema,
  StudioSchema,
  WRITE_HEADER,
  WRITE_HEADER_VALUE,
  type AiState,
} from '@tileset/contracts';
import { request, responseError } from './api.js';
import { pollAfterCompletion } from './poll.js';
import { CandidateRegion, type Region } from './CandidateRegion.js';
export function AiStudioPanel({
  projectId,
  revision,
  onRefresh,
  blocked,
}: {
  projectId: string;
  revision: number;
  onRefresh: () => Promise<void>;
  blocked: boolean;
}) {
  const [state, setState] = useState<AiState | null>(null),
    [supplemental, setSupplemental] = useState(''),
    [style, setStyle] = useState('temperate-pixel'),
    [reference, setReference] = useState(''),
    [referenceInfo, setReferenceInfo] = useState(''),
    [grass, setGrass] = useState(''),
    [water, setWater] = useState(''),
    [regions, setRegions] = useState<Record<string, Region>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [job, setJob] = useState('');
  const scope = useRef(projectId);
  scope.current = projectId;
  const running =
    state?.candidates.some(
      (c) =>
        !['COMPLETED', 'FAILED', 'CANCELLED_LOCAL', 'SUBMISSION_UNKNOWN'].includes(c.state) &&
        c.archiveState !== 'RETRY_REQUIRED',
    ) ?? false;
  async function read(signal?: AbortSignal) {
    const d = AiStateSchema.parse(
      await request(`/api/projects/${projectId}/ai`, undefined, signal),
    );
    if (scope.current === projectId && !signal?.aborted) setState(d);
  }
  useEffect(() => {
    setState(null);
    setReference('');
    setReferenceInfo('');
    setGrass('');
    setWater('');
    setRegions({});
    setError('');
    setNotice('');
    setJob('');
    const c = new AbortController();
    void read(c.signal).catch((e) => {
      if (!c.signal.aborted) setError(String(e));
    });
    return () => c.abort();
  }, [projectId]);
  useEffect(() => {
    if (!running && !job) return;
    const c = new AbortController();
    const started = Date.now();
    const stop = pollAfterCompletion(
      async (signal) => {
        if (Date.now() - started > 180000)
          throw Error('AI自动查询已达3分钟预算；仅手动恢复原任务，不自动重提。');
        await read(signal);
        if (job) {
          const d = StudioSchema.parse(
            await request(`/api/projects/${projectId}/studio`, undefined, signal),
          );
          const result = d.jobs.find((j) => j.id === job);
          if (
            result &&
            ['COMPLETED', 'FAILED'].includes(result.state) &&
            !signal.aborted &&
            scope.current === projectId
          ) {
            setJob('');
            await onRefresh();
            setNotice(
              result.state === 'COMPLETED'
                ? '完整 Pack 已构建并通过结构检查；下方交付预览和下载读取同一实际构建。'
                : (result.diagnostic?.message ?? '构建失败，旧成功保留。'),
            );
          }
        }
      },
      c.signal,
      1000,
      {
        onStopped: ({ error }) => {
          if (!c.signal.aborted) setError(`轮询停止：${String(error)}；可手动刷新恢复。`);
        },
      },
    );
    return () => {
      c.abort();
      stop();
    };
  }, [projectId, running, job]);
  async function act(fn: () => Promise<void>) {
    const p = projectId;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      if (scope.current === p) await read();
    } catch (e) {
      if (scope.current === p) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (scope.current === p) setBusy(false);
    }
  }
  async function create(repair?: 'grass' | 'water') {
    await act(async () => {
      AiCreatedSchema.parse(
        await request(`/api/projects/${projectId}/ai/create`, {
          expectedRevision: revision,
          supplemental,
          style,
          ...(reference ? { referenceId: reference } : {}),
          ...(repair ? { repair } : {}),
        }),
      );
      setNotice(
        repair
          ? '已创建选定组件修复任务；未选组件与固定岸线保留。'
          : '已创建草地与共享水面基础任务；归档完成后选择候选生成完整Pack。',
      );
    });
  }
  const candidates =
    state?.candidates.filter(
      (c) => c.state === 'COMPLETED' && !c.discarded && c.errorCode !== 'CANDIDATE_UNUSABLE',
    ) ?? [];
  return (
    <section aria-label="AI 整套创作">
      <h2>AI 草地 + 动态水面 Pack</h2>
      <p>
        {state?.mode === 'mock'
          ? '当前为 Mock 合成模式（零付费），不能作为真实AI或美术验收。'
          : state?.mode === 'wavespeed'
            ? '真实 Provider 模式；文字和参考图将发送给 WaveSpeed，提交受步骤09共享预算限制。'
            : '正在读取后端创作配置…'}
      </p>
      <label>
        补充描述（可选）
        <textarea
          value={supplemental}
          maxLength={600}
          onChange={(e) => setSupplemental(e.target.value)}
          placeholder="可留空；也可填写颜色、材质、纹理等偏好"
        />
      </label>
      <label>
        风格
        <select value={style} onChange={(e) => setStyle(e.target.value)}>
          <option value="temperate-pixel">明快像素</option>
          <option value="muted-pixel">柔和像素</option>
        </select>
      </label>
      <label>
        参考图（可选 PNG）
        <input
          type="file"
          accept="image/png"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void act(async () => {
              const response = await fetch(`/api/projects/${projectId}/ai/reference/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'image/png', [WRITE_HEADER]: WRITE_HEADER_VALUE },
                body: file,
              });
              const body: unknown = await response.json();
              if (!response.ok) throw responseError(response, body);
              const saved = AiReferenceSchema.parse(body);
              setReference(saved.id);
              setReferenceInfo(
                `${saved.width}×${saved.height}，原图已保留；中心等比裁切到方形后准备256×256，边缘与细节可能损失。`,
              );
            });
          }}
        />
      </label>
      {reference && (
        <p>
          已上传参考：{referenceInfo}{' '}
          <button
            onClick={() => {
              setReference('');
              setReferenceInfo('');
            }}
          >
            使用默认文字创作
          </button>
        </p>
      )}
      <div className="actions">
        <button
          disabled={busy || blocked || running || state?.mode === 'disabled'}
          onClick={() => void create()}
        >
          {reference ? '参考图生成完整素材候选' : '默认文字生成完整素材候选'}
        </button>
        <button disabled={busy} onClick={() => void act(() => read())}>
          刷新 AI 状态
        </button>
      </div>
      <p>{state?.limits}</p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <label>
        草地候选
        <select aria-label="草地候选" value={grass} onChange={(e) => setGrass(e.target.value)}>
          <option value="">保留当前草地</option>
          {candidates
            .filter((c) => c.component === 'grass')
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.mode === 'text' ? '文字' : '参考'} / {c.purpose} / {c.id.slice(0, 8)}
              </option>
            ))}
        </select>
      </label>
      <label>
        水面共享基础候选
        <select aria-label="水面候选" value={water} onChange={(e) => setWater(e.target.value)}>
          <option value="">保留当前水面</option>
          {candidates
            .filter((c) => c.component === 'water')
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.mode === 'text' ? '文字' : '参考'} / {c.purpose} / {c.id.slice(0, 8)}
              </option>
            ))}
        </select>
      </label>
      <p>
        默认取中心最大方形；可先缩小方框，再点击候选中的连续材质区域。草地和水面共同提取最多64色；不会自动识别并删除场景物体。选区、原图及转换版本随新revision保存，旧构建保留。整套采用新的双候选时从新草地捕获岸线颜色；局部修复保留原固定岸线。
      </p>
      {(['grass', 'water'] as const).map((component) => {
        const id = component === 'grass' ? grass : water,
          candidate = candidates.find((c) => c.id === id);
        return candidate ? (
          <CandidateRegion
            key={id}
            candidate={candidate}
            value={regions[id]}
            onChange={(region) => setRegions((previous) => ({ ...previous, [id]: region }))}
          />
        ) : null;
      })}
      <div className="actions">
        <button
          disabled={busy || blocked || (!grass && !water) || !!job}
          onClick={() =>
            void act(async () => {
              const result = AiAppliedSchema.parse(
                await request(`/api/projects/${projectId}/ai/apply`, {
                  expectedRevision: revision,
                  ...(grass ? { grassTask: grass } : {}),
                  ...(water ? { waterTask: water } : {}),
                  ...(grass && regions[grass] ? { grassRegion: regions[grass] } : {}),
                  ...(water && regions[water] ? { waterRegion: regions[water] } : {}),
                }),
              );
              setJob(result.job.id);
              setGrass('');
              setWater('');
              await onRefresh();
              setNotice('规范化与配方已采用，正在编译完整 Pack；构建成功后才可交付。');
            })
          }
        >
          选择候选并构建完整 Pack
        </button>
        <button disabled={busy || blocked || running} onClick={() => void create('grass')}>
          局部修复草地
        </button>
        <button disabled={busy || blocked || running} onClick={() => void create('water')}>
          局部修复水面
        </button>
      </div>
      <div className="ai-candidates">
        {state?.candidates.map((c) => (
          <article key={c.id}>
            <strong>
              {c.component === 'grass' ? '草地' : '水面共享基础'} {c.id.slice(0, 8)}
            </strong>
            <p>
              {c.state} / {c.archiveState}
              {c.discarded ? ' / 已丢弃' : ''} {c.errorCode}
            </p>
            {c.url && (
              <img
                src={c.url}
                alt={`${c.component} 原始AI候选 ${c.id.slice(0, 8)}`}
                width="128"
                height="128"
                style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
              />
            )}
            <p>{c.recovery}</p>
            <div className="actions">
              <button
                disabled={busy || c.state === 'SUBMISSION_UNKNOWN'}
                onClick={() =>
                  void act(async () => {
                    await request(`/api/projects/${projectId}/ai/action`, {
                      taskId: c.id,
                      action: 'resume',
                    });
                  })
                }
              >
                恢复原任务
              </button>
              <button
                disabled={busy || ['COMPLETED', 'CANCELLED_LOCAL'].includes(c.state)}
                onClick={() =>
                  void act(async () => {
                    await request(`/api/projects/${projectId}/ai/action`, {
                      taskId: c.id,
                      action: 'cancel',
                    });
                  })
                }
              >
                本地取消
              </button>
              <button
                disabled={busy || c.discarded || c.state !== 'COMPLETED'}
                onClick={() =>
                  void act(async () => {
                    await request(`/api/projects/${projectId}/ai/action`, {
                      taskId: c.id,
                      action: 'discard',
                    });
                  })
                }
              >
                丢弃候选
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
