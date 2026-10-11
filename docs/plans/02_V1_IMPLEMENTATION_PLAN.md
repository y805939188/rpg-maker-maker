# AI Tileset Studio — V1.0 十步开发与 Review 执行计划

**依据**：[V0.5 完整方案](./01_PRODUCT_TECH_SPEC_V0.5.md)（方案级通过）  
**状态**：执行计划已通过 Review；仅允许按授权启动步骤 01，不得自动推进步骤 02–10。**本次入库只创建文档，不启动代码开发。**  
**终点**：完成整个 V1.0 本地素材生产产品，而不是只交付 V0.0 原型。

## A. 所有步骤适用的硬性 Review 门禁

每步流程：**实现 → 自动化测试 → 独立 Agent Review（如能安排）→ 提交绑定版本的代码及证据 → 用户 Review → 根据意见修复并复测 → 用户明确批准 → 下一编号步骤**。固定十步，不把任务人为拆成几十个审批节点；当前步骤内部可细分或并行。

必须同时满足**技术门禁有真实 PASS 证据**与**用户批准指定候选版本**。每步报告包括受测分支和 commit SHA、Profile/契约版本、构建 ID/哈希、实际命令与结果、MZ 手工验收证据（未做写 NOT_EXECUTED）、独立 Reviewer/结论（未做不得冒充）、阻断和非阻断问题。状态为 NOT_STARTED、IN_PROGRESS、READY_FOR_REVIEW、CHANGES_REQUESTED、BLOCKED、APPROVED；只有用户可最终批准。

如果 Codex 不能操作 MZ，提供可复现的 PNG、测试工程、地图绘制说明和验收表，步骤记 BLOCKED 等待用户实测；**不能因为用户说「继续」就把未执行的必要实机测试当 PASS**，除非明确批准修改执行门禁并记录原因。

当前步骤可以为修缺陷而改以前步骤文件，补回归与影响分析；**不得将已批准兼容规格的改变伪装成 Bugfix**，这种变更须用户确认。Review 绑定 commit+构建哈希，不是动态工作目录；产物改变后按影响范围重新测试。严禁删除失败测试、放宽阈值或重置参考图来掩盖错误。

必须在 **步骤 02** 开始维护简明的「V1.0 产品要求 → 实施步骤 → 验证方式 → 证据」映射表，步骤 10 以其审计完整性。

---

## 步骤 01 — MZ 原生可行性与最小编译原型

**目标**：在最早阶段证明草地 A2、动态水面 A1 和一套固定岸线在未经修改的 MZ 中可行。

**编码与实验**：建立最小 Git/依赖锁定/运行说明/测试命令及 AGENTS.md 范围，不搭完整后台。制作带方向、角落、子块编号和帧标识的独立诊断素材与来源明确的真实美术母版；开发独立可执行的 TypeScript 最小编译入口，输出 A1/A2。锁定原生 MZ 版本、Area Type、48px、A1 Block D 普通水面与 A2 普通地面的具体槽位/容量、连接形态、通行建议、岸线透明叠加或预合成的**唯一实际可行方案**，确认水面三源帧 `0→1→2→1` 及目标版本时间基准。

**验收两类行为**：①已指定形状/Tile ID 能正确渲染；②用户在 MZ 编辑器正常画水池，编辑器自动选图正确。保存手绘测试地图，运行游戏确认动画。原型不能依赖 AI、NestJS、PostgreSQL。

**交付**：Target Profile v1、Pixel Processing Contract、诊断与美术母版、原型编译命令、PNG、真实 MZ 画图/运行证据和已知风险。

**Review/门槛**：真实 MZ 中草地、水池、岸线和波纹均按固定方案工作；没有实测只能 BLOCKED。此阶段不调用真实付费模型。

## 步骤 02 — 正式 Monorepo 与工程/任务契约

**目标**：统一前后端技术基线，并**前置** AI Gateway、Mock/任务状态与模型配置契约。

