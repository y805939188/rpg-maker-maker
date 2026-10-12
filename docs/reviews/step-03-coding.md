# Step 03 Coding candidate — READY_FOR_REVIEW

正式受测源码为 `7ca928f2c1ac480691c77e67b3d19da4dda8e643`，分支 `codex/step-03-coding`，工作树 `/Users/dingshinn/.codex/worktrees/step-03-coding/rpg-maker-maker`，基于已发布 main `c021b20991281317fbbbb1fc398c0ae496ef648d`。所有下面的冻结命令均在该 clean commit 上执行；之后只提交本报告、需求映射和 Coding evidence 文档。文档 HEAD 不替代受测源码 SHA。Independent Review、委托验收、远端 CI、Merge/Push 均为 **NOT_EXECUTED**，由主 Orchestrator 承担；步骤 04 未启动、未授权。

实际客户端角色 `step_coder / gpt-6.1-sol / xhigh / default`；thread `01a12e44-090b-7a43-a6f3-07f34d6086b6`，实施 turn `01a12e47-0920-73f0-8e89-886a948b07b2`，rollout turn_context line98，feedback_tags 示例 log2940173。最初 preflight turn `01a12e44-09ae-7e70-886e-39a123c5ae82` 的 log2932174/2932323 同样满足配置。**server-final UNVERIFIED_NOT_EXPOSED**；没有更改全局模型、服务层、安全或权限设置。完整正式两份 plans、AGENTS、Runtime/Profile/Pixel Contract、步骤 02 基线/codec/最终独立 Review 和 root live handoff/state 均已读取。

## 实施范围与状态

新增 `asset-core`、`material-processing`、`image-adapter`，登记为八个 workspace，构建顺序/清理/六个生产 ESM exports/产物收集纳入现有 CI 工程门禁。领域与像素没有 Nest/Prisma/DOM/Sharp/Provider/MZ numeric Tile ID 依赖；asset-core 仅标准 crypto，Sharp 只在适配器隔离子进程中运行。HTTP/contracts、API/Prisma/Web、Gateway 现有职责保留。

Source byte/pixel/provenance 所有权与不可变 revision、Material/Surface/Style/固定 Transition、通用 Animation Clip、严格源与 semantic Tile IR 校验、Raw→Validated→Compilable→Built 处理链路已实现。整数裁切、跨 Buffer view 重叠快照复制、明确最近邻、透明/部分 Alpha、线性 sRGB source-over、逻辑密度、二值静态岸线 mask 和精确版本配方均由独立手写 expected 测试验证。固定配方绑定草地、各水源帧、mask、bank detail、style、parameters、recipe 的 revision/hash，强制跨帧静态岸线一致和内部实际变化。bank detail 为绑定草地上的静态沙岸/暗水边组件；不能改 mask 外区域。新的 style/参数/配方内容必须匹配其不可变身份。

草地 grass@4 的可用性不会改变 grass@3 历史结果。仅显式 `adoptRevision` 改当前项目采用记录后，受影响的当前 derived build 才 needsRebuild；历史 VALID、newerAvailable、currentMismatches 分开记录。Built 只表示处理 IR/hash，`targetCompilation=NOT_EXECUTED`，不宣称正式 MZ Compiler 或 Pack 已完成。没有上传、完整 Studio、持久化任务/Mock runner、WaveSpeed 或付费调用。

PNG 新入口的容器、元数据、方向、色彩、字节/读取/解码/内存/时间/并发策略详见 [STEP_03_BASELINE.md](../engineering/STEP_03_BASELINE.md)。EXIF/text/其他未支持 ancillary metadata 在 native 前进入显式 repair-required；RGB/灰度/索引/16bit 需新 revision 显式转换；没有暗中旋转或转换。ICC/HDR/APNG/非 sRGB/CRC/隐藏 RGB 明确拒绝。只接受有界字节流或 owned RawSource，不接受服务器路径。

## 冻结验证与证据

