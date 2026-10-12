# 步骤06正式独立复审 — 第2轮 / 5

2026-10-13，Asia/Shanghai。结论：**REQUIRES_REVISION**。P0：0；P1：0；**阻断P2：2**。R1的原始反例已获得整改支持，但新增父租约/嵌套入口及本机真实目录别名控制仍失败，不能技术放行。未批准、合并、推送、提交或实施步骤07，没有改变Main的canonical调度state或重置第1轮历史。

## 精确版本与独立性

| 对象                          | 绑定                                                                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 冻结源码与正式tests           | `debcce716e5b563eec881eb24eaa41aebcccac30`                                                                                                                                                   |
| 作者文档HEAD                  | `ac4ca7b222ccae93569c60275cafb3eace236356`                                                                                                                                                   |
| 工作树                        | `/Users/dingshinn/.codex/worktrees/step-06-review-round2/rpg-maker-maker`                                                                                                                    |
| 工程BuildID                   | `step06-debcce716e5b-e8d5be24e48346c2`                                                                                                                                                       |
| 工程Manifest SHA-256          | `e0bc82fe0e8cff938482769afc721563da58331a83d0c3bbd9e7f6bcdd783bed`                                                                                                                           |
| Profile内容身份               | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                                                                                                                           |
| Profile / Compiler / Assembly | `mz-native-ground-water / 1.0.0-candidate.1`；`mz-single-material-v1 / stable-slots-v1`                                                                                                      |
| 本轮独立绑定DB Build          | `dba852c41039c97fd9c0fd07668f5da6f729d2ce1e6c1844c0f4005a864a9314`；Manifest SHA `cae57645f2a82cf7f925f029876541885099f0ec73af07f1818527d813092b84`；真实上下文/四文件SHA见public-probe.json |

源码checkout没有检出后续作者文档。直接以 `git show ac4ca7b:<path>` 读取并保存作者报告、基线与证据；source→docs的53路径全部是README/docs，没有未审执行变化。[差异](evidence/docs-diff.json)。独立重建的168个工程payload SHA全部匹配作者Manifest，并重新计算相同BuildID；没有调用会写根artifacts的工程发布命令。[重建](evidence/engineering-rebuild.json)。数据库内部四文件载体与步骤05标准八文件导出分别验证，没有把domain Built或内部存储包当最终交付。

本会话原生客户端字段为 `step_reviewer / gpt-6.1-sol / ultra / default`，cwd精确绑定本工作树。[客户端收据](evidence/client-configuration.json)。逐请求模型及服务端最终tier **UNVERIFIED_NOT_EXPOSED**；客户端收据不冒充服务器证明。没有collaboration子Agent、Priority/Fast/Ultrafast、配置更换或全局配置改动。

开始保护记录1473个tracked文件。源码、正式tests、锁、Profile/Pixel、母版、plans及历史Review按开始/结束SHA逐项比对；结束精确HEAD、git状态及比较结果在 [source-after.json](evidence/source-after.json)。没有写Main/Coding工作区、用户MZ工程、远端或canonical state。新数据库均属于本实例PG55469；没有reset或复用R1/Coding数据。

## 阅读、作者证据与范围

完整阅读AGENTS、两份正式plans、MZ_RUNTIME_ENVIRONMENT、STEP_03/04/05/06_BASELINE、需求映射、步骤05最新独立复审/发布记录、本轮授权、R1完整报告、作者初次报告和本轮整改报告、全部步骤06生产实现/迁移/正式测试及相关差异。Main状态只读；候选内旧state按历史快照处理。

作者整改ledger的46个文件逐项SHA匹配；旧ledger的50个文件也全部可从新docsHEAD读取。两份旧版本原.log已版本化且与原hash相同，IR004关闭。[作者审计](evidence/author-audit.json)。首次backup 60003ms失败及后续累积fixture失败日志保留原字节，不以本轮green覆盖；位置和SHA见 [失败保留](evidence/author-failed-run-preservation.json)。作者230/16、API3、browser2、JS78、56payload和构建结果仅作为作者证据，本报告下述结果均另外独立执行。

