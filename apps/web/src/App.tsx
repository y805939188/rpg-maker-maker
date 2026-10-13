import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ComponentSchema, type Project, type Studio, type BuildDetail } from '@tileset/contracts';
import { createProject, listProjects, studio, request, upload, preview } from './api.js';
import { useMemo } from 'react';
import { SourceAnimation } from './SourceAnimation.js';
import { DeliveryPreview } from './DeliveryPreview.js';
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
    [name, setName] = useState(''),
    [id, setId] = useState(localStorage.getItem('studio-project') ?? ''),
    [data, setData] = useState<Studio | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<Record<string, string>>({}),
    [style, setStyle] = useState('component-palette'),
    [recipe, setRecipe] = useState(''),
    [build, setBuild] = useState(''),
    [detail, setDetail] = useState<BuildDetail | null>(null),
    [scene, setScene] = useState('pond'),
    [group, setGroup] = useState(''),
    [density, setDensity] = useState(2),
    [sourceFrame, setSourceFrame] = useState(0);
  const projectRef = useRef(id);
  projectRef.current = id;
  const generation = useRef(0),
    previewGeneration = useRef(0),
    latest = useRef<Studio | null>(null),
    project = projects.find((p) => p.id === id);
  useEffect(() => {
    void listProjects()
      .then(setProjects)
      .catch((e) => setError(String(e)));
  }, []);
  async function refresh(projectId = id, reset = false) {
    const n = ++generation.current;
    const d = await studio(projectId);
    if (n !== generation.current || projectRef.current !== projectId) return;
    if (latest.current?.projectId === d.projectId && latest.current.revision > d.revision) return;
    latest.current = d;
    setData(d);
    setSelected((old) => {
      const next = reset ? {} : { ...old };
      for (const c of ComponentSchema.options)
        if (!next[c]) next[c] = d.sources.find((s) => s.component === c)?.id ?? '';
      return next;
    });
    const adopted = d.recipes.find((r) => r.current);
    setRecipe((old) => (reset || !old ? (adopted?.id ?? '') : old));
    setBuild((old) => (reset || !old ? (d.successfulBuildId ?? '') : old));
  }
  useEffect(() => {
    generation.current++;
    previewGeneration.current++;
    latest.current = null;
    setData(null);
    setDetail(null);
    setSelected({});
    setRecipe('');
    setBuild('');
    setGroup('');
    if (id) {
      localStorage.setItem('studio-project', id);
      void refresh(id, true).catch((e) => setError(String(e)));
    }
  }, [id]);
  useEffect(() => {
    if (!id || !data?.jobs.some((j) => ['QUEUED', 'RUNNING'].includes(j.state))) return;
    const timer = setInterval(() => {
      void refresh(id).catch((e) => setError(String(e)));
    }, 800);
    return () => clearInterval(timer);
  }, [id, data?.jobs]);
  useEffect(() => {
    const n = ++previewGeneration.current;
    setDetail(null);
    if (!id || !build) return;
    const controller = new AbortController();
    void (async () => {
      if (data?.builds.find((b) => b.id === build)?.exportBuildId === null)
        await request(`/api/projects/${id}/builds/${build}/export`, {}, controller.signal);
      return preview(id, build, scene, group, controller.signal);
    })()
      .then((d) => {
        if (n === previewGeneration.current) setDetail(d);
      })
      .catch((e) => {
        if (n === previewGeneration.current && !controller.signal.aborted) setError(String(e));
      });
    return () => controller.abort();
  }, [id, build, scene, group]);
  async function act(fn: () => Promise<void>, message: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(message);
      if (id && projectRef.current === id) await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function create(e: FormEvent) {
    e.preventDefault();
    await act(async () => {
      const p = await createProject({ name });
      setProjects(await listProjects());
      setId(p.id);
      setName('');
    }, '项目已保存。');
  }
  const running = data?.jobs.some((j) => ['QUEUED', 'RUNNING'].includes(j.state)) ?? false;
  const chosenRecipe = data?.recipes.find((r) => r.id === recipe),
    currentBuild = data?.builds.find((b) => b.id === build);
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
        <span className="badge">AI 尚未开放</span>
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
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="春日湖畔"
              />
            </label>
            <button disabled={busy || !name.trim()}>创建项目</button>
          </form>
          <ul aria-label="已保存项目">
            {projects.map((p) => (
              <li key={p.id}>
                <button className={id === p.id ? 'selected' : ''} onClick={() => setId(p.id)}>
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
                        void act(async () => {
                          await request(`/api/projects/${id}/preset`, { family: 'art' });
                          setSelected({});
                        }, '原创美术组件已保存；请选择版本并采用配方。')
                      }
                    >
                      导入原创美术样例
                    </button>
                    <button
                      disabled={busy || running}
                      onClick={() =>
                        void act(async () => {
                          await request(`/api/projects/${id}/preset`, { family: 'diagnostic' });
                          setSelected({});
                          setDensity(1);
                        }, '编号诊断组件已保存。')
                      }
                    >
                      导入编号诊断样例
                    </button>
                    <label>
                      上传逻辑密度
                      <select value={density} onChange={(e) => setDensity(Number(e.target.value))}>
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
                              onChange={(e) =>
                                setSelected((old) => ({ ...old, [c]: e.target.value }))
                              }
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
                                  void act(async () => {
                                    await upload(id, c, density, f);
                                    setSelected((old) => ({ ...old, [c]: '' }));
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
                      <select value={style} onChange={(e) => setStyle(e.target.value)}>
                        <option value="component-palette">采用所选组件的实际调色板</option>
                        <option value="baseline-palette">原创基线调色板（超出即拒绝）</option>
                      </select>
                    </label>
                    <button
                      disabled={
                        busy || running || ComponentSchema.options.some((c) => !selected[c])
                      }
                      onClick={() =>
                        void act(async () => {
                          await request(`/api/projects/${id}/recipe`, {
                            expectedRevision: data.revision,
                            sources: selected,
                            style,
                          });
                          setRecipe('');
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
                          setRecipe(v);
                          const r = data.recipes.find((r) => r.id === v);
                          if (r) setSelected(r.components);
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
                      disabled={busy || running || !chosenRecipe?.current}
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
                        busy || running || !chosenRecipe?.current || !data.successfulBuildId
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
                  {recipe && (
                    <div className="processed">
                      <label>
                        创作源水面状态
                        <select
                          value={sourceFrame}
                          onChange={(e) => setSourceFrame(Number(e.target.value))}
                        >
                          {[0, 1, 2].map((n) => (
                            <option key={n} value={n}>
                              源帧 {n}
                            </option>
                          ))}
                        </select>
                      </label>
                      <img
                        src={`/api/projects/${id}/recipes/${recipe}/processed?frame=${sourceFrame}`}
                        alt="当前配方处理水面"
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
                              setBuild(j.buildId!);
                              setGroup('');
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
                      Mock任务 {t.id.slice(0, 8)} · {t.state} / {t.archiveState} · {t.recovery}
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
                          setBuild(e.target.value);
                          setGroup('');
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
                      <select value={scene} onChange={(e) => setScene(e.target.value)}>
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
                          onChange={(e) => setGroup(e.target.value)}
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
                            void act(async () => {
                              await request(`/api/projects/${id}/builds/${build}/visual`, {
                                confirmed: true,
                              });
                              setDetail(await preview(id, build, scene, group));
                            }, '已记录你的人工视觉确认；本产物 MZ 实测仍未执行。')
                          }
                        >
                          我已检查此产物的视觉效果
                        </button>
                        <button
                          onClick={() =>
                            void act(async () => {
                              await request(`/api/projects/${id}/builds/${build}/visual`, {
                                confirmed: false,
                              });
                              setDetail(await preview(id, build, scene, group));
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
