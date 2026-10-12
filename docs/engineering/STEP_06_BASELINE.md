# 步骤 06 持久化、发布与 Mock 恢复基线

本轮仅实施步骤06。依据保留的两份正式 plans 和 [本轮授权](../orchestration/steps-06-07-authorization.md)，Coding 只实现、自测、本地冻结；独立 Review、批准、合并及推送由 Main 安排。步骤07未启动。既有 Profile、Pixel Contract、母版、Compiler/Pack 的身份、槽位与退役规则未改变。最终版本及命令见 [Coding 报告](../reviews/step-06-coding.md)。

## 所有权和方向

| 模块                                                           | 所有权                                                                                                                                 | 依赖                                                                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| asset-core / material-processing / mz-compiler / pack-assembly | 既有框架无关领域、像素、Compiler、稳定槽位规则                                                                                         | 原方向保持                                                                                              |
| ai-gateway                                                     | Provider/Executor/Task/ResultArchiver 与创建时快照协议                                                                                 | 原包保持契约，无 DB、SDK、真实模型调用                                                                  |
| persistence                                                    | Prisma repositories、源/版本/依赖/处理引用、项目快照、完整 Pack/Slot 历史、不可变文件、CAS 发布、验收、任务/attempt/归档数据、备份恢复 | asset-core、material-processing、image-adapter、mz-compiler、pack-assembly、ai-gateway、Prisma、pg、Zod |
| local-executor                                                 | 通用任务恢复与 Archiver；MockProvider 文件为测试远端的 submit/query，不拥有应用 DB/恢复                                                | ai-gateway、persistence、asset-core、image-adapter                                                      |
| API                                                            | 原 HTTP 安全边界和项目壳；项目创建参与维护写入锁                                                                                       | contracts、persistence、既有 Nest/Prisma                                                                |
| Web                                                            | 原项目/Pixi 壳                                                                                                                         | 仍只依赖 contracts；没有新增 Studio/上传/AI HTTP                                                        |

新增两成员先登记方向、构建、clean、真实 Node exports 和工程收集；生产只从构建 JS/包 exports 加载。Prisma schema/生成命令与增量迁移继续由 apps/api 目录承载，persistence 是领域持久化实现的拥有者。根原型只在 CLI 使用新增包，不把固定诊断布局变成正式 Pack。STEP05-RR-001 最小维护修复为 test:step05 自行 build:prototype，原 Review 未改写。

## 数据和真实恢复

数据库保存 Project 当前 revision/成功 Build 指针，ProjectSnapshot 的具体 adoption、稳定 OriginalAsset UUID、不可变 AssetRevision、精确 RevisionDependency、ProcessingRecord、Pack 当前版本、完整 PackVersion/SlotVersion、Build/BuildFile/AcceptanceRecord，以及 LogicalTask、SubmissionAttempt、TaskArtifact。源字节/派生或最终图像在专属 AssetStorage。没有 reset 代替 migration；旧 Project 的 UUID/name/createdAt 必须保留。

通用 domain-archive-v1 保留原始 PNG 或 RGBA8 字节、实际尺寸和 validationHash；saveDomainArchive/readDomainRecipe 通过公共 RawSource/真实 PNG decoder 或 validatedDecodedSource、版本构造器和 processShoreline 重建合法通用 IR，不先要求 MZ 兼容。二维 RGBA、两帧/milliseconds/nonloop 等既有合法语义可保存并在独立 DB 恢复后实际重建。IR 与 MZ_FRAGMENTS 是追加式独立处理引用，不将 Built 伪称 Compiler。Native archive/Pack 再明确使用 Compiler；尚未编译的通用版本不会混入 Native fragment registry。

Native 归档源包含真实 PNG、RawSource 描述、ref、validationHash、Style/Parameters/Recipe 版本；读回实际执行 RawSource → decodeSource → styleProfile/shorelineParameters/shorelineRecipe → processShoreline → buildProcessedAsset → compileFragment。恢复 IR/Fragment 采用公共构造、校验与真实像素，不把 JSON/state 字符串断言为拥有对象。完整历史再经过 validatePack/validateLayout/renderAtlas；标准旧 CLI 的身份与导出仍保留。

