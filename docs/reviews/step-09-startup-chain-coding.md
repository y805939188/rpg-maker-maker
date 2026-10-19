# 步骤09启动链整改 Coding 交付

2026-10-19，America/Chicago。状态 **READY_FOR_REVIEW / SELF_TESTED**，交给 Main 安排限定 R4；本作者没有启动独立 Review、批准、合并、Push 或 CI，不进入10。此次授权只整改启动链，不重审01–09。旧 R2/R3/T01/R01 只按未变产品范围复用，原失败与停止记录保留。

冻结基线 `980157bd242afce8fe79b1d8234bbe43a5c08921`；分支 `codex/step-09-startup-chain`；最终执行 source **`ea5a4331271af89879900bf4265b057635efce00`**。首个执行候选 `1f8096aeea168e1fc576097dd07d3312d7676349` 的退出验证失败，保留该提交并追加信号整改提交，没有改写失败历史。本报告为后续单独文档提交；最终 HEAD 由 ignored `summary.json` / `main-request.json` 绑定，避免为写自身 SHA 循环提交。

实际原生 CLI 进程显式 `-m gpt-6.1-sol`、`model_reasoning_effort="xhigh"`、`service_tier="default"`，cwd 为本树，developer 角色 step_coder。隐藏服务端字段 **UNVERIFIED**；没有 Priority/Fast、全局配置修改或子 Agent。已读本树 AGENTS、两份正式 plans（含公共门禁、工程启动、09/10边界）、指定三份历史报告和启动文件；主仓只读取指定 completion.json 与 job117927255808 日志。旧 CI 日志足以支持组织整改：30000ms 内仍串行执行构建/资源，超时尚未进入 run-local；不声称查明全部旧原因，不归因 PG 或机器负载。

## 实现与新计时语义

执行差异8文件：`package.json`、`playwright.config.ts`、`.github/workflows/ci.yml`、`scripts/run-local.mjs`、新增 `scripts/dev-preparation.mjs` / `scripts/local-processes.mjs` / `tests/startup-chain.test.mjs`、工程基线中的启动说明。本报告是第9个交付文件。

- `pnpm dev` 调用共享入口，始终清理并重建开发所需10个包、prototype、API，执行原 `studio-resources`，再启动服务。只清理会重建的12个输出根，不清理生产 Web 输出，不建立跨次缓存平台。
- `pnpm dev:prepare` 执行同一准备；`pnpm dev:start` 校验该次成功凭据后执行同一 API/Vite 启动。CI 顺序现在是生产 E2E → 合成启动测试 → 显式准备 → 开发 E2E，已打破旧生产→开发相邻顺序。
- 准备工作 watchdog 为 **120000ms**，包括输入/输出校验、构建、资源生成与成功凭据写入。超时/取消进入有界自有进程组清理，TERM 后1000ms升级 KILL；清理窗口单独有界，不把超时后的结果补成成功。准备在任何构建前移除旧凭据，失败/取消移除凭据与临时文件。
- 凭据绑定当前源码树（含未跟踪新增、删除和修改）、fixtures、根及包内构建配置、锁、commit、Node/pnpm版本与可执行文件 SHA、平台/架构和安装锁/模块元数据；启动重新计算并比较。检查包声明导出、API/资源关键入口及全部244个准备输出的逐文件 SHA/成员完整性。源或输出缺失、内容改变、失败重建、取消、畸形凭据均拒绝，不以 dist存在/同commit/曾build 或环境开关代替准备。凭据不遍历 `.local`、node_modules 源树或 `.env` 凭据文件；运行时继续按既有 API/Vite 边界读取并校验本树环境配置。
- 同树独占锁、API/Vite 端口预检发生在准备前；占用拒绝，不复用服务。每个自有子命令独立进程组，退出/取消/服务失败只清理这些组，包括已退出 leader 的后代。SIGINT/SIGTERM 处理器保持到清理结束，承受 pnpm/shell 重复转发；异常强杀遗留锁不会自动放行旧服务。
- API 改为 development 环境直接 `tsx src/main.ts`，避免 watch 宿主隐藏应用退出；API/共享包修改后须重新 `pnpm dev`。Vite 前端热更新保留。没有改变 API/package 的业务代码或生产启动命令语义，生产仍执行构建 JS。
- 服务 watchdog 与 Playwright 就绪等待仍为 **30000ms**。开发 Playwright 等待 `LOCAL_DEV_READY`，该标记只在真实 `/api/health` 返回200且 `status=ok / database=connected`、Vite首页和真实入口模块均200并通过内容检查后输出。没有假 health、吞错、延后初始化或复用残留服务。Playwright 的5000ms gracefulShutdown仅用于退出清理，不延长就绪门限。

