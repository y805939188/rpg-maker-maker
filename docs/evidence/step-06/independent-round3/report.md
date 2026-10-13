# 步骤06正式独立复审 — 第3轮 / 5

2026-10-13，Asia/Shanghai。结论：**PASS**。P0：0；P1：0；阻断P2：0；新增非阻断P3：0。最新冻结候选的必要技术验证真实通过，STEP06-IR-001 与 STEP06-R2-001 本轮独立关闭；IR-002/003/004 保持 CLOSED，相关回归通过。

本报告是独立技术 Review，不是用户亲自美术/MZ验收或 Main 的阶段批准。Reviewer没有批准、提交、合并、推送、修复生产实现/正式tests或启动步骤07。正式轮次保持3/5，原R1/R2失败结论与证据不改写。

## 绑定版本、配置与独立性

| 对象                      | 精确绑定                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------- |
| 冻结源码/正式tests        | `c227f8c6ecfe85895937013e4687deb40247a6ee`                                              |
| 作者文档HEAD              | `89f15cbb3d560584043128235014e230f982c2c8`                                              |
| Review工作树              | `/Users/dingshinn/.codex/worktrees/step-06-review-round3/rpg-maker-maker`               |
| 原第2轮报告SHA            | `4297ee38b16378bfc4f463f9d7f894c6be37d5396e6c0a6d06efbf3ba7a6a07f`                      |
| 工程BuildID               | `step06-c227f8c6ecfe-2408d70aa6a8d040`                                                  |
| 工程Manifest SHA          | `f69ca0afbb95a5bf78d7bdeeada7af798f9e3f6352b339532646bc152a2cde1c`                      |
| 独立公共DB BuildID        | `afb5c63d6dc0d550e58a967c6c6f1f8a60da5428231ce482829e7614d10f3b80`                      |
| 独立DB Manifest SHA       | `3af8f68bb0261a5ea97f452ecf250f03e73e5e84cbb658cc11cb4dfbc2a42231`                      |
| Profile内容身份           | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                      |
| Profile/Compiler/Assembly | `mz-native-ground-water / 1.0.0-candidate.1`；`mz-single-material-v1 / stable-slots-v1` |
| 锁文件SHA                 | `7c02fb7f8cc3c8386a1d9bc00c132d318cd4964ba1fea991e3c991cad19175e8`                      |

独立原生会话客户端收据为 `step_reviewer / gpt-6.1-sol / ultra / default`，thread `01a13284-5dcc-73a0-b0ec-689c81ae06a9`，cwd/round/candidate一致；原收据及SHA保存在 [配置证据](evidence/client-configuration.json)。逐请求模型与服务端最终字段为 **UNVERIFIED_NOT_EXPOSED**，客户端收据不冒充服务端证明。未调用collaboration接口，未使用Priority/Fast/Ultrafast，未更换模型/配置或修改全局配置。

实际checkout始终精确功能SHA；作者基线、报告与证据通过 `git show 89f15cbb:<path>` 提取到本实例 `.local/step06-review/author`，没有检出文档覆盖源码。source→docs共79路径，全部为README/docs；没有未审实质实现。相对R2功能候选，实质改动仅 `gate.ts`、`config.ts`、新增两个测试文件及正式测试config。原16项测试源码逐字节不变，60000ms预算未放宽。[版本审计](evidence/version-audit.json)。

工程重新build后168个payload逐文件SHA及独立重算BuildID均与作者Manifest一致；浏览器开发启动之后再次验真仍相同。未运行会写根artifacts的工程出版命令。独立DB发布使用真实candidate/锁/Node/codec，并实际读回四文件和重复同ID。正式DB套件的 `a…a` 等context是明确合成测试值，不冒充源码绑定。[工程](evidence/engineering-rebuild.json)、[公共发布](evidence/public-probe.json)。内部 `durable-pack-v1/durable-build-v1` 四文件与步骤05标准八文件交付分别核对。