原始字节和 RgbaImage 均独立持有，getter 返回副本。DB trigger 禁止改写/删除版本、依赖、处理、项目快照、Pack/Slot、Build/文件引用/验收历史；任务创建输入、外部 ID 和已固化归档单独保护。当前采用版本改变不会重写历史配方或退役来源。当前 ACTIVE 绑定必须吻合冻结采用依赖；RETIRED 按旧来源重建并继续占槽。存储使用内部 durable-pack-v1/bundle.json 和 durable-build-v1 manifest，包含完整来源、历史、Profile、上下文、片段及文件身份；这是内部持久化载体，既有步骤05标准八文件导出入口未替换。

同一验证操作可用 ReplaySession 复用已经实际重放过、内容完全相同的归档，缓存仅持有公共边界产生的拥有对象；最多128项且估计保留预算32MiB。每个新操作重新验真；恢复后真实重建不依赖之前进程的内存。继承源归档32MiB、最多128配方和 Pack256历史等既有边界，不承诺无限项目/Pack 历史。

## 不可变发布与失败保护

prepareBuild 在事务外读来源/完整历史、处理/Compiler/规划/编码；发布拷贝调用方输入，重放验证实际内容、依赖、哈希和 canonical Pack 历史，再写唯一暂存目录。文件 wx 写入、重读对比、fsync 后 rename 到 builds/<content ID>；对象用 SHA-256 内容 key、独占 link 和 fsync 固化，已有文件核对原字节而不覆盖。PNG/source 文件与像素独立。

固化之后才进入短 Prisma 事务登记源、依赖、文件、Build 引用与验收关联。Pack version 与冻结 Project revision 均满足才 CAS 推进 Pack/项目成功指针；旧快照或同旧 Pack 版本的失败竞态结果登记 HISTORICAL，不能占用新的 canonical SlotVersion 或倒退成功指针。Pack 的独立 PostgreSQL session scope lock 串行化发布，事务内另有 CAS；同一身份重复发布读回核对并返回同一 Build。

图像/下载/远端等待不在 DB 事务中。文件完成而 DB 失败保留可定位不可变孤立文件；中断暂存目录保留在 stage/。不自动清理、复用槽位或覆盖上次成功。当前没有自动垃圾清理；后续清理必须进入同一 WriteGate，不能单独删已引用/历史文件。文件目录权限和 fsync 为单机合作式协议，不声称防恶意本机管理员、分布式对象存储事务或磁盘硬件失效。

## 通用任务恢复与 Mock 远端

创建任务先深冻结并持久化 model/provider/adapter/configuration 版本、参数、虚拟模板内容/版本、补充、Style/Target 和参考 revision/hash；Worker 只读任务快照。没有正式 Prompt Registry/Composer、SDK、Key 或视觉模型调用。

逻辑任务、提交 attempt/意图时间、external prediction ID、本地 archiveState、项目快照和候选历史分别记录。先短事务写 SUBMITTING/INTENT，再调用 Provider；已知 ID 与 attempt 结果短事务一起保存。实际远端成功仍未完成，只有有界 PNG 校验、文件固化和 TaskArtifact/AssetRevision 事务完成才 COMPLETED。ResultArchiver 不承担供应商 submit/query；Provider 不承担平台恢复或 Prisma。