与批准步骤05候选 `ad669a06218b6cf775f32b8333d75d9dd3f9186f` 比较：原型/Profile/Pixel、asset-core、material-processing、image-adapter、mz-compiler、pack-assembly、fixtures、make-fixtures没有源差异。本轮按相关像素/Compiler/Pack回归验证，不重开步骤05全量Review或要求重复MZ手工。既有用户观察、Original Native Host、旧Map003延期保持原范围，未冒充完成。

## 独立环境与实际执行

固定工具链Node22.21.1、pnpm10.20.0、Prisma6.19.3、PostgreSQL14.20。新独占 `.local/postgres` / `.env`，PG **55469**、API **4369**、Web **5269**；资产、备份、恢复、Mock远端、探针与报告均属于本checkout的ignored `.local`。正式结果和最终保留现场位于 `.local/step06-review`，PG及新.env为必要实例环境。没有复制其他.env或连接其他集群；恢复使用本集群的新专属DB，无需55471。[归属与结束状态](evidence/environment-final.json)。

正式套件的固定 `process.cwd()` 临时路径需要隔离：首次 `--root` 控制测试发现但没有改变worker cwd，生成物落在本实例 `.local/step06`；原结果保留后移入报告private目录。随后显式从 `.local/step06-review/formal-workspace` 的cwd、绝对Node22.21.1启动同一未修改正式config/tests；第二次12/16通过，4个fixture迁移因child pnpm仍继承22.14的PATH失败。只在本实例进程环境给child固定22.21.1后再次完整运行16项。目录映射、两次结果和原文件SHA保留，不将首次路径误配隐藏。sandbox只用指向本候选的只读源码/dist链接及本实例环境，没有改正式测试。[临时归属](evidence/formal-output-ownership.json)。