## 阅读、作者证据与范围

完整阅读AGENTS、两份正式plans、MZ_RUNTIME_ENVIRONMENT、STEP_03/04/05/06_BASELINE、需求映射、步骤05最新复审/发布记录、本轮授权、R1/R2原报告、作者初次与两轮整改报告、步骤06全部生产实现/迁移/正式tests及相关差异。Main最新state只读，候选内旧state作为历史快照，未修改任何canonical调度state。

作者coding/fix-round1/fix-round2 ledger分别50/46/75项全部SHA匹配。这些作者测试、浏览器、DB/故障和出版结果只列作作者证据，本报告下述运行均在本实例另外执行。[作者审计](evidence/author-audit.json)。两份原工具.log已经可从指定docsHEAD读取且原hash不变，IR-004保持关闭。

作者首次backup的60003ms超时及后续累积fixture超时原文/hash单独保留。整改初版原队列测试21/22＋1 unhandled rejection日志也保留；原因是拒绝维护内排队写入，最新候选恢复正常排队后原测试23/23且无unhandled error。没有删旧测试、改阈值或把失败日志覆盖为green。[原失败保留](evidence/author-failures-preserved.json)。

相对批准步骤05候选ad669a0，原型/Profile/Pixel、asset-core、material-processing、image-adapter、mz-compiler、pack-assembly、母版与make-fixtures没有源码差异。本轮按相关像素/Compiler/Pack和标准产物回归确认语义，不重开步骤05全量Review或要求重复MZ手工。原装Host、旧Map003及既有用户观察保留原范围。

部分公共探针沿用已保留的R2独立脚本，修改仅候选身份、实例名称/端口、输出/输入证据路径及整改后的断言；原脚本SHA另存。所有数据、DB、文件和执行是本轮新建，未复用R2或Coding资产/凭据。另自行补写三层祖先/未等待工作/身份边界、真实历史触发器、实际live pg_restore取消探针，均调用当前生产JS公共入口。缓存专项使用构建JS ReplaySession检查cache身份，不用该内部入口替代真实公共恢复。[原探针身份](evidence/prior-probe-hashes.json)。

## 独立环境和准确执行

Node22.21.1/pnpm10.20.0、Prisma6.19.3、PostgreSQL14.20、Sharp0.35.5/libvips8.18.7。新独占 `.local/postgres`，PG **55471**，API **4371**，Web **5271**；凭据自行生成，私有环境保存在本实例private目录及formal-workspace的必要.env，不复制他人.env。所有资产、Mock远端、恢复文件、报告与探针属于本checkout.local。没有使用55469、他人DB/端口、用户MZ工程或reset。

正式套件固定输出依赖worker cwd，故从 `.local/step06-review/formal-workspace` 启动同一未修改config/tests。该目录只链接本候选的源码/dist/node_modules，自己的.local承载输出。所有父/child命令PATH显式固定Node22.21.1，未重复R2的Node22.14错误。`pnpm check` 的config测试产生本实例固定.local/step06路径；该本轮生成目录已完整移入private保留。此处理没有修改正式tests/配置。[输出归属](evidence/formal-output-ownership.json)。

每条命令由本地 `run.py` 载入私有环境并记录argv/cwd/退出码/耗时，凭据不写命令日志。以下命令省略公共包装 `python3 .local/step06-review/run.py <label>`；formal/browser行明确标明cwd。准确执行明细在 [commands.jsonl](evidence/commands.jsonl)。

