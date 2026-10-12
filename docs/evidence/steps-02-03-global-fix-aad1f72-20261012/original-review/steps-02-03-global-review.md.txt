# AI Tileset Studio — 步骤 02＋03 已发布版本联合独立 Review

审查日期：2026-10-12，Asia/Shanghai。本轮只审查、隔离验证和新增报告；没有修复生产代码、提交、合并、推送或启动步骤 04。

主审对象：`784a39fb9739c01750b4b6cbf5da78df24b227b7`（REVIEW_TARGET）。历史委托批准和局部 PASS 作为证据入口，不作为本轮结论。

| 本轮结论               | 结果                   |
| ---------------------- | ---------------------- |
| 实现与跨模块审查       | **REQUIRES_REVISION**  |
| 独立验证覆盖           | **COMPLETE_FOR_SCOPE** |
| 进入步骤 04 的技术建议 | **FIX_BEFORE_STEP_04** |

新发现：**1 个阻断 P2（GR-0203-001）、1 个非阻断 P3（GR-0203-002）**；未确认 P0/P1。另保留既有 esbuild 非阻断 P2，单独记账。COMPLETE_FOR_SCOPE 表示本轮范围内的必要检查已执行或有明确适用性依据，不表示所有断言通过、保证没有其他缺陷，或 V1.0 已验收。

发布完整性、步骤 02 工程和真实运行链路、正常素材处理链路及受影响的步骤 01 回归均有本轮支持。阻断项是步骤 03 公共运行时硬校验接受非法字段类型，且 Built 的稳定 ID 可由调用方改写。无需更换技术栈或提前实现后续功能。

证据目录：[本轮新增脱敏证据](evidence/steps-02-03-global-784a39f-20261012-150234/ledger.json)。原始 JSON、脚本和 Python 文件以 `.txt` 后缀归档，保持实际执行字节，避免改动工程格式政策；日志保留原始输出。下文证据文件均指该目录。

## 1. 会话条件、独立性与版本基线

本会话 ID：`01a12eeb-0f98-7613-8d6c-160e519ee87b`，独立于此前 Coding 和局部 Reviewer。本会话实际 rollout 的 `turn_context` 为 **gpt-6.1-sol / ultra**；客户端配置文件读取为 **gpt-6.1-sol / ultra / service_tier=default**。没有修改配置或切换模型。当前可访问的针对本会话的 feedback_tags 查询没有返回请求 tier；**逐请求 service tier 和服务端最终 tier 均为 UNVERIFIED_NOT_EXPOSED**，不能把配置文件推定为服务端最终字段。未发现客户端明确配置不符的证据，按用户对不可见字段的处理要求继续。证据：`reviewer-configuration.json.txt`。

没有启用子 Agent：暴露的子 Agent 工具元数据只声明 Priority，无法保证 Standard。本轮全部正式审查判断、重要发现复现及汇总由本会话顺序完成，没有用未知配置的子 Agent 代替审查。

原工作区开始为干净状态，HEAD `6129b21cc5deb64131b85543d914424ca1c34307`，分支 `codex/orchestration-02-03`。现有 main integration worktree 的 main 是 REVIEW_TARGET。GitHub 只读读取 `main` 的实际提交也为 REVIEW_TARGET，未向前推进。

原 HEAD 相对目标仅多三个文档/证据路径：`docs/orchestration/steps-02-03-final-report.md`、`steps-02-03-state.json`、`evidence/final-main-metadata-ci.json`。它们不被静默纳入受审代码。通过 `git show codex/orchestration-02-03:docs/orchestration/steps-02-03-state.json` 只读取得 canonical 状态，确认历史发布完成、调度停止、步骤 04 未授权；该状态不是本轮批准。

以下提交均已核验存在，并且是 REVIEW_TARGET 的祖先。完整父提交和逐路径差异见 `version-relations.json.txt`。

| 定位                    | 核实的提交                                 |
| ----------------------- | ------------------------------------------ |
| 步骤 02 前 main         | `f004d6c74abe64ea853619390aa9dc2bc34654c1` |
| 步骤 02 最终受审实现    | `5356d66e693613f9ce52c4b0ceaddfe2821fffb5` |
| 步骤 02 文档证据候选    | `85fefc1d4638cec79ea00797a0be50e2018444bd` |
| 步骤 02 发布 main       | `c021b20991281317fbbbb1fc398c0ae496ef648d` |
| 步骤 03 最终受审实现    | `a0e9f07ae26567c3a623a2b38e42b0b015441d30` |
| 步骤 03 文档证据候选    | `0cf7aa049137cae6c9367231a141ffcb04df97a9` |
| 步骤 03 功能发布 main   | `0793c948da3bf3a8967579253f27ab2e234b8e70` |
| 本轮目标及实际远端 main | `784a39fb9739c01750b4b6cbf5da78df24b227b7` |

