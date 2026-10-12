# AI Tileset Studio 开发约束

## 步骤 02 工程归属

当前隔离 Coding 候选只实施步骤 02。根目录是 `@tileset/prototype` 工作区成员，保留步骤 01 源码/命令/母版；固定诊断布局不得被当作正式 Compiler/Pack。
`packages/contracts` 唯一拥有 HTTP JSON/Zod/OpenAPI；`packages/ai-gateway` 仅拥有 Provider/Executor/任务/快照契约，不实现真实调用或完整 Mock runner。`apps/api` 拥有 Nest/Express 安全边界和最小 Prisma 项目链路；`apps/web` 仅依赖 contracts，不导入 API、Prisma、Sharp 或供应商。
后续领域/像素模块保持框架无关。模块方向和所有 V1 要求的证据映射见 `docs/engineering/STEP_02_BASELINE.md` 与 `V1_REQUIREMENTS_EVIDENCE.md`；新增包先更新方向检查。生产 Node 只使用构建 JS 与包声明导出，不依赖 TS 源路径别名。
仅使用工作树中独立的 `.local/postgres` / `.env`，不复用其他数据库、MZ 工程或全局运行环境；上传尚未开放，后续必须按 Pixel Contract 验真格式/体积/像素且不接受本地路径。默认模型/Prompt 版本不可无记录变更，任务使用创建时深冻结快照。
步骤 02 发布构建绑定 clean commit/Profile/契约/锁文件/逐文件 SHA，证据单独保存；后续步骤只在最新候选独立 Review 与授权门禁后启动。Coding 不自行批准、合并或推送。`docs/orchestration/steps-02-03-state.json` 由主工作区 Orchestrator 管理，Coding 不修改。

## 步骤 03 当前候选归属

步骤 02 已发布；本轮当前 Coding 仅实施步骤 03。`asset-core` 拥有框架无关领域/不可变版本/硬 IR 校验，仅使用 Node crypto；`material-processing` 仅依赖 asset-core，拥有确定性像素/固定岸线配方；`image-adapter` 拥有有界 PNG/native codec 隔离，不接受服务器路径。新增成员须先登记方向/构建/导出检查。源字节与像素必须独立持有，不得以可变 Buffer 破坏历史快照。正式领域 Built 只表示处理 IR，不能冒充步骤 04 Compiler 或步骤 05 Pack。新元数据/方向/资源政策见 `docs/engineering/STEP_03_BASELINE.md`；原型/Profile/Pixel Contract/母版与旧 manifest 不改写。步骤 03 完成后停止，步骤 04 未授权。

## 2026-10-12 一次性授权覆盖

本轮用户明确授权步骤 01 阶段收尾、步骤 02–03 Coding/独立 Review/整改及通过技术门禁后 Merge/Push。下文的步骤 01 限定与禁止 Merge/Push 在本轮授权范围内由此覆盖；步骤 04–10 仍须新批准。详见 `docs/reviews/step-01-authorization.md` 和 `docs/orchestration/steps-02-03-state.json`。正式代码仅由 `step_coder`（gpt-6.1-sol / xhigh / default）修改，独立审查仅由 `step_reviewer`（gpt-6.1-sol / ultra / default）执行；禁 Fast/Priority/Ultrafast。每步最多 5 轮，P0/P1/阻断 P2 清零且最新候选独立 PASS 后由 Orchestrator 委托验收。步骤 03 发布后停止。

正式基线：完整阅读 docs/plans/01_PRODUCT_TECH_SPEC_V0.5.md 与
docs/plans/02_V1_IMPLEMENTATION_PLAN.md。保留两份文件。

当前仅授权步骤 01。步骤 02–10 必须等用户批准明确的候选 commit 和构建后才开始。
当前目录是独立 TypeScript 原型；不创建正式 Monorepo、Web、数据库、AI Gateway、
槽位分配器或持久化服务，不调用任何付费模型。

- src/profile.ts 拥有此次实验唯一的候选槽位/版本/动画时基；状态不得冒充实机冻结。
- src/compiler.ts 只将合格的 96×144 源样板放入固定诊断布局；不做生产槽位规划。
- src/pixels.ts 拥有步骤 01 所需最小像素规范；不依赖 Web/ORM/供应商。
- scripts/make-fixtures.ts 是独立创作诊断和美术母版，不从编译器生成期望值。
- verify-mz 使用本机正版未修改核心脚本作外部 oracle；不得把相同实现的自测当独立验证。
- 构建绑定源码 commit、Profile、契约和逐文件 SHA-256。发布目录拒绝覆盖。
- 后续实机证据保存为独立记录，引用构建；不修改已发布的 manifest 来加 PASS。
- STRUCTURAL_PASS、视觉确认、编辑器手绘、游戏动画、独立 Review、用户批准分别记录。
- 未执行写 NOT_EXECUTED。必要门禁缺证据时步骤 BLOCKED，不继续下一编号步骤。
- 不得删失败用例/降低阈值/重置母版来掩盖问题。修改候选后按影响重新验证。
- Coding → 自动测试 → 独立 Agent Review → 修复 → 复测 → 用户 Review。
- 不推送、不合并、不覆盖远端分支；提交只在本地 codex/ 分支进行。
- .local/ 中正版 MZ 项目及 runtime 不入库、不对外发布。已有用户工程不可覆盖。

## RPG Maker MZ Runtime Environment

本地 RPG Maker MZ 可能使用升级版 NW.js 和 RPGReactor Runtime。

当任务涉及 MZ 编辑器、Tileset、Autotile、游戏运行时、
Playtest 或真实兼容性验收时，必须先阅读：

`docs/engineering/MZ_RUNTIME_ENVIRONMENT.md`

正式 V1.0 目标仍是原生 MZ。
不得将 RPGReactor 测试结果当作原生兼容性验收。
未经授权不得修改全局 MZ / NW.js 环境。
