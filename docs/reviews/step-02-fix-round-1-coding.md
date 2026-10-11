# 步骤 02 第一轮整改 Coding 报告

状态 `READY_FOR_REVIEW`；第二轮独立 Review 由 Orchestrator 启动，尚未收到结论。Coding 未自行批准、合并、推送或实施步骤 03/04。

- 唯一阻断发现：`STEP02-R1-001 / P1`，Vite 开发服务器可服务 `.local` 私有文件，默认 CORS 允许其他 localhost Origin 读取。完整第一轮独立报告由主工作区保存，SHA-256 `bb12df8bcd914264f13fcbe5bb38d9ee7325029afb82d2c3fbd5fbb255816ba9`。
- 冻结整改实现：`396cefbdef6f22783e209722155c9088e685719b`，分支 `codex/step-02-coding`。旧实现 `8a7d4b9bfa62bc259d6a9485fb58e0277c8a0def` 及其全部不可变构建和证据保留。
- Coding 继续使用 `gpt-6.1-sol / xhigh / default`；客户端服务层级的原证据适用，服务器最终层级没有可用验证。无付费调用。
- Profile/Pixel/HTTP/Task 契约仍为 `1.0.0-candidate.1 / rgba8-srgb-integer-v1 / http-v1 / task-snapshot-v1`；没有改 Profile、母版、来源、算法、阈值、依赖锁或任何 MZ 工程/运行环境。

## 修复范围

Vite 允许文件根显式限定为 Web 根、共享 contracts 的构建目录和实际 node_modules；不再允许整个工作区。完整 `.local` 树（根目录和任意嵌套，包括 PostgreSQL/MZ 私有状态）被拒绝，保留 `.env`、证书和 `.git` 默认拒绝规则并增加 `.key`。独立中间件在静态/transform handler 前检查 Host/Origin、解码路径与实际文件路径，拒绝允许目录内符号链接指向私有目标或其他未允许根；错误文案不包含内容或本地路径。

CORS 只允许精确的实际 Web Origin；预检继续到边界中间件，因此其他 localhost 端口和 `null` Origin 的普通请求/预检都被拒绝，没有 Access-Control-Allow-Origin。关闭未使用的 publicDir 静态入口；现有素材均由 src 导入，实际浏览器验证证明正常模块/Pixi 加载未受影响。Vite 是独立安全表面，API 边界测试不能替代它的验证。

新增 `pnpm test:dev-privacy` 启动真实 pnpm/Vite CLI 和独立环回端口，所有“敏感文件”都是随机目录中新建、权限 0600 的假哨兵。覆盖 plain、raw、import、raw&import、import&raw、url、编码目录、嵌套私有树、假 env/key/git、符号链接、未允许内部目录、同源/其他 localhost/无 Origin，外来预检及正常 Web/共享包。没有请求、读取或输出真实密码。CI 显式执行该命令；它也纳入普通 Vitest/Strict 检查，没有删原用例或放宽预期。

## 回归确实能发现旧缺陷

使用 Git 导出的**字节相同**旧 8a Vite config，保持其原文件位置语义运行当前新 CLI 测试；正常页面/共享包检查通过，私有文件与 Origin 检查失败，命令预期 exit 1。未回退或修改正式候选源码。旧配置副本、原始失败输出、请求记录和配置/测试 SHA 留在本候选证据中。

| 对象                    | 实际记录                                                                         | 结果                                         |
| ----------------------- | -------------------------------------------------------------------------------- | -------------------------------------------- |
| 旧 8a 配置              | 257 条记录，156 次返回假哨兵，其中 72 次来自其他 localhost Origin                | 预期 FAIL / exit 1；正常 Web/共享包测试 PASS |
| 冻结 396cefb            | 259 条记录：252 条私有访问 + 3 条外来普通请求均 403；4 条正常 Web/共享包请求 200 | PASS；假哨兵泄露 0                           |
| 冻结 396cefb 的外来预检 | 127.0.0.1 其他端口、localhost 其他端口、null，各 1 次                            | 3/3 为 403，均无 ACAO                        |

## 构建及冻结后的实际检查

| 构建          | ID                                     | Manifest SHA-256                                                   |
| ------------- | -------------------------------------- | ------------------------------------------------------------------ |
| 工程，68 文件 | `step02-396cefbdef6f-736ff6eb0f5e6054` | `e3eb890c013337dafb8df46015ae05e03b84b47b01341130b013d730bebdb6ef` |
| 新原型，4 PNG | `step01-5126a8b175aa7d0707af`          | `9e47bb386853895301554569b666aea83fcb926b9c40c4cf65b46927a75fca6c` |

构建位于 Coding 工作树 artifacts；全部文件重新读回核验 SHA，两种构建的重复发布都预期 exit 1，前后文件/Manifest 哈希相同。旧 8a 和步骤 01 批准构建未覆盖。证据文档提交在实现冻结之后，必须保持源码/配置/测试零差异并引用 396cefb。

[完整命令索引](../evidence/step-02/396cefbdef6f22783e209722155c9088e685719b/commands.json) 保存 13 条准确 argv、环境覆盖、实现 commit、exit、耗时和逐日志 SHA；原始日志全部归档。

| 门禁                                              | 结果                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| frozen install / Prisma generate / migrate deploy | PASS；Node 22.21.1、pnpm 10.20.0、Prisma 6.19.3，原专属 PostgreSQL 14.20/127.0.0.1:55432        |
| pnpm check                                        | PASS：模块方向/固定版本、Strict、lint、format、66/66（含原 52）、clean build、三个真实 ESM 导出 |
| pnpm test:dev-privacy                             | PASS 3/3；独立实际 Vite CLI，上表数据均绑定冻结实现                                             |
| pnpm test:integration                             | PASS 3/3；真实 DB 写/读及 HTTP 边界                                                             |
| 生产/开发 Playwright                              | 各 PASS；创建项目、刷新读取、Pixi 和无 pageerror                                                |
| 新工程与原型 publication / overwrite refusal      | PASS；两种不可变新身份，原身份未动                                                              |
| 四 PNG 黄金比较                                   | 全部逐字节 EXACT_MATCH 至批准 step01-56368269c8328e0f84b9                                       |
| 外部正版核心 oracle                               | PASS：960 选图、2,211,840 像素、241 update；只读原始核心                                        |

原 52 个测试、全部原型 TS scripts、profile/pixels/compiler、fixtures/provenance、两份 plans、Profile/Pixel 文档相对阶段基线仍无改动。Native oracle 不是编辑器/GPU/游戏 Host 验收；Original Native MZ Host 与新实机/视觉确认继续 `NOT_EXECUTED`，Map003 `(4,10)` 继续 `PENDING_USER_EVIDENCE`。

第一轮已经判为当前暴露非阻断的 Sharp/esbuild P2 范围记录继续保留，未因此次整改升级编码器或改 golden。远端 CI `NOT_EXECUTED`。P1 修复的最终独立结论和 Orchestrator 批准由对应角色记录，Coding 到此停止源码修改。