5356→c021 没有 docs 外差异；a0e→REVIEW_TARGET 的 196 个变化路径全部在 docs 内。进一步检查了 workspace、TS include、Vitest include、构建收集、素材样例和原型的实际输入：新增 docs/evidence 脚本不自动进入生产导入、测试或构建执行；Profile/Pixel ID、锁文件和正式 fixture 输入未改变。最终重新构建的步骤 03 **88 个工程 payload 全部逐字节等于 a0e 的受审工程产物**，素材样例 **13 个 payload 全部等于 a0e 样例**。因此“没有功能变化”有执行图和产物证据，不是仅凭路径名称判断。commit/Build ID/Manifest 包装信息相应变化是允许的。

两步受审实现及整改完整进入最终 main，没有发现遗漏整改、合并覆盖、旧生产输出或未解释的发布后功能改动。**GR-0203-001 已存在于受审实现并随发布进入 main，属于此前审查遗漏，不是发布后新增代码。**

## 2. 范围、阅读覆盖与隔离环境

已完整阅读目标版本的 AGENTS、两份正式 plans、MZ_RUNTIME_ENVIRONMENT、Target Profile、Pixel Contract、阶段性授权、两步工程基线及 Codec companion、需求证据映射、最终交付和两份 release 报告。阅读步骤 02 四轮、步骤 03 两轮独立报告以及对应初始 Coding/整改记录，区分各历史检查点的当时状态。

实际审查的生产实现包括：

- `apps/api/src` 全部六个模块、Prisma schema/唯一迁移及迁移入口；`apps/web/src`、Vite 配置及文件/Origin 边界。
- contracts、ai-gateway 的完整 HTTP/OpenAPI、Provider/Executor、任务状态和深冻结快照契约。
- asset-core、material-processing、image-adapter 全部生产源文件，特别是所有权、JSON/Revision、IR/Built、采用/历史判断、像素操作、配方、容器检查和子进程生命周期。
- workspace/package exports/TS 配置、构建顺序、clean/build/export/boundary/toolchain/local-postgres/run-local、工程及素材发布脚本、CI 和 Playwright 配置。
- 原型 compiler/profile/pixels/export、原型发布及输入预检、外部核心 oracle 入口；检查受保护原型脚本/测试/母版与版本差异。

测试阅读覆盖新领域、像素、配方、适配器及五项整改回归，API/HTTP/Gateway、安全回归和浏览器脚本。旧 MZ 准备/创作脚本以副作用、引用及保护差异为重点，没有重新实施 MZ 工程准备或重造 Golden。依赖目录仅针对已加载版本、Vite 解析/服务用途和相关原生隔离行为检查；自动生成文件按导出运行、产物哈希核验。证据文件核验主要完整 ledger、命令绑定、关键断言和统计，不声称逐行完整审查所有历史日志或整个依赖仓库。

实际验证 checkout：`/private/tmp/tileset-global-review-784a39f-20261012`，detached REVIEW_TARGET。独立 pnpm store 位于该目录 `.local/pnpm-store`，Prisma 生成使用本轮 `.local/cache`。生成 Client、构建和验证输出均在本轮隔离目录。Node 实际固定为 22.21.1、pnpm 10.20.0、Prisma Client 6.19.3；使用现有 PostgreSQL 14.20 二进制和现有 Chromium，未升级全局工具。

本轮新建 SCRAM 集群在该 checkout 的 `.local/postgres`，环回端口 **55439**；API **4339**、集成 API **4340**、Web **5199**。没有启动或复用 55432/55433/55434，未读取历史数据库内容作为样例。私有 `.env`/ownership 凭据保持 0600，不进入证据。

准备失败单独保留：首个 detached checkout 建在原工作区 `.local/global-review-784a39f-20261012`，其中首次安装被沙箱网络 EPERM 阻止、Prisma 生成被用户缓存 utime 权限阻止、首次 initdb 被共享内存权限阻止。该 checkout 路径还受 Vite “所有深度 .local 禁止服务”的政策限制，因此实际执行验证改用上述临时 checkout；未把此政策当成生产缺陷。经明确沙箱审批，在新的自有目录完成安装、生成和数据库初始化，未重置任何旧集群。失败 stdout 见 `preparation-*.log`；不是 PASS，也不是平台安全拒绝被绕过。

