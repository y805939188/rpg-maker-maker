# 步骤 02 工程基线

当前只提供工程壳与项目创建/列表/读取的真实数据库链路。没有素材上传、完整 Studio、正式 Compiler/Pack、持久化任务运行器或真实 Provider 调用。MZ 的原装 Host 验收仍为 `NOT_EXECUTED`；步骤 01 的阶段放行与 Map003 待证据记录继续有效。

## 安装和运行

固定 Node `22.21.1`、pnpm `10.20.0`（`.nvmrc`、`.node-version`、`engines`、`packageManager`）。可用 `nvm use` 选择 Node；终端如果登录配置选择了旧 Node，先按版本文件修正 PATH。PostgreSQL 本地实测 `14.20`，CI 使用同版本服务。

```sh
pnpm install --frozen-lockfile
pnpm db:local init
pnpm db:generate
pnpm build
pnpm db:migrate
pnpm dev
```

开发 Web 在 `http://127.0.0.1:5173`，API 在 `http://127.0.0.1:4310`。退出开发后执行 `pnpm start`，独立 Node 运行编译后的 API，同源提供构建后的 Web，访问 `http://127.0.0.1:4310`。生产启动不使用 tsx 或源码解析。`pnpm start` 不自动迁移数据库。

启动链整改：`pnpm dev` 每次清理并重新构建开发所需输出、生成 Studio 资源，再启动 API/Vite。准备阶段预算为120000ms；验证准备产物、启动服务并等待真实 DB health 与 Vite 页面/入口模块的预算为30000ms。API 以 development 环境直接运行 tsx，不再用会掩盖应用退出的 watch 宿主；修改 API/共享包后重新执行 `pnpm dev`，Vite 仍保留前端热更新。

CI 及定向开发 E2E 先执行 `pnpm dev:prepare`，再由 Playwright 调用 `pnpm dev:start`。两条路径共用同一准备/启动实现。`dev:start` 必须验证当前源文件（含新增/删除）、锁、配置、Node/pnpm及逐文件输出与本树成功准备凭据一致；失败或取消准备先使旧凭据失效，不以环境开关或 dist 存在跳过。准备不读 Provider 文件；服务环境策略保持既有后端边界。准备与服务启动分开计时，日志分别记录 prepare_ms、service_ms、total_ms；total_ms 是从该次准备开始到就绪的墙钟耗时，包含独立命令之间的间隔，不能与旧 Playwright 包含全部准备的30秒边界混称。

端口占用及同树并行启动拒绝；SIGINT/SIGTERM和子服务异常会清理本入口创建的进程组。Playwright 保留30000ms并等待真实两端检查后的标记，退出给启动器5000ms清理窗口。`.local/dev-startup.lock` 为独占锁；异常强杀后遗留锁须先核实本树进程/端口再人工处理，入口不自动复用残留服务。`pnpm test:startup` 仅运行独立 Node 合成用例与既有7项 observer 回归，不进入 Vitest 普通测试集合。

R4端口竞争整改：启动器为每次服务启动生成随机关联标识，分别从自有API/Vite子命令的stdout收取匹配标识、角色及实际端口的监听成功信号。API在await listen成功并核对server.address后发出；Vite仅在自身HTTP server的listening事件且实际地址/端口匹配后发出。取得必需的自有监听证据后仍执行原真实HTTP检查，预检后抢占端口的其他实例不能替代信号。关联标识只用于本地启动握手，不进入HTTP JSON、健康检查或前端业务环境。生产同样要求自有API监听证据和DB health；生产Playwright等待 `LOCAL_PRODUCTION_READY`，开发等待 `LOCAL_DEV_READY`，二者均保留30000ms且不以URL探测绕过归属校验。120000ms准备、计时字段、退出清理和开发API须手动重启的说明均保持。

`pnpm db:local init` 仅创建当前工作树内 `.local/postgres/data`，拒绝已有集群和已有 `.env`，使用独立端口 `55432`、环回 TCP、SCRAM 密码验证、不开放 Unix socket。随机密码只写入被忽略且权限 0600 的 `.env` / `.local/postgres/ownership.json`。不删除数据库，不操作 Homebrew 服务或已有 5432 集群。初始化失败后保留现场，由操作者检查，禁止为了重试删除未知数据。

