# 步骤 02 第二轮整改及停止检查点

**状态：BLOCKED，未批准。** 第三轮指定独立 Reviewer 被平台以可能的网络安全风险中断，最新候选独立门禁不可用。Orchestrator 明确要求停止，Coding 仅完成已在运行的证据整理，源码保持冻结；不合并、推送或实施步骤 03/04。第三轮独立 Review 记 `NOT_EXECUTED_PLATFORM_INTERRUPTION`，没有 PASS。未寻求其他模型、服务层级、安全访问或设置变更。

- 冻结实现：`c3914ec1929e8b5a9571d9ed18fa8feb3c6f17dc`，本地分支 `codex/step-02-coding`。
- 工作树：`/Users/dingshinn/.codex/worktrees/step-02-coding/rpg-maker-maker`。
- 整改对象：`STEP02-R2-001 / P1`；第一轮问题不得仅因当前自动测试通过而标为独立关闭。第二轮独立报告在主工作区保留，SHA `c197dc9893ee0c0901856361c0bfdfb4ab575c545263654f119564167a120695`。
- Coding 配置仍为 `gpt-6.1-sol / xhigh / default`，原客户端证据适用；服务器最终服务层级未获验证。没有付费模型调用。

## 实现与真实负对照

此前中间件对带 `/@id/` 的未处理路径做 realpath，遇到 ENOENT 放行，之后 Vite 解包装并读取别名目标。现按固定 Vite 7.3.5 的实际 client resolver 结果授权，缺失路径或未注册伪虚拟模块拒绝，不再把 ENOENT 当作放行依据；module load 阶段也检查真实文件目标，覆盖 raw/asset loader。只等待 Vite 已登记优化依赖的 processing 后验真，没有通用缺失文件豁免。标准 Vite/React runtime 和真实注册虚拟模块保留，API 代理独立路由进入 Nest。

CLI 回归保留旧断言并增加文件/目录别名、wrapped @id→@fs、重复/编码包装、raw/import 顺序、HEAD、Range、script Fetch Metadata、OPTIONS 与缺失/未注册路径。只创建随机目录内的 0600 假哨兵。纯虚拟测试插件只返回公共字符串，不改原 server/FS/Origin 配置，用来证明已注册 NUL 模块仍可加载；正常浏览器使用原正式配置。未读取、请求或输出真实凭据。

负对照临时在 Coding 自有文件位置重放 Git `396cefb` 的**精确配置与边界源码字节**，随后 finally 恢复当前实现。两份旧源码快照/哈希、同一当前测试 SHA、失败原始日志和请求记录均保留，不回退候选提交，不修改他人文件。

| 对象                     | 已执行结果                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| 精确旧 396 配置 + guard  | 528 条记录，60 次返回假哨兵，6 次 HEAD 200；预期 FAIL / exit 1                                   |
| 冻结 c391 当前测试       | 530 条记录：522 拒绝、8 条正常/共享/虚拟成功，假哨兵泄露 0；5/5 PASS                             |
| 全工程检查               | Strict、lint、format、方向/固定版本、68/68（原 52 保留）、clean build、真实三个 ESM exports PASS |
| 真 DB / 开发及生产浏览器 | DB 3/3，生产和开发创建/刷新/Pixi/no pageerror 各 PASS                                            |
| 冻结后的冷缓存开发浏览器 | 只将本工作树生成的 Vite cache 移至被忽略备份，保持 server 配置；PASS，验证优化依赖等待逻辑       |

冻结后共 14 条命令绑定 commit/argv/env/exit/耗时/日志 SHA，见 [commands.json](../evidence/step-02/c3914ec1929e8b5a9571d9ed18fa8feb3c6f17dc/commands.json)。其余已有测试和平台中断前的历史独立检查保留，但没有被改写成最新候选独立 PASS。

## 不可变产物与兼容回归

| 构建          | ID                                     | Manifest SHA-256                                                   |
| ------------- | -------------------------------------- | ------------------------------------------------------------------ |
| 工程，68 文件 | `step02-c3914ec1929e-c718a9846c1ce18a` | `c790e873616a7925a20a9ff1bc799220a79352de28e1108ea54029debaab6893` |
| 原型，4 PNG   | `step01-c512ed0c899ac99d4694`          | `414df504306bd0f5022ea06af4578116a21b73b944f57d26bba178ba2d5d9711` |

产物在该工作树 `artifacts/`，Manifest 与逐文件哈希快照在本候选 evidence。全部读回核验一致；重复发布预期 exit 1 且全文件/Manifest 哈希不变。所有旧候选、构建、失败探针及文档保留。

四 PNG 与批准 `step01-56368269c8328e0f84b9` EXACT_MATCH；外部正版原始核心 oracle PASS：960 选图、2,211,840 像素、241 update。Profile `mz-native-ground-water / 1.0.0-candidate.1`、Pixel `rgba8-srgb-integer-v1`、HTTP `http-v1`、Task `task-snapshot-v1` 不变。原型算法、TS scripts、fixtures/provenance、两份 plans 与 Profile/Pixel 文档未改。新增代码仅限当前开发服务器防护与回归；没有后续步骤功能。

## 恢复条件和进程状态

停止检查点未发现 Coding 的 4310/5173 应用监听；Playwright/隐私 CLI 已关闭自己的服务。专属 PostgreSQL PID 37990 当时仍只监听 127.0.0.1:55432，数据/凭据完整保留于被忽略 `.local/postgres` / `.env`，Orchestrator 可在检查点后停止其自有集群。已有用户 MZ 工程、系统数据库和全局 MZ/NW.js/RPGReactor 未改。

最新候选 standalone Node 端口/错误配置/DB 停启故障探针为 `NOT_EXECUTED`：停止指令到达前尚未开始，之后没有新增探针。旧冻结版本的真实故障结果继续作为旧证据保留。远端 CI `NOT_EXECUTED`；Original Native MZ Host 与新手绘/游戏/美术确认仍 `NOT_EXECUTED`，Map003 `(4,10)` 仍 `PENDING_USER_EVIDENCE`。继承 Sharp/esbuild 的已记录 P2 暴露判断未变，未升级编码器或改变黄金值。

恢复时先读取此检查点、冻结源码和所有哈希索引，恢复指定角色/设置的最新候选独立 Review 并补齐缺失门禁。只有取得真正的最新候选独立 PASS 及 Orchestrator/用户批准后才可继续；当前不可通过更换模型、层级或安全设置规避平台中断。
