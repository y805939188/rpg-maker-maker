import { useEffect, useState, type FormEvent } from 'react';
import type { Project } from '@tileset/contracts';
import { createProject, listProjects } from './api.js';
import { CanvasShell } from './CanvasShell.js';

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void listProjects()
      .then((items) => {
        if (active) setProjects(items);
      })
      .catch(() => {
        if (active) setError('无法读取项目，请检查本地服务。');
      });
    return () => {
      active = false;
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createProject({ name });
      setProjects(await listProjects());
      setName('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建项目失败。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <header>
        <span className="eyebrow">本地素材工作室 · 工程预览</span>
        <h1>AI Tileset Studio</h1>
        <p>为 RPG Maker MZ 制作草地、水面与岸线。当前版本提供项目保存与画布基础。</p>
      </header>
      <div className="workspace">
        <section aria-labelledby="projects-title">
          <h2 id="projects-title">项目</h2>
          <form
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <label htmlFor="project-name">项目名称</label>
            <input
              id="project-name"
              value={name}
              maxLength={80}
              required
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：春日湖畔"
            />
            <button disabled={busy || !name.trim()}>{busy ? '保存中…' : '创建项目'}</button>
          </form>
          {error && <p role="alert">{error}</p>}
          <ul aria-label="已保存项目">
            {projects.map((project) => (
              <li key={project.id}>
                <strong>{project.name}</strong>
                <small>{new Date(project.createdAt).toLocaleString('zh-CN')}</small>
              </li>
            ))}
          </ul>
          {projects.length === 0 && <p className="muted">创建项目后会显示在这里。</p>}
        </section>
        <section aria-labelledby="canvas-title">
          <h2 id="canvas-title">素材画布</h2>
          <CanvasShell />
          <p className="muted">导入、编译、动画及 AI 创作将在后续版本开放。</p>
        </section>
      </div>
    </main>
  );
}
