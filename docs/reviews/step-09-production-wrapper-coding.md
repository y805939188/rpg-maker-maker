# Step09 production wrapper Coding closeout

2026-10-19，America/Chicago。**READY_FOR_REVIEW（限定R10）/ SELF_TESTED**。从干净 `1a2580c63a13da76c4409d3ce3ecb160fb71c80a` 继续；执行source **`af26495e5901f96e5b9b8f4ffff0736c951ad9e3`**，本报告另行提交，docs HEAD仅写ignored summary/main-request。实际客户端核对为本树cwd、gpt-6.1-sol / xhigh / 显式default(Standard)，隐藏服务端字段UNVERIFIED。无Agent派生、Review、批准、Merge、Push、CI触发或全局配置修改。

## 来源与唯一语义变化

已读AGENTS及Main workflow-context-final/completion回执，仅使用现有日志/Git取证，没有重现十分钟。Git证明 **`b00e4b709d5103c44a86b2111f53edcc7f82983e`首次新增ci-prepared.mjs及production timeout600000**，其父提交没有该文件。原main `980157bd242afce8fe79b1d8234bbe43a5c08921` 的workflow直接执行pnpm test:e2e，package命令为playwright test，Playwright没有globalTimeout。原始文件/历史保存在本轮evidence的origin-proof.json及对应txt。

CI39282826278的core日志记录production budget_ms600000，第16项完成后报“Prepared check phase exceeded its bounded deadline.”，没有取得完整18项结论；dev18通过。Main回执当时整体metadata仍为in_progress/null，本报告不补写未经读取的最终状态。旧日志SHA为`287f09229742f463bf7ae8edd106ff4750288a7ad8ac9081952583e04ddb6e06`，关键行另存candidate-production-excerpt.log。R9上下文整改仍有效，不将当前wrapper问题归因PG/负载或展开性能研究。

source仅改 **scripts/ci-prepared.mjs、tests/ci-preparation.test.mjs**。production显式配置`timeout: null`，runPrepared在null分支完全不调用setTimeout，也不调用clearTimeout；check-start记录budget_ms:null。没有把0/Infinity/undefined传给setTimeout，没有换更大数值。仍由同一prepared runner执行原命令`pnpm test:e2e`，保留全部18项、原per-case期限/retries和真实服务30秒门禁；不是绕过runner或跳测试。唯一移除的是本次用户明确授权的、新增600秒production suite总计时器。

其他目标仍逐项为：typecheck120000、unit300000、integration120000、step06 600000、step07 1080000、step08 300000、step09 600000、exports30000、migrate60000ms。prepare120000ms、core40/development20/baseline2分钟及严格聚合不变。prepareChecks/verifyChecks/产物与源码工具链绑定/Mock允许列表、main的失败传播/外部信号/后代回收/锁逻辑逐字节未改，见static-scope-proof.json。workflow/package/Playwright/E2E/产品/DB/Compiler/Profile/像素/素材/依赖及其他启动文件均未改。

## 定向验证

只执行必要合成测试和静态检查，显式Node22.21.1/pnpm10.20.0。**pnpm test:ci-prepared一次：10/10 PASS，fail/cancel/skip均0；原7项全部保留，新增3项；外层47750ms，Node报告47462ms。**该mjs文件继续由专属node --test收集，未加入普通Vitest的test.ts集合，没有本地全450/full09/生产18/浏览器/PG/MZ运行。

| 新增定向项             | 证明与结果                                                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 无suite计时器/其他期限 | spy实际全局setTimeout：runPrepared production调用0次；九个其他目标各创建1次且毫秒数完全相同；手动触发原exports到期回调后中止，未等待30秒；PASS，8932ms                              |
| 前后验证与真实子命令   | 使用真实pnpm运行合成test:e2e：有效准备成功；缺receipt、执行前source/output漂移均拒绝且未执行命令；执行后source/output漂移拒绝；真实exit7拒绝且不发check-pass；PASS，10114ms         |
| 正式CLI失败/取消与清理 | 当前正式runner及两个依赖脚本复制到独立fixture，真实失败CLI exit1、SIGTERM取消exit143；TERM抵抗合成父子进程均回收，ci-checks.lock消失，前后receipt仍可验，无check-pass；PASS，5934ms |

旧7项继续覆盖完整输出/缺失或改变/额外输出、错误资源commit/锁、准备失败/取消旧receipt失效、命令映射、Provider注入剥离等。子命令exit7、CLI exit1/143是预期负控，不是被忽略的测试失败。本轮没有非预期测试或静态失败、自动重试、断言删除或期限放宽。

受影响两文件ESLint PASS（最终1115ms）；两文件绕过旧Prettier ignore的定向检查、全仓Prettier以及git diff --check（含新报告）PASS，完整参数/exit/耗时见evidence/*.command.json与同名log。没有新增测试框架或依赖。

## 隔离、保留与交接

所有新证据在 `.local/step09-production-wrapper-coding/`，launcher和旧失败/报告未覆盖。外部父根 `/private/tmp/step09-production-wrapper-6qn7j35k` 的Git探测exit128；TMPDIR为其tmp子目录。9个合成fixture各自有.git、有效真实HEAD、匹配自身realpath的顶层、合成author/committer及0 remote；沿用原独立Git helper，禁止继承GIT_DIR/WORK_TREE/用户Git配置。普通环境为允许列表Mock，不读main .env.local或真实Provider密钥。

测试仅清理自己创建的fixture目录及合成后代；9个目录结束后均不存在，记录的后代PID均不存在。未启动、停止或探测任何真实服务，4398/PG55529未操作；所有旧工作树ignored数据、DB/资产/历史/预算/MZ保持，没有WaveSpeed调用/H02运行，AI调用0、10 NOT_STARTED。原R2/R5/R6/R7/R8/R9仅按未变范围复用；原冷启动及历史全部原因仍UNVERIFIED，没有声称生产完整18或新候选CI已通过，也没有实测提速结论。

Reviewer入口：source diff、origin-proof及旧日志节选、static-scope-proof、targeted-prepared完整日志、test-and-cleanup-result、最终lint/format/diff结果。新summary.json/main-request.json绑定source/docs HEAD、准确命令、结果与保护边界。**冻结后READY_FOR_REVIEW并停止；限定R10、候选CI及条件发布仅由Main安排。**
