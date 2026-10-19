# 步骤09独立Git夹具整改 Coding

2026-10-19，Asia/Shanghai。**READY_FOR_R6 / SELF_TESTED**。本轮仅执行用户追加授权的测试夹具Git整改；R4/R5已结束，其结论、候选CI失败及Main调度遗漏全部保留，不重置编号。没有Review、批准、合并、Push、CI请求或子Agent。

基线HEAD `bd7e9f1a8486e4776011c1c70d318906038fe30f`（原执行source c83be2b）；本轮 source **`40e020d3baec582ca72071cb8ac7ea522d5a0c35`**，分支 `codex/step-09-startup-chain`。测试执行时两份源码SHA与冻结source逐字节一致，见 `source-binding.json`；本报告另提交一次，最终HEAD只写ignored summary/main-request，不循环追加自身SHA。实际原生CLI参数为gpt-6.1-sol、xhigh、显式service_tier=default及本树cwd；隐藏服务端字段 **UNVERIFIED**，没有Priority/Fast或全局配置修改。

差异仅 `tests/startup-chain.test.mjs`、专属 `tests/helpers/startup-fixture-git.mjs` 和本报告。每个项目fixture在自身mkdtemp根初始化独立Git仓库及真实空提交，所有夹具Git命令明确 `-C root` / cwd=root。realpath归一化后断言show-toplevel等于本fixture、Git目录等于自身.git且为真实目录、HEAD可解析为commit对象，author/committer均为 `Synthetic Startup Fixture <startup-fixture@example.invalid>`，remote为空。空提交使用固定合成日期，故不同仓可得到相同真实SHA；没有mock主仓SHA或借用父HEAD，原正式prepare的Git校验没有跳过。

Git环境按允许列表重建，不继承GIT_DIR/GIT_WORK_TREE/GIT_CONFIG_COUNT等。系统/用户全局Git配置在子进程内禁用，空模板/空hooks目录仅位于该fixture，签名通过命令级配置禁用；身份及日期均合成。fixture的Git发现上界是规范化的临时父目录，防止损坏.git后回借父仓；正向用例另断言准备凭据的commit正是该fixture真实HEAD，并验证污染的继承Git/身份字段被排除。没有remote创建、Clone/Push或真实凭据使用；本轮源码/报告提交也用显式合成身份、命令级空hooks及关闭签名，没有写全局Git配置。

外部父根 **`/private/tmp/tileset-step09-git-fixture-hi6e2qhp`**，完整套件TMPDIR为其 `/tmp` 子目录。两者规范路径均不在任何已登记工作树内；使用未设置Git发现上界的干净环境，分别执行show-toplevel和HEAD探测，4次均exit128，确认运行前无可借用Git上下文。`preflight.json`保存这些**本轮新本地检查**的真实输出，不把它们补写成旧CI缺失的stderr或临时路径。

| 本轮验证                                     | 实际结果                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 外部环境唯一一次完整 `pnpm test:startup`     | **26/26 PASS**，原24项+新增2项，0 skip/fail/cancel；命令83058ms，TAP82800ms                                                                 |
| 每个项目fixture独立Git自检                   | **18/18**，独立顶层/.git/真实HEAD/commit对象/合成双身份/无remote；日志逐项保存                                                              |
| 正式prepare负控                              | 删除本fixture.git、删除本fixture分支ref使HEAD未出生两项均被未改动的prepareDevelopment拒绝，旧成功凭据删除，verify仍拒绝；没有放宽断言或门限 |
| 定向ESLint；两份测试源码直接Prettier         | PASS                                                                                                                                        |
| 全仓 `pnpm format:check`；`git diff --check` | PASS，包含本新报告；旧报告及格式规则未改                                                                                                    |

完整日志及解析自检在 `.local/step09-git-fixture-coding/evidence/` 的 `startup-external.log` / `fixture-results.json`。本轮没有旧版本失败重放、失败重试或产品启动；原端口竞争负向用例中的EADDRINUSE等属于保留的预期故障注入，不是套件失败。Linux CI **NOT_EXECUTED / UNVERIFIED**；本地Mac仓库外成功不能替代Main的新SHA候选CI和唯一R6。

`unchanged-formal-modules.json`保存正式prepare/serve/local-processes、监听信号bootstrap/Vite配置、Playwright、package命令、CI、锁及observer等关键文件的基线/当前SHA逐一相等；实际diff之外的所有正式代码不变。120秒/30秒、监听归属、生命周期、业务/Profile/素材和原24项断言/时限均保持；没有PG/API/Vite产品启动、资源构建、450/full09/浏览器/MZ或真实AI调用，没有读取真实Provider/.env.local、预算、H02/T/R/旧DB或操作4398/55529。

清理仅由原finally删除本测试mkdtemp创建的fixture/进程临时目录：18个项目fixture均已不存在；外部父根仅留Node工具缓存供审计，没有清理其他/tmp目录。旧startup-chain-coding/r4-fix及指定旧报告、停点证据保持原字节，重要文件前后SHA见 `history-preservation.json`；本轮只写新out及自有外部temp（另有本次授权源码/报告和本地提交）。launcher文件未覆盖，未启动任何需额外关闭的产品服务。

**停点：READY_FOR_R6。** 交接入口 `.local/step09-git-fixture-coding/main-request.json` / `summary.json` 绑定最终HEAD/source、范围、完整命令/结果、自检与负控、清理边界。Main负责新SHA candidate CI及一次R6，本作者交接后立即停止。原启动超时完整原因仍UNVERIFIED，正式质量数字待用户确认，步骤10 NOT_STARTED。
