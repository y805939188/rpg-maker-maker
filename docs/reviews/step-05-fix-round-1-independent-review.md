# 步骤05第一轮整改独立复审

日期：2026-10-13，Asia/Shanghai。主Reviewer：独立会话 `01a13128-4512-7cb1-93fb-0cfcfe656632`。本轮只读实现、隔离执行和新增报告/证据，没有修复生产代码或正式测试。

| 结论                      | 结果                                                           |
| ------------------------- | -------------------------------------------------------------- |
| 代码与跨模块审查          | **PASS**，允许保留非阻断P3                                     |
| 独立验证覆盖              | **COMPLETE_FOR_SCOPE**                                         |
| STEP05-IR-001             | **FIXED_INDEPENDENTLY_VERIFIED**，四入口关闭                   |
| 新增问题                  | P0/P1/阻断P2：0；非阻断P3：1                                   |
| MZ阶段观察                | **PASS_USER_REPORTED_REFERENCED_FOR_UNCHANGED_MATERIALS**      |
| Reviewer本轮新MZ GUI/游戏 | **NOT_EXECUTED**                                               |
| 步骤05整体建议            | **READY_FOR_USER_CANDIDATE_APPROVAL_AND_STEP06_AUTHORIZATION** |

技术阻断已清零，可以进入步骤05候选批准和步骤06启动授权环节；本报告不自行宣布步骤05APPROVED，不启动步骤06。用户既有观察可以引用，不要求现在重做整套人工测试。COMPLETE_FOR_SCOPE只表示本次修订及影响复核范围已完成，不等于无任何缺陷或已取得原装Host验收。

## 1. 版本、配置与独立性

- REVIEW_TARGET：`ad669a06218b6cf775f32b8333d75d9dd3f9186f`。
- DOCS_TARGET：`430d15ca6091e087caaf32516b28a5799c35e992`，直接父提交为REVIEW_TARGET。
- 原功能候选：`c09027f921e7d67469b301083db89acc44433d9e`；原独立结论和反例保持原字节，不后补PASS。
- 复审开始主工作区：`codex/step-05-pack-assembly` / DOCS_TARGET，porcelain为空。main、origin/main、开始及结束只读远端查询均为`fc407198eefad9336ba97fb9482bdd832ca78f83`；远端本步分支未返回。
- 隔离checkout：`/private/tmp/tileset-step05-rereview-ad669a0-20261013-033124/checkout`，detached精确REVIEW_TARGET。

本回合记录的模型为`gpt-6.1-sol`、effort为`ultra`，collaboration设置相同。客户端配置记录`service_tier=priority`；逐请求及服务端最终字段仍**UNVERIFIED_NOT_EXPOSED**。曾按原门禁停止，用户随后直接授权“本次review允许fast”，仅覆盖本轮速度档位限制；没有把这项授权扩大到其他模型、生产修改、合并推送或步骤06。Reviewer未修改客户端配置，配置文件不作为服务端实际执行证明。

使用一名只读`step_reviewer`子Agent复核四入口状态机与新测试可信度，角色元数据指定gpt-6.1-sol/ultra，可用服务档位声明Priority，处于本次用户覆盖范围内。主Reviewer亲自运行所有隔离验证，验证并去重子Agent建议；没有Coding Agent。[配置](../evidence/step-05/independent-ad669a0-20261013-033124/configuration.json)。

## 2. 阅读与变更范围

延续本会话已完整阅读的AGENTS、两份正式plans、MZ_RUNTIME_ENVIRONMENT、步骤03/04/05契约、Profile/Pixel Contract与原独立报告。此次完整读取整改报告、全部生产diff、新15项测试、修改的test入口、当前基线及ledger/commands/builds/新旧比较/人工影响引用。

