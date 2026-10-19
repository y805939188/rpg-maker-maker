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
