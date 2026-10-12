# 步骤06第2轮整改 Coding 交付

2026-10-13，Asia/Shanghai。状态：**READY_FOR_REVIEW / SELF_TESTED_PENDING_ROUND3**。最新正式第2/5轮独立结论仍是 **REQUIRES_REVISION**；本报告是作者交付，不是 Independent PASS，不自行关闭独立ID。下一次正式第3/5轮；未批准、发布、合并、推送或启动07。

| 绑定                     | 精确版本                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| 原受审功能 / 原作者docs  | `debcce716e5b563eec881eb24eaa41aebcccac30` / `ac4ca7b222ccae93569c60275cafb3eace236356`            |
| 第2轮原独立报告 SHA256   | `4297ee38b16378bfc4f463f9d7f894c6be37d5396e6c0a6d06efbf3ba7a6a07f`；127项原ledger只读验真          |
| 新功能 candidate         | `c227f8c6ecfe85895937013e4687deb40247a6ee`；仅5个授权源码/测试文件                                 |
| 证据/基线 docsHEAD       | `6b9c80202dbab1c3ab5709762e8026aca6d4f002`；直接父为功能candidate，纯文档/证据                     |
| 报告交付HEAD             | 随后的report-only提交；自身不能自引用Git SHA，精确值在最终回复和.local/step06/coding-progress.json |
| 本地分支                 | `codex/step-06-persistence`；冻结后干净detached精确候选验证，再安全回到同分支写文档                |
| 工程 BuildID             | `step06-c227f8c6ecfe-2408d70aa6a8d040`；168 payload＋Manifest                                      |
| 工程 Manifest SHA256     | `f69ca0afbb95a5bf78d7bdeeada7af798f9e3f6352b339532646bc152a2cde1c`                                 |
| 真实DB BuildID           | `ec64c1ca9ecd3847fbd32502c8ecfb5e4ea614fd5ad1fbfac40adfd56ec88807`                                 |
| DB Build Manifest SHA256 | `26386d20e3207265df8f4577d9819163e1851a7edb4e6e6050fb0c68aef5f2d7`                                 |
| 新证据 ledger SHA256     | `c62aff3da3897322bb80c3ff31fa5c66630e83556648f8361f913d7eb9578586`；75文件，ledger自身另存         |
| Profile内容Hash          | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`；像素/Compiler/Pack身份不改     |

[原第2轮报告副本](../evidence/step-06/fix-round2/independent-round2-report.original.md)、[原ledger副本](../evidence/step-06/fix-round2/independent-round2-ledger.original.json)与三份原探针文本保留原字节。原ledger的127路径仍描述Main原证据位置；本轮只搬运报告/ledger/相关探针，不声称本目录包含全部原127文件。新[命令](../evidence/step-06/fix-round2/commands.json)、[ledger](../evidence/step-06/fix-round2/ledger.json)、[采集/脱敏索引](../evidence/step-06/fix-round2/capture-index.json)绑定新候选。Main/Reviewer目录只读。

## 两项阻断P2整改

**STEP06-IR-001：作者已实现并自测，待第3轮独立复核。** WriteGate保存完整活跃父链；新子操作在创建会话之前递归核对父checkpoint。子signal监听父真正失锁，传递同一GateLost原因并结束自己的PG会话，后续Executor提交/查询/归档、storage写入/固化和DB登记实际检查这条链。短事务递归取得所有祖先scope的6008 xact fencing锁及6006 maintenance shared xact锁，结束前核对链；保留6007 session scope与6008 transaction scope分工。同数据库身份共享ALS，协议写法或重建Persistence实例不能遮住失效父；独立异步调用链仍独立。

相同scope（包括任何祖先scope）重入和嵌套维护明确拒绝。不同scope普通嵌套合法；如果其新增shared会话被等待父释放的maintenance挡住，会直接拒绝，避免自死锁。正常结束的GateEnded区别于真正失锁的GateLost。维护窗口中**已经排队**的写请求等待实际PG锁正常释放，再开始自己的lifetime；维护失锁则取消等待会话。须结束维护回调后才等待这些排队请求，保留原public备份队列用法。已经结束的旧上下文不能发起新写入；普通父写操作的未等待子工作也不能越过其lifetime。

七项新增正式真实PG测试覆盖：owned父scope在child INTENT/remote-created barrier时被终止，child在释放barrier前已abort；新公共write/同DB重建实例拒绝且无新Project；正常不同scope嵌套/祖先scope重入拒绝/失效旧上下文/独立并发/维护内外队列；维护失锁取消实际等待PG会话；父及子TX scope持续fence到rollback、maintenance不能提前进入；父失锁停止半文件发布且上次成功保留。关键结果在 [nested executor](../evidence/step-06/fix-round2/new-ci/nested-executor-loss.json)、[new child](../evidence/step-06/fix-round2/new-ci/new-child-after-loss.json)、[queue loss](../evidence/step-06/fix-round2/new-ci/maintenance-queued-loss.json)、[transaction](../evidence/step-06/fix-round2/new-ci/parent-transaction-fence.json)、[publication](../evidence/step-06/fix-round2/new-ci/parent-publication-loss.json)。所有terminate先以pg_locks确认来自本测试lease，只终止本实例owned backend。

已经开始的外部请求、已完成的文件动作或已提交事务不能追溯撤销。本实现停止后续动作并等待本次可取消资源结束，不用外层Promise.race留下子工作继续。已可能创建远端、ID未落库仍保留SUBMITTING，真实新Executor/进程恢复保守UNKNOWN，不盲目重购；不声称本地锁或幂等能保证第三方绝不重复收费。未把图像处理或远端长等待搬入DB事务。

**STEP06-R2-001：作者已实现并自测，待第3轮独立复核。** 共享resolveAssetRoot保守casefold首段保留名，同时逐个比较所有既存祖先与本项目PostgreSQL根的真实dev/ino，继续拒绝symlink/非目录/escape/空配置。合法默认、custom absent与相邻postgres-assets目录保留。本机只读证据确认postgres/Postgres/POSTGRES三者dev=`16777232`、ino=`163349999`相同，全部拒绝；[原R2 case探针适配](../evidence/step-06/fix-round2/adapted/asset-root-case-alias.json)及[正式CI真实身份结果](../evidence/step-06/fix-round2/new-ci/postgres-case-identity.json)保留。新增config.test.ts在缺少PG目录时仍验证大小写保守拒绝，Linux CI可运行；未向真实PG目录创建任何测试资产，没有新增HTTP路径入口。

IR-002/003/004保持第2轮独立报告的CLOSED记录；本轮未改reference身份/冻结快照或改写旧报告。原六项revision、CLI配置root、leaf gate/file/backup控制全量复跑，包括合法同字节rev1/2精确引用与恢复后选择、真实CLI自定义root backup→新空DB/不存在root restore→读取/重建及Mock同root归档。原工具日志字节仍在既有文档提交中。

## 精确冻结候选验证

| 命令                                                                                                                                 | 实际结果                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                                                                         | exit0；22文件231/231；strict、12方向、lint/format、clean生产build、10真实ESM exports                            |
| `pnpm test:step06`                                                                                                                   | exit0；4文件23/23（原16＋新7），179.18s；原60000ms单项预算不变                                                  |
| `pnpm build:step06`                                                                                                                  | exit0；168 immutable payload逐文件SHA＋Manifest验真；锁/Profile/契约/schema/迁移绑定c227f8c                     |
| `CANDIDATE_SHA=c227f8c6ecfe85895937013e4687deb40247a6ee node --env-file=.env .local/step06/fix-round2/probes/gate-probe-adapted.mjs` | exit0；leaf与nested parent loss、child abort before release、无新remote/KNOWN、新公共write无提交、UNKNOWN不重提 |
| 同CANDIDATE_SHA执行`root-case-adapted.mjs`                                                                                           | exit0；真实同inode别名拒绝，相邻合法root接受，全程只读PG身份                                                    |
| `node --env-file=.env .local/step06/fix-round2/bound-publication.mjs`                                                                | exit0；实际生产JS/公共重放发布ADOPTED，重复返回同BuildID；真实commit/锁/Node/codec与文件hash保留                |
| `INTEGRATION_API_PORT=4366 pnpm test:integration`                                                                                    | exit0；API3/3，真实DB→Nest/HTTP                                                                                 |
| `API_PORT=4366 WEB_PORT=5266 pnpm test:e2e`                                                                                          | exit0；生产1/1，真实浏览器Project保存/重载/Pixi与pageerror控制                                                  |
| `E2E_MODE=dev API_PORT=4366 WEB_PORT=5266 pnpm test:e2e`                                                                             | exit0；开发1/1；两套JSON/PNG分别保留                                                                            |
| `node .local/step06/scalars.mjs`                                                                                                     | exit0；78/78，原脚本SHA506ec056…不变，生产包exports                                                             |
| `pnpm build:pack-sample` ＋ `node .local/step06/fix-round2/pack-compare.mjs`                                                         | exit0；8套Pack、56 payload/16PNG SHA与批准步骤05完全相同；包装Manifest因commit变化正常不同                      |

以上命令均在source冻结后、干净精确candidate checkout执行；之后只写文档。最终重算当前168编译/schema payload仍等于工程Manifest，未混入后来其他构建。新七项在vitest.step06.config与现有CI的test:step06，config负例在pnpm check；并非只有作者私有探针。原R2探针适配是作者重跑，不冒充新的Independent Review。

原16项包含真实执行器重建、真实子进程kill/重启、保存ID查询同任务/不确定UNKNOWN、成功归档失败仅重试归档、重复/迟到/取消/冻结配置、原成功构建保护、反向完成和同旧槽位争用、真实PG延期COMMIT失败，以及一致DB+文件备份、干净独立DB/root恢复后合法源/配方/完整退休Pack历史实际重放与重建。本轮完整通过；见 [原DB恢复](../evidence/step-06/fix-round2/original-db/backup-restore.json)、[真实发布进程kill](../evidence/step-06/fix-round2/original-db/publication-process-kill.json)、[已知ID重启](../evidence/step-06/fix-round2/original-db/known-id-process-restart.json)及[UNKNOWN进程kill](../evidence/step-06/fix-round2/original-db/unknown-process-kill.json)。迁移前最小Project仍存在，schema/migrations未改，未reset替代migration。

## 失败、所有权与恢复

作者初版把维护内排队请求一起拒绝，引入原备份测试回归：第一次全套21/22＋1 unhandled rejection，169.69s。原[失败日志](../evidence/step-06/fix-round2/logs/test-step06-pre-freeze.log.txt)及[原因/恢复](../evidence/step-06/fix-round2/failures.json)保留。修改gate区分正常release与loss，保留原排队测试和预算；随后新增7/7、pre-freeze完整23/23（177.51s）与精确冻结23/23通过。未删失败、降低阈值、修改旧测试来制造green。原所有旧失败/ledger/报告不变。

仅写原Coding Worktree与本地codex分支；Main/Reviewer/canonicalstate无写入。沿用专属.local/postgres/.env、PG55466/API4366/Web5266和.local/assets；Node22.21.1/pnpm10.20.0/PG14.20已有工具，无系统升级/未知进程终止/他人凭据复制。新恢复fixture和适配probe均新空tileset_ DB/独立asset root在本实例PG55466；未用55468。原DB/资产/中断stage与orphan保留，可由证据中的DB名、root和build/task ID定位。恢复需验真备份、暂停本实例相关写入并指向新空DB与不存在root，再读取/实际重建；曾提交/未知任务只查询或保守核对，不当成新请求购买。

[保护记录](../evidence/step-06/fix-round2/preservation.json)确认功能仅五文件变化、138个列举的plans/Profile/母版/领域/Compiler/Pack/旧证据字节未变；所有其他源码也由精确Git diff限制。Web仍contracts-only旧壳，核心框架无关。固定native gpt-6.1-sol/xhigh/default；不可见服务端字段UNVERIFIED_NOT_EXPOSED；未使用collaboration或更换/降级/加速。证据仅脱敏日志/hash/合成结果/浏览器图，未提交.env/DB dump/runtime/cache。

未执行：远端CI、正式第3轮Independent Review、新MZ手工/GUI/游戏/视觉/全量native CPU oracle、Original Native Host、单次live pg_restore abort实验、真实模型/ProviderSDK/Key/PromptRegistry/Composer/Redis/SaaS、批准/merge/push及07。以前的独立实际pg_dump abort/crossprocess fence证据保留，本轮未冒充重做。作者未识别剩余代码阻断；两个ID仍待Main安排正式第3/5轮复核。本步停止等待Main，不发布或启动07。