**编码**：pnpm Monorepo；React/Vite/PixiJS 前端壳；NestJS/Express API；本地 PostgreSQL/Prisma；Zod HTTP Schema 与 OpenAPI；TypeScript Strict、Vitest、ESLint/Prettier、CI。固定 Node/SDK 等必要依赖版本、模块格式与共享包导出；真实验证生产构建 API 可启动。将步骤 01 原型迁入工程并重复运行基准。前端请求→NestJS 校验→Prisma DB→返回页面形成最小链路。定义 AI Gateway/Provider 接口、任务状态含 SUBMISSION_UNKNOWN、默认模型/Prompt 模板快照和通用本地任务执行器**契约**，不用实现真实 API。完善 AGENTS.md、环回监听/文件上传/密钥基础安全及要求证据映射表。

**交付/门槛**：开发/生产模式均启动，typecheck/lint/test/build 通过，最小 DB/API 链路通过，步骤 01 无回归；Mock/任务契约可用但不做完整任务执行。

## 步骤 03 — 领域素材模型、像素算法和岸线版本配方

**目标**：对源图片进行规范化，产出引擎无关的 Tile IR。

**编码**：创建源素材、Material、Surface、Style Profile、固定 Transition、Animation Clip、Asset/Recipe 不可变 revision 和依赖模型，区分 Raw/Validated/Compilable/Built。依据步骤 01 Pixel Contract 实现 RGBA、sRGB、整数裁切坐标、Alpha/透明、逻辑像素密度、最近邻/显式缩放、边缘/遮罩/图块构造；不靠图像库默认设置保证像素精度。草地/水面/遮罩固定版本组成岸线配方；新 grass@4 仅影响当前采用新版的项目，不使引用 grass@3 的历史构建自动失效。非法输入拒绝或进入显式修复状态。

**交付/门槛**：类型化中间结果、像素快照、配方依赖/状态测试，输入输出确定、可追溯；通用核心不得依赖 NestJS/Prisma/WaveSpeed。源与 IR 的硬结构校验必须在本步执行。

## 步骤 04 — 正式 A1/A2 单素材 Compiler

**目标**：将 Tile IR 转为带明确放置约束的 MZ 编译片段，**不负责选最终槽位**。

**编码**：普通草地 A2、Block D 动态水面 A1 的 quarter-tile/连接形态、固定岸线需求与三源帧结构。Fragment Contract；不兼容子类/尺寸/帧序须明确错误，不能静默改写。穷举首期合法形状和动画状态并与独立母版比较。可使用**步骤 01 固定诊断布局**将片段写进实验图集验证，但不能由此额外开发第二套槽位分配器。

**交付/门槛**：模块化 Compiler、编译片段、诊断图集、独立结构与实际 MZ 渲染验证；正确性不能仅靠读取同一错误规则的网页预览器证明。

## 步骤 05 — Pack Assembly、槽位退役和标准导出

**目标**：完成多份素材稳定绑定至同一套 A1/A2，并可在旧地图上兼容更新。

**编码**：Compiler Fragment → Pack Layout Plan → Final Atlas Renderer；仅 Pack Assembly 分配槽位，只有 Compiler 定义 MZ 布局规则，Atlas Renderer 严格执行 Layout。维护 NEVER_USED、ACTIVE、RETIRED，退役保留兼容内容且不得自动复用；容量/冲突明确失败。导出 A1/A2 PNG、Build Manifest（Profile/源版本/Compiler/槽位/哈希/依赖/验证状态）与安装配置说明，校验图集和清单一致。

**交付/门槛**：原生 MZ 首次安装及**使用步骤 01 已手工绘制的地图**替换更新，两种场景都成功；旧绑定不会静默改变，退役不顶替，无法分配有清晰错误。必须在布局/导出时执行结构硬校验。

## 步骤 06 — 持久化、不可变构建、Mock 异步任务恢复

**目标**：把 V0.5 要求的通用任务恢复**提前到 V0.1**，而不是首次放到步骤 08。

