# 步骤09开发启动定向 Coding 停点

2026-10-18，America/Chicago。作者 `step_coder`，**BLOCKED**：本地未复现原 CI 超时；交付脱敏观测候选，请 Main 安排一次有意义的 CI 取证。没有认定根因或实施性能修复，不宣称 CI 恢复或独立 PASS。原 R2 历史及结论保留，R3 由 Main 组织，本作者不调度 Reviewer、不批准/合并/Push、不进入10。

基线 `e228d09a732955aaf63b2bddd949bc0a45ac9815`；本树 `codex/step-09-startup-fix` 的执行文件冻结提交 **`65a8ad44d74232b0fd8fb876b1694219c8d68799`**。本报告是后续文档提交；最终本地 HEAD 由 ignored `summary.json` / `main-request.json` 绑定。客户端进程明确覆盖 `gpt-6.1-sol / xhigh / service_tier=default`，会话 turn_context 一致，developer 指令为 startup-only step_coder；未改变全局配置，隐藏服务端字段 UNVERIFIED。没有子 Agent。

已读本树 AGENTS、指定 R2 / release、主仓指定 blocked/excerpt/完整 job 日志，及正式 plans 的公共门禁、工程启动和09/10直接影响段落。原 CI39151160848 / job117744918491 在 e228 的开发阶段仅有 `Timed out waiting 30000ms from config.webServer.`；无子阶段时序、开发用例或 trace。其完整日志 SHA256 为 `cbfac9c786908b248446b189bd36eb22c1bbeca22a93783bd5b87cd5591195bf`。既往生产服务是否完全退出及当时 DB/端口状态仍 UNVERIFIED，不能用本地结果倒推 CI。

本地使用 Node22.21.1 / pnpm10.20.0，`pnpm install --frozen-lockfile --store-dir .local/pnpm-store` 成功，锁文件 SHA256 保持 `d533bbb2ae9cf77a1c91b18f9fc395af500fc55a27f7529a045a7eab6d85ce7b`。允许列表环境启动所有安装/构建/测试子进程，排除继承的密钥及 Provider 配置，固定 `TILESET_AI_MODE=mock`；只加载本树 `.env`。本树 API49279 / Vite4479 / PG55579 起始空闲；PG14.20 新 cluster 在本树 `.local/postgres`，7项迁移成功。TMPDIR、cache、pnpm-store、Playwright路径和资产配置均在本树；未下载浏览器。

| 定向验证                 | 真实结果与范围                                                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 有效基线完整 `pnpm dev`  | health200 于20844ms；API tsc 于13769ms完成；studio-resources 13819–16994ms；run-local 于17024ms进入。30秒内通过作者启动探针，非18项开发浏览器通过                                                                      |
| 观测脚本首次真实链验证   | health200 于19810ms；仍执行全部原构建/资源链，随后关闭自有进程组。不是耗时改进证明                                                                                                                                     |
| 最终 Playwright 启动探针 | `E2E_MODE=dev pnpm test:e2e --config .local/step09-startup-coding/playwright-startup.config.ts`，exit0，1项HTTP探针，命令21192ms。继承原 webServer、显式还原原根目录 cwd，仅替换测试目录/报告；无 browser fixture      |
| 最终观测时间线           | E2E入口0ms、dev726ms、prototype957ms、依赖1193ms、API build13136ms、资源15183–19173ms、run-local19220ms；首次采样 health200 于21061ms。采样不是精确就绪瞬间，也不是 Playwright计时起点                                 |
| 观测脚本自测             | `node --test --test-timeout=10000 tests/startup-observer.test.mjs`：完整7/7；覆盖固定标签、禁用无输出、原成功/失败退出码、占用端口及503→200、脱敏、不滞留、SIGTERM原信号/无残留进程、无响应HTTP的250ms总超时、非法配置 |
| 静态检查                 | `pnpm exec eslint scripts/startup-observer.mjs tests/startup-observer.test.mjs`、对应3文件Prettier检查、`pnpm check:boundaries`：全部exit0，13成员方向通过                                                             |
| 冻结提交构建             | clean执行提交65a8ad4上串行 `pnpm build` exit0 / 21512ms；随后 `pnpm verify:exports` exit0 / 11项通过；未在被测服务运行时clean build                                                                                    |

有两个有效直接启动链样本、两个随源版本验证的HTTP启动探针，及准备中止/首次取证夹具记录。最终HTTP探针执行于155f008；其后至本执行候选仅撤去拟加在生产与开发步骤之间的CI自测，以保留原相邻顺序；产品/预加载脚本/测试字节相同，结果按该范围复用。最终构建重新绑定本执行候选。没有重跑01–08整套、18+18、完整09或H02。各次沿用本树私有缓存，初始缓存冷热并不相同，不据此声称冷启动保证、性能改善或CI机器慢。

