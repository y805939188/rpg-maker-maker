# Step03 第一轮整改 — READY_FOR_REVIEW

受测新源码 **a0e9f07ae26567c3a623a2b38e42b0b015441d30**，分支 `codex/step-03-coding`，工作树 `/Users/dingshinn/.codex/worktrees/step-03-coding/rpg-maker-maker`。基于第一轮受审 source7ca928f / author metadata8540f12。本次仅修改两个领域/处理源文件、两个回归测试文件及 Step03 technical baseline；冻结后只有本报告、要求映射和 Coding evidence 补充，生产代码/测试/锁文件不再改动。

第一轮正式结论为 CHANGES_REQUESTED，P0/P1=0、blocking P2=5；五项均已完成 Coding 修复与回归，**仍待第二轮独立确认**。最大五轮计数不重置。没有批准、Merge/Push、远端 CI 或步骤 04 行为。Root canonical state、独立档案和原报告未修改；原始 report SHA `2fa9bc7550844e9c747fcc6a3b08c9412b8666626775458b73facde378814f60` 保留。

实际本轮客户端为 `step_coder / gpt-6.1-sol / xhigh / default`；thread01a12e44-090b-7a43-a6f3-07f34d6086b6，turn01a12e89-2a1e-7743-ab3f-a76773d23d47，rollout turn_context line544，sampling log2948577。当前请求配置及后续采样见 client-configuration.json。Server-final **UNVERIFIED_NOT_EXPOSED**，没有改变模型/tier/权限/安全设置。

## 五项针对性整改

| Finding       | 修复与验证                                                                                                                                                                                                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STEP03-R1-001 | 逐索引要求数组具有自有、非 undefined 值；JSON 以索引复制，sequence/durations 以索引验证且 frameAt 使用已验证拥有快照。稀疏序列/时长、nested JSON、inherited slots、palette 缺 channel/entry 明确拒绝，不填 null；合法 null JSON 和静态 generic clip 控制仍通过。                                     |
| STEP03-R1-002 | IR 增加显式 parameters RevisionRef，纳入 IR hash 与必备 dependency closure。删除参数 dep 后 rehash、遗漏字段、错 revision/kind 不能 validate/Built；缺历史参数报告 MISSING_DEPENDENCY；新版本可用与显式参数 adoption 分开，旧 Build 历史仍 VALID。                                                   |
| STEP03-R1-003 | 文档化并在 recipe、IR 和 current adoption 执行每 kind+logical ID 仅一个 revision。water@1/@2/@3 同 ID 的组合在 Compilable 前报 REVISION_IDENTITY_CONFLICT；独立 frame component IDs 继续支持，catalog 仍保存全部历史版本。Built 自身 exact dependency array 不触发 rebuild，显式切换才改变当前状态。 |
| STEP03-R1-004 | 可见 overlay.image 源调色板在 composition 前验证，composed bank 继续验证。literal [255,0,0,1] over [40,100,30,255]，只有允许 composite[44,100,30] 的 style 必须拒绝；增加 red 源色及 composite 的有效控制输出仍精确[44,100,30,255]，透明零和 mask 规则保持。                                         |
| STEP03-R1-005 | recipe 与 IR 的 fixed animated 判断使用 declared sequence 可达帧实际 pixel hashes。仅未播放帧不同、不同引用但被播放像素相同均拒绝；不同可达帧、unused frame、nonloop 控制仍通过。所有存储帧的固定 bank 逐像素一致性不变；generic clip 无额外 Native 三帧限制。                                       |

没有放宽已批准规格、删除用例/阈值、重设母版或改变 pixel math。参数依赖字段和 IR hash 的更正是未批准候选的结构修复；旧产物保持不可变，不冒充重新验证后的新 IR。

## 旧失败与新生产导出对应

在 own WT、生产包 JS 仍为7ca时，原始独立 `repro.mjs` byte-for-byte 复制并实际执行，SHA `6b1326f2a245cb81f868a0117b45c2790f93f56ffbb54f061dd72e1af0002e05`。`negative-control/old-production-results.jsonl` 重现全部五项错误和 baseline literal expected PASS。13 项 draft regression 在旧代码上实际10失败、3控制通过；其日志保留，随后 sparse 字面量改为同语义 typed array construction 以通过 Strict/lint，未关闭 lint。此历史 log 不冒充最终 frozen test file 的原样运行。

新候选的 `public-remediation.mjs` 经生产 package exports 独立 Node 执行，逐项验证 ANIMATION/INVALID_METADATA、IR_DEPENDENCIES、REVISION_IDENTITY_CONFLICT、STYLE_PALETTE、ANIMATION_STATIC/IR_ANIMATION，及历史/采用、overlay composite、真正可达变化的有效控制。它是 Coding 验证，不是独立 Review。手写 expected planes 与原像素参考完全保留。

## 新候选冻结验证

[证据目录](../evidence/step-03/fix-r1-a0e9f07/) 保存 **22** 个实际命令的 exact clean SHA、argv、非敏感环境、expected/actual exit、耗时、log SHA；50 个文件的 ledger SHA **f16c114361c0a645168fae38be975aec5f09b1fb0d8fa6508fbbf4da4b8992e9**。669 个受测 tracked 文件在全部命令前后 SHA 不变、exact a0e9f07 HEAD、Git clean。