**编码**：Prisma/PostgreSQL 项目与素材版本、配方、Pack/Slot、任务、构建记录；文件存放不可变资产目录。落实「暂存文件→校验哈希→发布不可变文件→数据库短事务→CAS/预期版本条件切换成功构建」。同 Pack 串行发布或乐观锁，防止并发槽位抢占、旧构建反向完成覆盖当前。实现最小可重启的本地任务执行器、**Mock Provider**、归档流程，模拟：已获 ID 后重启继续查询；提交未知不自动重提；供应商成功但保存失败只重试归档；重复完成幂等；取消不等于远端成功取消；旧任务晚完成不发布当前。**Adapter 只处理供应商 Submit/Query，通用 Recover/归档属于应用层**。备份 DB+文件须获得一致快照，并在干净环境恢复后重新构建。

**交付/门槛**：持久化和发布实现、Mock/故障注入、并发与恢复测试、备份脚本。失败/重启不破坏最后成功构建或造成重复远端逻辑提交；没有真实付费模型调用。

## 步骤 07 — 人工素材 Studio、浏览器 Animated Autotile 预览与 QA

**目标**：形成不依赖 AI 的完整可操作工作台，并汇总验收 V0.1 的 Mock/可靠性要求。

**编码**：项目创建/选择、导入基础纹理、选择固定岸线配方、组件替换、编译、构建历史、打包下载；PixiJS **创作动画预览**和根据**实际导出 A1/A2 PNG + Manifest + Profile**的**交付拼接动画预览**。网页直接播放/暂停水波、逐状态检查和边角/池塘示例；时间基准遵守真实 MZ。聚合步骤 03–06 已实现的结构硬校验为 QA 报告，增加基础接缝、重复纹理、颜色跳变和动画不动风险提示，标识人工视觉确认和具体 MZ 实测不同状态。不做完整像素编辑器，UI 美术精修留步骤 10。

**交付/门槛**：在已部署本地实例，非开发用户可以导入→编译→在线动态预览→下载；结构错误不能交付；双预览符合证据；步骤 06 Mock 未知提交/恢复/备份均通过。

## 步骤 08 — 内置 Prompt 策略、AI Gateway 与 WaveSpeed 真实连接

**目标**：让真实 Provider 接入已经成立的 Task Contract，且普通用户不负责写主 Prompt/选模型。

**编码**：在后端实现版本化**平台主 Prompt Registry + Prompt Composer**，内置草地、动态水纹、岸线及参考图编辑的任务主模板、结构化约束与风格配置；用户可选辅助提示词仅调整美术偏好，留空仍可调用，冲突不得改写核心规则。所有请求按任务类型/Style Profile/参考输入组合后由 Adapter 转为模型支持的 prompt/input；工程正确性仍靠程序 QA。集中、可修改的默认 Generate/Edit 模型配置；**不向普通用户暴露模型选择器**，每个任务创建时冻结模型、Prompt 模板版本和用户补充/参考资料版本。

通过 WaveSpeed 官方 `wavespeed` JS SDK 实现真实图片生成与参考图编辑；可在 Adapter 内有限调用官方 REST 以支持提交/查询恢复。真实测试分别覆盖**文生图成功归档**与**参考图上传→编辑→结果归档**，不要求本地服务对公网暴露。限定真实付费测试预算、并发与重试，并验证提交未知/归档失败/迟到任务不会导致重复付费或发布。记录模型 ID、Prediction ID、Prompt 版本、费用/估算、文件哈希。

**交付/门槛**：真实 Generate/Edit 两条最低连通路径、任务追踪与归档、Prompt 空值及冲突测试、集中换默认模型测试、受控费用记录。步骤 08 一次成功只证明连接，不代表生成质量达标。

## 步骤 09 — AI 整套素材生产与正式质量评测门槛

**目标**：**文字创作**和**参考图创作**两种路径均能形成完整草地+三源帧动态水面+固定岸线 Pack。