源实现实际只改四个发布文件和package.json测试选择器，新增`publication-ownership.test.ts`。从c090到ad669a0的源码变更没有改Compiler/Pack Planner/Renderer、领域/处理/codec/Profile/Pixel/母版、API/Web/CI、依赖锁文件或版本。中间165a2a0只保存既有人工准备/观察记录；它不是新代码或新的独立PASS。DOCS_TARGET相对候选仅README、文档/证据，没有额外执行入口。

整改ledger的33个files及报告共**34个SHA**全部匹配；原人工receipt SHA保持`783620fe8f98eefeb76eba912d1c2a0b1425552a064a3a4a8c682129c01b365a`。[版本审计](../evidence/step-05/independent-ad669a0-20261013-033124/version-audit.json)。原首轮关于真实来源→领域→Compiler→Planner→Layout→Renderer→PNG→重读的判断继续适用于未变化的实现，本轮成功重建再次直接走完整链路。

## 3. 需求 → 修复 → 独立验证

行号来自REVIEW_TARGET。

| 要求                           | 修复位置                                                                                  | 直接验证与判断                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 未拥有stage不得删除            | pack-export.ts 131–144；suite 17–23/51–54；prepare 33–40/53–56；engineering 71–83/117–122 | 目标已有、stage已有、已有lock的sentinel保留；PASS                                                       |
| 创建成功才取得归属             | 四入口独占mkdir后才stageOwned=true；prepare 39–41                                         | 实际prepare先mkdir再cp；部分复制故障仅清理自有stage；PASS                                               |
| 自有失败清理，拒绝半成功       | publisher verify / suite写入 / prepare cp / engineering写入与finally                      | 正式15回归＋实际suite完成两次完整子导出后失败、实际prepare部分复制失败；目标未发布、自有stage清理；PASS |
| rename成功结束旧路径归属       | publisher 140–141；suite 48–49；prepare 50–51；engineering 103–104                        | 发布后重新创建旧stage，外来sentinel保留；补suite/实际prepare无mock路径；PASS                            |
| 清理异常仍释放所持lock         | 四入口嵌套finally                                                                         | publisher及engineering注入rm失败，保留失败stage但释放lock，不出现成功目标；PASS                         |
| 成功目标不可覆盖与有限同名并发 | 原目标检查及mkdir lock保留                                                                | 重复工程/导出拒绝，旧成功保留；两个同名publisher一成功一拒绝；PASS                                      |
| 新产物和观察影响一致           | 四入口成功完整链路；未变的Pack/codec入口                                                  | 123工程payload、64标准文件精确复现；旧56文件/16PNG不变；PASS                                            |

stageOwned初始false；目标提前拒绝或mkdir失败保持false。mkdir成功后，写入/校验/复制错误保持true并清理。rename成功立即false，旧路径的后来使用者不会被清理。lock创建失败位于try之前，不会删别人的lock；取得lock后的stage清理异常仍会走独立finally释放它。

此处证明本步单机、合作式目录发布协议与实际可触达失败分支，不扩大为外部恶意目录置换、认证、数据库事务/CAS或分布式锁保证。

## 4. 测试可信度与本轮独立探针

新增15正式回归真实载入生产JS，IPC先提供PID并等父进程设置碰撞再import，避免碰撞设置与启动竞态。Git身份和prepare只读预检使用合成fixture；mkdir/cp/write/rename/归属/finally未被替换为另一套实现。错误消息有断言，没有靠无关预检失败冒充通过。

测试边界也明确保留：正式suite自有失败例在fixture读取失败处停止，未写入suite payload；15项未覆盖suite发布后重新占用、stage清理自身失败和已有lock。主Reviewer补了**7项独立边界**：

1. publisher已有外来lock及stage均保留。
2. publisher清理失败仍释放lock。
3. engineering清理失败仍释放lock。
4. prepare实际部分复制失败清理自有stage。
5. prepare实际成功发布后外来stage保留。
6. suite在完成两个真实Pack子导出后中途失败，整体stage清理、无整体半成功。
7. suite完成完整八套生产链并发布后，重新占用的stage保留。