- SUBMITTING 重建为 SUBMISSION_UNKNOWN，未知只核对且不自动重提；没有外部幂等保证时，本地 ID 不证明第三方绝不重复收费。
- 已保存 ID 的恢复查询同一 ID。FETCHING/归档失败保留远端成功结果，只重试本地归档，不再 submit。
- QUERY_KNOWN_ID / RETRY_ARCHIVE_ONLY / RECONCILE_UNKNOWN 指令不得对 QUEUED 新提交；只有 WAIT/enqueue 可提交尚无 attempt 的新任务。
- 重复完成保留同一候选资产/TaskArtifact，不重复发布。取消是 CANCELLED_LOCAL/NOT_REQUESTED，不等同供应商取消；当前 Mock cancel 返回 UNSUPPORTED，平台没有伪造远端取消。
- MockProvider 用独立 jobs JSON 和真实 PNG 在专属 remote root 跨进程保留状态；不是随 Executor 重建而丢失的内存 double。测试真实 fork、SIGKILL 和新 Node 生产 JS 会话重启。
- 候选归档总是历史，不自动 adoption/Pack publish；晚到任务保留创建时项目快照。需要选择候选的正式产品流程留步骤07–09，当前不会覆盖项目/Pack 成功指针。

Unknown 的诊断使用 task/attempt、冻结 snapshot、远端 ID 清单与可用供应商记录进行人工核对；当前不提供盲重提或把 UNKNOWN 改成新请求的按钮。恢复策略宁可保留不确定记录，也不承诺第三方计费幂等。

## 一致备份与干净恢复

WriteGate 用独立 pg.Client 的 session shared lock 包住本实例写入、提交/查询/归档及发布全过程，backup 用 exclusive lock 等待这些操作结束并阻止新写入；API 项目创建也参与。短 Prisma 写事务有同一 shared transaction lock。锁连接终止自动释放，合作式运行；不包括直接 SQL/任意外部文件改写。锁等待30s 超时只失败，不执行写入；长等待不在 DB 事务。

维护流程：暂停 → 验证 DB 引用、真实源/全部 Build 与 Pack/Slot/采用/任务 → pg_dump custom → 流式复制不可变 objects/builds（不复制 unfinished stage） → 前后 DB 内容摘要一致 → 每文件长度/SHA 验真与 manifest → 恢复写入。目标新建且拒绝覆盖；错误保留现场，无 manifest/验真失败不得作为成功备份。dump/.env/Runtime/缓存不入库。

restore 要求空 public schema 与不存在的资产根，先验真备份全部文件、复制并 fsync/复核，再 pg_restore --single-transaction 登记 DB，最后真实源/配方/全 Pack 历史/文件引用再次验证与内容摘要比较；之后实际执行一次新 Build。已提交/未知任务保持原记录，不能恢复成 QUEUED 新购买。测试用新的 tileset_backup_fixture_<uuid> 和独立资产根获得可重复的完整 fixture 实例（真实迁移，不 reset），随后恢复到本实例专属其他空 tileset_restore_<uuid> 数据库和独立恢复资产根，仍在55466，不触碰其他集群。

