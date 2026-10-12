# 步骤 02–03 最终交付报告

步骤 02、03 均已通过独立 Review、必要技术门禁和候选/main CI，完成正常合并及 GitHub main 推送。验收标签为 **APPROVED_BY_PREAUTHORIZED_ORCHESTRATOR**，表示本次预先委托验收。步骤 04 **未启动**，正式开发调度已经停止。

步骤 02 发布 main：`c021b20991281317fbbbb1fc398c0ae496ef648d`。步骤 03 功能发布 main：`0793c948da3bf3a8967579253f27ab2e234b8e70`，远端读回一致；后续收尾提交仅为文档和证据。实际最新 main 用 Git 读取，最终操作检查点保存在同一 canonical 状态文件的 `codex/orchestration-02-03` 分支，避免把未来推送写成已成功。

## 步骤 02

五工作区 pnpm 基础包含保留的诊断原型、React/Vite/Pixi 前端、Nest/Express API、Zod HTTP/OpenAPI 契约和 AI Gateway/Provider/任务及配置快照契约。真实闭环为页面→API 校验→Prisma→PostgreSQL→刷新后读回。开发、生产及冷缓存启动已实际验证；未开发完整资产后台、任务执行器或付费调用。

使用现有 Homebrew PostgreSQL 14.20，三个自有 SCRAM 集群分别监听 `127.0.0.1:55432/55433/55434`。数据与私有凭据保留，未初始化或改动全局数据库。退出时三集群安全关闭。Coding 集群可从保留的 Step02 Coding 工作区执行 `pnpm db:local start`；主工作区运行需要使用正确的私有环境配置，不能把密码输出或入库。

最终受审源码 `5356d66e693613f9ce52c4b0ceaddfe2821fffb5`，文档证据 `85fefc1d4638cec79ea00797a0be50e2018444bd`。正式 Review 共 4 轮：前两轮 Vite 私有路径/Origin 和解析目标边界 P1；恢复第三轮独立确认两个 P1 FIXED，另发现 PNG EXIF 可触达旧编解码依赖的阻断 P2；第四轮对实际 Sharp 0.35.5/libvips 8.18.7、新回归及旧像素产物独立 PASS。旧平台中断仍作为中断保存，未计为 PASS。

当前 72 测试含原有 52、真实 DB3、五项文件访问回归（530 记录、零假哨兵读取）、开发/生产/冷缓存浏览器、编译后端故障与 DB 恢复、生产导出、不可变发布拒绝覆盖均通过。四 PNG 字节与独立 RGBA、原生核心 VM oracle 回归通过；它们不是新的实机视觉或原装 Host 验收。

