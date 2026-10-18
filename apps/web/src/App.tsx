import { AiStudioPanel } from './AiStudioPanel.js';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ComponentSchema, type Project, type Studio, type BuildDetail } from '@tileset/contracts';
import { createProject, listProjects, studio, request, upload, preview } from './api.js';
import { useMemo } from 'react';
import { SourceAnimation } from './SourceAnimation.js';
import { DeliveryPreview } from './DeliveryPreview.js';
import { ProcessedPreview } from './ProcessedPreview.js';
import { pollAfterCompletion } from './poll.js';
import { boundedResourceRead } from './resource-read.js';
const names = {
  grass: '草地',
  'water-0': '水面源帧 0',
  'water-1': '水面源帧 1',
  'water-2': '水面源帧 2',
  mask: '固定岸线遮罩',
  overlay: '岸线颜色组件',
};
const scenes = {
  isolated: '孤立格',
  edges: '直边 / 内外角',
  holes: '孔洞',
  channel: '窄通道',
  pond: '池塘',
  large: '大片铺设',
};
export function App() {
  const [projects, setProjects] = useState<Project[]>([]),
    [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>('loading'),
    [listError, setListError] = useState(''),
    [name, setName] = useState(''),
    [id, setId] = useState(localStorage.getItem('studio-project') ?? ''),
    [loadedData, setData] = useState<Studio | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [stateRead, setStateRead] = useState<{
      projectId: string;
      failures: number;
      error: string;
      stopped: boolean;
    } | null>(null),
    [manualReading, setManualReading] = useState(false),
    [selected, setSelected] = useState<Record<string, string>>({}),
    [style, setStyle] = useState('component-palette'),
    [recipe, setRecipe] = useState(''),
    [build, setBuild] = useState(''),
    [detail, setDetail] = useState<BuildDetail | null>(null),
    [previewSettled, setPreviewSettled] = useState(''),
    [processedBusy, setProcessedBusy] = useState(false),
    [scene, setScene] = useState('pond'),
    [group, setGroup] = useState(''),
    [density, setDensity] = useState(2),
    [sourceFrame, setSourceFrame] = useState(0);
  const projectRef = useRef(id);
  projectRef.current = id;
  const projectGeneration = useRef(0),
    selectionGeneration = useRef(0),
    actionGeneration = useRef(0),
    listGeneration = useRef(0),
    listRead = useRef<AbortController | null>(null);
  function changeSelection(change: () => void) {
    selectionGeneration.current++;
    change();
  }
  function selectProject(next: string) {
    if (projectRef.current === next) return;
    projectGeneration.current++;
    selectionGeneration.current++;
    actionGeneration.current++;
    projectRef.current = next;
    setBusy(false);
    setError('');
    setNotice('');
    setId(next);
  }
  const generation = useRef(0),
    refreshInFlight = useRef<{
      projectId: string;
      n: number;
      controller: AbortController;
      promise: Promise<void>;
    } | null>(null),
    previewGeneration = useRef(0),
    latest = useRef<Studio | null>(null),
    project = projects.find((p) => p.id === id),
    data = loadedData?.projectId === id ? loadedData : null,
    chosenRecipe = data?.recipes.find((r) => r.id === recipe),
    currentBuild = data?.builds.find((b) => b.id === build),
    running = data?.jobs.some((j) => ['QUEUED', 'RUNNING'].includes(j.state)) ?? false,
    previewKey = `${id}/${build}/${scene}/${group}`,
    previewBusy = Boolean(currentBuild && previewSettled !== previewKey);
  async function refreshProjects() {
    listRead.current?.abort();
    const n = ++listGeneration.current,
      controller = new AbortController();
    listRead.current = controller;
    setListStatus('loading');
    setListError('');
    const timer = setTimeout(() => controller.abort(Error('列表读取超过60秒预算。')), 60000);
    try {
      // Disposed StrictMode setup must not start a replaced list request.
      await Promise.resolve();
      controller.signal.throwIfAborted();
      const rows = await listProjects(controller.signal);
      if (n === listGeneration.current && !controller.signal.aborted) {
        setProjects(rows);
        setListStatus('ready');
      }
    } catch (error) {
      if (n === listGeneration.current) {
        setListError(error instanceof Error ? error.message : String(error));
        setListStatus('error');
      }
    } finally {
      clearTimeout(timer);
      if (n === listGeneration.current) listRead.current = null;
    }
  }
  useEffect(() => {
    void refreshProjects();
    return () => {
      listGeneration.current++;
      listRead.current?.abort();
    };
  }, []);
  async function refresh(projectId = id, reset = false, parent?: AbortSignal, select = true) {
    const existing = refreshInFlight.current;
    if (existing?.projectId === projectId && !existing.controller.signal.aborted)
      return existing.promise;
    const n = ++generation.current;
    const selection = selectionGeneration.current;
    const controller = new AbortController(),
      cancel = () => controller.abort(parent?.reason);
    parent?.addEventListener('abort', cancel, { once: true });
    if (parent?.aborted) cancel();
    const timer = setTimeout(
      () => controller.abort(new Error('项目读取超过60秒预算，请检查本地服务；上一成功数据保留。')),
      60000,
    );
    const promise = (async () => {
      const d = await studio(projectId, controller.signal);
      if (n !== generation.current || projectRef.current !== projectId) return;
      if (latest.current?.projectId === d.projectId && latest.current.revision > d.revision) return;
      latest.current = d;
      setData(d);
      if (!select || selection !== selectionGeneration.current) return;
      setSelected((old) => {
        if (selection !== selectionGeneration.current) return old;
        const next = reset ? {} : { ...old };
        for (const c of ComponentSchema.options)
          if (!next[c]) next[c] = d.sources.find((s) => s.component === c)?.id ?? '';
        return next;
      });
      const adopted = d.recipes.find((r) => r.current);
      setRecipe((old) =>
        selection === selectionGeneration.current && (reset || !old) ? (adopted?.id ?? '') : old,
      );
      setBuild((old) =>
        selection === selectionGeneration.current && (reset || !old)
          ? (d.successfulBuildId ?? '')
          : old,
      );
    })().finally(() => {
      clearTimeout(timer);
      parent?.removeEventListener('abort', cancel);
      if (refreshInFlight.current?.n === n) refreshInFlight.current = null;
    });
    refreshInFlight.current = { projectId, n, controller, promise };
    return promise;
  }
  useEffect(() => {
    refreshInFlight.current?.controller.abort();
    generation.current++;
    previewGeneration.current++;
    latest.current = null;
    setData(null);
    setDetail(null);
    setPreviewSettled('');
    setSelected({});
    setRecipe('');
    setBuild('');
    setGroup('');
    setStateRead(null);
    setManualReading(false);
    if (id) {
      const controller = new AbortController();
      localStorage.setItem('studio-project', id);
      void refresh(id, true, controller.signal).catch((e) => {
        if (!controller.signal.aborted && projectRef.current === id) setError(String(e));
      });
      return () => controller.abort();
    }
  }, [id]);
  useEffect(() => {
    if (!id || !running || data?.projectId !== id || stateRead?.stopped) return;
    const controller = new AbortController();
    const stop = pollAfterCompletion(
      (signal) => refresh(id, false, signal),
      controller.signal,
      800,
      {
        onError: ({ error, failures }) => {
          if (!controller.signal.aborted && projectRef.current === id)
            setStateRead({ projectId: id, failures, error: String(error), stopped: false });
        },
        onRecovered: () => {
          if (!controller.signal.aborted && projectRef.current === id) setStateRead(null);
        },
        onStopped: ({ error, failures }) => {
          if (!controller.signal.aborted && projectRef.current === id)
            setStateRead({ projectId: id, failures, error: String(error), stopped: true });
        },
      },
    );
    return () => {
      controller.abort();
      stop();
    };
  }, [id, data?.projectId, running, Boolean(stateRead?.stopped)]);
  useEffect(() => {
    const n = ++previewGeneration.current;
    const selection = selectionGeneration.current;
    setDetail(null);
    setPreviewSettled('');
    if (!id || !data || !currentBuild) return;
    const controller = new AbortController();
    let conversionNeeded = currentBuild.exportBuildId === null;
    void boundedResourceRead(
      async (signal) => {
        if (conversionNeeded) {
          await request(`/api/projects/${id}/builds/${build}/export`, {}, signal);
          conversionNeeded = false;
        }
        return preview(id, build, scene, group, signal);
      },
      controller.signal,
      (attempt) => {
        if (
          n === previewGeneration.current &&
          projectRef.current === id &&
          selection === selectionGeneration.current
        )
          setNotice(`交付读取槽忙，正在有界恢复（${attempt + 1}/5）。`);
      },
    )
      .then((d) => {
        if (
          n === previewGeneration.current &&
          projectRef.current === id &&
          !controller.signal.aborted
        ) {
          setDetail(d);
          setPreviewSettled(previewKey);
          setNotice((old) => (old.startsWith('交付读取槽忙') ? '' : old));
        }
      })
      .catch((e) => {
        if (
          n === previewGeneration.current &&
          projectRef.current === id &&
          !controller.signal.aborted
        ) {
          if (selection === selectionGeneration.current) setError(String(e));
          setPreviewSettled(previewKey);
          setNotice((old) => (old.startsWith('交付读取槽忙') ? '' : old));
        }
      });
    return () => controller.abort();
  }, [id, build, scene, group, data?.projectId, currentBuild?.id]);
  async function act(fn: (scope: { current: () => boolean }) => Promise<void>, message: string) {
    const projectId = id,
      projectEpoch = projectGeneration.current,
      selectionEpoch = selectionGeneration.current,
      action = ++actionGeneration.current;
    const owned = () =>
      projectRef.current === projectId &&
      projectGeneration.current === projectEpoch &&
      actionGeneration.current === action;
    const current = () => owned() && selectionGeneration.current === selectionEpoch;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn({ current });
      if (current()) setNotice(message);
      if (projectId && owned()) await refresh(projectId, false, undefined, current());
    } catch (e) {
      if (current()) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (owned()) setBusy(false);
    }
  }
  async function rereadState() {
    const projectId = id,
      epoch = projectGeneration.current;
    const current = () => projectRef.current === projectId && projectGeneration.current === epoch;
    setManualReading(true);
    try {
      await refresh(projectId);
      if (current()) {
        setStateRead(null);
        setError('');
      }
    } catch (error) {
      if (current()) setStateRead({ projectId, failures: 1, error: String(error), stopped: true });
    } finally {
      if (current()) setManualReading(false);
    }
  }
  async function create(e: FormEvent) {
    e.preventDefault();
    await act(async (scope) => {
      const p = await createProject({ name });
      if (!scope.current()) return;
      await refreshProjects();
      if (!scope.current()) return;
      selectProject(p.id);
      setName('');
      setNotice('项目已保存。');
    }, '项目已保存。');
  }
  const sourceUrlKey = [0, 1, 2]
    .map((n) => data?.sources.find((s) => s.id === selected[`water-${n}`])?.url ?? '')
    .join('|');
  const sourceUrls = useMemo(() => sourceUrlKey.split('|'), [sourceUrlKey]);
  return (
    <main>
      <header>
        <div>
          <span className="eyebrow">V0.1 · 人工素材工作台</span>
          <h1>AI Tileset Studio</h1>
          <p>导入基础纹理，固定草地—水面岸线，预览并下载原生 MZ 素材包。</p>
        </div>
        <span className="badge">AI 整套创作</span>
      </header>
      <div className="layout">
        <aside>
          <h2>项目</h2>
          <form onSubmit={(e) => void create(e)}>
            <label>
              项目名称
              <input
                value={name}
                maxLength={80}
                onChange={(e) => changeSelection(() => setName(e.target.value))}
                required
                placeholder="春日湖畔"
              />
            </label>
            <button disabled={busy || !name.trim()}>创建项目</button>
          </form>
          {listStatus === 'loading' && <p role="status">正在读取已保存项目…</p>}
          {listStatus === 'ready' && !projects.length && <p role="status">尚无项目，请创建。</p>}
          {listStatus === 'error' && (
            <p role="alert">项目列表读取失败：{listError} 已保留此前加载的项目；可只读重读。</p>
          )}
          <button disabled={listStatus === 'loading'} onClick={() => void refreshProjects()}>
            重读项目列表
          </button>
          <ul aria-label="已保存项目">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  className={id === p.id ? 'selected' : ''}
                  onClick={() => selectProject(p.id)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
          <p className="muted">
            目标固定：MZ 1.10.0 / Area / 48px。无需密钥、模型选择或手工整理图集。
          </p>
        </aside>
        <div className="studio-content">
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          {stateRead?.projectId === id && (
            <div className="alert" role="alert">
              <p>
                项目状态读取失败／未知 · 连续失败{stateRead.failures}次。
                {stateRead.stopped
                  ? '自动读取已停止（最多5次连续失败／60秒共享预算）；保留上次成功，未重新提交任务。'
                  : '正在有界读取恢复；保留上次成功。'}
                {stateRead.error}
              </p>
              {stateRead.stopped && (
                <button disabled={manualReading} onClick={() => void rereadState()}>
                  {manualReading ? '正在只读重读…' : '只读重读项目状态'}
                </button>
              )}
            </div>
          )}
          {id && !data && <p role="status">正在读取所选项目…</p>}
          {!id ? (
            <section>
              <h2>从一个项目开始</h2>
              <p>
                创建或选择项目，然后导入六个 PNG 源组件。也可使用原创美术 /
                编号诊断样例练习完整流程。
              </p>
              <p role="status">画布已就绪 · 选择素材后显示实际产物</p>
            </section>
          ) : (
            data && (
              <>
                <AiStudioPanel
                  key={id}
                  projectId={id}
                  revision={data.revision}
                  blocked={busy || running || previewBusy || processedBusy}
                  onRefresh={() => refresh(id, true)}
                />
                <section>
                  <div className="section-title">
                    <h2>{project?.name ?? '项目'} · 创作素材</h2>
                    <span>
                      采用版本 {data.revision} {data.needsRebuild ? '· 当前配套待重建' : ''}
                    </span>
                  </div>
                  <p>
                    合格源：单图 RGBA8 sRGB PNG，96×144，透明像素
                    RGB=0。选择真实逻辑密度；不自动裁切、缩放或转换。
                  </p>
                  <div className="toolbar">
                    <button
                      disabled={busy || running}
                      onClick={() =>
                        void act(async (scope) => {
                          await request(`/api/projects/${id}/preset`, { family: 'art' });
                          if (scope.current()) setSelected({});
                        }, '原创美术组件已保存；请选择版本并采用配方。')
                      }
                    >
                      导入原创美术样例
                    </button>
                    <button
                      disabled={busy || running}
                      onClick={() =>
                        void act(async (scope) => {
                          await request(`/api/projects/${id}/preset`, { family: 'diagnostic' });
                          if (scope.current()) {
                            setSelected({});
                            setDensity(1);
                          }
                        }, '编号诊断组件已保存。')
                      }
                    >
                      导入编号诊断样例
                    </button>
                    <label>
                      上传逻辑密度
                      <select
                        value={density}
                        onChange={(e) => changeSelection(() => setDensity(Number(e.target.value)))}
                      >
                        <option value={2}>2px 像素美术</option>
                        <option value={1}>1px 方向诊断</option>
                      </select>
                    </label>
                  </div>
                  <div className="components">
                    {ComponentSchema.options.map((c) => {
                      const s = data.sources.find((s) => s.id === selected[c]);
                      return (
                        <article key={c}>
                          <h3>{names[c]}</h3>
                          <label>
                            {names[c]}精确版本
                            <select
                              value={selected[c] ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                changeSelection(() =>
                                  setSelected((old) => ({ ...old, [c]: value })),
                                );
                              }}
                            >
                              <option value="">选择源版本</option>
                              {data.sources
                                .filter((s) => s.component === c)
                                .map((s) => (
                                  <option key={s.id} value={s.id}>
                                    revision {s.revision} · 密度{s.density} · {s.sha256.slice(0, 8)}
                                  </option>
                                ))}
                            </select>
                          </label>
                          {s ? (
                            <img className="source-image" src={s.url} alt={`${names[c]}原始 PNG`} />
                          ) : (
                            <div className="source-empty">尚未导入</div>
                          )}
                          <label className="upload">
                            替换 / 导入 PNG
                            <input
                              type="file"
                              accept="image/png"
                              aria-label={`上传${names[c]}`}
                              disabled={busy || running}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f)
                                  void act(async (scope) => {
                                    await upload(id, c, density, f);
                                    if (scope.current())
                                      setSelected((old) =>
                                        scope.current() ? { ...old, [c]: '' } : old,
                                      );
                                  }, `${names[c]}新 revision 已保存，历史不会改变。`);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </article>
                      );
                    })}
                  </div>
                  <div className="toolbar">
                    <label>
                      风格约束
                      <select
                        value={style}
                        onChange={(e) => changeSelection(() => setStyle(e.target.value))}
                      >
                        <option value="component-palette">采用所选组件的实际调色板</option>
                        <option value="baseline-palette">原创基线调色板（超出即拒绝）</option>
                      </select>
                    </label>
                    <button
                      disabled={
                        busy || running || ComponentSchema.options.some((c) => !selected[c])
                      }
                      onClick={() =>
                        void act(async (scope) => {
                          await request(`/api/projects/${id}/recipe`, {
                            expectedRevision: data.revision,
                            sources: selected,
                            style,
                          });
                          if (scope.current()) setRecipe('');
                        }, '固定岸线配方已验证并采用；请构建当前配套。')
                      }
                    >
                      验证并采用固定岸线配方
                    </button>
                  </div>
                </section>
                <section>
                  <h2>处理与构建</h2>
                  {sourceUrls.every(Boolean) && (
                    <SourceAnimation urls={sourceUrls} animation={data.animation} />
                  )}
                  <div className="toolbar">
                    <label>
                      精确配方 revision
                      <select
                        value={recipe}
                        onChange={(e) => {
                          const v = e.target.value;
                          changeSelection(() => {
                            setRecipe(v);
                            const r = data.recipes.find((r) => r.id === v);
                            if (r) setSelected(r.components);
                          });
                        }}
                      >
                        <option value="">请选择配方</option>
                        {data.recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            recipe@{r.revision} {r.current ? '· 当前采用' : '· 历史'}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      disabled={
                        busy || running || previewBusy || processedBusy || !chosenRecipe?.current
                      }
                      onClick={() =>
                        void act(async () => {
                          await request(`/api/projects/${id}/builds`, {
                            recipeId: recipe,
                            expectedRevision: data.revision,
                            mode: 'update',
                          });
                        }, '构建已排入本地任务；完成后从历史选择实际结果。')
                      }
                    >
                      构建当前配套
                    </button>
                    <button
                      disabled={
                        busy ||
                        running ||
                        previewBusy ||
                        processedBusy ||
                        !chosenRecipe?.current ||
                        !data.successfulBuildId
                      }
                      onClick={() =>
                        void act(async () => {
                          await request(`/api/projects/${id}/builds`, {
                            recipeId: recipe,
                            expectedRevision: data.revision,
                            mode: 'retire-and-add',
                          });
                        }, '将保留旧组画面与槽位，并尝试分配第二组。')
                      }
                    >
                      退役旧组并建立第二组
                    </button>
                  </div>
                  {chosenRecipe && (
                    <div className="processed">
                      <label>
                        创作源水面状态
                        <select
                          value={sourceFrame}
                          onChange={(e) =>
                            changeSelection(() => setSourceFrame(Number(e.target.value)))
                          }
                        >
                          {[0, 1, 2].map((n) => (
                            <option key={n} value={n}>
                              源帧 {n}
                            </option>
                          ))}
                        </select>
                      </label>
                      <ProcessedPreview
                        projectId={id}
                        recipeId={recipe}
                        frame={sourceFrame}
                        enabled={!previewBusy}
                        onBusy={setProcessedBusy}
                      />
                      <p>
                        创作预览：实际保存的源组件与当前处理素材。此处用于检查组件；下面的交付预览读取完成构建的正式图集。
                      </p>
                    </div>
                  )}
                  <ul aria-label="构建任务">
                    {data.jobs.map((j) => (
                      <li key={j.id}>
                        <strong>
                          {j.state === 'COMPLETED'
                            ? '完成'
                            : j.state === 'FAILED'
                              ? '失败'
                              : stateRead?.projectId === id
                                ? '状态未知（上次读取未完成）'
                                : j.state === 'RUNNING'
                                  ? '正在构建'
                                  : '等待构建'}
                        </strong>{' '}
                        · {j.id.slice(0, 8)}{' '}
                        {j.diagnostic && (
                          <p role="alert">
                            {j.diagnostic.message} {j.diagnostic.recovery}
                          </p>
                        )}
                        {j.buildId && (
                          <button
                            onClick={() => {
                              changeSelection(() => {
                                setBuild(j.buildId!);
                                setGroup('');
                              });
                            }}
                          >
                            查看这次实际构建
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {data.mockTasks.map((t) => (
                    <p key={t.id}>
                      AI任务 {t.id.slice(0, 8)} · {t.state} / {t.archiveState} · {t.recovery}
                    </p>
                  ))}
                </section>
                <section>
                  <div className="section-title">
                    <h2>交付预览与构建历史</h2>
                    <span>{currentBuild?.current ? '当前成功构建' : '历史构建'}</span>
                  </div>
                  <div className="toolbar">
                    <label>
                      实际构建
                      <select
                        value={build}
                        onChange={(e) => {
                          const value = e.target.value;
                          changeSelection(() => {
                            setBuild(value);
                            setGroup('');
                          });
                        }}
                      >
                        <option value="">选择实际构建</option>
                        {data.builds.map((b) => (
                          <option key={b.id} value={b.id}>
                            Pack v{b.version} · {b.id.slice(0, 10)}{' '}
                            {b.current ? '· current' : '· history'} · {b.publication}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      检查场景
                      <select
                        value={scene}
                        onChange={(e) => changeSelection(() => setScene(e.target.value))}
                      >
                        {Object.entries(scenes).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    {detail && (
                      <label>
                        素材组
                        <select
                          value={
                            group ||
                            detail.descriptor.groups.find((g) => g.state === 'ACTIVE')?.logicalId ||
                            detail.descriptor.groups[0]?.logicalId
                          }
                          onChange={(e) => changeSelection(() => setGroup(e.target.value))}
                        >
                          {detail.descriptor.groups.map((g) => (
                            <option key={g.logicalId} value={g.logicalId}>
                              {g.logicalId} · {g.state}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  {detail &&
                  detail.descriptor.buildId === build &&
                  detail.descriptor.scene === scene &&
                  (!group || detail.descriptor.group === group) ? (
                    <>
                      <p className="build-binding">
                        Build {build.slice(0, 16)} · Export {detail.descriptor.exportBuildId} ·
                        Manifest {detail.descriptor.manifestSha.slice(0, 16)}
                      </p>
                      <DeliveryPreview descriptor={detail.descriptor} />
                      <a
                        className="download"
                        href={`/api/projects/${id}/builds/${build}/download`}
                        download
                      >
                        下载此构建的标准 MZ 素材包 ZIP
                      </a>
                      <p>
                        内含 A1/A2、Manifest（完整 TargetProfile）、Pack、历史、布局、源归档与
                        INSTALL；预览和下载来自同一选定 Export。
                      </p>
                      <h3>QA 与验收状态</h3>
                      <div className="qa-status">
                        <span>结构：{detail.qa.structural}</span>
                        <span>Profile：已有阶段实测基线</span>
                        <span>本产物 MZ：{detail.qa.artifactMz}</span>
                        <span>人工视觉：{detail.qa.visual}</span>
                      </div>
                      <p className="muted">{detail.qa.limits}</p>
                      <ul>
                        {detail.qa.risks.map((r, n) => (
                          <li key={n}>
                            {r.code} · {r.location} · {r.metric.toFixed(3)}（阈值 {r.threshold}）：
                            {r.message}
                          </li>
                        ))}
                      </ul>
                      {!detail.qa.risks.length && (
                        <p>未触发当前启发式风险；请继续人工检查边角、重复与动画。</p>
                      )}
                      <div className="toolbar">
                        <button
                          onClick={() =>
                            void act(async (scope) => {
                              await request(`/api/projects/${id}/builds/${build}/visual`, {
                                confirmed: true,
                              });
                              if (!scope.current()) return;
                              const result = await preview(id, build, scene, group);
                              if (scope.current()) setDetail(result);
                            }, '已记录你的人工视觉确认；本产物 MZ 实测仍未执行。')
                          }
                        >
                          我已检查此产物的视觉效果
                        </button>
                        <button
                          onClick={() =>
                            void act(async (scope) => {
                              await request(`/api/projects/${id}/builds/${build}/visual`, {
                                confirmed: false,
                              });
                              if (!scope.current()) return;
                              const result = await preview(id, build, scene, group);
                              if (scope.current()) setDetail(result);
                            }, '已记录需修复；替换组件为新版本，再采用配方并重建。')
                          }
                        >
                          视觉需修复
                        </button>
                      </div>
                    </>
                  ) : (
                    <p role="status">
                      {build
                        ? '正在验真并读取实际 Export…'
                        : '构建成功后选择结果，查看拼接与动画。'}
                    </p>
                  )}
                </section>
              </>
            )
          )}
        </div>
      </div>
    </main>
  );
}
