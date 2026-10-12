# 步骤06 Coding 冻结候选

日期：2026-10-13，Asia/Shanghai。状态：**READY_FOR_REVIEW**。本报告是 step_coder 的实现与作者验证，不是 Independent PASS，也不是批准/发布。步骤07未启动；等待 Main 派独立 Reviewer。

| 版本/对象                         | 绑定                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 功能候选 SHA                      | `a2878a922db93c14d29e0f128bd14e6b41fc09af`                                                                                               |
| 分支                              | `codex/step-06-persistence`；冻结后在同 Worktree 干净 detached checkout 执行绑定检查/构建                                                |
| Evidence/基线 docsHEAD            | `dfa445df2c9b3cec15a6e9a0c3379012f2d15da3`；其父是功能候选，纯文档/证据提交                                                              |
| 本报告的交付 HEAD                 | 本报告为随后单独的 report-only 文档提交；精确交付 SHA 在最终回复与 `.local/step06/coding-progress.json`，不能在自身 Git 内容中自引用 SHA |
| 工程 BuildID                      | `step06-a2878a922db9-5f73046cf5c7dfac`；165 payload＋Manifest                                                                            |
| 工程 Manifest SHA-256             | `7c97adbf203a1fb15bdfb65f5687cf3f47aa40d1fb0fe20fac65625b5afd3d19`                                                                       |
| 实际 DB 采用 BuildID              | `6869a1b5935842adc3feb9ede4187e0ed1f31b2e320485001a779293be446035`                                                                       |
| 实际 DB Build Manifest SHA        | `0fb828e3cac8865cae4f91fd61aa119d1166aff6f443fa856ca4712184b80b6e`                                                                       |
| Profile                           | `mz-native-ground-water / 1.0.0-candidate.1`；内容身份 `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                |
| Pixel/IR/Compiler/Pack            | 原契约及 `tile-ir-v1 / mz-single-material-v1 / stable-slots-v1` 不变                                                                     |
| 独立 Review / Main 放行 / 远端 CI | **NOT_EXECUTED_BY_CODER**；不冒充通过                                                                                                    |

完整逐文件 SHA、准确命令与退出结果分别在 [工程构建](../evidence/step-06/coding/build-engineering.json)、[命令](../evidence/step-06/coding/commands.json)、[ledger](../evidence/step-06/coding/ledger.json)。本报告关联上述冻结 evidence docsHEAD；报告之后没有新增实现。数据库测试使用明确标注的合成上下文（例如测试 SHA `a…a`），没有把它们当真实源码构建。另以真实候选 SHA/锁/Node/codec 执行一次公共持久化发布，重复调用返回相同采用记录，见 [绑定发布](../evidence/step-06/coding/bound-publication.json)及可复现的 [生成命令源码](../evidence/step-06/coding/bound-publication.mjs.txt)。

## 实现范围与所有权

`persistence` 拥有 Prisma repositories、不可变文件、项目/采用快照、源 revision/配方/依赖/处理、完整 Pack/Slot、Build/文件引用/验收与 task/attempt/archive 记录；schema/生成/增量迁移仍在 apps/api。`local-executor` 实现既有 Provider/Executor/Task/ResultArchiver 契约；Provider 只处理 Mock submit/query，通用恢复和下载验真/归档不放进 Provider。API 原项目创建参与维护写入锁；Web 仍 contracts-only 旧壳。

通用 `domain-archive-v1` 真实恢复 PNG/RGBA8 源和合法处理 IR，支持原有两帧、milliseconds、nonloop 等语义，未经 MZ Compiler 也能存档。`IR` 与 `MZ_FRAGMENTS` 是独立追加处理引用；通用 Built 仍 `targetCompilation=NOT_EXECUTED`。Native 路径再实际重放源、版本构造器、处理、Compiler、全部历史和 Layout/Atlas 校验，普通 JSON/标签没有被断言成拥有对象。源字节、像素与取出副本独立；历史/退役依赖可重建。

发布实际执行：冻结输入→真实内容/依赖/hash 验证→唯一暂存、完整重读/fsync、不可变固化→短 Prisma 事务登记→Pack version/Project revision CAS 切换成功指针。Pack session scope lock 串行发布，事务另做版本条件；旧快照/同旧槽位争用的落后结果只存历史。失败和中断保留旧成功，完整文件但 DB 失败留下可定位孤立文件；重复身份不重复记录。像素、codec、远端等待不在长 DB 事务。

任务创建深冻结 model/参数/虚拟模板/config/style/target/参考版本；先持久化 INTENT，再 submit。保存 ID 后只 query 同一 ID；中断且 ID 未落库恢复 SUBMISSION_UNKNOWN，不自动重提；远端成功但归档失败仅重试归档。QUERY/ARCHIVE/RECONCILE 指令不能对 QUEUED 新提交。Mock 远端 JSON/PNG 在独立文件根跨进程保存。取消仅本地 NOT_REQUESTED，候选归档只进入历史，迟到结果不 adoption/发布当前。未建 Prompt Registry/Composer、真实 AI 工作流、SDK/Key/计费/Redis/SaaS。

一致备份使用本实例 cooperative 写入/任务暂停，真实 pg_dump custom＋流式文件复制/hash＋前后 DB 内容摘要。空 DB 与不存在的资产根恢复，实际源/配方/IR/全 Pack 历史校验，再执行新 Build；已提交/未知保持记录，不变成新请求。恢复文件重新只读固化。详见 [基线](../engineering/STEP_06_BASELINE.md)。

## 冻结候选验证

| 实际命令/检查                                            | 结果                                                                                               | 主要边界                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm check`                                             | exit0；21文件230/230；12工作区方向、Strict/lint/format、clean production build、10真实 ESM exports | 含新增公开通用 IR/JSON 重放、旧处理/Compiler/Pack/隐私回归             |
| `pnpm test:step06`                                       | exit0；2文件10/10，104.08s；原每项60000ms门限不变                                                  | 真实 PostgreSQL、native COMMIT 拒绝、故障/竞态/进程/备份               |
| `INTEGRATION_API_PORT=4366 pnpm test:integration`        | exit0；3/3                                                                                         | 真实 DB→Nest→HTTP、契约/安全、读写一致                                 |
| `API_PORT=4366 WEB_PORT=5266 pnpm test:e2e`              | exit0；1/1                                                                                         | 生产 Node、创建/刷新持久化、Pixi、pageerror 空                         |
| `E2E_MODE=dev API_PORT=4366 WEB_PORT=5266 pnpm test:e2e` | exit0；1/1                                                                                         | 开发旧壳同一链路；两份截图/JSON保留                                    |
| 删除本次生成的根 dist 后 `pnpm test:step05`              | exit0；37/37                                                                                       | STEP05-RR-001 最小修复，入口自行 build:prototype；未依赖残留根 dist    |
| 原公开 JS scalar probe                                   | exit0；78/78；原脚本 SHA `506ec056e7eecde0410e7f05093531ed3d62a5f83b7a2d61482ef662c6c801b9` 不变   | final dist 实际执行；不是新增未登记私有测试替代 CI                     |
| `pnpm build:step06`                                      | exit0；165 payload、schema/所有迁移逐文件 SHA                                                      | 干净候选、锁、Profile/契约/真实 codec 绑定                             |
| `pnpm build:pack-sample`                                 | exit0；8套/16PNG                                                                                   | 56 payload 与批准步骤05 SHA 一致，包装 Build/Manifest 按新 commit 变化 |
| 8次 `verify-step05` 读本机正版 pinned core               | 全 PASS；3600形态/播放状态、8,294,400像素；每套600 update/601观测                                  | CPU 规则对照，ACTIVE/RETIRED 实际PNG；非新 GUI/游戏/GPU/美术 PASS      |
| `pnpm db:migrate`                                        | exit0；4迁移，无 pending，无 reset                                                                 | 旧最小 Project UUID/name/createdAt 保留；fixture DB 另真实部署全部迁移 |