`prepare_ms` 是准备函数起点到完成产物与源校验、写成功凭据前的墙钟耗时；`service_ms` 从服务阶段进入开始，包含凭据复核、端口预检、API/Vite启动及两端 HTTP 检查；`total_ms` 从该次准备开始到两端就绪，**包含独立命令之间的间隔**。普通启动外层 pnpm 开销和独立准备命令的退出清理另存命令耗时。原 Playwright30秒覆盖全部构建/资源的边界已经改变；本次不是冷启动计时边界保持不变，也不证明提速。watchdog 外最多1000ms的进程清理宽限与上述准备/就绪耗时区分记录。

## 最终 source 的定向结果

所有构建及真实路径串行，没有在服务运行中 clean build。实际脚本为 `.local/step09-startup-chain-coding/author/real-paths.mjs`，原始日志、进程树、JSON 与 Playwright配置/单项HTTP用例保存在其 `real-final/` 子目录；该临时配置继承正式 webServer，显式保留根 cwd，只替换测试目录和报告。没有 browser fixture，不代表18项浏览器套件通过。

| 路径                    | 准备                                   | 服务就绪 | 完整总耗时                         | 真实检查与退出                                                                                                                          |
| ----------------------- | -------------------------------------- | -------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 普通 `pnpm dev`         | 17685ms；起点12个开发输出根全部缺失    | 1491ms   | 19177ms；外层探针观察到标记19599ms | API200/DB connected、Vite首页200/入口模块200；SIGINT后入口exit130，1083ms内退出并确认所有记录的自有PID消失、端口关闭                    |
| CI prepare→同一服务入口 | 17614ms；独立prepare命令18916ms、exit0 | 1619ms   | 22347ms，含命令间隔                | 正式30000ms Playwright门禁通过；定向HTTP 1/1、92ms；外层命令5337ms、exit0；Playwright SIGTERM后入口exit143，记录的自有PID消失、端口关闭 |

退出时 pnpm 打印 Vite被SIGTERM和入口130/143属于主动取消结果，原日志保留；不把这些信号状态当无故启动失败或吞为0。CI测试进程自身exit0。

- `pnpm test:startup`：最终 **19/19**（新增12项、原observer7项），45484ms；串行 Node测试。覆盖失败/取消/受控超时使旧凭据失效，源/锁/配置/安装元数据与输出新增/缺失/改变，构建中源变化，端口占用保留原服务，畸形/不健康/挂起 HTTP，服务退出/无法spawn/前端未就绪，TERM-resistant后代与leader先退出，以及重复SIGINT/SIGTERM。测试中的短超时只通过函数参数注入，不提供生产环境绕过开关。
- 新测试是 `.test.mjs`，不在现有 Vitest `*.test.ts` 收集范围；没有把慢真实PG验证挤入普通check。全部合成服务使用允许列表子进程环境，固定Mock；旧observer自身也仅允许列表/合成配置。
- 定向 ESLint（3个启动脚本、新测试和Playwright配置）、`tsc --noEmit --module NodeNext --target ES2023 --strict --skipLibCheck playwright.config.ts`、`pnpm check:boundaries`均exit0，13成员方向通过。真实准备已完成所需全部构建；随后 `pnpm verify:exports` exit0，11个生产Node包导出通过。
- 全仓 `pnpm format:check` 与 `git diff --check` 在 source冻结前通过；包含本报告的最终同项检查亦通过，日志见 `format-with-report` / `diff-with-report`。额外对默认被忽略的新 `.mjs` 测试使用 `prettier --ignore-path /dev/null` 直接检查，没有放宽既有规则。