## 3. 步骤 02：要求 → 实现 → 独立验证

| 已批准要求                         | 实现及责任边界                                                                       | 本轮结果/证据                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| pnpm workspace；保留步骤 01        | 八成员登记；根仍为 prototype；框架无关核心不反向依赖应用                             | `pnpm check` 方向/exact pins/Strict/lint/format PASS；保护差异为空                           |
| JS/声明导出、模块格式、构建顺序    | 各包 Node ESM 指向 dist；API 独立编译 JS；无生产 TS 源别名                           | 干净 build、六个真实生产 Node export imports PASS；88 payload 等于受审产物                   |
| React/Vite/Pixi 前端基础           | contracts-only Web；显式工程壳和后续能力提示；静态 shader polyfill                   | 生产/开发/冷缓存三次页面创建刷新/Pixi/零 pageerror PASS，截图已查看                          |
| Nest/Express 请求/错误/响应        | strict Zod 输入；专用 Prisma→UUID/name/ISO DTO；8 KiB JSON；安全错误                 | DB3、编译后端同一行验证、格式/Origin/媒体/gzip 拒绝与错误脱敏 PASS                           |
| HTTP/Zod/OpenAPI 单一来源          | contracts 生成 OpenAPI 3.0.3；前端解析实际响应                                       | 当前契约测试及实际 `/api/openapi.json` PASS；不把自定义 refine 视为仅靠静态 OpenAPI 就可执行 |
| 真实 PostgreSQL/Prisma 闭环        | 独立 Project 表/迁移；启动 connect、结束 disconnect                                  | 本轮新集群迁移成功；HTTP 与 Prisma 同行一致；浏览器刷新读回 PASS                             |
| 数据库不可达准确失败               | health 实际 SELECT；Prisma 失败映射 503；启动错误退出                                | 200→自有 DB stop→503 SERVICE_UNAVAILABLE→restart→200、原行恢复 PASS                          |
| 开发、生产、冷缓存启动             | `pnpm dev` 先构建共享包；production 使用独立 Node 并同源提供 Web                     | 两种模式及冷缓存 PASS；非法 bind/等端口/占用端口/不可达 DB 启动均安全 exit 1                 |
| Gateway/Provider/任务/快照最小契约 | Provider submit/query 与应用 Executor 分离；SUBMISSION_UNKNOWN；深拷贝冻结创建时配置 | 契约/快照测试及源码核验 PASS；只有类型/test double，没有真实调用或完整恢复 runner            |
| 环回 Host/Origin/写请求保护        | API exact Host/Origin/custom header/JSON；不信任 proxy；Vite 独立 realpath/load 授权 | API 与 Vite 现有边界 PASS；530 记录无假哨兵读取，正常模块/虚拟模块保留                       |
| CI 与不可变工程证据                | 显式必要命令、临时 Linux DB、固定工具/action SHA；clean commit/锁/Profile/逐文件 SHA | 目标 CI 原始日志核验；本轮发布和拒绝覆盖/文件集合核验 PASS                                   |

当前 API 只有工程项目链路，没有 HTTP 图片上传、素材处理端点、远端图像下载或用户可选服务器路径。不能据这些结果宣称资产持久化、登录、Studio、完整任务恢复已经完成；这些未实现内容也不是本轮缺陷。

## 4. 步骤 03：要求 → 实现 → 独立验证