实现依据：[PostgreSQL14 advisory locks](https://www.postgresql.org/docs/14/explicit-locking.html#ADVISORY-LOCKS)、[node-postgres 同一连接规则](https://node-postgres.com/features/transactions)、[Prisma 事务文档](https://www.prisma.io/docs/orm/fundamentals/transactions)。这些资料不是本项目测试 PASS 证据。

## 当前专属环境与命令

Node22.21.1 / pnpm10.20.0 / PostgreSQL14 工具；本 Worktree 自建 .local/postgres、新 .env、PG55466、API4366、Web5266、.local/assets 和 .local/step06。不复制其他 Worktree 凭据，不改 Main 或用户 MZ 工程。恢复 DB/资产根名称与端口记录在脱敏 evidence；备份/失败现场只留 .local。

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
pnpm db:migrate
pnpm check
pnpm test:step06
INTEGRATION_API_PORT=4366 pnpm test:integration
API_PORT=4366 WEB_PORT=5266 pnpm test:e2e
E2E_MODE=dev API_PORT=4366 WEB_PORT=5266 pnpm test:e2e
pnpm tasks:mock create <existing-project-UUID>
pnpm tasks:mock resume <logical-task-UUID>
pnpm tasks:mock complete <mock-prediction-UUID>
pnpm tasks:mock resume <logical-task-UUID>
pnpm tasks:mock recover
pnpm backup:local <new-local-backup-name>
# restore: configure an independently created EMPTY tileset_ DB via process DATABASE_URL;
# use an absent .local asset root through TILESET_ASSET_ROOT. Never reset/overwrite.
pnpm restore:local <verified-backup-name>
```

CI 明确在真实 PostgreSQL14 service 上运行 test:step06；runner 的已有 PostgreSQL client 路径单独配置。CI 文件存在不表示远端执行通过。新公共 JSON/重放测试在 pnpm check，DB/故障/子进程/备份在 test:step06。工程构建包含新增包和 schema/全部迁移，绑定 clean commit、Profile/契约/锁、逐文件 SHA；敏感 DB/资产环境不打包。

独立 Review、用户/Orchestrator 批准、新 MZ GUI/游戏/视觉与 Original Native Host 均不由 Coding 冒充 PASS。旧延期记录保留；步骤06最多 READY_FOR_REVIEW，步骤07未启动。

## 第1轮独立 Review 后整改候选

原功能 a2878a9 / docs bae84fd 的第1轮正式独立结果为 REQUIRES_REVISION，STEP06-IR-001/002/003 为阻断P2，IR-004为非阻断P3。原报告/反例/失败与旧 ledger 不改写。当前整改功能 `debcce716e5b563eec881eb24eaa41aebcccac30`，仅作者 SELF_TESTED_PENDING_ROUND2，最多 READY_FOR_REVIEW；正式轮次保持第1轮结束、下次第2轮/最多5轮。

WriteGate 将真实 lifetime lease（signal、锁backend、maintenance/scope拥有检查）传给 operation，并以 AsyncLocalStorage 维持同一上下文。Executor 使用该 signal；故障/等待检查点之后和 submit/query/archive之前实际检查。文件创建/写入/完整性验证/link/rename及后续登记逐阶段检查，失去锁后停止后续动作，不以外层 Promise.race留下后台继续。已开始外部请求不能声称撤销；ID未保存时保留 SUBMITTING，下一次新 lease 恢复 UNKNOWN、不重购。

短事务先验证活跃 lease，再取 shared maintenance xact锁以及单独6008 scope xact锁，结束前再核对原 lease；6008与6007 session scope分离，避免同任务自己的两连接死锁。若 session在事务中终止，原事务必须回滚/结束后维护独占才取得。已经完成的外部动作或提交不可追溯撤销，此门禁停止后续副作用并保留保守恢复。backup/restore持有exclusive lease，pg_dump/pg_restore进程接同一 abort signal，取消后等待本次子进程close；复制/hash/完成manifest每阶段检查，失锁不返回成功。备份manifest先pending、验真后才完成，不把半备份当成功。

Task references 的 revision须规范十进制正整数、≤2147483647（实际PG Int），且查询包括 project/asset/kind/revision/hash，不选first/latest来猜版本。合法同字节rev1/rev2可分别冻结，异常/不存在/错hash拒绝；恢复后版本选择保持。

maintenance和Mock正式CLI共享 resolveAssetRoot，读取 TILESET_ASSET_ROOT，安全默认当前项目 .local/assets；配置必须在该项目 .local，不能指向 .local根、PostgreSQL或符号链接祖先/逃逸目录。真实CLI的自定义root backup→新空DB+不存在root restore→按配置read/rebuild及Mock归档已加入正式 test:step06/CI。

新增六项正式真实PG/CLI回归与原10项合并16/16通过；check230/230、API3/3、两模式浏览器1/1、旧JS78及56标准payload/16PNG哈希回归通过。正式CI远端未由Coder执行，MZ手工/真实模型仍未执行。原两份工具.log字节在新纯文档提交force-add，旧bae没有它们的事实和旧ledger保持。完整候选/Build/hash/命令/未执行项见 [整改报告](../reviews/step-06-fix-round-1-coding.md)、[新证据](../evidence/step-06/fix-round1/commands.json)。