未执行完整450/full09/两套18/MZ、H02-A、Generate/Edit、远端CI或独立Review，均为 **NOT_EXECUTED / NOT_STARTED**。本地一次有效结果不能保证未知CI机器耗时；Main才可触发绑定最终候选的一次有意义workflow并组织限定R4。

## 失败与更正保留

1. 首次合成测试自设15秒总文件时限，Node按整个文件计时，前两项通过后文件被取消；observer7项通过，但该轮不计完整PASS。改为独立120秒合成套件总时限并串行，不改变产品30秒门禁。后续18/18通过，新增信号用例后最终19/19通过。首轮残留合成fixture保留在本树TMPDIR。
2. 首次ESLint报告8项：定时器/AbortController全局声明和catch cause。通过显式timer import、globalThis及保留cause修正，后续定向lint通过。
3. 首个冻结source `1f8096a` 的真实普通路径完成准备（凭据记录23078ms）并到达探针，但SIGINT退出清理失败；外层harness的6秒清理等待超时，留下本树API/Vite组25960/25968。原harness先缓冲、后保存，清理超时又阻止保存，因此**首轮stdout、完整服务计时与逐信号轨迹不可用**，不计有效完整路径，也不能声称已保存完整原因证据。原命令失败日志、成功准备凭据、残留PID/PPID/PGID与lsof cwd归属另存 `normal-first-failure.json` / `normal-first-preparation-receipt.json`。确认归属后只TERM/KILL这两个自有组，确认端口关闭，保存证据再移除失效操作锁/凭据；不触碰其他会话。
4. 源码的一次性信号处理器存在重复转发后恢复默认终止行为的风险，与上述症状一致，但旧失败缺完整信号轨迹，这一具体因果仍属推断。改为持续处理直到清理结束，新增重复SIGINT/SIGTERM回归通过；最终source重新从干净输出完整测两条路径，退出均通过。最终harness改为实时写原始stdout/stderr，避免再次丢日志。没有为满足测试放宽正确门禁。

初始一次apply_patch因同一路径重复操作被工具拒绝、未应用；两个只读探查因未安装依赖/库内路径不匹配返回非零，后按实际文件位置读取，不计产品验证失败。ignored临时Playwright配置的相对路径在运行前已改为明确根路径。详细命令失败与修正索引见 `author/corrections.json`；未删除旧日志、回退他人改动或重复无进展尝试。

## 产物、隔离与交接边界

`candidate-build-binding.json` 绑定最终source、Profile、Node/codec/锁及244文件SHA。`studio.json` SHA256 **`c1c6e3ec785b12f135d0a6ee6a3c64cee0a487cf17e28debd3bb753b1493471b`**；按文件名排序的输出清单规范JSON SHA256 **`36e64cf67e436273dc96610d3a58bfc1541454e0c66416a0ebb1ec0641149717`**；锁 SHA256 `d533bbb2ae9cf77a1c91b18f9fc395af500fc55a27f7529a045a7eab6d85ce7b`。这是开发准备产物，没有新发布Pack或改写旧manifest。

与基线比较，apps/packages/src/锁/plans/fixtures、studio-resources、observer及其7项测试、AGENTS、Orchestrator状态的diff为空；关键字节SHA见 `scope-and-unchanged.json`。HTTP契约、模型/Prompt、AI生产/像素算法、Compiler/Profile/Pixel Contract、素材、Task/Executor/硬校验均未修改。旧R2/R3/T01/R01仅按该未变范围保留；不批准正式质量数值、商用美术或步骤10。

