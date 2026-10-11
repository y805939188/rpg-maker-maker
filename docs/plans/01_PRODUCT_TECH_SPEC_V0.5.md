# AI Tileset Studio — 完整产品与技术方案 V0.5

**项目仓库**：`y805939188/rpg-maker-maker`  
**状态**：方案级通过，可作为 V0.0 正式开发基线；不代表实现或实机测试完成。  
**执行计划**：[`02_V1_IMPLEMENTATION_PLAN.md`](./02_V1_IMPLEMENTATION_PLAN.md)

## 1. 产品目标与第一版边界

平台以 **AI 视觉创作 + 确定性图块编译 + 质量校验 + 素材包管理**，稳定交付 RPG Maker MZ 原生地图素材。用户选择素材类型、可选参考图和可选创作偏好，经候选生成、源素材处理、编译、布局组装、质检、网页预览，下载标准图集，并在 MZ 数据库注册后使用原生画笔。

**V1.0 最小完整交付单元**：同一风格的一套 **A2 静态草地 Autotile + A1 原生三源帧动态水面 Autotile + 固定草地—水面岸线关系**，能够在同一张 MZ 地图中使用。文字创作和参考图创作两种入口**都要产生完整的配套素材包**；同时支持用户导入合格基础素材，绕过 AI 完成编译。

必须有**浏览器内直接播放 Animated Autotile** 的功能：创作预览可检查视觉源帧；交付预览读取**实际构建的 A1/A2 PNG、Build Manifest 和 Target Profile**，显示自动拼接后的水域动画，含暂停/逐帧及典型边角检查。网页预览不替代真实 MZ 编辑器绘图和运行测试。

首期不做用户账号、第三方登录、Stripe/支付宝/微信支付、充值/扣费、Redis、线上部署、多用户 SaaS、智能笔刷地图编辑、独立地图编辑器、其他地形类别、A3/A4/A5/B-E 全支持、N 帧 MZ 运行时插件、Shader/动态树木。保留可扩展模块边界，不提前实现这些功能。

## 2. 原生 MZ 兼容契约

以 **MZ Native Ground & Water Profile v1** 为唯一首期导出契约：

| 项目 | 基线与验证要求 |
|---|---|
| 引擎 | 未修改的 RPG Maker MZ；V0.0 锁定编辑器和运行时实际版本 |
| 地图模式 | Area Type |
| Tile | 48×48（首期产品选择，并非 MZ 唯一合法尺寸） |
| 图集 | A1、A2 在 48px 规范下为 768×576 PNG |
| 草地 | A2 已验证普通地面槽位 |
| 水面 | A1 Block D 已验证普通水面槽位 |
| 帧与节拍 | 三源帧，0→1→2→1；以固定运行时的 Tilemap.update 时基验证（公开实现每 30 次 update 推进状态） |
| 岸线 | 一种经真实 MZ 验证的组合与绘制方案 |
| 其他 A1 子类 | 深海/海洋/瀑布等暂不支持，必须明确拒绝 |
| 配置 | 明确 A1/A2 注册、通行、图层和必要绘制顺序；不保证 PNG 零配置导入 |

V0.0 冻结具体**允许槽位集合、容量、连接形态、透明叠加/烘焙方式、通行设置和不支持列表**。初始岸线配方是「共享草地底纹 + 固定岸线遮罩 + 水体内部动画」；需对比原生绘制行为后选择**一种**可行方案，不允许只凭理论推断。

必须分开验证：①给定 Tile ID/形态的运行时渲染正确；②用户在原生编辑器正常绘图自动选图正确；③实际游戏动画与通行配置正确。要保留编辑器**亲手绘制**的测试地图；程序生成的预置 Tile ID 地图不能替代它。

内部 Animation Clip 可以描述可变源帧、播放步骤、时长与循环，但 V1.0 只编译原生三源帧。未来 Enhanced MZ 需独立 Compiler/运行时插件；不兼容 N 帧不得被静默丢帧冒充原生兼容。

## 3. 平台内置主 Prompt + 用户可选辅助 Prompt（正式产品契约）

**生成的主体 Prompt 永远由平台维护。**页面可提供一个**可选**的用户补充提示词输入框，留空也能完成创作；用户补充只描述颜色、主题、质感、波纹柔和程度等美术偏好，不得替代/覆盖结构约束、目标角色、岸线、动画、像素规范和输出限制。

后端建立**类型化、集中式、可版本化 Prompt Registry + Prompt Composer**，不同任务模板覆盖草地表面、波纹视觉元素、岸线边缘、参考图编辑等。按以下层级组合：

1. 平台内置主要创作与约束模板（像素风、素材角色、无缝、边缘/透明、动画共享几何、避免无关物体等）。
2. 当前任务模板、Target/Style Profile、结构化参数和引用的素材上下文。
3. 用户可选的辅助偏好。

