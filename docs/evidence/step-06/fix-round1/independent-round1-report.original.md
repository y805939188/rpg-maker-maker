# 步骤06正式独立审查 — 第1轮 / 5

2026-10-13，Asia/Shanghai。结论：**REQUIRES_REVISION**。P0：0；P1：0；**阻断P2：3**；非阻断P3：1。必要正常路径与正式套件已独立执行，但补充故障/公共入口反例未清零，当前候选不能技术放行。

本报告只审查步骤06及其差异相关回归，不批准、合并、推送，不实施步骤07，也不替代用户亲自美术或MZ验收。Main的用户技术委托授权已阅读；本候选内旧调度state是历史快照，本Reviewer没有修改任何canonical state。

## 版本、构建与独立性

| 对象                                 | 精确绑定                                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 冻结生产源码 / 正式tests             | `a2878a922db93c14d29e0f128bd14e6b41fc09af`                                                                  |
| 作者最终docsHEAD                     | `bae84fd83ae85b2e1aa3a449726a15a47f5df852`                                                                  |
| 工作树                               | `/Users/dingshinn/.codex/worktrees/step-06-independent-review/rpg-maker-maker`                              |
| 上一步受审功能                       | `ad669a06218b6cf775f32b8333d75d9dd3f9186f`                                                                  |
| 工程BuildID                          | `step06-a2878a922db9-5f73046cf5c7dfac`                                                                      |
| 工程Manifest SHA-256                 | `7c97adbf203a1fb15bdfb65f5687cf3f47aa40d1fb0fe20fac65625b5afd3d19`                                          |
| 本轮真实DB BuildID                   | `3a2da3b4637e73c3397c8d266e8145521ca7adfff4ef127531f94d26b02c247d`                                          |
| 本轮DB Build Manifest SHA-256        | `8e8ac30841f56743958fd1349f19bd1a807d41a0469fd5823925f90078056237`                                          |
| Profile / 像素 / Compiler / Assembly | `mz-native-ground-water / 1.0.0-candidate.1`；既有Pixel Contract；`mz-single-material-v1 / stable-slots-v1` |
| Profile内容身份                      | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                                          |
| 锁文件SHA                            | `7c02fb7f8cc3c8386a1d9bc00c132d318cd4964ba1fea991e3c991cad19175e8`                                          |

工程检查重新生成全部dist，165个工程载荷逐文件SHA与作者Manifest相同，并独立重算BuildID。没有为了满足输出隔离而运行会写根artifacts的工程发布CLI；本轮哈希结果保存在 [engineering-rebuild.json](evidence/engineering-rebuild.json)。工程包装Build与真实数据库Build分开：数据库内部载体是 `durable-pack-v1 / durable-build-v1` 的四文件，不是步骤05标准八文件导出。

独立原生会话客户端字段为 `step_reviewer / gpt-6.1-sol / ultra / default`，启动cwd绑定本工作树；已读取Main只读派发收据并复制到 [client-configuration.json](evidence/client-configuration.json)。逐请求模型/服务端最终tier字段 **UNVERIFIED_NOT_EXPOSED**，客户端字段不冒充服务端证明。没有collaboration子Agent、加速档位、配置更换或全局配置修改。

开始/结束保护覆盖1420个tracked文件，生产源码、正式tests、锁文件、母版、plans和已有Review全未改变、未缺失；结束HEAD仍为精确冻结SHA，git porcelain为空。只新增本实例.local文件、独立.env、工具链正常生成物和本实例数据库，没有写Main/Coding工作区、用户MZ工程或远端。保护见 [source-before.json](evidence/source-before.json) 和 [source-after.json](evidence/source-after.json)。

## 阅读、作者证据与本轮环境

完整阅读AGENTS、两份正式plans、MZ_RUNTIME_ENVIRONMENT、STEP_03/04/05/06_BASELINE、需求映射、步骤05最新复审与发布记录、本轮授权、作者报告、生产差异、新正式tests和相关归档/故障/命令/构建证据。STEP_06、作者报告与证据从 `git show bae84fd:<path>` 提取到本.local；未检出后续文档覆盖源码。独立验证source→docs的53路径全部为README/docs；源码提交以后的作者文档没有未审实现。作者ledger50个SHA匹配，两个未入Git的日志通过已停止、HEAD精确bae84fd且clean的作者工作树原文补读；详见P3及 [author-audit.json](evidence/author-audit.json)。