| 准确命令 / 操作                                                                                                                                                                                                                                              | 实际结果                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                                                                                                                                                                                                                             | exit0；锁/依赖未升级                                                                                                                                                     |
| `TILESET_PG_PORT=55469 pnpm db:local init`                                                                                                                                                                                                                   | exit0；独占新PG，未覆盖已有环境                                                                                                                                          |
| `pnpm db:generate`                                                                                                                                                                                                                                           | exit0；真实Prisma Client生成                                                                                                                                             |
| `pnpm check`                                                                                                                                                                                                                                                 | exit0；21文件230/230、12工作区方向、Strict/lint/format、clean build、10生产ESM exports                                                                                   |
| `node --env-file=.env .local/step06-review/baseline.mjs`                                                                                                                                                                                                     | exit0；先应用真实步骤02基线SQL并保存旧Project                                                                                                                            |
| 第一次不带env的Prisma `migrate resolve`                                                                                                                                                                                                                      | exit1，DATABASE_URL缺失；Reviewer接线失败日志保留                                                                                                                        |
| `node --env-file=.env .local/step06-review/with-env.mjs pnpm --filter @tileset/api exec prisma migrate resolve --applied 202610120001_step02_project`                                                                                                        | exit0；仅标记已真实执行的基线                                                                                                                                            |
| `pnpm db:migrate`                                                                                                                                                                                                                                            | exit0；追加3项步骤06迁移，旧Project保留、4迁移链完整，无reset                                                                                                            |
| `pnpm exec vitest run --config "$PWD/vitest.step06.config.ts" --root "$PWD/.local/step06-review/formal-workspace"`                                                                                                                                           | exit0；3文件16/16，168.14s；每项60000ms不变；首次worker cwd输出归属问题如上                                                                                              |
| 在formal-workspace执行 `/Users/dingshinn/.nvm/versions/node/v22.21.1/bin/node ../../../node_modules/vitest/vitest.mjs run --config ../../../vitest.step06.config.ts --root .`                                                                                | exit1；12 passed / 4 failed，104.08s；4项在新fixture迁移启动时失败，未执行其后断言；原日志保留                                                                           |
| 正式cwd中 `/Users/dingshinn/.nvm/versions/node/v22.21.1/bin/node --env-file=.env ../with-toolchain.mjs /Users/dingshinn/.nvm/versions/node/v22.21.1/bin/node ../../../node_modules/vitest/vitest.mjs run --config ../../../vitest.step06.config.ts --root .` | exit0；3文件16/16，167.27s；child pnpm使用已验证22.21.1，未改正式config/tests                                                                                            |
| `INTEGRATION_API_PORT=4369 pnpm test:integration`                                                                                                                                                                                                            | exit0；真实PG→Nest/HTTP，3/3                                                                                                                                             |
| formal-workspace中 `API_PORT=4369 WEB_PORT=5269 /Users/dingshinn/.nvm/versions/node/v22.21.1/bin/node --env-file=../../../.env ../../../node_modules/@playwright/test/cli.js test --config ../playwright.config.mjs`                                         | exit0；生产1/1，6.4s；持久化创建/刷新、Pixi、pageerror控制                                                                                                               |
| 上述浏览器命令加 `E2E_MODE=dev`                                                                                                                                                                                                                              | exit0；开发1/1，15.2s                                                                                                                                                    |
| `node .local/step06-review/engineering.mjs`                                                                                                                                                                                                                  | exit0；168 payload SHA及工程BuildID精确复现                                                                                                                              |
| `node .local/step06-review/legacy.mjs`                                                                                                                                                                                                                       | exit0；原公开JS78/78，原脚本SHA `506ec056e7eecde0410e7f05093531ed3d62a5f83b7a2d61482ef662c6c801b9`                                                                       |
| `node --env-file=.env .local/step06-review/environment.mjs`                                                                                                                                                                                                  | exit0；新独立public fixture DB、真实迁移、专属资产根                                                                                                                     |
| `node --env-file=.env .local/step06-review/public-probe.mjs`                                                                                                                                                                                                 | exit0；28组独立有效/非法控制、实际领域/Compiler/DB Pack、退休与迟到历史                                                                                                  |
| `node --env-file=.env .local/step06-review/gate-probe.mjs`                                                                                                                                                                                                   | exit0仅表示探针完成；原R1反例green，父租约两种反例仍失败；扩展字段结果保存在gate-probe-expanded.json                                                                     |
| `node --env-file=.env .local/step06-review/concurrency.mjs`                                                                                                                                                                                                  | exit0；真实两进程正常竞争及失锁6008 fence/回滚/历史恢复                                                                                                                  |
| `node --env-file=.env .local/step06-review/recovery.mjs`                                                                                                                                                                                                     | exit0；跨进程backup暂停、独立空DB+空文件恢复、通用源/完整退休历史实际重建、真新进程known/unknown；另真实维护/Mock CLI自定义根backup→空DB/absentRoot restore→read/rebuild |
| `node --env-file=.env .local/step06-review/maintenance-loss.mjs`                                                                                                                                                                                             | 最后测量修订exit0；实际pg_dump子进程失锁取消并等待close、恢复登记前失锁、备份hash损坏拒绝；前三次Reviewer观察错误均保留                                                  |
| `node .local/step06-review/pack-suite.mjs`，随后 `node .local/step06-review/pack-compare.mjs`                                                                                                                                                                | exit0；真实标准导出/重读8套、56 payload / 16 PNG与批准步骤05逐文件SHA一致                                                                                                |
| `node --env-file=.env .local/step06-review/root-case.mjs`                                                                                                                                                                                                    | exit0只表示反例完成；真实PG目录大小写别名被错误接受，见新增P2                                                                                                            |

准确命令、cwd、结果和日志映射见 [commands.json](evidence/commands.json)。只读探针exit0不等于候选PASS，不把计数相加为覆盖率。