核心工程格式由**确定性 Compiler/QA 保证，而非单靠提示词**。当模型接口没有独立 system role 时，Adapter 将平台要求与用户偏好组合为该模型支持的输入；不假设模型一定服从主 Prompt。冲突、越界或不支持的用户要求要通过业务验证反馈，不直接放宽 Profile。

任务创建时冻结**实际主/任务 Prompt 模板版本、用户补充、结构化参数、参考资产版本、模型与 Provider**，避免任务排队期间切换模型或 Prompt。支持比较模板版本的质量表现。Provider/主 Prompt 信息不必暴露给普通用户，不应无意写入最终游戏素材包。

局部图像修改依靠遮罩、裁切和程序合成保护固定区域，不能仅靠「不要修改其他像素」的 Prompt。首期动画优先共享基础水纹/视觉元素，通过确定性约束获得符合 MZ 往返播放的三源帧；不默认独立 AI 绘制三个无关图。

## 4. AI 接入与可恢复任务

**首期供应商 WaveSpeed，官方 JS SDK `wavespeed`**，只在后端 Provider Adapter 内接入。后端 **AI Gateway + Provider Adapter + 轻量 Model Registry** 抽象 Image Generate、Image Edit，必要时 Image Analysis。用户不见模型列表；服务端集中配置默认模型（例如 WaveSpeed 的 GPT Image 候选），容易更换，但**新配置仅作用于新任务**。是否用某模型必须经账户真实调用、输出质量、成本和授权评测。

职责分离：
- WaveSpeed Adapter：供应商上传/提交/查询/输出规范化，若 SDK 不支持可恢复提交，可限于 Adapter 内使用官方 REST。
- 通用结果归档：下载、校验、哈希、本地不可变资产保存。
- 平台任务执行器：任务状态持久化、重启恢复、重试/取消、过期版本检查和构建发布。

任务：创建冻结快照 → 等待提交 → 提交中 → 远端运行 → 下载 → 校验 → 本地归档 → 平台成功。**供应商成功不等于平台成功**。异常必须区分已知外部 ID 的恢复查询、未获 ID 的 `SUBMISSION_UNKNOWN`（不盲目重提）、远端成功本地归档失败（只重试归档）、重复完成、取消语义和旧项目版本的迟到结果。

平台逻辑任务键不等于供应商创建幂等保证。真实付费调用须有受控并发、次数、重试和预算；记录模型、实际任务 ID、估算/实际用量与成本。WaveSpeed 临时 URL 不能当长期资产，完成后保存为自有文件。**V0.1 先用 Mock Provider 验证整个状态机；V0.2 才接入真实 SDK。**

## 5. 三层素材模型、处理规范与依赖

1. **创作源/配方**：参考图、原纹理、Prompt/模型来源、Style Profile、版本化草地/水面/岸线遮罩与参数。
2. **引擎无关 Tile IR**：逻辑图块、连接形态、边/角、透明和动画状态。
3. **Target Build**：已编译片段、Layout Plan、完整 A1/A2 PNG、绑定、Manifest、校验与验收证据。

领域概念按实际需要表达 Material、Surface、Transition、Autotile Definition、Animation Clip、Target Profile、Asset Project、Pack、Build Record；不得为了概念名词机械拆十几个微服务。

**Pixel Processing Contract** 在 V0.0 冻结 RGBA8 工作表示、sRGB、整数坐标、裁切越界、Alpha/透明像素归一化、逻辑像素密度 vs 48px 最终尺寸、允许缩放算法、调色板/帧共享几何、合格输入/显式修复边界。Sharp 可处理解码和普通图片操作，但像素编排与遮罩应使用可测试的确定性算法；不能把默认平滑缩放当作像素画正确处理。高分辨率 AI 图转像素风不是简单整数放大。

将源资产明确分为原始、已验证、可编译、已构建状态。派生岸线引用具体不可变材质版本/哈希；新增 grass@4 不使引用 grass@3 的历史构建失效。只有**当前工作项目采用新版**时受影响的当前派生结果待重建；区分版本可用、待重建、验证失败。

## 6. 编译、布局、退役和素材包

严格三个逻辑动作：
- **MZ Compiler**：将 Tile IR 编成满足目标格式的 `Compiled Fragment` 和放置约束，负责目标子块形状和源帧结构；不分配最终槽位。
- **Pack Assembly**：唯一的 Layout Plan/槽位分配者，保证既有绑定、容量和冲突规则。
- **Final Atlas Renderer**：只按合法 Plan + Fragment 写最终图集，不重新决定格式和槽位。

槽位状态至少 NEVER_USED / ACTIVE / RETIRED。退役保存绑定及可选兼容导出内容，默认不自动复用；真正清空/复用属显式**破坏性操作**。更新素材包必须实测**以前已经用 MZ 编辑器画出的地图**继续使用旧绑定，而非只比较 Manifest 数字。