[证据目录](../evidence/step-03/coding-7ca928f/) 的 `commands.jsonl` 绑定 20 条实际命令的 argv、clean source SHA、非敏感环境、期望/实际退出、耗时、完整 log SHA。40 个归档文件的逐文件 SHA 见 `ledger.json`，SHA-256 `4793caffde28712db880e1673987543020c0bb8c66a394964302c8b0060c5bab`。所有 625 个冻结 tracked 文件 before/after SHA 一致，HEAD 精确、Git clean；文档补充在此验证之后。早期 dirty 开发执行和失败调试未冒充冻结证据。没有删用例、降阈值或重做旧母版。

| 门禁                               | 冻结候选实际结果                                                                                                 | 证据                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Frozen install / Prisma generation | Node22.21.1 / pnpm10.20.0 / Prisma6.19.3，exit0                                                                  | install.log / db-generate.log                             |
| 完整工程门禁                       | 八成员方向/exact pins、Strict 含 tests、lint、format、116/116、clean build、六个生产 Node imports PASS           | check.log                                                 |
| 新领域/像素/配方/适配器测试        | 44/44，包含真实 PNG→validated source→IR、独立 literal pixels、边界/repair、concurrency/timeouts                  | check.log；packages 三组测试                              |
| 继承回归                           | 72/72 保留，其中原始步骤 01 52 个测试；旧 src/fixtures/Profile/Pixel Contract/完整 plans/API/Web/Gateway 无 diff | source-before/after.json；Git c021→7ca 范围               |
| Standalone 实际 Vite privacy       | 5/5，530 个保存记录，零 private synthetic marker 读取；无实际 credentials 请求                                   | privacy.log / privacy-results.json                        |
| 真实 DB/HTTP/Nest/Prisma           | migration 无待应用，3/3 PASS；仅 integration 创建的 ID 被清理                                                    | migrate.log / integration.log                             |
| 生产浏览器                         | API4314 创建201、刷新持久化、Pixi、零 pageerror；截图已检查                                                      | browser-production.log/json/png                           |
| 开发及 cold-cache 浏览器           | API4314/Web5176 同链路 PASS；仅移动 owned generated Vite cache，原配置；截图已检查                               | browser-development*.log/json/png / cold-cache-setup.json |
| 最大合法普通平面                   | flat 与高熵 768×576 RGBA 精确像素 SHA；实际 patched child                                                        | resource-measurement.log                                  |
| 三份不可变发布                     | 88 工程、13 processing sample、4 原型 payload，commit/lock/Profile/codec/逐文件 SHA 验真                         | *publication.log / manifest snapshots                     |
| 重复发布拒绝覆盖                   | 三个实际 expected exit1；所有 payload+manifest 保持不变，没有 stage/lock 遗留                                    | _overwrite-refusal.log / artifact-integrity-_.log         |
| 独立 decoded pixels                | stdlib PNG CRC/inflate/filter 比较新样例的独立 literal expected；旧四 PNG 字节/RGBA 与批准构建完全相同           | verify-artifacts.py / artifact-integrity-*.log            |
| 只读原生核心 oracle                | 核心 SHA 匹配，960 selected tiles、2,211,840 pixels、241 updates PASS                                            | native-oracle.log/json                                    |
| Fresh audit                        | expected exit1：high0/critical0/moderate0/low1，仅既有 scoped esbuild                                            | audit.log                                                 |

产物 checksum 辅助报告中的 `allCurrentCompiledFilesMatch` 仅适用于工程构建：88 个当前 dist 文件全部匹配。材料和原型条目的 false 表示没有“当前 dist 对照”适用对象，它们的全文件 hash、独立 expected/旧基线字节和 decoded pixels 均独立通过，不代表校验失败。

