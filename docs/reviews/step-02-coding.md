# 步骤 02 Coding 报告

状态：`READY_FOR_REVIEW`。Coding 未自行批准、合并或推送；独立 Review 已由 Orchestrator 启动，结果尚未收到。步骤 03 尚未实施。

- 分支：`codex/step-02-coding`。
- 冻结实现：`8a7d4b9bfa62bc259d6a9485fb58e0277c8a0def`；基线 `f004d6c74abe64ea853619390aa9dc2bc34654c1`。
- 工作树：`/Users/dingshinn/.codex/worktrees/step-02-coding/rpg-maker-maker`。
- Profile：`mz-native-ground-water / 1.0.0-candidate.1`，仍为候选；Pixel Contract：`rgba8-srgb-integer-v1`。HTTP `http-v1` / Task `task-snapshot-v1`。
- Coding 客户端采样：`gpt-6.1-sol / xhigh / default`；当前任务日志 `logs_2.sqlite` 的 `feedback_tags` 记录 2827450 已核对；服务器最终服务层级没有可用证明，不宣称已验证。未使用付费模型。

## 结果与构建身份

五个工作区统一了 Strict TS、固定依赖与生产 ESM 包导出；Nest/Express + Prisma/PostgreSQL + React/Vite/Pixi 最小项目链路可在开发和独立生产模式运行。Zod 输入/输出与 OpenAPI 来自共享 HTTP 定义；Provider、默认模型配置、任务状态、不可变模型/模板/参数/参考 revision 快照和本地 Executor 仅提供契约。没有正式素材/配方/IR、Compiler/Pack、完整任务 runner、上传、AI SDK 或真实供应商调用。

| 构建                              | ID                                     | Manifest SHA-256                                                   |
| --------------------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| 工程（68 个文件）                 | `step02-8a7d4b9bfa62-c52e6a5508a18928` | `23d5f59a8bd749a93e37c23c1de422a8235b3dff05cc8214ca0deebbca6ed73c` |
| 新 commit 绑定的诊断原型（4 PNG） | `step01-3b32cba0a6db7fad1fac`          | `ae263ab357c66d0442a49bb6960b480f24920c3f99249ff0a60386770bfa640a` |

两个构建位于该工作树的 `artifacts/`，完整 Manifest 副本和逐文件索引保存在 [本候选证据](../evidence/step-02/8a7d4b9bfa62bc259d6a9485fb58e0277c8a0def/commands.json)。已重新读取产物验证所有文件 SHA-256；两次重复发布均以预期 exit 1 拒绝，所有文件和 Manifest 哈希保持不变。证据与本报告是之后的文档提交，明确引用冻结实现，不修改构建 Manifest 或宣称文档 HEAD 获得新的代码测试。

## 亲自执行的门禁

[commands.json](../evidence/step-02/8a7d4b9bfa62bc259d6a9485fb58e0277c8a0def/commands.json) 记录每条准确 argv、环境覆盖、实现 SHA、exit、耗时、原始日志 SHA；对应 `.log` 保留完整命令输出。下面均针对冻结实现执行。

| 命令/操作                                        | 结果                                                                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                 | PASS；Node 22.21.1 / pnpm 10.20.0                                                                                            |
| `pnpm db:generate`                               | PASS；Prisma Client 6.19.3                                                                                                   |
| `pnpm check`                                     | PASS；依赖方向/固定版本、Strict（含新增测试）、ESLint、Prettier、63/63 Vitest、清理后 build、三个包真实 Node ESM export 导入 |
| `pnpm db:migrate`                                | PASS；迁移 `202610120001_step02_project` 已应用，最终重复 deploy 确认无需变更                                                |
| `pnpm test:integration`                          | PASS 3/3；HTTP 写入与 Prisma 行一致，HTTP UUID 读回/列表，恶意与超限请求没有 DB 写入，health/OpenAPI/404                     |
| `pnpm test:e2e`                                  | PASS；编译 JS 的生产 API 同源提供 Web；创建项目、刷新读回、Pixi 初始化、无 pageerror                                         |
| `E2E_MODE=dev pnpm test:e2e`                     | PASS；Vite→Nest→Prisma 同样闭环；截图与原始 Playwright JSON 单独归档                                                         |
| `pnpm build:engineering`                         | PASS；clean build 后不可变发布 commit/Profile/契约/锁文件/每文件绑定                                                         |
| `pnpm prototype`                                 | PASS；旧算法重新编译，新 commit 绑定身份                                                                                     |
| `pnpm verify:mz <本机正版原始核心> <新原型构建>` | PASS；960 次选图、2,211,840 像素、241 次 update；是 Node VM 原始 Tilemap oracle，不是编辑器/GPU/游戏 Host 测试               |
| 工程/原型重复发布                                | PASS；预期拒绝覆盖 exit 1，前后全文件哈希相同                                                                                |
| 生产占用端口/错误 bind 启动                      | PASS；独立 Node 退出 1，安全错误文案，无密码/连接 URL/本地路径泄露，无残留服务                                               |
| 专属 DB 停止→health→重启→health                  | PASS；实际 503 `SERVICE_UNAVAILABLE`，重启后 200；只操作本工作树的 55432 集群                                                |