| 门禁                               | 实际结果 / evidence                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frozen install / Prisma generation | PASS Node22.21.1/pnpm10.20.0/Prisma6.19.3；install.log / db-generate.log                                                                                                 |
| 完整工程门禁                       | PASS129/129，原116全部保留含72继承/52步骤01；13新增R1 regression；八成员 direction/pins、Strict含tests、lint/format、clean build、六个生产 ESM export；check.log         |
| 生产导出五项 remediation           | 全部预期拒绝和有效控制 PASS；public-remediation.log/mjs                                                                                                                  |
| 实际 Vite standalone privacy       | 5/5；530保存记录，零 fake private marker 读取，没有请求/读取真 credential；privacy.log/json                                                                              |
| 数据库/HTTP/Nest/Prisma            | 55432 owned DB migration 无 pending，3/3；只清理 integration 记录的 own IDs；migrate.log / integration.log                                                               |
| 生产/开发/cold 浏览器              | API4314/Web5176；201创建、刷新持久、Pixi、零pageerror；三截图已检查；browser*.log/json/png                                                                               |
| 实际 codec 与预算                  | Sharp0.35.5/libvips8.18.7/libexif0.6.26，flat/high-entropy最大合法768×576 plane exact SHA；resource-measurement.log；既有 timeout/concurrency/read/repair tests 同样通过 |
| 三份新不可变 publication           | 88工程+13sample+4legacy payload，105 payload/3manifest exact SHA；publication、manifest snapshots、independent stdlib decoded pixels                                     |
| 重复 publication                   | 三项实际 expected exit1，108文件未改变，无 stage/lock；overwrite-refusal / artifact-integrity / retained-artifacts                                                       |
| 原型及样例 pixels                  | 四 legacy PNG bytes+independent RGBA 与批准构建完全相同；新 sample 所有 PNG 与旧7ca样例相同；IR JSON/hash因明确parameters字段更新；旧三 builds/manifest全部保持 exact    |
| 外部原装核心 VM oracle             | PASS960 tiles、2,211,840 pixels、241 updates；core SHA4ad828…ff67f；只读，不是 Host/editor/GPU/游戏验收                                                                  |
| Fresh audit                        | expected exit1，high0/critical0/moderate0/low1，仅既有 scoped esbuild；audit.log                                                                                         |

新的最大合法普通 plane child RSS 为85,950,464 /96,075,776 bytes，decode6.18 /61.00ms。Rss 是本机普通输入观测，不是 peak/OS native memory hard ceiling；5s single-slot isolated policy、128MiB child JS heap及外部 producer 分配限制仍沿用第一轮认可政策，没有扩大媒体入口。

## 新不可变版本

| Build ID                                      | Manifest SHA-256                                                 |
| --------------------------------------------- | ---------------------------------------------------------------- |
| step03-a0e9f07ae265-4ecf0ddf8cce1edf          | 46c0de9ce066e16c1bd00d0b511f771f101f4fc689228e1dc2d852a3f2b6f0aa |
| step03-material-a0e9f07ae265-cd0467ddf07df105 | 384b360002a5ee24cb4d7b4230367455a36b7b250f480d06b01c8046849e9f99 |
| step01-4b1e0cd7d9e2af9f004f                   | 3bffcde791f57694f3113a3e3a4a594938846a79001245d7116d4c4eb1f89bd0 |

每个 manifest 绑定 full a0e9f07 source、lock/Profile/contract/逐文件 SHA。Profile1.0.0-candidate.1、Pixel rgba8-srgb-integer-v1、HTTP/task/domain/IR/processing契约仍在既定候选范围。旧7ca三构建未覆盖；批准 step01-56368269c8328e0f84b9 的 manifest1be774…1351b、四 PNG 和原始核心全部未改。

旧 src/prototype、完整两份 plans、Pixel/Profile/MZ文档/母版/原测试、API/Web/Prisma/contracts/Gateway、image-adapter、lock/toolchain 与第一轮无 diff。正式代码只由本 Coding role 修改；root canonical state/independent archives、Reviewer WT 不动。没有 compiler/pack/Studio/durable runner/provider/newterrain/paidAI/04。Built 仍是 processing IR，targetCompilation=NOT_EXECUTED；没有宣称 CAS 或持久化恢复完成。

API4314/Web5176 已停止；assigned55432 DB保持ready，credentials/cluster不改。浏览器 own随机test rows沿用原套件保留，其他行不删/改。Original Native Host/新手绘/游戏/visual仍 NOT_EXECUTED，Map003(4,10)仍 PENDING_USER_EVIDENCE。Inherited scoped esbuild Windows standalone serve+servedir 未暴露，仍待 engineering 在该暴露前升级。

请主 Orchestrator 将 exact a0e9f07 新候选及三份构建交给第二轮 fresh independent `step_reviewer/gpt-6.1-sol/ultra/default`。Coding 不自行关闭独立 findings、批准、Merge或Push；新 Review 或明确整改任务前停止修改，步骤 04保持未授权。