| 已批准要求                           | 实现及边界                                                                              | 本轮结果/证据                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Source Asset、不可变来源 Revision    | RawSource 复制 encoded bytes/provenance；RgbaImage 私有像素、取出副本；ref/hash         | 对输入及返回副本修改的控制通过；正常来源、编码/像素身份和 provenance 已核验                       |
| JSON 可表达性、规范化和硬状态        | freezeJson 逐索引拒绝洞/undefined/非 JSON；source 所有权 WeakSet；IR/Built 再校验       | 原稀疏问题仍 FIXED；**标量类型和 Built ID 所有权存在 GR-0203-001**                                |
| Material/Surface/Style/Transition/IR | 明确几何/语义区、版本依赖、共享风格、不透明水拥有岸线；无 MZ numeric ID                 | 正常语义、区域覆盖/越界/帧/依赖等通过；重复数组区域名可越过整个处理链路，需整改                   |
| Raw/Validated/Compilable/Built       | PNG 实际 decoder→owned validated→处理 IR→冻结 Built                                     | 本轮素材样例重建、源码与实际导出核验；Built 仍 `targetCompilation=NOT_EXECUTED`                   |
| RGBA8/sRGB/straight Alpha            | 容器前检查；无暗中旋转、ICC/HDR/编码转换；透明 RGB=0                                    | 实际 PNG 及 partial/zero alpha 往返 PASS；拒绝/repair 代码与现有测试覆盖                          |
| 整数裁切、复制、显式最近邻           | 半开边界；先快照整个复制来源；显式 floor 映射                                           | 当前像素测试 PASS；独立 81 种二维重叠方向/位置控制 PASS；未引入隐式平滑                           |
| 半透明线性 sRGB 合成                 | source-over 在线性空间，最后写回取整                                                    | 本轮九项独立 80 位 Decimal 预期逐字节一致；包含 alpha=1、双 partial、transfer 边界和恒等控制      |
| 固定岸线跨帧与调色板                 | 同一静态 mask；overlay 不能改动态内部；源及合成 palette；可达帧实际变化                 | 手写 literal、真实 PNG→样例→11 张源/处理 PNG 独立解码 PASS；历史两项 palette/播放缺陷仍 FIXED     |
| Animation 源帧/播放分离              | 有界任意帧数、sequence/duration、updates/ms、loop/nonloop                               | 源码及当前回归 PASS；本轮两源帧/ms/nonloop控制成立；未偷偷写死三帧或编译 Native 时基              |
| 精确配方/参数依赖                    | grass、每水源、mask、detail、style、parameters、recipe 的 ref/hash 全部绑定             | 必备参数 dependency 删除后重哈希仍拒绝；样例 IR 与 revisions.json 精确对应                        |
| 新版本、采用、历史分离               | append-only catalog；一身份选一版本；explicit adopt；assessBuild 三种事实分开           | grass@4 可用而 grass@3 历史有效；明确采用才 needsRebuild；旧快照重跑同 hash                       |
| 当前图片入口资源预算                 | 4 MiB/4096 chunk/64 KiB metadata/768×576 pixels；读/codec 单槽；5s；child SIGKILL-close | 当前 suite 的 busy/timeout/cleanup/repair 控制及本轮六项 codec probe PASS；普通最大输入观测见下文 |

`validatedDecodedSource` 对 PNG 是文档明确的受信任基础设施缝合口，实际 PNG 的字节解码由 image-adapter 承担；没有仅因该构造器公开而判问题。普通对象伪造 validated 状态不能通过处理器。目录、组件删除和 revision 替换不由 append-only catalog 提供；缺精确历史依赖会给 MISSING_DEPENDENCY，不能由此推断步骤 06 的文件恢复/CAS 已经实现。

## 5. 两步交界及步骤 01 回归

当前真实调用链已追踪并复测：独立 PNG wire/样例源 PNG → adapter 容器/解码 → owned Raw/Validated Source → 版本化 Style/参数/Recipe → processing → hard Tile IR → Built → adapter 编码/样例导出。各层的 RGBA、straight Alpha、角色、密度、所有权、错误/repair、具体版本和 NOT_EXECUTED 目标状态在正常输入下衔接；GR-0203-001 则使非法元数据在这条链路进入可编译/已 Built 状态。

步骤 02 与 03 在工程层共用有序构建、包导出、锁定 codec、资源/契约身份和 CI。当前 Project HTTP DTO 没有被误用为资产/IR/Prisma schema；Web 仍只引用 contracts，API 项目链路没有引入 Sharp 或领域处理。Web→资产处理业务入口和持久化连接尚属后续步骤，不能把当前 CLI 链路描述为网页已经可导入/编译素材。

c021→REVIEW_TARGET 的 API/Web/Prisma/contracts/Gateway、旧 src、旧测试/母版、Profile/Pixel 文档、两份 plans，以及相关原型发布/准备/oracle 脚本差异为空。工程基础的整改没有被步骤 03 覆盖。

原型输出四 PNG 与批准的 `step01-56368269c8328e0f84b9` **字节相同**；独立 Python stdlib CRC/inflate/filter 解码的 RGBA 也相同。对应完整 SHA 存于 `artifact-verification.json.txt`。未改母版、来源、阈值或历史 Manifest。

本轮对实际正版未修改核心 SHA `4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f` 再执行 VM oracle：960 个图块状态、2,211,840 像素、241 updates 均通过。统计为两素材族 ×（两草地槽×1状态＋两水槽×4播放状态）×48形状=960；每图块48×48=2304像素，总计2,211,840。241 是更新计数0至240。原生核心作为外部选图 oracle，但运行层是 stub/Node VM；不能称原装 Host、GPU、编辑器手绘或游戏实机 PASS。