浏览器隔离包装首次根路径误配及subcwd shell选用Node22.14导致启动失败均保留；显式固定22.21.1后两模式通过。首次误配reporter文件只产生在本实例.local，已移入private保留。未改变全局Node/MZ配置，也未降低engine检查。维护观察器先因事务内pg_stat_activity缓存、再因把服务器锁等待backend立即消失当child close而失败；修订只在本.local测量工具，使用 `pg_stat_clear_snapshot()` 与真实OS子进程PID。实际pg_dump close后服务器backend可仍等待本测试持有的表锁，解除后消失；不把取消扩张为立即撤销PostgreSQL已经开始的读取。原日志全部保留，无平台中断。

## 步骤06责任覆盖

| 责任                     | 本轮直接验证与范围                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 项目与不可变版本         | 旧Project UUID/name/createdAt迁移保留；真实source/style/parameters/recipe/依赖/ProcessingRecord、当前adoption和冻结ProjectSnapshot；正式触发器更新历史拒绝                                        |
| 通用领域恢复             | 独立2×2可信Raw RGBA、两帧7/11ms、nonloop真实保存/恢复/备份后重放，像素与手写数组一致；Built.targetCompilation始终NOT_EXECUTED；仅请求MZ时拒绝目标几何                                             |
| 公共入口非法变体         | 改字节、validationHash、缺源依赖、duration、density、伪Built标签拒绝；没有用JSON断言伪造owned对象                                                                                                 |
| 精确reference            | 同字节不同合法元数据rev1/rev2/最大PGInt分别保存并选择；0/负数/前零/小数/指数/超界/不存在/空/错SHA拒绝；新恢复DB再次精确选择，旧快照未变                                                           |
| 像素/字节与cache         | getter副本修改不影响重读历史；同字节新revision和合法改role源分别真实重放出不同IR身份；缓存命中不能让非法revision/role/validationHash跳过硬校验；新恢复操作不依赖旧进程内存                        |
| IR / Fragment / Pack分层 | IR与MZ_FRAGMENTS分别登记；真实PNG decode→公共版本构造→process→build→Compiler；JSON Fragment拒绝；完整历史经公共Pack/Layout/Atlas边界重建                                                          |
| 稳定槽位与退休           | 完整四槽位、连续版本、旧退休配方依赖与像素保留；当前采用改变后旧Build不变；新active配套与冻结adoption吻合，旧结果仅HISTORICAL；8套标准payload不变                                                 |
| 文件与短事务发布         | 正式16项真实半写/写失败、完整文件DB失败、延期COMMIT拒绝、提交前后SIGKILL、重复恢复；孤立文件可定位、半成品不成为成功引用、失败不替换旧成功                                                        |
| 并发/CAS与事务fence      | 正式Promise.all两个调用及独立两个生产JS进程；6007串行正常发布；文件等待处session xact_start=null；丢session后6008 xact竞争确实等待旧回滚再采用，旧重启仅历史                                      |
| Mock任务/attempt/ID      | INTENT先落DB；保存ID后真正新Node恢复同ID；创建远端但ID未落库的实际SIGKILL保留SUBMITTING，恢复UNKNOWN、不重买；原始snapshot参数/模板与默认改变隔离                                                 |
| 归档、幂等与取消         | 正式实际归档故障仅重归档、重复完成不增资产/Build；真实CLI完成可重读源；本地取消NOT_REQUESTED、Mock远端仍运行，cancel UNSUPPORTED不冒充远端取消；旧任务迟到只历史                                  |
| 一致备份与干净恢复       | 独立backup exclusive期间两进程的项目写入与task query真实shared锁等待；dump/全部文件hash和DB digest；全新DB/absentRoot恢复、通用源和完整退休Pack实际再建，known/unknown不自动当新请求              |
| 维护失锁/资源收束        | 正式view/filecopy/manifest前失锁拒绝；独立实际pg_dump等待表锁时kill gate，OS child已关闭后返回、无成功manifest；restore-before-db失锁保留空public及可定位文件；损坏备份hash拒绝；父租约例外仍OPEN |
| Build/文件/验收          | 真实候选上下文、BuildFile/manifest SHA、同身份幂等、独立STRUCTURAL追加记录；Manifest未写用户美术/MZ/独立Review PASS                                                                               |