工程构建 `step02-5356d66e6936-d15cfdc0a1130a7e`，Manifest SHA `6a9fd114e256047ea4112bca7595a32f5c6ff6268dc38d9d5100133bd2f44d1d`。原型 `step01-0c4bab5226bff144467a`，Manifest SHA `6730f1299a71cae5908c7a94407e7f3d98e46c4b6bcfdd7f0ea30d87a92af5fb`。候选 CI [38201263354](https://github.com/y805939188/rpg-maker-maker/actions/runs/38201263354) 和 main CI [38201664942](https://github.com/y805939188/rpg-maker-maker/actions/runs/38201664942) 全部 SUCCESS。

详见 `step-02-release.md`、`docs/reviews/step-02-independent-round-4.md`、Coding 与四轮独立证据目录。

## 步骤 03

新增 asset-core、material-processing、image-adapter 三模块，形成八工作区。交付 Source Asset、不可变 Revision/来源依赖、Material/Surface/Style Profile、固定 Transition、通用 Animation Clip、引擎无关 Tile IR 和真实 Raw/Validated/Compilable/Built 语义。Built 仅表示处理后的 IR，`targetCompilation=NOT_EXECUTED`。核心不依赖 Nest/Prisma/DOM/Provider 或具体 MZ 数值 Tile ID。

实现 RGBA8/sRGB/straight Alpha、透明边缘、整数坐标、裁切、显式最近邻缩放、遮罩、共享内存视图重叠复制与固定岸线跨帧约束。手写 Golden 和在代码冻结前计算的独立 80 位 Decimal/Literal 预期用于复核。grass@4 的存在不会让 grass@3 历史构建失效；只有明确采用新版才影响当前派生判断。历史内容完整性、版本可用和当前重建分别判断。

PNG 适配通过实际补丁版原生库和隔离子进程运行，具有编码字节、chunk/metadata、decoded pixel、读取/编解码并发、deadline/cleanup 规则；非法输入明确拒绝或要求修复。JS heap 限制不能代表 OS/native RSS 上限，普通输入测量不是峰值或任意图片安全证明。未来 HTTP/remote 入口须独立预算验收。

正式 Review 共 2 轮。首轮 `7ca928f…` 虽通过 116 测试和全部运行/产物检查，仍发现 5 个阻断 P2：稀疏动画/JSON、遗漏参数依赖、同源多版本与采用模型冲突、bank overlay 源调色板漏验、未播放帧变化被误判动画。Coding 新增 13 回归，在旧版本复现 10 失败/3 对照通过；修复后全部通过。第二轮对最新源码 **a0e9f07ae26567c3a623a2b38e42b0b015441d30** 独立 PASS，五项全部 FIXED，P0/P1/阻断 P2 为零。

最终证据 HEAD `0cf7aa049137cae6c9367231a141ffcb04df97a9` 仅改文档/证据。129 测试、52 独立生产导出控制案例、六个生产包导出、DB3、文件访问、开发/生产/冷缓存浏览器、独立像素/版本历史/预算、原生核心和不可变产物回归通过。669 受跟踪源码哈希未变。source/assets 的硬结构检查在本步完成。

| 不可变构建 | Manifest SHA-256 |
| --- | --- |
| `step03-a0e9f07ae265-4ecf0ddf8cce1edf` | `46c0de9ce066e16c1bd00d0b511f771f101f4fc689228e1dc2d852a3f2b6f0aa` |
| `step03-material-a0e9f07ae265-cd0467ddf07df105` | `384b360002a5ee24cb4d7b4230367455a36b7b250f480d06b01c8046849e9f99` |
| `step01-4b1e0cd7d9e2af9f004f` | `3bffcde791f57694f3113a3e3a4a594938846a79001245d7116d4c4eb1f89bd0` |

候选 CI [38212088525](https://github.com/y805939188/rpg-maker-maker/actions/runs/38212088525) 和 main CI [38212585754](https://github.com/y805939188/rpg-maker-maker/actions/runs/38212585754) 全部 SUCCESS；合并后格式、六导出、13 整改回归、真实 DB 和生产浏览器均通过。详见 `step-03-release.md`、`docs/reviews/step-03-independent-round-2.md`、原始 52 项安全证据及 50 项 Coding 证据。

## 工程及清理状态

结构：根目录诊断原型；`apps/api`、`apps/web`；`packages/contracts`、`ai-gateway`、`asset-core`、`material-processing`、`image-adapter`。主工作区依赖已执行 frozen install，Prisma Client 已生成。常用命令为 `pnpm dev`、`pnpm start`、`pnpm check`、`pnpm test:dev-privacy`、`pnpm test:integration`、`pnpm test:e2e`、`E2E_MODE=dev pnpm test:e2e`、`pnpm build:engineering`、`pnpm build:material-sample`、`pnpm prototype`；迁移在构建和正确私有配置后执行。

主要版本：Node 22.21.1、pnpm 10.20.0、TypeScript 5.9.3、React 19.2.0、Vite 7.3.5、PixiJS 8.22.0、Nest 11.2.7、Prisma 6.19.3、PostgreSQL 14.20、Zod 3.25.76、Vitest 4.1.11、Sharp 0.35.5/libvips 8.18.7。Coding 实际请求为 gpt-6.1-sol/xhigh/default；Review 为 gpt-6.1-sol/ultra/default，服务端不可见最终字段继续 UNVERIFIED。

14 份已登记构建的 Manifest/逐文件哈希和 10 份历史 MZ 地图均再次核验未变，应用/DB 自有端口无监听。两份 Step03 托管工作区已可恢复归档；Step03 Coding/integration 本地分支和两步临时候选验证远端分支正常删除前均确认包含于远端 main。Step02 Coding/Review 工作区保留数据库及凭据，main integration 工作区保留可用检出。Step01 两份历史工作区、`codex/step-01-mz-prototype` 和未知/用户文件未清除；Orchestrator 分支保留全部检查点。正式 Review、失败证据和旧不可变产物未覆盖。

## 延期事项与后续边界

- Original Native MZ Host Compatibility：NOT_EXECUTED，仍为 V1.0 发布前必要条件，最迟步骤 10 关闭。
- Map003 (4,10)：PENDING_USER_EVIDENCE；未伪造手工保存或截图结论。
- esbuild 0.27.7 / GHSA-g7r4-m6w7-qqqr：范围明确的非阻断 P2（供应方 low），当前未使用受影响的 Windows standalone serve+servedir；启用前由工程 Coding 验证兼容的 >=0.28.1 修复及回归。没有宣称全局审计 clean。
- 新 HTTP/remote 图片入口必须重新验证 I/O/metadata/pixel/CPU/并发/native memory 预算；当前普通图片和补丁版本不是任意媒体安全证明。
- 步骤 04 须另行授权，从合法 IR 与已批准 Profile 恢复；未来 Compiler 必须明确处理通用 Clip 与原生 MZ 帧数/时基的兼容，不得静默删帧。本轮没有启动它。

用户当前无需补做操作才能完成步骤 02、03。本轮停止；后续人工 Host/地图证据及下一编号步骤另行安排。

## 最后操作核对

最终本地/远端 main：`784a39fb9739c01750b4b6cbf5da78df24b227b7`，读回一致，最终 main CI [38213568627](https://github.com/y805939188/rpg-maker-maker/actions/runs/38213568627) SUCCESS。它相对受审源码 a0e9f07 没有功能代码差异。完成检查点位于同一 canonical 状态文件的 codex/orchestration-02-03 分支；该检查点追加于已成功的 main 文档发布之后。正式开发停止，步骤 04 未启动。