**编码**：Studio 引入可选用户辅助 Prompt、风格/任务选项、参考图、候选选择、组件局部修复；平台主 Prompt 永远是默认主体。AI 先生成共享基础纹理/水纹等源视觉，再确定性处理为合格配方与原生 MZ 三源帧；保护静态岸线区域，替换源组件后依赖重编译。使用固定探索集评估候选模型、Prompt 版本、质量、耗时、成本、人工修改和失败/重试；成功以**完整可用素材包**为单位，不是单张 PNG。保留未用于调参的独立验收集。在用户 Review 时提交建议的正式阈值、重试/人工干预预算，并**在步骤 10 之前冻结**，不能事后下调粉饰评测。

**交付/门槛**：文生整套 Pack、参考图整套 Pack 均在 MZ 正常绘制/播放；质量/成本可复核，局部修改保护有效；正式评测口径和发布阈值经用户批准。

## 步骤 10 — V1.0 发布候选、回归与最终交付

**目标**：不新增品类，完成 V0.5 全部产品能力、质量及正式验收。

**编码**：完善 Studio UX、错误提示、受控修复、项目历史/备份恢复、导出包与说明、统一本地启动/环境检查、基础安全；修复端到端与独立 Review 问题。先冻结**RC 候选（commit、Profile、依赖、Prompt/模型版本、构建哈希、质量阈值）**，然后执行固定和保留集、全量自动测试、独立审查与原生 MZ 编辑器正常绘制/运行/旧地图更新验收。修改候选代码需重出 RC，并按影响复测；不允许边修改边复用旧证据。

**交付/门槛**：V1.0 本地应用、完整测试与文档、示例 Pack、MZ 验收工程和视频/截图、备份恢复证据、调用成本与质量报告、逐需求验收映射和独立 Review。只有**用户明确批准步骤 10 对应候选**，才能宣称 V1.0 完成。

---

## B. 版本映射与计划终点

| 里程碑 | 步骤 | 退出原则 |
|---|---|---|
| V0.0 | 01–02 | MZ 真实闭环 + 工程依赖最小链路 |
| V0.1 | 03–07 | 核心处理、编译、Pack、持久化、Mock 恢复和人工素材网页预览 |
| V0.2 | 08–09 | WaveSpeed 两条输入路径、内置主 Prompt、完整 AI 素材生成 |
| V0.3 / V1.0 | 10 | 发布候选、质量/回归/MZ 实机与用户正式批准 |

**项目第一版终点**：在本地 Web Studio 中，用户无需选择模型、可不填补充 Prompt，也可上传参考图；平台靠内置主模板、AI 生成、确定性处理、编译和组装稳定产出可安装 MZ 原生草地与动态水面（含固定岸线）。用户可直接在网页中预览编译后的 Animated Autotile 动画、检查边角和质量，保存/恢复项目，下载稳定 Pack，在原生 MZ 中绘图和运行。所有必要工程、安全、数据和 Review 门禁通过。

## C. 每步提交 Review 报告模板

```text
Step: XX/10
Status: READY_FOR_REVIEW / BLOCKED
Branch + Tested Commit SHA:
Target Profile / Contract Version:
Build ID + Critical Artifact Hashes:
Changes / Scope:
Automated Checks (exact commands/results):
MZ Editor Drawing Evidence: PASS/FAIL/NOT_EXECUTED
MZ Runtime Evidence: PASS/FAIL/NOT_EXECUTED
Independent Reviewer + Findings: PASS/ISSUES/NOT_EXECUTED
Backward Compatibility / Prior-step Regressions:
Open Blocking / Non-blocking Items:
User Approval Requested: yes (do not begin next step yet)
```

首个正式 Codex 指令只能是「依据这两份文档实施步骤 01，完成原型、Profile 和 MZ 验收准备；达到门禁后停止等待 Review」。**本次文档发布不构成步骤 01 已执行。**