这些都在本轮私有合成目录注入。Git只重定向到精确候选checkout读取真实身份；prepare使用真实core/Pack预检，未mock这些前置链路。另将原Reviewer反例适配到新候选，publisher两种碰撞、suite/prepare碰撞、已有成功保护、验证失败清理、有限同名并发均为green；engineering原碰撞也green。[7项补充探针](../evidence/step-05/independent-ad669a0-20261013-033124/extra-ownership.json)、[原反例green](../evidence/step-05/independent-ad669a0-20261013-033124/publish-probe.json)。

**STEP05-IR-001独立关闭。** 没有修改生产代码/正式测试来获得这些结果，没有删除失败用例或降低阈值。

## 5. 隔离执行与重建

工具固定Node22.21.1 / pnpm10.20.0；专属外部pnpm store按frozen lock安装，生成Prisma Client，没有启动或连接数据库。

| 本轮执行                     | 结果                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| frozen install / Client生成  | exit0                                                                                     |
| pnpm check                   | exit0：20文件225/225，十成员方向、Strict/lint/format、clean生产build、8真实ESM exports    |
| 已构建后的Pack/导出/归属子集 | 3文件37/37＝旧22＋新15，包含在225中                                                       |
| 原公开JS                     | exit0，78/78，脚本SHA仍为506ec056e7eecde0410e7f05093531ed3d62a5f83b7a2d61482ef662c6c801b9 |
| 工程构建                     | 123 payload及Manifest与作者逐字节相同                                                     |
| 八套Pack                     | 64标准文件及8request精确复现，sources/history由新进程实际重放                             |
| PNG独立字面量探针            | 16张完整RGBA与原母版＋明确RGB旋转＋手写四坐标期望相同，含全部透明保留区                   |
| 原生CPU对照                  | 8套全PASS，3600形态/状态、8,294,400像素，每套600 update调用/601观测                       |
| 实际无mock prepare           | 成功；源/本轮/作者副本五JSON原字节、四最终PNG对应一致                                     |
| 原碰撞green及补充边界        | 全部PASS                                                                                  |

工程Build为`step05-ad669a06218b-deec5d4376173aaf`，Manifest SHA `a262d9f49d95b3bf97db947e846b6e3d1e11559726c8733a4725748aaeb524b2`精确复现。[命令](../evidence/step-05/independent-ad669a0-20261013-033124/commands.json)、[CPU摘要](../evidence/step-05/independent-ad669a0-20261013-033124/oracle-summary.json)、[PNG探针](../evidence/step-05/independent-ad669a0-20261013-033124/png-probe.json)。

PNG期望来自批准母版及手写Profile坐标，不读取输出Plan来选择预期位置。CPU读取实际最终PNG，原core SHA `4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f`固定；Native Tilemap VM矩形捕获不等同GPU/GUI/游戏。原16PNG对应四增量、四旧图Pack，各A1/A2。3600＝240＋7×480，像素＝3600×48×48，数量不相加为独立覆盖率。

DB集成/迁移、Playwright、远端CI和Reviewer新MZ GUI/Host/游戏NOT_EXECUTED；本修订没有相关应用/数据/页面行为变化，原unit/隐私测试随check执行，未把这些未执行扩大为代码缺陷。所有已需检查通过后没有无差别重复旧处理/原型出版；它们的源码与Golden不变，原测试已包含在225中，共用工程发布成功/失败路径另直接验证。

## 6. 新增非阻断问题

### STEP05-RR-001 — 子集测试入口没有构建其新增dist依赖

- **P3；类别：测试工具入口/改进建议；不阻断。**
- 位置：`package.json:51`；`tests/publication-ownership.test.ts:52/55/64/76`。
- 触发：frozen install后的干净checkout直接运行`pnpm test:step05`。
- 实际：命令只build:contracts，新15项读取/载入根`dist/scripts`及`dist/src/profile.js`，因此15失败、原22通过。已有旧dist时也可能检查旧编译JS。
- 预期改善：子集命令自己构建根prototype，或明确单独入口必须先构建；避免依赖残留dist。
- 最小复现：本轮`pack-tests-clean.log`；之后完整`pnpm check`及fresh-built子集37/37直接验证正常。
- 边界：STEP_05文档示例原本先`pnpm build`再测试，正式`pnpm check`也先build:prototype；当前冻结门禁未被绕过，生产导出与目录归属不受影响，因此不作为硬契约阻断。可在后续工程维护最小处理，本Reviewer未修改。