上表计数不相加为“独立覆盖率”。新 DB/故障/子进程/备份测试由明确 `test:step06` 和 CI 入口执行，新增公共重放测试进入 `check`；远端 CI 是否运行由 Main 记录。继承的 Vite 536.27kB chunk 提示为 warning，Web payload 没有新 Studio 变更。

## 故障、竞态、重启与恢复证据

[文件/DB 失败](../evidence/step-06/coding/failures-and-recovery.json)覆盖半写/写失败、文件固化后异常、真实 PG 延期 constraint trigger 在 COMMIT 抛 `STEP06_DEFERRED_COMMIT_REJECTION`；原成功指针保留、未登记半结果，移除本次拥有的测试 trigger 后恢复发布成功。没有终止未知进程或改其他 DB。

[实际发布进程中断](../evidence/step-06/coding/publication-process-kill.json)保留 PID/IPC checkpoint/SIGKILL，分别在半文件、DB 提交前和提交后停止，再新生产 JS 进程重建并返回同一 Build。[反向/槽位竞态](../evidence/step-06/coding/race.json)记录新项目快照先完成、旧结果 HISTORICAL，以及两个同旧 Pack/同快照首次槽位 claim 只一方 canonical 采用。

[未知提交](../evidence/step-06/coding/unknown-process-kill.json)实际杀死已创建 Mock 远端但尚未保存 ID 的进程；新进程变 UNKNOWN，再重启不新增远端。[已知 ID 重启](../evidence/step-06/coding/known-id-process-restart.json)查询同一远端并归档；[独立对象重建](../evidence/step-06/coding/executor-reconstruction.json)、[归档单独重试/重复完成](../evidence/step-06/coding/archive-only-idempotency.json)与 CI 正式测试涵盖冻结默认改变、本地取消和迟到历史。UNKNOWN 的策略是人工/可用供应商记录核对；本地 ID/锁不证明第三方绝不重复收费。