步骤05独立PASS与发布事实沿用已读记录。差异核对确认原型/Profile/Pixel、asset-core、material-processing、image-adapter、mz-compiler、pack-assembly、母版与make-fixtures均未变。本轮没有重开步骤05全量Review或要求重复MZ手工。

Node22.21.1、pnpm10.20.0、Prisma6.19.3、PostgreSQL14.20 (Homebrew)；专属PG **55467**、API **4367**、Web **5267**。本工作树从不存在的.local/postgres独占初始化并生成新.env；不复制Coding.env，不接55466或其他集群。主资产根 `.local/step06-review/assets`；formal helper输出在本实例 `.local/step06/tests`；自编探针、归档、恢复文件和报告在 `.local/step06-review`。没有reset、删除/还原有价值数据或终止未知进程。

干净恢复使用本PG55467下专属新DB，无需PG55469：

- 正式套件：`tileset_backup_fixture_720d0e6a577b4a418fc309c75bcdf14b` → `tileset_restore_c20a52b502d745c7824acde9dcedfe24`。
- 独立补充：`tileset_independent_cae2b35de4c4407983b91a8cc5a1d5a2` → `tileset_independent_restore_014d20534e2a4405a9f546f21a036706`。
- CLI反例：空 `tileset_cli_restore_cb96a3d0a044414b905f15a8bc31936f`，文件根独立置于本.local。

根路径、创建/迁移、Build、任务、暂停观察和恢复hash见 [independent-recovery.json](evidence/independent-recovery.json)。结束没有API/Web/探针服务或数据库客户端连接；只有本实例owned PG保留，数据/故障现场未清除，见 [environment-final.json](evidence/environment-final.json)。

## 实际命令与结果

下列命令均在本冻结工作树运行，Node脚本通过真实构建JS/package exports调用公共入口。探针exit0只表示探针完成；发现候选缺陷的探针不计作候选PASS。原始私有日志在 `private/`，脱敏副本在 `evidence/`。

| 准确命令 / 动作                                                                       | 结果                                                                                                                  |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                      | exit0；固定工具链和锁，无依赖升级                                                                                     |
| `pnpm db:generate`                                                                    | exit0；真实Client生成                                                                                                 |
| `TILESET_PG_PORT=55467 pnpm db:local init`                                            | exit0；新独占集群、新凭据                                                                                             |
| 首次 `pnpm db:migrate`，构建前                                                        | exit1；缺API dist/config.js，数据库迁移未执行；原日志保留                                                             |
| `pnpm check`                                                                          | exit0；21文件230/230，12工作区方向、Strict/lint/format、clean build、10生产ESM exports                                |
| `node --env-file=.env .local/step06-review/baseline.mjs`                              | exit0；独立应用步骤02基线SQL、插入旧Project，再真实Prisma resolve；不reset                                            |
| 构建后 `pnpm db:migrate`                                                              | exit0；追加3项步骤06迁移，旧Project UUID/name/createdAt保持；4迁移链完整                                              |
| `pnpm test:step06`                                                                    | exit0；2文件10/10，104.98s；每项60000ms门限未改                                                                       |
| `INTEGRATION_API_PORT=4367 pnpm test:integration`                                     | exit0；真实PG→Nest/HTTP，3/3                                                                                          |
| `API_PORT=4367 WEB_PORT=5267 pnpm test:e2e`                                           | exit0；生产旧壳1/1，创建/刷新持久化、Pixi、pageerror空                                                                |
| `E2E_MODE=dev API_PORT=4367 WEB_PORT=5267 pnpm test:e2e`                              | exit0；开发旧壳1/1，截图/JSON保存                                                                                     |
| `node .local/step06-review/legacy-probe.mjs`                                          | exit0；原公开JS脚本78/78，脚本SHA保持`506ec056e7eecde0410e7f05093531ed3d62a5f83b7a2d61482ef662c6c801b9`               |
| `node --env-file=.env .local/step06-review/public-probe.mjs`                          | exit0；独立通用有效控制、非法变体、真实IR/Compiler/DB发布；复现STEP06-IR-002                                          |
| `node .local/step06-review/cache-valid-control.mjs`                                   | exit0；同PNG不同revision恢复得到不同IR/Fragment身份、原revision再次恢复正确                                           |
| `node --env-file=.env .local/step06-review/gate-loss.mjs`                             | exit0；实际终止本实例owned锁backend后复现STEP06-IR-001                                                                |
| `node --env-file=.env dist/scripts/step06-maintenance.js backup independent-cli-root` | exit1；配置资产根被忽略，读取固定.local/assets失败，STEP06-IR-003                                                     |
| `node --env-file=.env .local/step06-review/recovery.mjs`                              | exit0；真实备份、新空DB/文件根恢复、跨进程暂停、完整历史与实际重建、新进程任务恢复                                    |
| `node --env-file=.env .local/step06-review/cli-restore-probe.mjs`                     | exit0；内层正式restore CLI exit0但文件写错根，复现STEP06-IR-003                                                       |
| 首次 `node --env-file=.env .local/step06-review/concurrency.mjs`                      | exit1；Reviewer诊断把autocommit锁等待语句的xact_start误当长事务；保留失败，终止精确本轮owned等待child，未改生产/tests |
| 修正同一Reviewer诊断后再次运行上述concurrency命令                                     | exit0；两个真实发布进程、scope等待、SIGKILL后另一方采用、重启旧方仅历史；没有idle in transaction或空闲连接持有事务    |
| `node .local/step06-review/pack-regression.mjs`                                       | exit0；4个完整标准八文件Pack、28 payload SHA匹配批准步骤05；退休前后实际PNG不变                                       |
| `node --env-file=.env .local/step06-review/final-audit.mjs`                           | exit0；PG/归属/旧Project/结束连接审计                                                                                 |

