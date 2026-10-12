# 步骤06第1轮整改 Coding 交付

2026-10-13，Asia/Shanghai。状态：**READY_FOR_REVIEW / SELF_TESTED_PENDING_ROUND2**。第1轮正式独立结论仍 **REQUIRES_REVISION**，本报告不是 Independent PASS。下次正式第2轮/最多5轮，未发布、批准、合并、推送或启动07。

| 绑定                       | 精确版本                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| 原受审功能 / 原作者docs    | `a2878a922db93c14d29e0f128bd14e6b41fc09af` / `bae84fd83ae85b2e1aa3a449726a15a47f5df852`                   |
| 原独立报告SHA              | `a983e4a763801ee83a74afccfc9e71fece162a255092fe898ba6f99ebb5b5fa4`，66个ledger路径只读验真                |
| 新功能 candidate           | `debcce716e5b563eec881eb24eaa41aebcccac30`                                                                |
| 分支                       | `codex/step-06-persistence`；已确认包含bae；功能提交后干净detached精确候选验证                            |
| 新evidence/基线 docsHEAD   | `9a70f3c4ce89b29f4c60f37f745c470857f2acb8`，直接父为功能candidate；纯文档/证据及两份原日志                |
| 报告交付HEAD               | 随后的report-only提交，精确SHA在最终回复和.local/step06/coding-progress.json；自身内容不能自引用其Git SHA |
| 工程BuildID                | `step06-debcce716e5b-e8d5be24e48346c2`；168 payload＋Manifest                                             |
| 工程Manifest SHA256        | `e0bc82fe0e8cff938482769afc721563da58331a83d0c3bbd9e7f6bcdd783bed`                                        |
| 真实DB BuildID             | `ba6325b4d117d89734ba7ad925e61946df8610913bb6d1afc3241b3a02fa51d7`                                        |
| DB Build Manifest SHA256   | `3a7f5f002111cd27ac4de87d0b29f68a363c71559e55aa7f6bbd10fc5b2a0fa1`                                        |
| Profile/像素/Compiler/Pack | 保持旧版及身份；Profile内容 `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`            |

原[独立报告原字节副本](../evidence/step-06/fix-round1/independent-round1-report.original.md)、原反例和旧Coding报告/失败/ledger保留；Main/Reviewer目录仅只读。最新[命令与hash](../evidence/step-06/fix-round1/commands.json)、[工程逐文件SHA](../evidence/step-06/fix-round1/build-engineering.json)、[ledger](../evidence/step-06/fix-round1/ledger.json)绑定新候选。源码后的两次文档提交不含未审实现。

## 逐项整改及实际控制

| 问题                   | 改动/边界                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 作者正式验证                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| STEP06-IR-001 阻断P2   | WriteGate传入真实lifetime lease/signal，实际核对maintenance/scope锁拥有；AsyncLocalStorage将相同lease带入storage和短事务。Executor使用gate signal，等待/故障点后、submit/query/archive前检查；文件写入/link/rename、DB登记逐阶段停止。DB先取得maintenance shared xact与独立6008 scope xact fence、回调末检查；不与自己的6007 session scope死锁。backup/restore的PG子进程接signal、取消后等待close，复制/hash/完成manifest每阶段核对；不是Promise.race留下后台。 | 真实pg_terminate_backend只终止测试明确持有的本实例锁backend；另连接先取得maintenance exclusive，再释放INTENT barrier，无新Mock ID/登记；新lease保守恢复UNKNOWN。已开始remote-created后丢锁保留唯一远端/ID未知，不撤销或重新购买。pack半写/固化前/登记前失锁停止，事务内失锁旧事务结束前maintenance不得取得；旧成功保留。exclusive backup在view/filecopy/manifest前失锁不完成。 |
| STEP06-IR-002 阻断P2   | reference revision规范正十进制整数且≤2147483647（PG Int）；查找包含project/asset/kind/**revision**/SHA；不靠排序或相同hash挑first/latest。                                                                                                                                                                                                                                                                                                                      | 公共saveDomainArchive保存相同字节、不同合法元数据rev1/rev2及PG最大值，各版分别可冻结；0/负数/前零/小数/指数/不存在/超界/空/错hash拒绝且不增任务；新空DB恢复后各精确版本仍分别可创建，旧已保存快照不修改。                                                                                                                                                                      |
| STEP06-IR-003 阻断P2   | maintenance/Mock CLI共享resolveAssetRoot，读取TILESET_ASSET_ROOT，默认项目.local/assets；只接受项目.local内非PostgreSQL/非根目录且所有既存祖先无symlink，逃逸/异常拒绝。无新HTTP路径入口。                                                                                                                                                                                                                                                                      | 真实生产JS子进程自定义root backup→新空DB＋不存在requested root restore→按该配置readBuild、实际重建像素不变；Mock create/resume/complete/archive同root可读；重复backup/已有restore目标拒绝；默认值/外部目录/Postgres/空值/symlink控制。                                                                                                                                         |
| STEP06-IR-004 非阻断P3 | 原两份postgres-tools-version.log/prisma-version.log与旧ledger SHA逐项匹配，在新9a70f3c文档提交显式force-add原字节。旧ledger/报告不改写。                                                                                                                                                                                                                                                                                                                        | `git show bae:<path>`缺失的历史事实保持；新docs提交可直接取得两原文件，新[搬运索引](../evidence/step-06/fix-round1/original-log-portability.json)列原路径/SHA与历史缺失。                                                                                                                                                                                                      |