准备阶段的错误不删除：安装尚未完成时提前执行 db:generate 报 prisma未找到；两次 db:migrate 在 API config dist 尚未生成时失败；因此中止第一次启动，保留 `initial-*` 为 CANCELLED_BY_CODER 的准备证据，不计有效启动结论。补齐API构建、生成与迁移后才执行有效诊断。观测脚本最初使用HTTP空闲超时，后改为250ms总超时并在收到状态码后关闭探针连接，新增无响应连接测试；旧source334/source155构建日志不删除。第一份临时Playwright配置虽然1项通过，但config目录导致启动cwd不同、附加CLI参数未进入外层观测标签，阶段时钟分离；保留 `playwright-startup-first-fixture*`，修正夹具及标签后重新验证最终观测。直接链首次观测的database_tcp为unconfigured，因为该探针进程未加载本树.env；最终集成验证通过显式本树DB进程值记录listening，不把TCP连接冒充SQL认证或迁移验证。详见 `preparation-corrections.json`。

执行差异仅3文件：CI为既有开发E2E增加 opt-in `NODE_OPTIONS --import` / `TILESET_STARTUP_OBSERVE=1`，保持生产→开发两命令相邻，不插入自测等待；上述7项自测仅本地执行；`scripts/startup-observer.mjs` 为限定预加载观测；`tests/startup-observer.test.mjs` 为合成自测。观测只输出白名单阶段、PID/PPID、时间、退出码和有限探针状态，不输出argv、路径、环境、密钥、数据库URL、HTTP正文或原生错误。只探测127.0.0.1；探针每1秒、网络超时250ms、35秒停止采样，全部计时器/socket unref，不接管信号、不派生子进程、不启动/清理服务。35秒是旁路观测寿命，**不是启动门限**。CI原开发命令、原Playwright30000ms、原断言全部保持；Playwright照常失败/取消，观测不会把之后就绪写成PASS。会话取消可缺少被信号终止进程的exit事件，保留最后enter与原超时报错用于定位。

`package.json` 原 `pnpm dev` 串行链、Playwright配置、run-local、studio-resources、Compiler/Profile/Pixel Contract及锁文件与e228逐字节相同，哈希见 `unchanged-contracts.json`。没有缓存命中/跳build/旧dist复用机制，没有移动计时边界或预热codec。所有必需构建和源绑定照常执行。

复用原R2完整450与09完整4/4，以及e228候选CI已通过的privacy5/API3/06=23/07=16/08=3/生产浏览器18，只证明未变产品范围。旧R2补充08本地2/3、旧失败/UNKNOWN/预算与所有旧候选仍按原历史保留。产品、Prompt/模型、Provider加载、AI转换、Task/Executor/预算门禁、Compiler/三帧/布局、T/R资产和Holdout均未修改；仅原启动所需内置测试fixture资源准备照常运行。因此T01接受A像素一致与R01 USER_REPORTED功能接受按未变范围复用，不重新评图。没有Generate/Edit、真实AI调用、唯一09账本访问/写入或H02运行，未读取主仓.env.local或真实Provider文件；不触发费用，不批准正式质量阈值或步骤10。

构建 `studio.json` SHA256 `5b13412608462f4705f8c512ca9de4f3f31a9082f93200f81217da7a734b08ba`；257文件清单 SHA256 `9140b699c7fe187b64012cc592e969668c562a04764a15259c0b9126f9120435`，绑定执行commit/Profile/codec/Node/锁文件见 `candidate-build-binding.json`。这不是替换已接受的T/R Pack或已发布Manifest。

全部作者证据在本树 `.local/step09-startup-coding/`：`summary.json`、`evidence-sha256.json`、基线/观测时间线与结果、最终Playwright日志/JSON、首次失败/修正、7项测试、静态检查、构建/逐文件SHA、preflight、final-services。Main发起器的活动cli-events等不纳入作者固定哈希。独立.env/PG/缓存/日志全部保留；本轮API/Vite/PG已关闭。旧PID49192:4398 / PID12517:55529继续监听，旧Studio health200；未触碰旧工程、DB、历史或全局runtime。

**停点：BLOCKED，等待 Main 读取 `.local/step09-startup-coding/main-request.json`，安排一次绑定本候选、保留原前置顺序的CI观测并保存原始日志。** 本地证据不能定位CI卡在哪个阶段；Main取得新证据后再决定是否需要本角色最小整改及限定R3。不得无新证据重复CI或把本报告当独立确认/发布批准。