| 命令/动作                                                                                                                                  | 本轮实际结果                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile --store-dir .local/step06-review/pnpm-store`                                                               | exit0，固定锁，无升级                                                                                                                                    |
| 独占 `initdb/pg_ctl/createdb`                                                                                                              | 新PG55471，仅本实例.local/postgres，私有初始化日志保留                                                                                                   |
| `pnpm db:generate`                                                                                                                         | exit0，真实Client生成                                                                                                                                    |
| `pnpm check`                                                                                                                               | exit0，22文件231/231，方向/Strict/lint/format/clean build、10生产ESM exports                                                                             |
| `node .local/step06-review/baseline.mjs`                                                                                                   | exit0，真实执行步骤02 SQL并插入旧Project                                                                                                                 |
| `pnpm --filter @tileset/api exec prisma migrate resolve --applied 202610120001_step02_project`；`pnpm db:migrate`                          | 均exit0，仅标记已实际执行的基线并追加三项迁移，无reset；旧Project UUID/name/createdAt保留                                                                |
| formal-workspace cwd：`node ../../../node_modules/vitest/vitest.mjs run --config ../../../vitest.step06.config.ts --root .`                | exit0，4文件23/23，181.23s，原单项预算不变，无unhandled error                                                                                            |
| `node .local/step06-review/environment.mjs`；`public-probe.mjs`                                                                            | 均exit0，新空专属DB真实迁移；28组通用/精确引用/cache/Compiler/发布/退休/迟到有效与非法控制                                                               |
| `node .local/step06-review/engineering.mjs`                                                                                                | 两次exit0，168文件SHA/BuildID精确复现                                                                                                                    |
| `node .local/step06-review/legacy.mjs`                                                                                                     | exit0，原生产JS78/78；脚本SHA仍506ec056e7eecde0410e7f05093531ed3d62a5f83b7a2d61482ef662c6c801b9                                                          |
| `node .local/step06-review/root-boundary.mjs`                                                                                              | exit0，真实dev/ino大小写别名全部拒绝；默认/合法相邻/absent/absolute及无PG目录portable控制通过，只读PG                                                    |
| `node .local/step06-review/gate-probe.mjs`                                                                                                 | exit0，R1 leaf与R2父active-child/父dead-new-createProject原反例green，已可能请求保持UNKNOWN且不重提                                                      |
| `node .local/step06-review/extra-gate.mjs`                                                                                                 | exit0，7组新增独立控制，包括三scoped＋一unscoped祖先真实TX fence/rollback                                                                                |
| `node .local/step06-review/concurrency.mjs`                                                                                                | exit0，两真实进程正常串行/CAS及失锁6008等待旧TX回滚；旧重启仅历史                                                                                        |
| `node .local/step06-review/recovery.mjs`                                                                                                   | exit0，46.68s；跨进程backup暂停项目写入/task query，新空DB＋absent root恢复、完整退休历史实际再建、真新进程known/unknown和正式CLI自定义root恢复/Mock归档 |
| `node .local/step06-review/maintenance-loss.mjs`                                                                                           | exit0，真实pg_dump失锁child关闭；restore-before-db失锁保持空public，备份hash损坏拒绝                                                                     |
| `node .local/step06-review/live-restore-abort.mjs`                                                                                         | exit0，真实运行中pg_restore失锁取消、OS child先关闭，解除测试阻塞后backend退出且single-transaction回滚，public表0                                        |
| `node .local/step06-review/history-guards.mjs`                                                                                             | exit0，28项真实DB历史/冻结/单调保护拒绝，测试事务均回滚                                                                                                  |
| `env INTEGRATION_API_PORT=4371 pnpm exec vitest run --config vitest.integration.config.ts`                                                 | exit0，真实DB→Nest/HTTP 3/3                                                                                                                              |
| formal-workspace cwd：`node ../../../node_modules/@playwright/test/cli.js test --config ../playwright.config.mjs`；同命令加 `E2E_MODE=dev` | 均exit0，生产1/1、开发1/1；创建/刷新/Pixi、pageerror及本轮截图，截图已独立查看                                                                           |
| `node .local/step06-review/pack-suite.mjs`；`pack-compare.mjs`                                                                             | 均exit0，真实源重放/标准八文件导出和重读8套；56payload/16PNG SHA与批准步骤05完全相同                                                                     |
| `node .local/step06-review/audit.mjs`                                                                                                      | exit0，1525保护文件全部未变，精确HEAD、git clean、API/Web无listener、DB无遗留客户端                                                                      |

本轮以上验证命令均首次运行通过，无平台中断、无限重试或生产/正式tests整改。只读探索中的路径查询错误不计作候选失败；完整原始私有日志留private。计数不相加为独立覆盖率。原作者失败保留不因本轮green消失。

## 责任覆盖与判断

| 步骤06责任/规格                                        | 独立执行与结论                                                                                                                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 产品§8.4/§10.1：项目、采用版本、不可变源/配方/精确依赖 | 旧Project真实增量迁移保留；saveDomainArchive/saveArchives/adopt/ProjectSnapshot实际持久化；同字节rev1/2/最大PGInt精确选择，旧快照不漂移；12张不可变历史表的UPDATE/DELETE均由真实trigger拒绝                                           |
| 产品§3.3/§8.1及STEP03：通用领域合法性与目标兼容分开    | 独立2×2可信Raw RGBA、两帧7/11ms、nonloop，原字节/像素手写控制经公共源/版本/处理入口保存、恢复及备份后重放相同；Built.targetCompilation始终NOT_EXECUTED；只请求MZ时拒绝目标几何                                                        |
| 公共恢复边界与非法变体                                 | 伪状态、坏字节、validationHash、缺依赖、非法duration/density拒绝；真实PNG decode→版本→process→build→compile得到Compiler-owned Fragment；JSON Fragment拒绝；IR/MZ_FRAGMENTS分别登记                                                    |
| 所有权与ReplaySession优化                              | raw/image/frame getter副本改零不影响重读；同PNG合法新revision/role重新产生不同IR/Fragment身份，原revision重读正确；非法revision/role/validationHash不能命中旧cache跳过硬验证，新操作/进程实际重放                                     |
| 产品§9.2/§9.3：完整Pack/Slot、退休与历史               | 全四槽位/连续历史经公共Pack/Layout/Atlas恢复；RETIRED保留旧依赖和像素、不复用；当前采用改变不重写旧Build；退休后新组实际建包、迟到项目快照仅HISTORICAL                                                                                |
| 产品§10.2：文件固化、短事务、CAS与失败保护             | 23正式项真实写失败/半写/完整文件后DB失败、PG延期COMMIT拒绝、提交前后SIGKILL、同身份恢复；旧成功保留、stage/orphan可定位；成功引用重读完整文件和hash                                                                                   |
| 同Pack两并发调用与反向完成                             | 正式Promise.all实际双调用同旧槽位claim只一方canonical；另两生产JS进程实际6007串行/CAS，6008实际TX锁阻挡后续事务直到旧回滚，失锁旧结果重启仅历史                                                                                       |
| 计算/等待不放长DB事务                                  | 处理/Compiler/编码/文件/远端等待在短Prisma事务外；文件durable barrier的gate session xact_start=null；实际短TX的全部祖先scope fence及maintenance shared xact锁保持至rollback                                                           |
| 产品§7：Task/attempt/外部ID/本地归档                   | INTENT先落库再真正submit；保存ID后SIGKILL＋真新Node查询同ID；remote-created但ID未落DB恢复UNKNOWN，不自动重买；possible-submit失锁保持唯一remote并保守恢复                                                                             |
| 归档失败、重复、取消、迟到、冻结输入                   | 成功但保存失败仅重归档、不再query/submit；重复完成不增资产/发布；本地取消NOT_REQUESTED且Mock远端仍运行，协议cancel UNSUPPORTED不冒充远端取消；旧snapshot迟到只候选历史；默认/输入变更与新进程不改变冻结模型/虚拟模板/参数/参考版本    |
| 产品§6.3：Adapter/Executor/Archiver方向                | MockProvider只有持久测试远端submit/query/输出协议，无Prisma恢复；Executor负责通用恢复，Archiver负责真实有界PNG/本地固化；无SDK/Key/真实模型/正式Prompt体系                                                                            |
| 产品§10.4：一致backup暂停和跨进程竞争                  | backup exclusive期间另两生产JS进程的项目write/task query在shared锁真实等待；前后DB digest、dump和全部文件hash一致，未复制unfinished stage；无自动清理，后续清理须同gate                                                               |
| 干净恢复和实际重建                                     | 本PG新专属空DB＋不存在文件根真实restore；源/通用配方、精确引用、完整退休Pack历史逐像素读取后实际prepareBuild/publish；known/unknown记录恢复后不当新请求；真实maintenance/Mock CLI同custom root，既有目标拒绝                          |
| 维护失锁与资源关闭                                     | view/copy/manifest前失锁正式测试通过；实际pg_dump和live pg_restore child在失败返回前关闭；restore运行中在真实single TX内由本测试非public event trigger阻塞CREATE TABLE，失锁取消，解除阻塞后backend退出/public表0，已验真孤立文件保留 |
| Build/BuildFile/Acceptance                             | 真实候选绑定Build/文件SHA、完整重读、重复同ID；STRUCTURAL追加记录真实保存且不可修改；Manifest中的Independent/MZ/Visual仍NOT_EXECUTED，未后补旧Manifest PASS                                                                           |

主要证据：[公共分层恢复](evidence/public-probe.json)、[祖先与生命周期](evidence/extra-gate.json)、[跨进程CAS](evidence/crossprocess-publication.json)、[一致恢复/CLI](evidence/independent-recovery.json)、[维护取消](evidence/maintenance-loss.json)、[live restore](evidence/live-restore-abort.json)、[历史保护](evidence/history-guards.json)、[标准Pack](evidence/pack-regression.json)，以及同目录formal结果和准确命令日志。

## R1/R2问题逐项结论

### STEP06-IR-001 — CLOSED / FIXED_INDEPENDENTLY_VERIFIED

原P2，阻断已解除。精确候选位置：`packages/persistence/src/gate.ts:32–48`、`:64–71`、`:83–99`、`:124–160`、`:164–175`；调用关联 `store.ts:65–76`、`executor.ts:84–176`、storage与backup各阶段checkpoint。

规格为产品§10.2/§10.4、计划步骤06以及本轮“父租约完整传播/短TX fencing/不可只外层reject”边界。原R1 leaf失锁＋maintenance取得后无新submit；已创建远端的控制保留唯一ID不重提。原R2 active child停在持久INTENT，真实terminate明确owned父backend后child在释放barrier前已abort，随后无remote/KNOWN，保留SUBMITTING并由新lease保守UNKNOWN；父已失锁后公共createProject无新Project提交。[原反例复跑](evidence/gate-probe-expanded.json)。

同DB重建Persistence和postgres/postgresql协议身份不能绕过失败父上下文；独立异步链路不受污染，不同DB控制正常写入。正常三层不同scope可用；任意祖先scope重入和嵌套exclusive拒绝。普通父正常结束后，已运行/等scope的未等待子工作及捕获的旧上下文拒绝后续写入；后台Project数量保持0。维护内已排队writer是明确例外，等待真实PG锁正常释放后可继续，真正失锁则取消。已等待maintenance时新子write明确拒绝、父结束后maintenance正常取得，没有自死锁或退回独立写入。[新控制](evidence/extra-gate.json)、formal正常/失锁队列结果。

真实TX核对三scoped＋一unscoped完整祖先链；父session终止后各scope的6008锁与6006 maintenance锁仍不能取得，释放barrier后回滚、Project不提交，之后锁可正常取得。正式父失锁半文件发布保留上一成功、无半成功引用。已完成请求/文件/COMMIT不能追溯撤销，证据仅支持停止后续合作式副作用与保守UNKNOWN，没有扩大为第三方计费幂等保证。

最小修复已落实为父链checkpoint/signal传播、共享同DB ALS、完整祖先TX fence与GateEnded/GateLost区别；无需新增整改。作者初版失败排队控制已真实恢复且原测试未改，不能用拒绝全部嵌套来声称关闭。

### STEP06-R2-001 — CLOSED / FIXED_INDEPENDENTLY_VERIFIED

原P2，阻断已解除。位置：`packages/persistence/src/config.ts:13–24`、`:26–36`。规格为当前STEP06资产根与本项目PostgreSQL必须分离、只属于项目.local的归属边界。

本机只读lstat证明postgres/Postgres/POSTGRES/pOsTgReS是相同dev/ino，公共resolveAssetRoot全部拒绝。首段casefold在没有PG目录的合成project仍保守拒绝；逐既存祖先真实dev/ino核对及symlink/non-directory检查有效。合法相邻postgres-assets、默认、existing/absent/absolute root成功；escape、空、.local根及symlink拒绝。未向PG目录写资源。[真实身份与控制](evidence/root-boundary.json)。最小修复已落实，无需新增整改。

### STEP06-IR-002/003/004 — CLOSED保持，回归通过

IR-002（原P2）：`store.ts:704–735`查询绑定project/asset/kind/revision/hash；同字节不同合法metadata rev1/2/2147483647分别成功，非规范/不存在/超界/错hash拒绝、不增任务；恢复DB再次精确选择、旧snapshot不变。

IR-003（原P2）：正式maintenance与Mock CLI共享resolveAssetRoot；本轮真实custom root backup→空DB/absent root restore→公共read/rebuild和Mock完成归档可读取，同名backup/已有restore目标拒绝，默认/非法root控制通过。新增大小写归属缺陷已由上项独立关闭。

IR-004（原非阻断P3）：两原.log在docsHEAD可读且SHA匹配；coding ledger50/50验真，原缺失事实/原报告未改写。没有新OPEN的P3。本轮无新增P0/P1/阻断P2，未识别需要另列的具体非阻断缺陷。

## 未执行、结束保护与门禁边界

本轮新MZ编辑器/手绘/GUI/游戏/GPU/用户美术、Original Native Host、RPGReactor、全量native CPU oracle、远端CI、真实视觉模型/Provider SDK/Key/预算、正式Prompt Registry/Composer、HTTP上传/真实远端下载、Redis/SaaS均 **NOT_EXECUTED**。这些属于既有延期或后续步骤；没有把旧壳浏览器、同Profile、自动结构或作者CPU证据冒充实机/美术完成，也没有无依据重新阻断步骤06外围技术放行。未开始步骤07。

结束逐项复核开始记录的1525个tracked文件SHA，生产源码/正式tests/锁/Profile/Pixel/母版/plans/历史Review及本checkout调度快照全部未变、未缺；HEAD精确c227，git porcelain为空。[源码保护](evidence/source-after.json)。未写Main/Coding工作区或canonical state，未reset/还原/删除他人文件；本轮原始日志、失锁stage/orphan、DB与dump保留本实例私有.local。

仅本实例owned PG55471保留供Main只读复核；15个tileset_ DB的归属清单、data_directory/版本、无API/Web listener及无遗留DB客户端在source-after。没有终止未知PG进程，所有terminate均先确认本轮lease PID实际持有6006 advisory lock。

报告仅在自身.local文件上用仓库Prettier显式 `--ignore-path /dev/null --write`，不改格式配置。最终报告SHA、脱敏日志/探针/结果的逐文件SHA及结束保护记录绑定在 [ledger.json](evidence/ledger.json)，重要进度在 `.local/step06-review/progress.json`。Reviewer完成后停止，技术PASS交Main按既有委托继续必要CI与验收门禁；本报告不自行阶段批准/发布，也不授权Reviewer实施07。