Node22.21.1 / pnpm10.20.0；本树独立 `.local/postgres`（55609）、API49309/Vite4489、合成私有 `.env`、资产、pnpm-store、cache、TMPDIR；所有作者安装/测试/构建/启动子进程由允许列表环境运行，固定Mock，不读取主仓.env.local或真实Provider密钥，不复制真实凭据。安装frozen lock成功；db:generate成功；直接Prisma migrate deploy成功7项（没有把该命令冒充已运行依赖构建的db:migrate包装器）。最终独立库Project/LogicalTask/AssetRevision均0，迁移7；预算/账本未读写，0真实AI调用，Holdout未运行。

最终API/Vite及本轮PG均已关闭；49309/4489/55609空闲、启动锁不存在。原4398工作台health200/DB connected、55529仍监听；未关闭其服务，未改旧数据、MZ、其他工作树、全局运行环境。私有.env、DB、资产/缓存/TMPDIR、失败fixture和全部作者证据原位保留。证据位于 **`.local/step09-startup-chain-coding/author/`**，未覆盖发起器的cli-events/launcher文件。

**停点：READY_FOR_REVIEW。** 交接入口为 `.local/step09-startup-chain-coding/main-request.json`；最终HEAD/source/范围/命令/结果/阻断/保留服务均由该ignored文件绑定。本作者立即停止，后续CI、限定Review及任何批准/发布由Main按用户授权管理。

## R4整改与最新交接（2026-10-19，Asia/Shanghai）

**最新作者状态：READY_FOR_R5 / SELF_TESTED，独立结论仍为 R4 CHANGES_REQUESTED，等待 Main 的唯一限定R5。** 本段只处理硬契约P2 **R4-P2-01**，没有重审或重新开发01–09。R4在 `09f78282376aacf57d290c931a6b2a098adf3eed` 复现：最后端口预检之后，其他API抢占端口返回合格health，本次API延迟1500ms才尝试listen，serve在518ms误报READY，随后本次API EADDRINUSE。R4的P0/P1=0、硬P2=1及原始报告/探针/日志不改写，不以任何旧CI绿色清除该发现。

本轮执行 source **`c83be2b9095f9c34344c314f17a2a34131619723`**，基于受审HEAD09f7828。实际恢复的原生CLI仍显式 `gpt-6.1-sol / xhigh / service_tier="default"`，cwd为本树，角色step_coder；隐藏服务端字段 **UNVERIFIED**。没有全局配置修改、子Agent、独立Review、批准、Merge、Push、CI触发或CI请求；步骤10未启动。新的最终文档HEAD只由 `.local/step09-startup-chain-coding/r4-fix/main-request.json` / `summary.json` 绑定，不在本报告循环追加自身SHA。

### 最小整改与生产直接影响

source仅6文件：`apps/api/src/main.ts`、`apps/web/vite.config.ts`、`scripts/run-local.mjs`、`playwright.config.ts`、`tests/startup-chain.test.mjs`、工程启动说明。本报告追加为第7个差异文件。

- 启动器每次生成随机32位hex关联标识，仅通过自有子进程环境传递。它从**对应自有子命令的stdout管道**等待匹配本次标识、服务角色及端口的 `[local-listening:…]` 信号；不会从其他实例的URL响应、全局日志、预检结果或固定延迟取得监听证明。stdout原有日志继续转发，解析仅保留标记长度的尾部。
- API仅在原 `await app.listen` 成功后，核对真实 `server.address()` 的host/port并发出信号。Vite增加仅serve模式的启动plugin，在其真实HTTP server的listening事件中核对实际地址/端口后发出信号。两处都是bootstrap监听见证；不移动DB/资源等初始化，不改业务、health正文、HTTP JSON/Zod/OpenAPI、AI/任务/像素/Compiler/Profile/素材。无新依赖、服务发现或构建平台。关联标识不是Provider凭据，不写入任务或HTTP业务数据，也不通过VITE前缀暴露给客户端。
- 必须先取得本次必需的自有API/Vite监听信号，再执行既有真实HTTP检查，仍要求API200、`status=ok / database=connected`及开发Vite首页/入口模块200。子服务退出仍立即使门禁失败，不能仅靠“尚未退出”通过。
- **生产同样要求自有API监听信号与真实DB health**，然后才输出 `LOCAL_PRODUCTION_READY`。生产Playwright从URL探测改为等待此标记，避免它在启动器归属门禁完成前接受竞争API；开发仍等待 `LOCAL_DEV_READY`。生产仍执行 `node dist/main.js`，没有TS源码别名或新的假health路径。
- 原准备成功凭据、字段/哈希绑定、计时语义、独占锁、子进程组与重复信号清理全部保留；准备 **120000ms**、服务/Playwright **30000ms**、TERM后1000ms升级KILL和Playwright5000ms退出窗口均未放大。API不自动watch、修改API/共享包后重新 `pnpm dev` 的明确说明保留，Vite前端热更新保留。