实际 codec 为 Sharp0.35.5 / libvips8.18.7 / libexif0.6.26。最大合法平面 1,769,472 decoded bytes；flat PNG2623 bytes，child decode6.2ms、RSS86,163,456 bytes；高熵 PNG1,536,296 bytes，child decode61.8ms、RSS95,715,328 bytes，完整 encode+decode roundtrip459.6ms。这些是本机普通输入实测值，不是承诺阈值或 peak/OS native RSS 硬上限。读流与 codec 各有单槽、无保留队列和5s deadline；native child JS heap128MiB、Sharp cache=false/concurrency1，超时实际 SIGKILL 后恢复同一槽的测试通过。生产方交付前的分配不受本包控制；未来 HTTP/remote 输入仍需自己的预算与 Review。

## 不可变构建身份

Profile `mz-native-ground-water / 1.0.0-candidate.1`；Pixel Contract `rgba8-srgb-integer-v1`；HTTP `http-v1`；Task `task-snapshot-v1`；Domain `asset-revision-v1`；IR `tile-ir-v1`；Processing `fixed-shoreline-v1`。源码 commit 和锁文件均记录在每个新 manifest，实际 encoder/runtime 记录于材料与原型产物。

| Build ID                                      | Payload                                        | Manifest SHA-256                                                 |
| --------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| step03-7ca928f2c1ac-4f67c752343684ec          | 88 JS/declaration/maps/Web files               | 71d4764dd41b3a9b1b80b88ac117d98ff7c6a1167429368b7c288493471fadf0 |
| step03-material-7ca928f2c1ac-ea62343b13d105af | 13 原始/处理 PNG、IR、revision/provenance 文件 | 245c79afd8527f3f53cfd217377b96dd575916a49fdea914c26b4ba8bdc3a3de |
| step01-507f3627a46d19ce6cbf                   | 4 原型回归 PNG                                 | 5c01da441c0426d30daa786d6097004d6334240a457ee9befa641239fe25e0a2 |

新的四 PNG 分别保持 `de08f8…b337f`、`b493ec…330cd`、`d896c5…5d9d2`、`7d60ac…b2b2b`，完整 byte/RGBA SHA 见 artifact integrity 日志。批准 `step01-56368269c8328e0f84b9` manifest SHA `1be77467ae7d5fab2c574dce1918d3c4a9a4b54b64a7beda0a42e89c8461351b` 与全部旧文件未修改；新 decoder/处理器没有替换原型算法或旧黄金值。材料样例是小型 generic processing fixture，不能作为正式 MZ atlas/视觉验收。

## 保护、限制与交接

使用 root 分配的既有 owned PostgreSQL127.0.0.1:55432、Step02 Coding 私有环境，只读载入凭据且未修改文件/集群；没有初始化、停止全局或他人数据库。integration 仅清理自己记录的 ID；browser 新建的随机测试项目按原套件行为保留，旧项目/其他行未删除或修改。API4314/Web5176 已停止；数据库保持原 ready 状态。证据排除真实 .env/credentials/cluster/server log、generated cache 与正版 runtime 源码。原装核心只读使用，没有复制 runtime 或 prepare/覆盖 MZ 项目。

原始 Native MZ Host、步骤 03 新 GUI 手绘/游戏/视觉测试 **NOT_EXECUTED**；Map003(4,10) **PENDING_USER_EVIDENCE**，沿用用户阶段授权记录。VM oracle 是旧行为回归，不能替代上述实机证据。历史 esbuild `GHSA-g7r4-m6w7-qqqr` 仍为 scoped nonblocking：Windows standalone serve+servedir 未使用，Darwin/CI Linux 的现有 Vite路径未新增暴露；engineering 在该表面开放前承担兼容固定版本升级。

Coding 未发现尚未关闭的已知阻断项；本报告不是独立 PASS 或批准。交接 fresh `step_reviewer / gpt-6.1-sol / ultra / default`，在独立冻结工作树复核精确 `7ca928f…`、构建与证据；后续修订须新候选与适当复测。Coding 不自行批准、Merge 或 Push；步骤 03 发布后本轮停止，步骤 04 保持 NOT_STARTED_UNAUTHORIZED。
