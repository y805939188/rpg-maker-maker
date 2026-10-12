# 步骤 05 Pack / Layout / Atlas / Export 独立技术审查

日期：2026-10-13，Asia/Shanghai。Reviewer：独立会话 `01a13128-4512-7cb1-93fb-0cfcfe656632`。本轮没有参与 Coding、修复实现或正式测试，没有调度 Coding/Review 子 Agent。

| 结论层次         | 本轮结论               |
| ---------------- | ---------------------- |
| 代码与跨模块审查 | **REQUIRES_REVISION**  |
| 独立验证覆盖     | **COMPLETE_FOR_SCOPE** |
| 步骤 05 MZ 实机  | **NOT_EXECUTED**       |
| 步骤 05 整体建议 | **REQUIRES_REVISION**  |

发现 **1 项阻断 P2：STEP05-IR-001**。四个发布入口存在同一目录归属缺陷：本次未创建的暂存目录仍会被失败清理递归删除。P0/P1 为 0，其他新增已确认问题为 0。标准成功产物、Pack 状态机、真实 Compiler 链路和像素检查均得到独立支持，但不能因此批准违反失败保护契约的候选。

COMPLETE_FOR_SCOPE 表示本报告列明的代码阅读、隔离复测、定向反例和交付审计已完成；它可以包含检出的失败，不代表没有缺陷，不涵盖 MZ GUI/游戏/主观美术、未来持久化或全部可能输入。步骤 05 未 APPROVED，步骤 06 未启动。

## 1. 精确版本、基线与 Git 关系

| 对象                        | 实际核对结果                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 步骤 04 已复审功能          | `44a5239a979cd549e893df705df7704d043216be`                                                                                         |
| 步骤 05 开发起点            | `af5b8e1c61175ca5627b15df37405e248bf26b37`，直接父提交为上述步骤 04 功能                                                           |
| REVIEW_TARGET               | `c09027f921e7d67469b301083db89acc44433d9e`，父提交为初始步骤 05 候选 `5062f1c77b4817edb0acaddf275b56a4371a5d25`                    |
| DOCS_TARGET                 | `ed189f7c274a7f397d261630bae396abb456665d`，直接父提交为 REVIEW_TARGET                                                             |
| 主工作区 / 本步 Coding 检出 | `/Users/dingshinn/Desktop/rpg-maker-maker`；`codex/step-05-pack-assembly` / DOCS_TARGET；开始时 tracked/untracked porcelain 均为空 |
| local main / origin/main    | `fc407198eefad9336ba97fb9482bdd832ca78f83`                                                                                         |
| 实时只读远端                | 开始、结束均为该 main；查询未返回 `codex/step-05-pack-assembly` 远端分支                                                           |
| 本轮检出                    | `/private/tmp/tileset-step05-independent-c09027f-20261013-013024/checkout`，detached REVIEW_TARGET                                 |

基线链确实包含已复审步骤 04，没有在旧 main 上重做 Compiler。开发起点到功能候选的 63 个变化路径包括新 Pack 模块/测试/工具、工程登记、契约与旧 Review 原字节归档。功能候选到文档 HEAD 的 105 个路径逐类核对：README、需求索引、Coding 报告与证据，没有新增生产代码、测试、锁文件或执行配置。证据中的脚本以 `.txt` 保存，不被构建或正式测试收集；归档旧 Reviewer 原文不构成本轮新 Review。

从步骤 04 功能到当前候选，原 `src`、母版、两份 plans、Profile/Pixel Contract、领域/处理/codec/Compiler、API/Web/contracts/Gateway/CI 均无差异。原正式测试没有删改，新增两个测试文件。锁文件仅新增 workspace importer/link，未改变 registry resolution/integrity 或直接依赖版本。

作者 ledger 的 103 个 files 引用及 Coding 报告，共 **104 个 SHA** 全部匹配。步骤 04 独立报告原 SHA `903818ab1e8072eb6748818ea32634e01e79ea38ddba3a3be8ef0e5fdc72e748` 匹配。`.prettierignore` 本步只增加这一报告的精确路径及说明；既有 `/scripts/*.ts`、`docs/evidence` 等忽略规则未扩大，没有新增生产/测试/全体文档忽略规则。[版本审计](../evidence/step-05/independent-c09027f-20261013-013024/version-audit.json)、[路径与证据审计](../evidence/step-05/independent-c09027f-20261013-013024/author-evidence-audit.json)。