## 6. 历史问题的独立关闭核对

| 历史编号/根因                                 | 本轮核对结果                                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| STEP02-R1-001：Vite 私有目录/Origin           | FIXED；受限 roots、所有深度 .local/default secrets、publicDir=false、精确 Origin/Host 仍在；当前实际 CLI 拒绝合成私有内容，正常开发和冷缓存加载通过    |
| STEP02-R2-001：包装/别名后的真实目标          | FIXED；实际 resolver→realpath、load 再检查、缺失/伪虚拟 fail closed；file/dir symlink、包装/编码/query/method 回归仍通过                               |
| STEP02-R3-001：PNG EXIF 触达旧 native decoder | FIXED；实际 Sharp 0.35.5/libvips 8.18.7；当前四个旧入口回归执行，普通 EXIF 接受行为和 PNG 像素未被篡改；新 adapter 对 EXIF 显式 repair                 |
| STEP03-R1-001：稀疏动画/JSON                  | FIXED；密集自有索引检查；新独立 sequence/metadata 拒绝控制及当前回归通过                                                                               |
| STEP03-R1-002：遗漏参数依赖                   | FIXED；显式参数字段参与 IR hash 和必备依赖；删除后重哈希拒绝，样例 exact binding 和历史缺依赖测试通过                                                  |
| STEP03-R1-003：同源多版本/采用模型冲突        | FIXED；recipe/IR/current 一逻辑身份一版本；catalog 保留多版本；本轮 own dependencies、采用/历史和冲突控制通过                                          |
| STEP03-R1-004：overlay 源 palette 漏验        | FIXED；合成前 visible overlay palette 检查保留；当前拒绝源 red alpha1/允许 composite 的反例和合法控制通过，独立 Decimal 验证 composite [44,100,30,255] |
| STEP03-R1-005：未播放帧被误判动画             | FIXED；实际 sequence 可达 pixelHash 检查；本轮 direct IR/Built 未播放变动拒绝、generic 真实变动通过                                                    |

核验历史主要 ledger：步骤 02 R4 **59 文件**、步骤 03 R1 **50 文件**、R2 **52 文件**、最终 Coding fix **50 文件**，全部 SHA 对应保存的真实路径。历史失败和平台中断没有被改写成 PASS；历史 R1 五个 P2 与本轮新增字段类型问题不重复计数。

本轮直接重新执行必要门禁并审查代码，而不是根据上述 ledger 或历史 FIXED 字样自动关闭。既有 esbuild 仍是单独的范围限定非阻断记录，不并入已修复 Sharp 问题。

## 7. 新发现（按严重程度、已去重）

### GR-0203-001 — P2，阻断当前已交付责任

类别：**跨模块契约/实现缺陷**。所属：**步骤 03**。要求：正式方案§8.2–8.4、§11.1以及步骤03的源/IR硬校验、类型化中间结果、稳定身份和不可变历史；STEP_03_BASELINE 的 owned snapshot、唯一语义区域和再次校验 Built。

目标文件：`packages/asset-core/src/index.ts`。

- `buildProcessedAsset` **723–737，关键725/733**：只用 regex 校验 id，没有先检查 string；随后把调用方 id 引用放进仅浅冻结的 Built。
- `geometry` **515–522，关键516**：regex 对 region.name 隐式转字符串，Set 去重却按对象引用，因此相同内容的两份数组都能作为“唯一名称”通过。
- `validateTileIR` **571–579，关键574/575**：对 opaque 使用 truthiness，没有要求 boolean true。

触发条件是公共生产 JS 导出收到普通、可 JSON 表达的非法输入；不需要恶意 getter、prototype 修改、共享内存竞态或未来 HTTP 入口。复现从本轮合法 2×2、两水源、owned image、正确 ref/hash 的控制配方开始。

实测三种表现属于同一“标量类型检查缺失”根因：

1. `const id=['build-one']; const built=buildProcessedAsset(validCompilable,id); id[0]='build-two'`：成功得到 BUILT_ARTIFACT；`Object.isFrozen(built)===true`，`Object.isFrozen(built.id)===false`；修改调用方数组后 built.id 和整体 JSON 变化，artifactHash 保持原 IR hash。预期在构造前拒绝非字符串 id，而不是持有可变别名。
2. 两个 region.name 分别为独立的 `['same']` 数组：`geometry` 接受，并可经 **shorelineParameters→shorelineRecipe→processShoreline→buildProcessedAsset** 完整进入 BUILT_ARTIFACT，IR 保留两个重复数组名称。预期唯一、合法字符串名称；当前 Set 不能对这些输入保证唯一性。
3. 将合法 IR 的 ground.opaque 改为 `'false'`、`1`、`[]` 或 `{}`，重新计算内容 hash：全部通过 hard IR 和 Built，保存相应非法类型。像素仍通过不透明检查，因此这是元数据契约缺陷，不能表述为已产生透明图集。预期这些非法类型在 IR_SEMANTICS 边界拒绝。