详细证据：[公共边界](evidence/public-probe.json)、[失锁](evidence/gate-probe-expanded.json)、[双进程发布](evidence/crossprocess-publication.json)、[恢复/CLI](evidence/independent-recovery.json)、[维护取消](evidence/maintenance-loss.json)、[标准Pack](evidence/pack-regression.json)和formal结果。核心得到支持不等于下述已复现异常可以放行。

## 问题与R1逐项结论

### STEP06-IR-001 — PARTIALLY_FIXED / OPEN：嵌套Gate遮住父租约失锁

**P2，阻断。** 原R1“单个任务session丢失后在维护exclusive下继续submit”已独立关闭该原始触发：真实terminate该task backend、取得exclusive、释放intent barrier，无远端；已可能提交的另一控制只保留一ID，后续UNKNOWN且不重提。正式部分文件、事务及exclusive丢锁控制也通过。通用嵌套入口仍未满足同一租约生命周期的必要边界，故该ID整体仍OPEN。

- **精确位置：** `packages/persistence/src/gate.ts:51–61` 为每次run无条件创建独立controller，没有读取/核对父context；`:113–115` 用新lease替换AsyncLocalStorage，只在父operation最终返回后才检查父lease。相关 `packages/local-executor/src/executor.ts:84/102/111–122` 使用被替换后的child lease提交/保存ID。
- **规格：** 本轮独立验收明确要求“父scope失锁、嵌套Gate租约”和“中间await之后无新副作用”；产品方案§10.2/10.4及步骤06的通用暂停/故障发布边界，作者整改描述租约lifetime沿异步链路带入storage/短事务，不能外层报错而后台继续。
- **触发A：** 公共 `store.gate.write(..., parentScope)` 内调用公共 `Executor.resume`，停在INTENT已持久化的child checkpoint。仅terminate明确owned的父backend；确认父signal已aborted、child尚未aborted，再释放await。
- **实际A：** child继续实际Mock submit，并保存KNOWN/REMOTE_RUNNING；父最终才返回GateLostError。扩展复现父PID/childPID分别58001/58008，远端ID和精确状态见证据。`childAbortedBeforeRelease=false`，不是已开始请求无法撤销。
- **触发B/实际B：** 父scope await期间失锁，随后调用公共 `createProject`；它取得新lease并提交Project，外层仍最后报GateLostError。数据库存在新Project，说明不仅是返回错误或远端完成的观测差异。
- **预期：** 父已失锁后子链停止新的提交、文件/DB动作；尚无请求的INTENT按新的有效lease保守恢复UNKNOWN，不盲重提。不能以新child lease掩盖仍未结束的失败父operation。保持正常独立并发、短事务fence和维护窗口排队控制。
- **复现：** `node --env-file=.env .local/step06-review/gate-probe.mjs`；[初次结果](evidence/gate-probe.json)、[扩展结果](evidence/gate-probe-expanded.json)及对应脚本/日志。两次都复现，没有改实现/正式tests。
- **最小修复：** 明确定义嵌套语义，在创建/运行child前核对父lifetime，父失锁向已运行child的signal/checkpoint/fence传播；适当复用同scope lease或明确拒绝不支持的重入，不能只最终reject。正常完成的维护父scope与真正失锁要区分，不能破坏原排队控制。补真实父backend终止＋active child、父失锁后新公共写入和正常嵌套控制到正式CI套件。

本反例的child仍持有自己的shared/task锁，因此没有声称它在另一maintenance exclusive已取得时写入，也没有声称撤销已经提交的SQL/请求。发现的是失去父scope之后仍新增副作用与对外失败结果不一致的生命周期漏洞。

### STEP06-IR-002 — CLOSED / FIXED_INDEPENDENTLY_VERIFIED

`store.ts`精确查询加入revision，并拒绝非规范/超PGInt值。独立同字节不同合法metadata的1/2/2147483647分别成功；非法、不存在和错hash不新增任务，冻结旧快照不变；新空恢复DB再次正确选择。[公共验证](evidence/public-probe.json)、[恢复](evidence/independent-recovery.json)。不是改排序挑latest，也未收窄合法通用IR。