每次导出至少有合法 A1/A2 PNG、配置说明和机器可读 Build Manifest（源/配方/Profile/Compiler/Pack 版本，映射，哈希，依赖和质量记录）。默认面向新建或显式配置的 Tileset，不覆写用户原有 Maps/Tilesets.json。

## 7. 数据一致性与本地技术栈

**前端** React + Vite + PixiJS；**后端** Node.js + NestJS + Express + TypeScript Strict；**存储** Prisma + 本地 PostgreSQL + 本地文件；**契约** Zod + OpenAPI；**工程** pnpm Monorepo、Vitest/Playwright、ESLint/Prettier、CI。固定并实测依赖版本/模块格式及生产编译后启动；核心 Compiler/Processing/Domain 不依赖 NestJS、Prisma 和 WaveSpeed。

正式源资产和构建尽量不可变。发布：暂存 → 文件及哈希校验 → 不可变目录 → PostgreSQL **短事务**登记并核实引用 → 满足版本条件后更新当前成功构建指针。两个构建反向完成时旧构建只入历史，不能切回当前；同 Pack 通过串行发布或乐观锁防并发抢占同一空槽。不能将长图像计算/远端 API 包入 DB 事务。失败不破坏上次成功构建。

备份需获得**一致的数据库和文件视图**，首期可在备份期间暂停写入/清理；恢复到干净环境后必须能够加载配方再次构建。AI 请求可追溯但不要求同 Prompt 再出同图；确定性编译在固定输入/配置下要求像素一致，必要时另规定编码后字节一致。

本地运行默认环回监听，保护变更接口、上传格式和解码尺寸，限制 Host/Origin，禁止任意服务端路径输入，服务端保管 API Key 和敏感日志。明确向用户告知远程 AI 会接收哪些参考图/提示词。V1.0 在完成文档化环境部署后供非开发用户使用；不承诺一键安装器。未来线上可增 PostgreSQL 多用户、S3、Redis/BullMQ、认证、计量、Ledger、支付，但本版不实现。

## 8. QA、预览与真实证据

工程**硬校验随产物实现**：步骤 03 校验源/Tile IR，步骤 04 校验编译片段，步骤 05 校验布局、图集/Manifest，步骤 06 校验发布/引用。步骤 07 聚合成用户 QA 报告和交付体验，不可推迟核心结构校验或仅在前端检查。

视觉风险单独检测接缝、色彩、重复纹理、闪烁、无可见动画；人工判断风格和美感，不能把一个数字评分当成高质量证据。修改源组件后仅重编译受影响对象，重新执行相关质检。

建立独立的带编号/方向/角标的诊断母版和人工确认的真实美术母版；预览用**真实最终 PNG**，也需要原生 MZ 编辑器手绘地图及运行验收。状态明确区分 STRUCTURAL_PASS、VISUAL_CONFIRMED、PROFILE_VERIFIED 和具体 ARTIFACT_MZ_TESTED；没有执行的实测记 NOT_EXECUTED，不能伪装 PASS。

## 9. 全 AI 开发与 Review 规则

根据信任边界建立 AGENTS.md、模块依赖检查、测试与示例。所有步骤严格执行：编码、自动检查、独立 Review、提交 commit/build/hash/MZ 证据、用户最终 Review；必要技术门禁和用户批准**同时满足**才可推进。允许当前步骤修复以前步骤的真实缺陷并复测，不允许擅改批准的 Profile/产品范围。若需规格变更，另交变更说明等待批准。没做的独立 Reviewer 或实机验证不得写成已完成。

**开发里程碑**：V0.0 真实 MZ 原型及最小工程链路；V0.1 确定性核心、素材包、持久化/Mock 恢复和人工素材 Studio；V0.2 WaveSpeed 文本/参考图双路径及主 Prompt；V0.3 质量/修复/体验完善；V1.0 固定候选、全量回归、独立 Review、用户批准。具体十步执行以 [开发计划](./02_V1_IMPLEMENTATION_PLAN.md) 为准。

**质量底线不可降级**：工程正确、数据完整、基本安全、可控付费调用、发布一致性。达到底线后再优化美术质量、使用体验、维护扩展与速度。

## 10. 重要官方参考

- [MZ 素材规范](https://rpgmakerofficial.com/product/MZ_help-en/01_11_01.html)
- [MZ Tilemap.js](https://rpgmakerofficial.com/product/mz/rmmz_api/Tilemap.js.html)
- [MZ 地图编辑器](https://rpgmakerofficial.com/product/MZ_help-en/01_07_01.html)
- [MZ Tileset 数据库](https://rpgmakerofficial.com/product/MZ_help-en/01_08_10.html)
- [WaveSpeed JavaScript SDK](https://wavespeed.ai/docs/javascript-sdk)
- [NestJS Prisma](https://docs.nestjs.com/recipes/prisma)
- [Sharp resize](https://sharp.pixelplumbing.com/api-resize/)

**本次文件初始化本身不授权 Codex 开始编码，也未完成 V0.0 实验。**