证据：`domain-probe.mjs.txt`、`domain-results.json.txt`、`domain-confirmation.log`，均通过实际构建后的 `@tileset/asset-core` / `@tileset/material-processing` package exports 执行；正常 literal 配方、版本/像素控制先通过。脚本 exit0 表示复现和控制检查成功，**不是“没有缺陷”的 PASS**；非法接纳分别作为 observations 保存。

影响：Built 稳定身份/不可变性承诺被违反；处理链路和硬 IR 接纳 schema 不合法、语义区域名称不唯一的中间结果。生产 `.d.ts` 的 string/boolean 不能替代这些公开 JS 边界的运行时验证。正常当前 fixture 不触发此问题，既有正确 PNG 没有因此变坏；当前无 HTTP 可达入口，不定为 P1 安全漏洞。

必要最小整改：id/name 先做 `typeof === 'string'` 再验证格式和去重；Surface opaque 明确要求 boolean true；审计同类标量字段。保留现有 pixel/ref/hash/状态检查和 crypto-only 依赖。加入公共 JS/不可信 JSON 形状的拒绝回归及合法控制，确保错误发生于 Compilable/Built 前；不能靠冻结非法数组或 TypeScript cast 掩盖问题。无需新增 Zod 到领域核心。

**阻断当前责任：是。影响步骤 04：是，应先修复和独立复审硬 IR/Built 边界，再让 Compiler 依赖其合法性与身份。**

### GR-0203-002 — P3，非阻断

类别：**改进建议（证据索引状态滞后）**。所属：跨步骤。位置：`docs/engineering/V1_REQUIREMENTS_EVIDENCE.md` **9、21行**。

该滚动映射的“当前证据/状态”仍写步骤 03 独立第二轮待执行、PNG policy Review 待完成；同一 REVIEW_TARGET 已包含最终 R2 报告、release/main CI 和最终交付记录。本轮已直接核验其历史证据，所以这里不是实际缺少 Review/CI，也不否定发布完整性。

要求来自正式方案§14.4及步骤02开始持续维护需求—步骤—验证—证据映射。触发为按此当前索引判断项目门禁；实际会误读为旧待执行状态，预期引用真实最终检查点并保留版本绑定。证据为目标文件文本与已核验的 R2/release/CI。

建议在后续获授权的文档整改中补最终发布和本次联合 Review 的引用，分别标明历史局部 PASS 与本轮 REQUIRES_REVISION；不改写原始历史报告/Manifest。**不阻断已交付能力或步骤 04 的技术基础；独立阻断项只有 GR-0203-001。**

## 8. 本轮执行、构建及 CI 证据的解释

`commands.jsonl.txt` 保存有效临时 checkout 的24条命令及实际时间/退出，原始 stdout/stderr 在对应日志。下表只列主要结论；三个 exit1 为预期不可变拒绝。

| 本轮执行                                                    | 实際结果                                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| frozen install、Client generate、新集群迁移                 | PASS；锁文件未改，独立 SCRAM 集群                                                               |
| `pnpm check`                                                | PASS：129/129、15文件、八成员边界/固定版本、Strict/lint/format、干净全 build、六个生产 ESM 导出 |
| `pnpm test:dev-privacy`                                     | PASS 5/5；530记录=522拒绝+8正常成功；零假哨兵内容读取                                           |
| `pnpm test:integration`                                     | PASS 3/3；真实 HTTP/Prisma/DB，相同行与拒绝无写入                                               |
| `pnpm test:e2e`、`E2E_MODE=dev pnpm test:e2e`、冷缓存同命令 | 各1/1；201、刷新读回、Pixi ready、零 pageerror；三张截图实际查看                                |
| 独立 domain/像素 probe                                      | 18项合法/拒绝控制通过，其中九项 Decimal、一项含81个二维重叠场景；新增缺陷另作 observations      |
| 独立 codec probe                                            | 六项通过，包括 wire streaming/owned bytes、Alpha往返、EXIF repair、超量停止拉取及正常最大 plane |
| 编译后端 runtime probe                                      | 十项通过，含 safe startup refusals、写边界、同一 DB 行、503恢复及清理自身行                     |
| 工程、步骤03工程、material sample、prototype 发布           | 均成功，新 Manifest/commit/lock/逐文件身份核验                                                  |
| 三种重复发布                                                | 均预期exit1；四份本轮产物共197个文件保持原样，无 stage/lock 遗留                                |
| independent PNG decode、原生核心VM oracle                   | 4旧PNG/11样例PNG literal和RGBA一致；960/2,211,840/241通过                                       |