首次Reviewer迁移和并发诊断失败均保留，没有删除失败用例、调整生产阈值或将失败改写为PASS。独立测试未遭平台中断。作者首次backup60003ms失败及后续累积fixture超时原文/hash保留在 `author-docs/docs/evidence/step-06/coding/test-step06-first.log.txt` 与 `test-step06-frozen-c010b90.log.txt`，不能由最后green覆盖。

## 责任覆盖与得到支持的行为

| 责任                                 | 本轮直接验证 / 判断                                                                                                                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 真实PG项目、当前采用与不可变revision | 真实旧Project迁移保留；存档源/版本/依赖/处理；adopt的版本条件；触发器拒绝改历史；当前切换不改变精确历史                                                                                       |
| 通用处理恢复                         | 自编2×2 Raw RGBA，两源帧 `[0,1]`、7/11ms、nonloop，源/配方保存后恢复、备份后恢复均逐像素吻合；Built始终targetCompilation=NOT_EXECUTED                                                         |
| 公共边界非法变体                     | 字节改动、缺依赖、duration=0、伪Built字段、validationHash改动拒绝；合法通用IR仅在请求Native编译时因目标几何拒绝                                                                               |
| Native IR / Compiler-owned Fragment  | 原PNG实际decode→构造版本→process→build→compile；JSON Fragment不能冒充owned；IR与MZ_FRAGMENTS为独立记录，真实DB两stage同时存在                                                                 |
| 字节与像素所有权                     | raw.bytes、image.bytes和IR frame副本写零后，原内容身份/重读历史不变；恢复对象不依赖旧进程或状态字符串                                                                                         |
| ReplaySession优化                    | 相同PNG新revision的有效控制重新产生正确不同元数据身份；descriptor revision/role、validationHash非法变体无法命中旧cache绕过硬验证；仅该缓存补测内部构建JS，实际恢复/发布均走公共入口           |
| 完整Pack/Slot历史和退休              | 全四槽位/连续历史、RETIRED兼容像素与依赖、标准导出和恢复重建；当前历史不会随adoption漂移                                                                                                      |
| 文件→短事务→CAS                      | 正式实际写失败/半写、durable后异常、PG deferred COMMIT拒绝、前后COMMIT SIGKILL、重复恢复；旧成功指针保留，孤立文件可定位，半结果不登记成功                                                    |
| 并发与迟到发布                       | 正式Promise.all真实双调用覆盖反向完成/同旧槽位claim；独立两个生产JS进程覆盖Pack scope串行化与kill后恢复；只一份canonical SlotVersion，旧方HISTORICAL                                          |
| 计算/等待事务边界                    | 静态所有处理/codec/下载在短Prisma事务外；独立文件durable checkpoint下持有gate的空闲连接xact_start=null；scope等待是独立pg autocommit语句，无长Prisma事务                                      |
| Mock任务/attempt/ID/归档             | 正式10项中的真实新进程known/unknown、INTENT先落库、归档失败仅重归档、重复完成不重复资产/Build、本地取消NOT_REQUESTED、旧项目快照迟到只存候选历史、冻结默认不漂移获支持；精确reference另发现P2 |
| 备份暂停和恢复                       | 实际backup exclusive期间另两个进程的项目写入与task query在shared锁等待，未出现新Project；pg_dump/files hash、恢复摘要、通用源与退休历史实际重建获支持；锁丢失例外另发现P2                     |
| 构建/文件/验收记录                   | 真实DB发布与重读、同身份幂等、STRUCTURAL追加验收记录与四文件hash；Manifest中的独立/MZ/视觉NOT_EXECUTED保持，八文件标准输出另行验证                                                            |