### 定向验证与准确失败记录

新增3项“预检后竞争”用例，分别覆盖开发API、开发Vite、生产API。竞争服务在 `services-start` 回调（最后预检后）抢占端口，本次目标服务1500ms后才尝试绑定。**旧实现0/3通过，均复现false-ready；修复后3/3通过**：本次绑定报EADDRINUSE，serve拒绝，不发services-ready/READY；自有组清理后竞争服务仍返回其foreign响应，再由测试自身关闭。1500ms只用于故障注入，生产门禁没有固定延迟。另新增缺失本次监听证明、错误启动标识两项拒绝测试。既有合成服务仅将信号放进自身listen成功回调以适配新握手，原断言、时限、用例均保留，没有弱化门禁。

| 检查                                                           | 本轮实际结果                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 新竞争回归，旧实现                                             | **预期FAIL，exit1，0/3**；`evidence/race-baseline.*`保留，证明旧实现缺陷，没有当PASS |
| 新竞争回归，修复实现                                           | PASS 3/3，exit0；三个竞争服务均在自有组清理后继续响应                                |
| `pnpm test:startup`                                            | **PASS 24/24**，69815ms，0 skip/cancel；原19（含observer7）及新增5项完整通过         |
| 定向ESLint                                                     | PASS，API bootstrap/Vite配置/run-local/启动测试/Playwright配置                       |
| API、Web typecheck与Playwright配置定向tsc                      | 均PASS；没有运行完整450/check/full09/两套18                                          |
| 方向、生产包导出                                               | PASS 13成员、11包导出                                                                |
| 全仓Prettier、被默认忽略的新测试直接Prettier、git diff --check | 均PASS，包含本段追加内容；未改格式忽略规则                                           |

真实构建/资源/启动串行执行。本树原有PG55609仅重启、不重置/迁移；API49309/Vite4489起始空闲，允许列表子进程环境固定Mock、TZ=Asia/Shanghai，复用本树独立store/cache/TMPDIR/资产，不读真实Provider/.env.local/预算或其他树凭据。两条开发路径各完成一次有效验证，每条在READY之前均捕获**本次同一关联标识的自有API和Vite监听信号**；独立真实HTTP检查也通过。

| 冻结source真实路径                   | 准备                                | 服务阶段 | 从准备起点至READY            | 结果与退出                                                                                                  |
| ------------------------------------ | ----------------------------------- | -------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 干净普通 `pnpm dev`                  | 17661ms；12个开发输出根起初全部缺失 | 2612ms   | 20275ms；外层观察20649ms     | API/DB/Vite首页及入口均通过；SIGINT入口exit130、1103ms内退出，记录的自有PID消失、端口关闭                   |
| `dev:prepare`→正式Playwright开发入口 | 17714ms；prepare外层19018ms、exit0  | 1618ms   | 21464ms，含命令交接/前置开销 | 正式30000ms门禁及HTTP1/1通过；外层4342ms、exit0；SIGTERM入口143、自有PID/端口清空                           |
| 正式Playwright生产入口直接影响       | 使用同一source构建JS及补齐的生产Web | 752ms    | 不另造生产prepare总耗时字段  | 自有API监听证明→真实DB health→生产READY；生产首页200，HTTP1/1；外层3399ms、exit0，入口143、自有PID/端口清空 |