72 是步骤02 Vitest 总数：52原型＋2HTTP＋3Gateway＋6API安全/配置＋5Vite隐私＋4codec。**DB3 和浏览器用例不在72内**。129包含72，再加步骤03原44及整改13；原型52和隐私5也是129的子集。单独再执行 privacy5不是新增独立功能覆盖。

历史“52独立案例”来自R2 `domain-static/results.jsonl`：52条case加1条summary，重点为五个旧根因及合法/拒绝控制；它不是52个新的整个产品端到端测试，也不同于R2 ledger的52个证据文件。本轮直接审查该脚本/结果范围和其ledger统计，没有将历史执行冒充本轮新执行。

530 是隐私脚本已保存的请求记录，不是独立漏洞数；还执行了未进入checks数组的3项 foreign OPTIONS断言。960是包含重复水源1播放状态的图块渲染状态检查，不是960个用户手工绘图场景。这些数字不能与129/52/像素数量简单相加成覆盖率。

本轮新构建（均绑定 REVIEW_TARGET）：

| Build ID                                        | Manifest SHA-256                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `step02-784a39fb9739-dacc394b09ec5538`          | `2b2e976bf5015ed42ba5189308541e12cca1f542cad226c3d7cc1bd4e041b460` |
| `step03-784a39fb9739-3309a5d39d103d86`          | `f7deb8ebb628c55847c64ed45c34a4871865e877a56d130f3846917284c31965` |
| `step03-material-784a39fb9739-5c1c1e8a30c43896` | `bb049649ce1b1ad8d66936d70ab45ffbff292d01a310c612165bcaf50a751886` |
| `step01-c013b8835a6c1b1e488b`                   | `442a42b72bcf1e1ad6f04901f7104ca04382bd5d6d0c323b9c8ceea065ce239a` |

`build:engineering` 默认标签仍是step02，当前目标包含八工作区，故该新工程有88 payload；另用同一干净dist发布了明确step03标签。不把它描述为重现历史70文件的步骤02目录。实际当前编译文件与a0的88文件完全一致，样例13文件一致；新Manifest仅按当前commit等包装身份变化。旧不可变目录没有被覆盖。