[公共探针](evidence/public-probe.json)、[cache有效控制](evidence/cache-valid-control.json)、[跨进程发布](evidence/crossprocess-publication.json)、[独立备份恢复](evidence/independent-recovery.json)、`formal-*.json`保存详细输入/ID/断点/结果。不将统计数量相加为覆盖率，也不只采信作者green日志。

## 阻断问题

### STEP06-IR-001 — 锁会话丢失只在操作返回后检查，维护暂停期间仍执行提交

- **P2，阻断；运行时/维护一致性。**
- 精确位置：`packages/persistence/src/gate.ts:21–33`；相关副作用入口 `packages/local-executor/src/executor.ts:97–105`。
- 规格：产品方案§10.4要求一致备份窗口暂停写入/清理；计划步骤06要求可重启恢复和一致快照；STEP_06_BASELINE“一致备份”声明gate包住提交/查询/归档全过程。代码自身注释明确死锁会话后不得继续发布。
- 触发：任务INTENT已持久化，停在`intent-durable`；仅终止该任务持有shared/scope advisory lock的本实例PG backend。确认连接已断及error事件有机会处理后，用另一个独立连接获得`pg_advisory_lock(6006,0)`维护独占锁，再释放旧任务checkpoint。
- 实际：维护独占锁取得后，旧Executor仍调用真实MockProvider.submit并创建远端 `bdfbfe81-2c3c-47de-9216-a0983d03496e`。维护锁解除后又保存KNOWN/REMOTE_RUNNING，最终调用才抛`Write gate connection lost`。AbortController未传入operation，Executor使用另一个永不取消的signal；首尾检查不能阻止中途副作用。
- 预期：会话丢失终止该操作的后续提交/文件写入/登记，不得在已确认paused的窗口继续新远端动作；已不可确定的提交保留UNKNOWN恢复语义。
- 独立复现：`node --env-file=.env .local/step06-review/gate-loss.mjs`；[gate-loss.json](evidence/gate-loss.json)有owned backend、时间顺序、exclusive取得、remote-created和最终状态。Mock不涉及真实费用；本报告没有据此声称已发生半文件成功引用或真实重复购买。
- 最小修复：给operation传递并使用gate lifetime signal/检查句柄；远端提交、文件固化、数据库登记及维护各异步阶段在丢失锁后停止后续动作，必要时增加事务内fencing。仅在外层race/reject Promise仍让后台operation继续不能关闭问题。补实际会话丢失＋维护/副作用竞态，不改变UNKNOWN保护。

### STEP06-IR-002 — reference查询缺少revision条件，合法同字节新版本无法创建任务

- **P2，阻断；精确不可变版本引用。**
- 精确位置：`packages/persistence/src/store.ts:694–705`。
- 规格：产品方案§5.4、§8.4要求任务冻结具体reference revision，源revision与内容hash分别存在；步骤06必须持久化/恢复精确引用，不能只凭相同源字节挑一个版本。
- 触发：通过公共saveDomainArchive保存同OriginalAsset的revision1和revision2，两版合法且源字节SHA相同；创建IMAGE_EDIT，reference明确指定revision2及该SHA。
- 实际：findFirstOrThrow只用projectId/assetId/kind/sourceSha，PG返回revision1，后续断言拒绝合法revision2：`Task reference revision mismatch: '1' !== '2'`。revision1有效控制成功；错误SHA负控制拒绝。并不需要伪造数据库或owned source。
- 预期：两个精确版本均可单独引用、正确冻结，即使原字节hash相同；不存在/不匹配的版本仍拒绝。
- 独立复现：公共探针的`exact-task-reference-revision-2`与revision1控制，见 [public-probe.json](evidence/public-probe.json)及同名日志。两版源SHA均为`1f01c44a4fe572dc0ded2f84b8840d03bd01058bbf9933f351ca2090be89df47`。
- 最小修复：校验reference revision为可精确映射的合法持久化整数，并把revision纳入查询条件；不能仅改排序选择最新。补同字节rev1/rev2、不同元数据版本、错误版本/hash及恢复后精确选择回归。