## 2. 配置、独立性与执行方法

本回合客户端 rollout 的 `turn_context` 时间为 `2026-10-12T17:28:09.763Z`，记录 `model=gpt-6.1-sol`、`effort=ultra`；collaboration settings 相同。本地客户端配置记录 `service_tier=default`。当前会话 ID 与作者配置证据中的 Coding 会话 `01a130ef-3487-7ec3-ac29-38d902367d10` 不同。

UI 只读读取超时，没有取得明确配置不符的显示。逐请求 tier、服务端最终 tier 均 **UNVERIFIED_NOT_EXPOSED**；客户端配置不是服务端实际执行证明，未宣称已经验证这些不可见字段。按照本次用户允许的不可见字段规则继续。可用子 Agent 元数据仅列 Priority，无法确认 Standard，故全部审查由当前会话顺序完成；没有切换模型、档位、推理强度或全局配置。[配置证据](../evidence/step-05/independent-c09027f-20261013-013024/configuration.json)。OpenAI Docs 技能只用于配置辅助核对，[官方说明](https://developers.openai.com/api/docs/guides/agents-api/configuration)不替代本会话日志。

受审源码只读；依赖在仓库外专属 worktree 和专属 pnpm store 按 frozen lock 安装。只生成 Prisma Client，无 DB 连接/迁移。所有故障注入只使用本轮合成目录/文件；prepare 使用先复制到本轮目录的专属来源工程。没有对作者 artifacts、ZIP、原手绘工程执行写入实验。

## 3. 实际阅读覆盖

完整阅读 AGENTS.md、两份正式 plans、MZ_RUNTIME_ENVIRONMENT、STEP_03/04/05_BASELINE、V1_REQUIREMENTS_EVIDENCE、Target Profile/Pixel Contract、最新步骤 04 独立 Review、阶段 receipt/保存地图检查、步骤 05 Coding/验收指南/模板，以及 ledger、commands、builds、delivery、候选比较和相关原始结果。

完整审查 `packages/pack-assembly/src/index.ts` 的全部公开入口与内部验证器、两个新测试文件，`pack-export.ts`、`build-pack-sample.ts`、`step05-fixture.ts`、`export-pack.ts`、`prepare-step05.ts`、`verify-step05.ts`，以及修改的 package/lock、方向、clean/build/exports/engineering 脚本。沿链路阅读原 Compiler 的拥有校验/内容身份、素材配方、领域 JSON/ref/IR/像素所有权、PNG 解码入口、来源 fixture 和原生 oracle。没有把这种范围审查描述成逐行审计所有旧应用或第三方依赖。

## 4. 要求 → 实现 → 独立验证矩阵

以下行号为 REVIEW_TARGET；DOCS_TARGET 未改变实现。

| 当前要求                     | 实现位置                                                                                  | 验证与结论                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 真实 Compiler 执行与唯一分配 | pack-assembly `registry` 162–182 / `planPack` 366–482；pack-export `replayArchives` 28–50 | 真实六源 PNG 重放、Compiler-owned Fragment、JSON伪造拒绝、新进程 CLI；PASS             |
| 稳定逻辑身份、精确 revision  | `snapshot` 207–340 / `registry` 169–178                                                   | 同 revision 不变、顺序/遗漏/冲突/重哈希反例，来源修订冲突正式测试；PASS                |
| 完整历史与根状态             | `history` 341–352 / `snapshot` 237–327                                                    | previousHash/版本/Pack 身份、根及后续非法退役、实际 JSON 重读；PASS                    |
| 显式新增/更新/退役/容量      | `planPack` 393–480                                                                        | ASCII 顺序、原槽位、重复操作拒绝、退休不可更新/复用、满载 C 拒绝；PASS                 |
| 精确水草配套                 | `pairings` 183–205                                                                        | 同 IR/recipe/parameters/dependencies/density；合法批量更新、退休依赖限制；PASS         |
| Layout 硬边界与唯一位置      | `layout` 483–539 / `validateLayout` 540–560                                               | 类型、遗漏/重复/稀疏、位置/尺寸/kind/TileID/状态，重哈希仍拒绝；PASS                   |
| 完整 Atlas / 所有权          | `renderAtlas` 562–591；asset-core `RgbaImage` 49–68                                       | 手写坐标完整像素、全透明保留区、输入/历史/像素副本/异步修改；PASS                      |
| 八文件来源和内容一致         | pack-export 60–127                                                                        | 8套重放、64文件逐字节复现、Manifest/说明/PNG/源一致；PASS                              |
| 不覆盖与失败目录归属         | pack-export `publishDirectory` 129–138；suite/prepare/engineering finally                 | 已有成功保护、验证失败清理、同名并发支持；**未拥有 stage 被删除，FAIL，STEP05-IR-001** |
| 工程方向/生产 exports        | package/lock、check-boundaries、build/clean/verify-exports                                | 10工作区、完整 check、8真实ESM exports、121工程 payload；PASS                          |
| 首次安装/旧图验收材料        | prepare-step05 12–46、指南/ZIP/现有副本                                                   | 原字节、资源/TileID/逻辑映射/flags 和材料核验；准备可用，MZ操作未执行                  |

## 5. 真实生产链与职责分离

源 PNG 字节及 descriptor/revision/provenance → RawSource → `decodeSource` 的有界解码/validated ownership → `processShoreline` 的精确六源、style、parameters、recipe → `buildProcessedAsset` 的硬 IR → 正式 `compileFragment` → 真实 Fragment → `planPack` → `validateLayout` → `renderAtlas` → `encodePng` → 实际 PNG 解码/字节像素比较 → stage 八文件重读/完整校验 → rename 发布。

sources.json 自包含 PNG base64 和精确配方元数据。离线入口重新解码、验证领域和运行原 Compiler，重新获得该进程的 owned Fragment；没有读取作者内存注册表、私有路径、旧缓存或数据库。本轮新进程从 `incremental-v4.request.json` 独立导出八文件，全部与正式 v4 字节相同。

Planner 是唯一生产槽位分配者。Renderer 先重验 Plan，再复制指定绝对矩形，没有重新选槽、缩放、平滑或另一套 quarter 规则。导出工具不换布局/Fragment。Profile 完整内容 hash 固定，坐标来自传入的原 `src/profile.ts`；Compiler 保留相对布局与放置约束。`pack-assembly → asset-core + mz-compiler`，无文件 I/O、codec、框架、数据库或 Provider；基础设施在根工具层。

## 6. 身份、历史、稳定槽位与配套

Pack ID/version、逻辑素材 ID/revision、来源 revision、Fragment hash、Profile/previousHash 和槽位状态分别维护。完整前序快照从版本1连续验证；遗漏 operations 保留绑定，新增按 ASCII logicalId / Profile 顺序使用 NEVER_USED。JSON 描述须与真实 Fragment 完全一致，不能靠普通 hash 或“成功”字符串取代执行校验。

ACTIVE 更新保留 atlas/kind/logicalId；同 revision 只能完全同绑定，更高 revision 才能变更。重复或组合操作对同 ID 拒绝，失败没有返回部分有效结果。RETIRED 保留最后绑定/像素/来源，不回到 NEVER_USED、不重激活/更新、不自动复用。容量满载不能写入物理保留区域。

c09027f 的根退役修订确实生效：validatePack、history→planPack、validateLayout、renderAtlas 都拒绝无历史的 RETIRED；本轮还修改实际 pack/layout/manifest JSON 并重算身份，readPackExport 仍以 PACK_TRANSITION 拒绝。后续 NEVER_USED→RETIRED 同样拒绝，不仅覆盖作者单条回归。

同 kind+来源 id+revision 的注册表内容冲突被拒绝，旧快照/历史拥有独立 JSON，像素为私有副本。水面 groundId 对应草地同处理 IR、配方/参数/依赖及密度；草地 components 包含于水面精确来源。单独更新草地而保留旧水面被拒绝，完整配套更新合法；退休水面仍限制对应草地变更，符合公开契约和旧岸线兼容语义。后来出现新 revision 不使历史 Pack 失效。

这些是内部一致性和允许转换的校验，不是外来历史真实性、用户授权或第三方签名的证明。本轮没有要求步骤05承担未承诺的权威数据库/认证平台。

## 7. Layout、最终 PNG、Manifest 和 sources

独立 Python 探针以旧创作母版、明确 RGB 置换、新旧组选择及四个手写 Profile 坐标构造期望；不读取 Plan 来选择预期位置，不导入 Planner/Compiler/Sharp。16 张完整 PNG 的全部 RGBA 与期望相同，包括 ACTIVE/RETIRED、三个横向源帧、所有保留区零 RGBA和不应更新区域。PNG 为完整 768×576、8bit RGBA、非隔行，CRC/zlib/过滤器重建通过；raw SHA 与 Manifest 相同。[像素/ZIP证据](../evidence/step-05/independent-c09027f-20261013-013024/png-probe.json)。

实际八文件精确清单：A1.png、A2.png、pack.json、history.json、layout.json、sources.json、INSTALL.md、manifest.json。读回校验不仅 parse：来源重放、历史/绑定、唯一 Plan、实际 PNG 全像素、说明全文、逐文件 bytes/hash、Profile/版本/依赖及 Manifest 重建相互一致。Build ID 从不含自身 ID 的 identity 摘要产生；Manifest 自身最终 SHA 由外部证据记录，不存在自引用计算循环。人工/独立审查状态保留未执行，由本报告另行记录，没有给旧 Manifest 添 PASS。

本地输入边界实际为≤128配方、每配方六源、PNG base64长度/规范性、累计32MiB源 PNG、≤1024 Fragment、最多255前序快照加当前、≤8 operations；单文件读取预算48MiB。小型非法 base64、错误 validationHash、重复配方、字段/稀疏输入及数量超界均拒绝。本轮未做无界耗尽测试，也未把现有 codec 预算说成未来 HTTP 防护。

## 8. 八套样例与作者统计口径

| 样例                                   | 独立核对行为                                                         |
| -------------------------------------- | -------------------------------------------------------------------- |
| incremental-v1                         | 只有 A：water kind4、ground kind16；其他两槽 NEVER_USED              |
| incremental-v2                         | 新增 B 至 kind6/17；A绑定和像素保持，B配色可辨                       |
| incremental-v3                         | A逻辑 revision2 配套更新，kind4/16不变；B未更新                      |
| incremental-v4                         | B退役，kind6/17与最后内容保持；PNG与v3相同                           |
| art-old-map-v1 / diagnostic-old-map-v1 | 恢复原四图和 kind4/6/16/17，A/B全部 ACTIVE                           |
| art-old-map-v2 / diagnostic-old-map-v2 | A配套 revision2 改色，B RETIRED且原像素保留；新增C因无NEVER_USED拒绝 |

八套标准目录 **64文件** 和八个 request 与作者正式候选逐字节相同；suite index 只有本轮输出绝对路径不同。工程构建 **121 payload + Manifest** 逐字节复现，Build `step05-c09027f921e7-140ec0b68f156030`、Manifest SHA `a1eb731038f19c8c4b522bbe986c85ed8a1a9f6f31c1f9da10dad8ba700cbfbb` 精确一致。[构建比较](../evidence/step-05/independent-c09027f-20261013-013024/rebuild-comparison.json)。

210 是旧188加新22，19测试文件；Pack测试22已经包含其中。原JS脚本 SHA `506ec056e7eecde0410e7f05093531ed3d62a5f83b7a2d61482ef662c6c801b9`，78/78，与unit存在重叠，不相加为独立覆盖率。

每个完整四槽Pack：48×(2草×1状态+2水×4状态)=480；仅A的v1为240。7×480+240=**3600**，×48×48=**8,294,400像素**。四播放状态包含源1重复，不是四源帧。每套 `nativeUpdates(600)` 为初始0加600调用的 **601观测**，不能称601次实际 update 调用。0–46为连接形态，47代表图另计。

原生 CPU oracle 执行 SHA 固定 `4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f` 核心中的原 Tilemap 定义；stub仅承载 Container、捕获 addRect 和提供未启用的 table 属性，不替换选择规则。实际 PNG先重读并与重建全像素一致，再进入原生矩形对照；不是只验原型。8套本轮亲自运行全部PASS。12张矩阵来自 incremental-v2、art-old-map-v2、diagnostic-old-map-v2，各四状态；本轮再生成矩阵及reference，与ZIP对应来源字节相同。[CPU结果](../evidence/step-05/independent-c09027f-20261013-013024/oracle-summary.json)。

作者 Python/literal 预期属于作者自测，方法已核查；本轮另写PNG解码/期望程序亲自核验，不将作者日志改称独立Review。

## 9. 实际执行与未执行

| 本轮实际执行                           | 结果                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| frozen install / Prisma Client生成     | 固定Node22.21.1 / pnpm10.20.0成功；未连接DB                                            |
| pnpm check                             | exit0；10工作区、Strict/lint/format、210/210、clean生产build、8ESM exports             |
| pnpm test:step05                       | exit0；2文件22/22                                                                      |
| 原公开JS脚本                           | exit0；78/78，原字节不变                                                               |
| 工程构建 / Pack suite                  | exit0；121工程payload、8套标准Pack，实际SHA精确复现                                    |
| 自写 state / boundary 探针             | 64+6条具名检查通过；含根退役实际重哈希JSON读回及数量预算                               |
| 自写发布失败保护探针                   | 验证失败自身stage清理、旧成功、有限同名并发通过；**四入口未拥有stage被删除，确认缺陷** |
| 独立Python最终PNG/ZIP                  | exit0；16全像素、95 ZIP成员/哈希、12矩阵/reference                                     |
| 新进程 export-pack / 重复导出          | exit0且八文件全等；重复exit1明确拒绝，原结果保持                                       |
| 原生核心CPU复测                        | 8套exit0，3600状态/8,294,400像素、每套601观测                                          |
| prepare-step05专属来源副本→新副本      | exit0；五份JSON原字节、四张替换PNG、TileID映射复核                                     |
| step03 material / step01 prototype回归 | exit0；13素材payload/4原型PNG与作者回归字节相同                                        |

作者保存的 material/prototype 回归包装来自初始5062f1c；本轮在精确c09027f重新运行，源码commit/锁身份不同导致新Build/Manifest正常不同，13/4 payload相同。没有将旧包装身份冒充最终候选。[回归比较](../evidence/step-05/independent-c09027f-20261013-013024/regression-comparison.json)。

失败执行如实保留：首次普通pnpm调用实际Node22.14.0，工程正确拒绝；为本轮命令设置固定PATH后通过。第一次原JS使用data URL无package解析基址而失败，改在隔离 `.local` 保存原字节脚本后78通过；自写state探针有一条未使用的读取误写 `source.material.id`，在检查前失败，改正自写探针后64通过，原探针/日志保留。这些不是生产缺陷，也未修改正式测试。比较回归时先要求不同commit包装身份相等的临时断言失败，随后按声明的payload/包装区分核对；没有删减任何生产失败用例。

关键 argv、退出码及日志见 [commands](../evidence/step-05/independent-c09027f-20261013-013024/commands.json)；早期四条命令开始时间未单独记录，明确写NOT_RECORDED，没有从mtime伪造精确时间。完整只读探查历史留在本会话及外部目录。

DB集成/迁移、Playwright开发/生产、远端CI、MZ编辑器/Host/真实游戏/主观视觉本轮 **NOT_EXECUTED**。diff没有API/Web/Prisma/HTTP/页面行为或新DB依赖，现有unit/Vite隐私检查已在check运行，故不为形式完整启动数据库/浏览器；这些未执行不作为本步实现缺陷。既有Vite大chunk提示、codec无OS硬RSS上限继续保留，未新增平台级防护承诺。

## 10. 已确认发现与最小整改

### STEP05-IR-001 — 未取得暂存目录所有权仍递归清理

- **严重度：P2；类别：实现/失败保护；阻断：是。**
- **REVIEW_TARGET位置：** `scripts/pack-export.ts` 的 `publishDirectory` 129–138（尤其138）；`scripts/build-pack-sample.ts` 14–20、47；`scripts/prepare-step05.ts` 33–37、47；`scripts/build-engineering.mjs` 74–80、113–115。后三者独立入口，同一根因去重为一项。engineering模式已经存在于步骤04基线，不是声称本步新引入，但当前步骤05正式发布仍可触达。
- **对应要求：** STEP_05_BASELINE的单机失败stage保护，以及本次审查E明确的“只清理本次拥有的临时目录”“不删除旧成功或无关文件”；不属于步骤06分布式锁/CAS范围。
- **触发：** 目标或预测暂存路径已存在，且对应stage目录中已有文件。路径使用固定PID后缀，可由遗留目录/PID重用或其他已存在数据触发，无须修改生产源码。
- **实际：** mkdir(stage)因EEXIST失败、或者已有target检查先抛错，finally仍 `rm(stage,{recursive:true,force:true})`。prepare甚至先明确报“Project staging directory already exists”，随后删除该目录。
- **预期：** 拒绝并保留未由本次成功创建的目录；只有本次拥有的stage可清理。已有成功目标继续拒绝覆盖。
- **直接证据：** [publish-probe.json](../evidence/step-05/independent-c09027f-20261013-013024/publish-probe.json)中通用publisher两个反例、suite/prepare子进程反例均 `unownedStagePreserved=false`；[engineering反例](../evidence/step-05/independent-c09027f-20261013-013024/engineering-collision.json)同样false。所有sentinel都由Reviewer在本轮临时目录预先创建，没有使用真实用户资产。
- **影响：** 成功Pack/旧地图本轮未被损坏，但本地失败/重试可删除不归属本次的暂存数据，违反当前明确数据保护保证；不能批准本候选。
- **最小整改方向：** 每个入口明确取得独占stage所有权，或者创建唯一owned临时目录；只在成功取得所有权后清理该目录。修复现有目标提前拒绝与stage创建失败两条路径，并保留本次部分写入失败后的清理。增加针对不归属stage的正式回归，覆盖四入口；不改变Profile/Golden/像素或设计持久化平台。新候选重新构建/按影响复测后再独立复审。

最小复现（仅自建临时目录、正式构建JS）：

```js
const target = join(reviewTemp, 'new-export');
const stage = `${target}.stage-${process.pid}`;
await mkdir(stage);
await writeFile(join(stage, 'unrelated.txt'), 'must survive');
await assert.rejects(publishDirectory(target, {}, async () => {}));
// 当前候选：stage 与 unrelated.txt 已被删除。
```

本轮未直接实现整改。没有额外未确认推测混入缺陷数量，也不保证不存在范围外问题。

## 11. 首次安装与旧地图材料

ZIP SHA `61f386e03ab0fec51bd2b51b00201643f9e25aa5c1301980dd9c9f38965ef07c` 精确匹配，95成员无重复：8×8标准文件=64、8请求+1index=9、12矩阵+3reference=15、4指南/契约/模板、2旧地图参考、1README。全部逐成员SHA与delivery一致；未含正版Runtime/RTP/Host、凭据或DB。

首次安装材料可用：incremental-v2两组配色明确，INSTALL/指南给出稳定图片名、Area mode1/48px、kind4/6/16/17、草flags0/水低4bit15、空B flags16，并说明水格草岸仍属水碰撞。指南涵盖普通画笔邻居重算、池塘/孔洞/通道/对角，以及v1新增→v3更新→v4退役观察。

旧地图副本确实来自已保存手绘步骤04工程，不是步骤05重造地图。Map001/002/003、System、Tilesets五文件与原来源、本轮新准备副本和作者验收副本逐字节相同。Map002/003 SHA分别为 `250a17a5fb092898a94a2a44c5572fafebc30441a01be979ed4b7c54be0ac52e` / `d4c15be39f93f629bb90b56f7b21e6e67086dece0eb4745c7a90814ac1b9b8ee`。

不仅比较文件hash：逐项检查两个地图四图层实际非零TileID与原/新Pack绑定，使用中的kind映射一致，Map002用Tileset2/art，Map003用Tileset1/diagnostic，数据库图片名/48形态flags匹配。两图各46个不同AutotileID都保持逻辑素材；(1,11)/(2,11)为2379/2381、kind6、b-water，(4,10)为2284、kind4、a-water。四替换PNG与art/diagnostic v2精确相同。A有意改色，B退役保持旧像素，不能靠新C复用退休槽“腾空间”。[旧地图审计](../evidence/step-05/independent-c09027f-20261013-013024/prepare-map-audit.json)。

因此**已生成的验收材料可供用户使用**。失败目录归属缺陷影响工具保证，需整改；材料存在/可解压/CPU通过不等于MZ真实验收通过。建议在整改后的最终候选完成必要绑定和独立复审后作最终步骤验收，不把当前文件预先记为APPROVED。

## 12. 既有延期、receipt 与用户剩余验收

步骤04 completion receipt SHA `5241d3a9a43a19e2c73ed8d55400465fe9b8fc219cd086457e27b00bfbc0ae89` 绑定 `step04-mz-44a5239a979c-ed3814944c9713b8`，关闭的是Map002第二水槽保存和Map003草地背景两个缺项。2026-10-13保存文件hash与本轮来源一致；阶段动画/岸线/通行结果属于USER_REPORTED，原装Host仍未执行。

旧 `Map003(4,10)` 待补记录在步骤01阶段授权中，绑定的是 `step01-56368269c8328e0f84b9`，不是上述步骤04 completion两个检查点。新步骤04地图在该坐标确有kind4水格，仍不足以自动关闭另一个历史构建的手工保存/证据记录。两记录并非同一事项，不归并成“全通过”或“全未通过”；旧待补继续保留，不据此新增代码缺陷。V1索引中的旧停止/待补文字按历史检查点理解。

步骤05没有绑定本步Pack的新编辑器/真实游戏/美术证据，结论 **NOT_EXECUTED**。用户仍须分别执行首次安装与旧地图替换，普通画笔形态/邻居重算、草可走水阻挡、至少两个0→1→2→1周期、固定岸线、退休保留与主观美术，并保存实际环境、地图SHA、截图/视频和独立验收记录，引用本次最终Build/PNG/Manifest。

Native Core＋Modified NW.js、Original Native Host、RPGReactor三种环境继续分开。Original Host延期至最迟步骤10的既有授权不是PASS，也不免除步骤05当前Pack的安装/更新验证。必要MZ证据和用户指定候选批准之前，不能进入步骤06。

## 13. 结束保护与可复核位置

开始记录原主/Coding检出、其他已有worktree/refs和4002个重要文件SHA（tracked、旧artifacts、MZ图片/JSON/工程标识及验收材料）。新增报告前复核：4002全部未变/未缺失，refs逐字节相同，所有现存检出HEAD/status保持；两条开工前已缺失的历史worktree记录未删除/整理。主目录和本步Coding检出是同一目录，另有旧step02 Coding工作区也保持。

结束只新增本报告和 `docs/evidence/step-05/independent-c09027f-20261013-013024/`，既有tracked文件、原报告/ledger/Manifest、作者build、验收ZIP、原MZ手绘/数据库均未修改；主HEAD仍DOCS_TARGET，候选worktree干净，main/远端仍fc407198。最终保护记录见 [end-state](../evidence/step-05/independent-c09027f-20261013-013024/end-state.json)。证据只保存必要日志/摘要/探针文本及SHA，路径脱敏，不复制Runtime、DB、凭据或依赖缓存到Git。

本轮外部根目录：`/private/tmp/tileset-step05-independent-c09027f-20261013-013024/`。detached worktree为其中 `checkout`；重建工程/suite/material/prototype在 `checkout/artifacts`；原始日志/探针在根下及 `evidence`；新进程导出为 `offline-export-v4`；专属来源/prepare副本为 `source-project` / `prepared-project`，仅本地，含正版文件不得对外发布。没有清理任何历史worktree或用户资料。

本轮启动的测试、codec、CLI和临时隐私测试服务均已退出，没有启动DB/MZ/NW.js/RPGReactor或付费模型，没有修改全局环境。**未修复生产代码/正式测试，未提交、合并、推送、创建PR；步骤06未启动。报告完成后本轮停止。**