远端只读核验：两步候选CI [38201263354](https://github.com/y805939188/rpg-maker-maker/actions/runs/38201263354)、[38212088525](https://github.com/y805939188/rpg-maker-maker/actions/runs/38212088525)，功能main CI [38201664942](https://github.com/y805939188/rpg-maker-maker/actions/runs/38201664942)、[38212585754](https://github.com/y805939188/rpg-maker-maker/actions/runs/38212585754)，目标main CI [38213568627](https://github.com/y805939188/rpg-maker-maker/actions/runs/38213568627) 的实际baseline job/必要steps均success。对两次功能main及REVIEW_TARGET取原始job日志，核实实际checkout SHA、72/129、exports、privacy、DB和两种浏览器结果；不是仅看绿色状态。

目标CI确实测试784a，129通过且其必要命令没有被跳过；workflow没有 continue-on-error 吞掉这些失败。CI是Ubuntu24.04、PostgreSQL14.20临时trust服务，本地新SCRAM集群另行验证。CI不执行本轮新增非法标量案例、不证明原装Host、完整安全或未实现业务；**绿色CI不能关闭GR-0203-001**。

## 9. 图片政策、外部核对及未执行/延期项

实际native child返回 Sharp0.35.5、libvips8.18.7、libexif0.6.26，不只读取package.json。新入口先限制encoded/chunk/metadata/IHDR像素，再进入短生命周期child；禁止不支持的色彩/动画，EXIF/text明确repair，未提供服务器路径、HTTP/remote入口。

本轮最大普通高熵输入为768×576，encoded1,514,097 bytes、decoded1,769,472 bytes；实际child处理72.60ms、总decode调用241.09ms，返回时RSS99,680,256 bytes。已有完整suite同时验证单读/codec槽、无队列、deadline、普通stalled worker SIGKILL及slot恢复。本轮没有无界内存耗尽、恶意crash媒体或第三方目标实验。

128MiB只限制child JS old-space，不能限制libvips/native或OS RSS。上述RSS是普通输入某时刻观测，不是峰值、任意媒体预算或硬上限。外部producer预分配仍不受包控制。当前文档诚实保留这些边界；未来HTTP/remote入口必须重新验收读取/并发/CPU/native memory预算。

2026-10-12直接读取供应方公告：[libvips EXIF公告](https://github.com/libvips/libvips/security/advisories/GHSA-jmwm-wc68-mhwm)（2026-07-17，修复≥8.18.2）及[Sharp覆盖公告](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj)（2026-07-17，修复≥0.35.0），实际加载版本超过对应修复下限，支持关闭旧EXIF依赖问题。此结论不扩展为任意媒体安全证明。

既有esbuild0.27.7范围记录保留。供应方[Windows standalone serve/servedir公告](https://github.com/evanw/esbuild/security/advisories/GHSA-g7r4-m6w7-qqqr)（2026-06-11，修复≥0.28.1）与本轮源/依赖使用检查支持原延后依据：当前Vite使用transform/build/自己的HTTP服务，未调用受影响的standalone serve/servedir；本机Darwin、CI Linux。未执行Windows该条件、没有重新运行整个网络审计，也没有宣称全局audit clean。启用该入口前仍由工程Coding验收兼容修复。

继续保留：

- Original Native MZ Host Compatibility：**NOT_EXECUTED**，V1.0前必要门禁，最迟步骤10关闭。
- Map003(4,10)：**PENDING_USER_EVIDENCE**，本轮只保护原地图，不重绘或伪造保存证据。
- 新MZ编辑器/游戏/人工美术验收：**NOT_EXECUTED**；工程壳截图和VM oracle不替代实机。
- 正式Compiler、Pack、资产/任务持久化/CAS/恢复、Studio上传/动画预览、真实AI等后续功能：本轮**不实现、不授权**。

没有发现当前新增入口违反这些延期条件。它们不自动否定当前已批准阶段基线；本轮FIX_BEFORE_STEP_04的原因是新确认的当前硬契约缺陷。

## 10. 给后续 Coding 会话的最小清单

1. 在asset-core修复GR-0203-001三个具体标量检查点，检查同类字段；保留领域框架无关、crypto-only方向。
2. 增加拒绝数组/对象ID、重复数组region.name、非布尔opaque的运行时回归；合法string/boolean配方、像素和历史控制继续通过。确认Built不持有调用方可变ID引用。
3. 对新固定候选执行相关领域/像素/生产导出与必要工程回归，重新绑定构建及独立Review；保留本轮失败复现和旧不可变产物。不得只增加类型声明或修改Golden让检查通过。
4. 非阻断地更新滚动需求证据索引，保留历史局部PASS的提交绑定并引用本轮结论。

本清单不是整改授权；本会话已停止在报告交付，不进行上述修改。修复通过也不会自动授权步骤04。

## 11. 原工作区、历史数据和结束状态

写报告前已核验原工作区863个受跟踪文件SHA不变、Git clean；目标checkout862个受跟踪blob与固定Git树完全一致。原有所有refs不变，原HEAD/分支不变。登记14份历史构建共514个payload＋Manifest文件全部验真，另对原保护快照549个文件核验未变；514是其中的子集，不重复计覆盖。十份Map002/003哈希与保存记录及本轮快照一致，未编辑地图、MZ工程或runtime。

结束时仅新增本报告和唯一证据目录；最终完整状态补充在 `workspace-after.json`。没有原有受跟踪文件变化、提交、merge/rebase/reset/clean/push或调度结果修改。唯一Git管理元数据变化是两个本轮新建detached worktree的注册。

本轮API/Web/集成/隐私服务均关闭；55439自有数据库安全stop并保留数据/0600凭据；4339/4340/5199/55439、最后隐私端口及旧55432/55433/55434无监听。旧三个集群没有被读取业务数据、启动、初始化、重置或关闭。浏览器测试仅在新集群留下三个随机合成项目，独立runtime/integration已清理自己记录的行；数据未导出。两个本轮checkout及其依赖/缓存/新构建保留供复核，未删除历史worktree或验收文件。

最终建议仍为 **FIX_BEFORE_STEP_04**：工程与正常素材处理基础具有充分当前证据，但应先关闭GR-0203-001并取得新候选的独立结论。历史委托批准保持历史事实；本轮没有批准、启动或实施步骤04。