### STEP06-IR-003 — CLOSED / FIXED_INDEPENDENTLY_VERIFIED（原始CLI资产根问题）

两个真实生产Node CLI均使用配置根。独立custom root backup→新空DB＋absent root restore→真实read/rebuild，Mock归档可读，重复目标拒绝；默认root解析、空/escape/小写postgres/symlink控制通过。[CLI](evidence/independent-recovery.json)。配置安全新增的真实大小写别名遗漏单列R2-001，不将原忽略env的反例写成仍未整改。

### STEP06-R2-001 — OPEN：真实PostgreSQL目录大小写别名绕过资产根排除

**P2，阻断；文件归属配置边界。**

- **精确位置：** `packages/persistence/src/config.ts:11–18` 仅对字符串首段做大小写敏感 `=== 'postgres'`；`:23–28` 检查祖先是否directory/symlink，但不检查真实目录身份是否已属于PostgreSQL。
- **规格：** 作者config自身和新STEP06基线规定资产根必须属于项目.local且与PostgreSQL分离；本轮要求安全custom root的postgres/escape/symlink控制。隔离数据库与资产归属是当前环境要求，不能以通过普通路径控制替代。
- **触发：** 在本机现有文件系统，`.local/Postgres` / `.local/POSTGRES` 与专属 `.local/postgres` 的 `lstat.dev + ino` 完全相同。公共resolveAssetRoot分别传入这两种祖先下的absent `review-assets`。
- **实际：** 两种配置均成功返回根；等价的小写配置正确拒绝，报告目录中的合法配置成功。接受结果的真实祖先就是数据库目录，后续storage/restore会把它当允许的资产根。
- **预期：** 同一真实PostgreSQL目录的任何本机路径别名都拒绝，正常项目.local资产根保持可用。
- **证据：** `node --env-file=.env .local/step06-review/root-case.mjs`；[asset-root-case-alias.json](evidence/asset-root-case-alias.json)。这是实际文件系统和真实公共解析入口的有效/非法控制；只读lstat/resolve，没有在PG目录创建资产或声称数据库损坏。
- **最小修复：** 将保留目录识别与真实文件系统归属一致（保守大小写归一拒绝保留首段，并/或比对已有祖先与实际PostgreSQL根身份）。保留现有absentRoot/default/symlink/escape/已有目标行为。补大小写别名及合法相邻目录回归；不能仅在Linux大小写敏感CI上测试一个小写字符串。

### STEP06-IR-004 — CLOSED（原非阻断P3）

新docsHEAD可直接git show两原.log，原ledger50/50 SHA相同，旧缺失事实和原失败报告没有改写。[author-audit.json](evidence/author-audit.json)。本轮未发现需要另留OPEN的P3。

## 未执行与结束门禁

本轮新MZ编辑器/手绘、GUI/游戏/GPU动画、用户美术、Original Native Host、RPGReactor、真实视觉模型/SDK/Prompt生产体系/Key/预算、HTTP上传/远端下载、远端CI均 **NOT_EXECUTED**。没有重复步骤05全Review/MZ人工，也没有使用RPGReactor或CPU/浏览器旧壳替代真实MZ/用户艺术验收。实际pg_restore运行中失锁单独实验未执行；共享command取消机制以真实pg_dump child及restore-before-db控制核对，不冒充该单独场景。没有平台中断。

两个阻断P2需正式step_coder整改、冻结新候选、加入现有CI的必要回归，再独立复审。当前230/16等green只支持已覆盖行为，不能批准步骤06；本报告不是Main的APPROVED，也不授权步骤07。

报告仅对本文件执行仓库Prettier格式化。最终reportSHA、脱敏证据与探针逐文件SHA在 [ledger.json](evidence/ledger.json)；结束源码保护检查、精确HEAD/git状态和本实例服务审计包含在同一ledger。私有原日志、失败stage/orphan、数据库、dump与恢复文件保留，不发布或删除他人文件。结束后停止。