没有新增P0/P1/阻断P2。该P3不重开已独立关闭的STEP05-IR-001。[干净入口日志](../evidence/step-05/independent-ad669a0-20261013-033124/pack-tests-clean.log)。

## 7. 人工观察与新候选的关联

本轮亲自比较新旧八套Pack：**A1/A2、pack/history/layout/sources JSON、INSTALL共56/56文件逐字节相同**，16PNG包含退役内容和保留区域。新Manifest/Build正常因源码commit变化而不同，没有把旧Build ID写成新身份。[独立新旧比较](../evidence/step-05/independent-ad669a0-20261013-033124/payload-comparison.json)。

用户已经报告全部核心人工观察符合预期，本地结果表逐项ok；原receipt记录正常画笔/邻居重算、动画/固定岸线/通行、新增/更新/退役和两张旧图为PASS_USER_REPORTED，保存地图和PNG为PASS_READ_ONLY。本轮原receipt SHA未变，作者影响引用准确，当前用户工程/手绘/工具资料未写入。

因为修订只改发布失败分支，PNG、绑定、布局、来源和推荐配置都不变，**可以把该用户观察引用用于新候选的不变素材使用行为**，不要求现在重做整套人工测试。不能将它冒充Reviewer新执行、独立GPU证明或签名认证。截图/录像NOT_PROVIDED、实际runtime日志NOT_CAPTURED、该次Host未独立验证，继续原样记录；不把原生core文件hash等同原装Host通过。[人工影响复核](../evidence/step-05/independent-ad669a0-20261013-033124/manual-impact.json)。

Original Native Host仍按既有阶段授权延期至最迟步骤10，旧步骤01Map003待补记录保持对应历史构建的边界；本次不自动关闭或重新把它们当新代码阻断。若以后PNG/布局发生变化，不能自动继承当前观察。

## 8. 门禁建议与结束保护

技术门禁已满足：原阻断独立关闭，新候选代码PASS，自动复测/实际出版/失败保护通过，具体不变素材已有人类观察及保存数据支持。当前可以由用户**明确批准ad669a06218b6cf775f32b8333d75d9dd3f9186f及对应构建，并授权步骤06启动**；本次请求仍是Review，不是Reviewer替用户批准或执行步骤06。

开工记录并在报告前复核13449个文件SHA，覆盖tracked、历史artifact、原Review/ledger/Manifest、MZ副本及用户Step-5-test/kit全部本地文件：未变/未缺失。已有worktree HEAD/status及refs不变，两条开工已缺路径记录保留。主HEAD仍DOCS_TARGET，main/远端仍fc407198。本轮只新增本报告及 `docs/evidence/step-05/independent-ad669a0-20261013-033124/`，不改原报告/用户工程或Orchestrator状态。

外部根：`/private/tmp/tileset-step05-rereview-ad669a0-20261013-033124/`，checkout为新detached worktree；实际重建在checkout/artifacts，原始日志/定向探针/合成失败目录留在根下，source-project/prepared-project为本轮专属正版副本，仅本地，不复制Runtime/私有文件到Git。清理异常探针留下的stage明确为本轮私有失败目录，没有伪装成成功构建。

配置变化未由Reviewer执行；无正式源码/测试/锁/Golden改动，无数据库/全局MZ/NW/RPGReactor/真实AI操作，无提交、合并、推送、PR。已启动测试/codec/CLI全部完成，无本轮长期服务。最终保护与report SHA见新证据end-state。**步骤06未启动，复审完成后停止。**