[备份/恢复](../evidence/step-06/coding/backup-restore.json)包含 dump/全部文件 SHA、DB 内容摘要、新 fixture DB 的实际 migration exit0、新空 restore DB/资产根/55466、旧退役画面/依赖和 version3 的实际重建。暂停测试观察到新的写入在 pg advisory lock 上等待，解除后恢复。通用 RGBA IR也在独立对象和备份恢复后真实重建，未先要求 MZ 兼容。备份不是仅 JSON 存在；私有 dump/DB/完整失败现场只留 `.local/step06`。

## 失败保留与环境边界

首次 backup 累积数据的60000ms超时及后续真实超时保留，未删除原 DB/失败用例/阶段文件，未增加时间门限。减少同操作重复解码的拥有对象缓存、把 fixture 变成新专属 DB/资产根后，最终104.08s套件通过。其他环境加载、格式器/TS/测试 helper 接线失败及修复记录见 [failures](../evidence/step-06/coding/failures.json)，完整现场在 `.local/step06`；没有把修复前结果写成新候选 PASS。

本 Worktree 独占新 `.local/postgres`/`.env`，PG55466/API4366/Web5266、资产 `.local/assets`、输出 `.local/step06`；测试恢复使用本实例专属另一空 DB/文件根（均在 evidence 指定），不复用其他 Worktree 凭据或 MZ 工程。Node22.21.1、pnpm10.20.0、PostgreSQL14.20 工具；未系统升级。长期仅本次专属 PG 保留供 Main/Reviewer 读取，API/Web 测试服务结束。端口若冲突只报告，不杀未知进程。

模型/effort/tier 按本原生会话要求为 gpt-6.1-sol/xhigh/default；不可见服务端最终字段 UNVERIFIED_NOT_EXPOSED。无 collaboration 子 Agent、配置更换/降级/加速。Main 目录与唯一步骤状态未写入；[保护记录](../evidence/step-06/coding/preservation.json)证明 plans、Profile/Pixel/原型源码、母版、领域/像素/Compiler/Pack 和步骤05旧 Review/evidence 没有改写。没有 `.env`、DB、Runtime、缓存、敏感日志上传。

恢复策略：先停本实例写入/执行器；保留当前成功与 orphan/stage；已知 ID 查询原任务，UNKNOWN 保持核对；归档只重试本地；发布用原冻结身份重读/重试；备份失败目标不当成功；恢复仅新空 DB/文件根，验真并实际重建后使用。自动 GC、破坏性槽位复用及历史删除均未提供，后续清理须同一维护门禁。

新 MZ GUI/游戏/视觉、Original Native Host、独立 Review、远端 CI **NOT_EXECUTED_BY_CODER**。旧延期/步骤05用户观察保留原边界，不把 CPU/同 Profile 当具体产物实机通过。作者未识别新的 P0/P1/阻断 P2；是否独立 PASS 留给 Main 的 Reviewer。状态仅 READY_FOR_REVIEW；本会话停止，不开始步骤07、批准、合并或推送。