原始两路径脚本/JSON/实时stdout/stderr/进程树在 `r4-fix/evidence/real/`，生产成功补充在 `evidence/production-valid/`。临时Playwright配置导入正式配置并保持root cwd、实际共享启动命令、30000ms/5000ms；只替换定向测试/报告目录。仅HTTP request fixture，不冒充浏览器18项或人工/MZ通过。所有准备、服务、总耗时口径沿用上阶段，缓存冷热未受控，**不证明提速，不声称恢复旧计时边界**。

本轮额外的生产探针首次准备不完整：普通路径的clean输出移除了生产Web目录，开发prepare不构建它，生产API因此按原 `Production Web build is missing` 硬门禁拒绝，未发任何生产READY；该部分的测试命令exit1，整个扩展harness也exit1。**同一harness此前已完成的普通dev和CI子路径及HTTP断言均通过**，没有把整体exit1写成0，也没有重跑这两条有效路径。确认服务/端口已关闭后，单独执行原 `pnpm --filter @tileset/web build`（exit0、4592ms），再只测生产入口，1/1通过。没有修改或放宽生产缺输出门禁；首次失败日志、`real/all-paths.json`及 `production-precondition-failure.json` 全部保留。除旧实现的预期缺陷复现和这次探针前置不完整外，本轮24项测试、static、两条有效开发路径没有失败重跑。

### 绑定、保留与停点

本次开发成功凭据244份输出与当前文件逐一重算SHA匹配；其规范排序清单SHA256 **`2170ea258ea0f550e6303f33822b79d094a554c88ee5bfc5c6ee93c5b84d51bb`**，`studio.json` SHA256 **`ce95019eb07baa76091a6b5dda3a7b8f141ce29007c31cfedd386d7b8211ca36`**，锁仍为 `d533bbb2ae9cf77a1c91b18f9fc395af500fc55a27f7529a045a7eab6d85ce7b`。另保存生产Web13份输出清单；完整Profile/context/Node/codec/逐文件SHA在新 `candidate-build-binding.json`，没有覆盖旧产物绑定或发布Pack。

`scope-and-binding.json`证明：业务API（除main bootstrap）、Web业务源码、所有packages、根src、contracts、模型/Prompt/AI/任务/预算逻辑、Compiler/Profile/像素/fixtures、锁、package命令、CI接线、准备凭据实现、生命周期/重复信号实现、observer及其7项原测试、plans/AGENTS/Orchestrator状态均未改。唯一新增apps差异明确是上述API监听信号和Vite启动plugin。旧R2/R3/T01/R01按未变范围保留；正式阈值/质量批准与步骤10未推进。

本轮独立库Project/LogicalTask/AssetRevision仍0，迁移仍7；无AI调用、H02或预算访问。最终本轮API/Vite/PG均已关闭，49309/4489/55609空闲、启动锁不存在；原4398/55529继续监听（仅只读TCP确认，没有写入、关闭或查询旧DB）。独有ignored数据原位保留。新证据只写 **`.local/step09-startup-chain-coding/r4-fix/`**，其中作者证据在 `evidence/`，未覆盖其launcher文件。旧根main-request/summary/全部日志、首个信号失败记录、旧source提交和本报告上方历史保留；指定Reviewer五份证据只读，前后SHA一致。

**最新停点：READY_FOR_R5，交给Main后停止。** 新交接文件为 `r4-fix/main-request.json` / `summary.json`，绑定最新HEAD、source、精确范围、命令/子路径结果、失败/更正、服务/数据状态。R4 CHANGES_REQUESTED保持为正式历史结论，作者回归PASS不是独立清零；唯一R5及新SHA的CI由Main按既有用户授权管理，本作者没有请求CI或启动Review。