生产首次浏览器验证发现 Pixi 默认动态 shader 代码受 CSP 限制，已使用该版本自带的 `pixi.js/unsafe-eval` 静态 polyfill 并复测，两模式均成功，没有放宽 `script-src`。恶意 Host 用例采用原始 Node HTTP，因为 Node fetch 会归一化 Host；攻击和阈值保留。所有失败的探索结果没有被描述为 PASS；正式最终日志均来自修复后的冻结候选。

## 步骤 01 回归和环境保护

52 个原测试全部保留并执行；新增 11 个单元/契约/安全用例，独立 DB 3 个用例，双模式浏览器用例。根 `src/profile.ts` / `pixels.ts` / `compiler.ts`、原型 TS scripts、旧 tests/fixtures、来源、Profile/Pixel 文档和两份 plans 相对基线无差异。根原型作为工作区成员保留原 CLI/路径；新 index 仅提供包导出。

四 PNG SHA 与批准的 `step01-56368269c8328e0f84b9` 完全相同：

| PNG               | SHA-256                                                            |
| ----------------- | ------------------------------------------------------------------ |
| diagnostic_A1.png | `de08f8bc36b87017afbb62aba946d612e8f4536939c0db707bbbbcbfd93b337f` |
| diagnostic_A2.png | `b493ecc86e938dc9aa4f389ba6b1b052222baeade6bb1d58dea7b003126330cd` |
| art_A1.png        | `d896c5c8b62816e844865b2abe12a0d5c1694aceb6cd3c75f93eccbd6c55d9d2` |
| art_A2.png        | `7d60ac8c6072d38736e4027cc25fa23979de6e400b9c66d4f586a108506b2b2b` |

独立专属 PostgreSQL 14.20 数据在 `.local/postgres/data`，监听 127.0.0.1:55432，SCRAM 唯一随机密码只在被忽略的 0600 文件，无 Unix socket；`pnpm db:local init/start/stop/status` 可重复执行生命周期，初始化拒绝已有 `.env` 或集群。原系统 5432 集群、用户 MZ Map002/003、正版模板和全局 MZ/NW.js/RPGReactor 均未写入或替换。应用验证结束已退出；本地 DB 重启后仍就绪。

## 已知边界与待独立判定事项

依赖审计剩余 3 条 high 全属继承的 Sharp 0.34.5/libvips/libheif/librsvg；1 条 low 属 esbuild Windows serve。Sharp 仅用于步骤 01 诊断 CLI 与受限 RGBA8 PNG golden，未被 HTTP/API/Pixi 调用，没有图像上传或远端素材输入。保留它是为了维持已批准的编码环境；不把存在漏洞的依赖标记为全面安全。esbuild 仅用于本地工具转换/打包，当前 Mac/CI Linux 且未调用 esbuild serve。新增框架/HTTP 依赖的已知 high/critical 已关闭；Prisma 配置的 deepmerge-ts 固定覆盖到修复版 8.0.2，并真实 generate/migrate 复测。具体 advisory 与依赖路径在 `dependency-audit.json`，由独立 Review 判定当前步骤阻断性；任何未来暴露外部图片输入前须重新评估 Sharp，升级需独立影响审查与像素/原生 oracle 回归，不改母版或阈值。

Vite 提示单个初始 JS chunk 536 KiB（gzip 160 KiB）；壳功能可用，性能精修留后续步骤。CI 工作流已配置为固定工具版本、SHA 固定 actions、独立 PostgreSQL、全部类型/lint/格式/测试/build/DB/双浏览器检查；远端 CI `NOT_EXECUTED`，不得把本地日志冒充远端 run。

STRUCTURAL/工程自动验证已记录。新的 MZ 编辑器手绘、游戏动画、人工美术确认均 `NOT_EXECUTED`；Original Native MZ Host Compatibility 仍为 `NOT_EXECUTED`，最迟步骤 10 必须关闭；Map003 `(4,10)` 保存证据继续 `PENDING_USER_EVIDENCE`。这次 Pixi 壳截图不是素材视觉确认，也不扩展步骤 01 的实机声明。独立 Review 结果、用户/预授权 Orchestrator 批准继续分别记录，Coding 到此停止源码修改。