### STEP06-IR-003 — 维护/Mock CLI忽略TILESET_ASSET_ROOT，恢复成功到错误目录

- **P2，阻断；可操作备份恢复与文件归属。**
- 精确位置：`scripts/step06-maintenance.ts:11–14`；同类 `scripts/run-mock-executor.ts:9`。
- 规格：产品方案§10.1/§10.4、计划步骤06要求文件与DB一致恢复到干净环境；STEP_06_BASELINE命令明确要求用TILESET_ASSET_ROOT配置不存在的独立恢复根。正式tests helper读取该字段，两个生产CLI却固定resolve('.local/assets')。
- 触发1：本实例DB的真实文件位于配置`.local/step06-review/assets`，执行正式maintenance backup CLI。
- 实际1：exit1，lstat错误指向固定`.local/assets/objects/...`，没有读取配置资产根。
- 触发2：复制已验真备份至本实例专属CLI cwd的命令规定备份目录，创建全新空DB，设置TILESET_ASSET_ROOT为不存在的requested-assets，再运行正式restore CLI。
- 实际2：正式CLI **exit0**，DB恢复完成，文件出现在该cwd的`.local/assets`；configured requested-assets仍不存在。按配置创建Persistence再readBuild立即ENOENT。直接函数restore有效控制通过，说明库的可配置恢复能力未接到正式脚本入口。
- 预期：backup、restore与Mock执行器使用同一明确资产根配置；恢复成功之后按该配置可实际读取源/Pack/Build，既有资产根仍拒绝覆盖。
- 独立复现：`node --env-file=.env .local/step06-review/cli-restore-probe.mjs`；[cli-asset-root.json](evidence/cli-asset-root.json)、[maintenance-cli.log.txt](evidence/maintenance-cli.log.txt)。只操作本.local和55467空DB，没有覆盖原源实例。
- 最小修复：两CLI共享资产根配置解析，支持已声明TILESET_ASSET_ROOT并保留默认值/内部归属校验；补真实命令子进程的自定义根backup→空根restore→read/rebuild，以及Mock归档使用相同根的控制。

## 非阻断问题

### STEP06-IR-004 — 作者版本化ledger的两份日志未在docsHEAD入库

- **P3，非阻断；证据可搬运性。**
- 位置：`docs/evidence/step-06/coding/ledger.json:43/45`（作者docsHEAD bae84fd）；对应 `postgres-tools-version.log`、`prisma-version.log`。
- 规格：plans的可复核证据要求Review绑定提交与文件hash。
- 触发：仅用git show精确docsHEAD提取ledger全部路径。
- 实际：48个payload可从该commit读取，两份`.log`被ignore且没有入库；文件在clean作者目录真实存在，Reviewer按允许的只读fallback核对SHA，50/50最终匹配。
- 预期/最小修复：将原字节显式纳入版本化证据，或以新归档/索引记录可从指定提交获取的路径；保留原失败日志和旧ledger，不伪造历史。
- 证据：[author-audit.json](evidence/author-audit.json)。本轮已获得、验真原文，工具版本也独立确认；故不阻断当前技术审查，不扩大为缺失关键故障证据。

## 未执行、边界与结束门禁

本轮新MZ编辑器手绘、GUI/游戏/GPU动画、人工美术确认、Original Native Host、RPGReactor、远端CI、真实模型/SDK/Key/预算均 **NOT_EXECUTED**。没有把CPU、同Profile、作者报告或浏览器旧工程壳等同这些验收。作者8套3600形态/8,294,400像素CPU证据作为作者证据读取，本轮未重新启动oracle；相关像素/Compiler/Pack自动回归、公开JS和4套标准导出已独立执行，批准核心源字节无差异，因此未无依据阻断外围或要求重做步骤05人工。

原装Host与旧Map003延期保留原记录，不冒充完成；步骤07Studio/HTTP上传/交付预览没有启动。必要技术放行仍须以上3个阻断P2由step_coder整改、冻结新候选、影响复测和新的正式独立PASS。当前报告不能自动批准步骤06或授权步骤07。

本报告按仓库现有Prettier格式，仅对本.local/report.md执行格式化。报告最终SHA、脱敏证据逐文件ledger及最终源码保护绑定见 [ledger.json](evidence/ledger.json)。结束源码保护检查未变化；本实例原始日志、DB、备份dump与故障stage留在.local，未发布、未清理。