前三项作者状态为 IMPLEMENTED_AND_SELF_TESTED_PENDING_INDEPENDENT_REVIEW，不能自行记录独立关闭。原[gate反例的适配](../evidence/step-06/fix-round1/gate-loss-adapted-result.json)和[公共reference/恢复探针适配](../evidence/step-06/fix-round1/public-probe-adapted-result.json)在自己的合成环境通过；原探针原文/hash保留，适配结果不是新的独立Review。

锁丢失后不能追溯撤销已发请求、已完成文件系统操作或已提交事务。当前保证是停止后续副作用、取消可取消的本次工作并等待资源结束；已经可能创建但ID未保存仍保守UNKNOWN、无盲重提，不声称本地锁/ID使第三方绝不重复收费。停止动作后可保留中断stage/完整orphan文件，失败保护旧成功。读取/像素处理/远端等待不移入长DB事务，核心框架无关与Provider职责保持。

## 精确候选验证

| 命令                                                     | 结果                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm check`（干净debcce7）                              | exit0；21文件230/230、12方向、Strict/lint/format、clean生产build、10真实ESM exports               |
| `pnpm test:step06`                                       | exit0；3文件16/16，166.48s；原10项＋新6项，原每项60000ms不变                                      |
| `INTEGRATION_API_PORT=4366 pnpm test:integration`        | exit0；3/3，真实PG→Nest/HTTP                                                                      |
| `API_PORT=4366 WEB_PORT=5266 pnpm test:e2e`              | exit0；生产1/1                                                                                    |
| `E2E_MODE=dev API_PORT=4366 WEB_PORT=5266 pnpm test:e2e` | exit0；开发1/1，截图/JSON与pageerror控制保留                                                      |
| 两份原独立probe适配命令                                  | exit0；maintenance取得之后无新remote；精确rev2/1控制与非法变体通过                                |
| `pnpm build:step06`                                      | exit0；168 payload，精确candidate/锁/Profile/契约/schema/迁移逐文件SHA                            |
| `node .local/step06/scalars.mjs`                         | 顺序重跑exit0；78/78；原脚本SHA506ec056…不变                                                      |
| `pnpm build:pack-sample`                                 | exit0；8套/16PNG，56 payload SHA与批准步骤05完全相同；Manifest包装正常因新commit不同              |
| 实际候选公共持久化发布                                   | ADOPTED；context真实debcce7/Node/锁/codec；重复返回相同ID，IR与MZ引用实际重放；Build/文件hash保留 |

新六项进入已有test:step06及CI；源/正式tests修改只在原Coding Worktree。原10项包含真实进程kill/重启、PG延期COMMIT拒绝、备份与干净恢复后的通用IR/退休完整历史实际重建，本轮全部复测。新的实际CLI/PG失锁/reference结果分别在 [intent](../evidence/step-06/fix-round1/intent-gate-loss.json)、[已可能提交](../evidence/step-06/fix-round1/remote-uncertainty.json)、[发布](../evidence/step-06/fix-round1/publication-gate-loss.json)、[备份](../evidence/step-06/fix-round1/backup-gate-loss.json)、[版本](../evidence/step-06/fix-round1/exact-reference.json)、[正式CLI](../evidence/step-06/fix-round1/operational-cli.json)。统计不相加为独立覆盖率。远端CI NOT_EXECUTED_BY_CODER，由Main管发布。

本次无Profile/Pixel/母版/处理/Compiler/Pack语义变更，全量旧自动回归及56payload字节hash确认不变。未重复无关MZ手工或oracle全量，也未把继承的MZ证据当本轮新GUI/游戏/美术；这些与Original Native Host仍NOT_EXECUTED，旧延期保持。Web仍contracts-only旧壳，未启动07。

## 现场、失败与门禁

原专属.local/postgres/.env与PG55466、API4366/Web5266、.local/assets继续使用；新fixture/restore DB与资产根仅本实例.local内、名称/端口在新证据，未reset/删除旧DB或失败现场。原分支一开始已包含bae且clean，无需快进/修复，没有reset/force/rebase或Main写入。维护时仅终止通过pg_locks确认的本测试gate backend，没有杀未知进程。

初期括号/backup helper编译错误、未用测试helper lint、证据组装文件名问题均保留。旧JS探针一度与clean build重叠遇到临时dist缺失，记录失败并在完整构建后顺序重跑；不计入新代码PASS，不删失败或降低阈值。见 [failures](../evidence/step-06/fix-round1/failures.json)，原私有工具日志保留.local。新证据原字节副本及SHA不包括.env/DB dump/runtime/敏感日志/cache。未系统升级、NoRealModel/SDK/Key/Composer/SaaS。

模型/effort/tier按本原生会话固定gpt-6.1-sol/xhigh/default，不可见服务端字段UNVERIFIED_NOT_EXPOSED；没有collaboration工具、加速/更换/降级。Main/Reviewer目录、canonicalstate未写；旧plans/Profile/像素/母版/Compiler/Pack/原失败与原报告保护记录见 [preservation](../evidence/step-06/fix-round1/preservation-before-freeze.json)。

剩余门禁：Main安排正式第2轮独立Review、必要CI与技术放行。作者未识别新的未解决代码阻断，但不能自己IndependentPASS/批准。此处停止等待Main，不发布、不开始步骤07。