后续启动/停止：`pnpm db:local start` / `pnpm db:local stop`；状态：`pnpm db:local status`。独立 Review 使用另一个工作树与 `TILESET_PG_PORT=55433 pnpm db:local init`。Linux 或不同 Homebrew 位置可用 `TILESET_PG_BIN` 指定包含 `initdb` / `pg_ctl` / `createdb` 的 PostgreSQL 14 二进制目录。这两个变量仅作用于本次命令，不修改系统环境。初始化时写入的端口不可在已有集群中静默更改。

如使用自行部署的本地数据库：复制 `.env.example` 到被忽略的 `.env`，设置自己的凭据；API 只接受 `127.0.0.1` 上名称以 `tileset_` 开头的独立数据库。不得把其他工程/系统数据库当测试数据库。应用启动会校验配置并连接；错误不输出密码、SQL 或本地文件路径。

## 命令和证据

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm test:integration
pnpm test:dev-privacy
pnpm exec playwright install chromium
pnpm test:e2e
pnpm dev:prepare
E2E_MODE=dev pnpm test:e2e
```

`pnpm check` 包含类型、lint、格式、单元/原型测试和构建。数据库测试是单独且必要的门禁，缺少数据库时必须失败，不自动跳过；仅清理测试新建且记录 ID 的行。浏览器测试在两种运行模式下真实创建项目、刷新后读回并检查 Pixi 画布和浏览器异常，截图/JSON 写入被忽略的 `.local/e2e`。CI 服务数据库无需密码，仅在临时 runner 的环回端口可用；本地默认仍必须 SCRAM。CI 配置存在不等于远端 CI 已运行。

先提交冻结候选，再执行 `pnpm build` 和 `pnpm build:engineering` 发布 `artifacts/step02-*`。Manifest 绑定完整 commit、唯一 Profile、Pixel/HTTP/Task 契约、Node、锁文件 SHA-256 和每个构建文件 SHA-256；已发布目录拒绝覆盖。验证、独立 Review、用户批准另存引用证据，不改 Manifest 加 PASS。证据文档提交不得被描述为新的源实现测试。原型命令继续保持根目录和 `dist/scripts` 路径：`pnpm prototype`、`pnpm verify:mz <本机正版 rmmz_core.js> <构建目录>`、`pnpm prepare:mz ...`。仅新目录可出版，不覆盖步骤 01 历史构建和人工工程。

## 安全和 API 边界

生产 API 仅监听 `127.0.0.1`；Host 必须精确匹配该地址和配置端口，拒绝转发 Host/地址。Origin 限定生产同源；开发额外允许精确的 Vite 地址。变更接口额外要求 Origin、`X-Tileset-Client: local-v1` 和 JSON Content-Type，服务端执行检查，CORS 仅是浏览器读权限。拒绝跨站 Fetch Metadata、表单和 multipart。JSON 解压关闭且上限 8 KiB，Zod strict 输入拒绝路径、模型、未知属性；输出专门映射 UUID、名称和 ISO 字符串，不直接暴露 ORM 对象。没有 cookie 身份或用户登录，此边界面向 local-first，不是 SaaS 授权。

`/api/openapi.json` 从 HTTP Zod 定义生成 OpenAPI 3.0.3；共享 ESM 包同时导出明确的 JS 和 `.d.ts`，不向生产 Node 导出 TS 源码。API 的 Prisma schema/迁移与 HTTP DTO 分开。API Key 不属于契约或前端环境；`VITE_*` 不可用于秘密。当前无上传端点；未来上传必须复用 Pixel Contract 的容器/CRC/体积/像素验证，不能只信后缀或 MIME。不可允许用户选择服务端路径。

Vite 开发服务器是独立的安全表面。其文件允许根显式限定到 `apps/web`、`packages/contracts/dist` 和实际依赖 `node_modules`，不启用默认工作区根允许列表；所有深度的 `.local`（包括 PostgreSQL/MZ 私有状态）都禁止服务，保留 `.env`/证书/`.git` 默认保护并增加 `.key`。请求的真实文件路径必须在允许根内，符号链接不能指向私有目录。没有 public 目录静态服务，前端素材通过 src 导入，避免另一个绕过文件检查的静态处理入口。Origin/CORS 精确限定实际 Web 端口，其他 localhost 端口同样拒绝；预检必须穿过该边界。`pnpm test:dev-privacy` 启动真实独立 Vite CLI，使用新建的 0600 假哨兵验证 plain/raw/import/query/编码/符号链接、外来 Origin 和正常前端/共享包加载；不读取或请求真实凭据。该回归也由 CI 明确执行。

第二轮路径整改后，边界以 Vite 实际 client resolver 的结果授权：先解除已固定版本的 ID 包装，再验证真实文件目标；缺失文件或未注册伪虚拟模块直接拒绝，不因 ENOENT 放行。模块 load 阶段也再次验证目标，覆盖 raw/asset loader；优化依赖仅等待 Vite 已登记的 processing 完成后验真。标准 Vite/React runtime 和实际注册的虚拟模块保留，API 代理按独立路由进入 Nest。隐私回归覆盖文件和目录别名、wrapped @id→@fs、重复/编码包装、查询顺序、HEAD/Range/script/OPTIONS，并用纯虚拟测试模块证明合法虚拟加载。

## 依赖与后续模块

根工作区 `@tileset/prototype` 保留 `src/profile.ts` / `src/pixels.ts` / `src/compiler.ts`，作为步骤 01 独立诊断工具。未改算法、Profile、PNG、来源或 golden。没有把固定槽位复制为生产规划。原型仅依赖 Sharp；任何正式核心不应反向依赖 Web、Nest、Prisma 或供应商。

| 模块            | 拥有的职责                                  | 允许依赖                                  |
| --------------- | ------------------------------------------- | ----------------------------------------- |
| contracts       | HTTP JSON、Zod、OpenAPI                     | Zod/OpenAPI 库                            |
| ai-gateway      | Provider/任务/Executor 类型、不可变快照构造 | Zod；不依赖 API/ORM                       |
| api             | 输入/输出转换、环回安全、最小项目 DB 链路   | contracts、Nest/Express、Prisma           |
| web             | React/Pixi 工程壳、项目列表                 | contracts；不能导入 API/ORM/Sharp/Gateway |
| prototype（根） | 步骤 01 固定诊断布局/像素/Profile/CLI       | Sharp/Node；不依赖 apps                   |

步骤 03 才增加引擎无关领域、像素/配方模块；步骤 04 Compiler 定义目标规则但不选槽；步骤 05 Pack 唯一分配稳定槽位；步骤 06 应用 Executor 实现持久化恢复与 CAS，Provider 仍只 submit/query。没有预建无内容的包或数据表。新包必须保持这个方向，并在本步依赖检查中登记。

Task Contract 包含 `SUBMISSION_UNKNOWN`，提供 `KNOWN/UNKNOWN/REJECTED` 提交结果、远端状态与本地归档成功的区别。`RecoveryDirective` 类型显式区分已知 ID 查询、未知提交核对且不重提、只重试归档和本地取消；这些是契约，不声称故障恢复已实现。`freezeTaskSnapshot` 深拷贝解析并冻结完整模型/配置版本、主/任务模板版本与内容、可选补充、结构化参数、Style/Target Profile、引用 revision/hash。不含凭据，不读取运行中的默认模型。Mock 仅存在于契约测试 double，无完整 runner、SDK 安装或网络行为。真实模板 Composer 留步骤 08。

新增依赖使用固定的可安装版本和锁文件，更新后执行安全审计和功能门禁。当前 Sharp 固定 `0.35.5`，因第三轮 Review 证实公开 decoder 与 supplied-build preflight 可达到旧 native EXIF 解码器，已选择补丁运行库并验证四 PNG 字节与像素保持一致。历史 Sharp `0.34.5` 的构建/契约记录原样保留；当前安全修订与实际版本见 [Codec runtime](STEP_02_CODEC_RUNTIME.md)。没有 HTTP/上传或远端素材路径不等于所有本地输入可信，不再以此把可达 EXIF 风险降为非阻断。完整新候选报告与独立 Review 仍是关闭门禁，不能改母版或阈值掩盖差异。

## 步骤 03 扩展记录

步骤 02 已发布于 c021b20991281317fbbbb1fc398c0ae496ef648d，第四轮独立 Review PASS，候选及 main CI SUCCESS（最终发布记录由 Orchestrator 管理）。现有五模块的工程职责保留；步骤 03 增加 asset-core、material-processing 和 image-adapter，方向/清理/构建/生产导出均登记为八成员。新处理语义与入口政策见 [步骤 03 基线](STEP_03_BASELINE.md)，没有增加 HTTP 上传、供应商调用或正式 Compiler/Pack。
