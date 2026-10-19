# 步骤09功能测试基线：CI整理与发布交接

2026-10-19。当前授权只整理CI/准备复用/测试拆分并正常发布09功能测试基线，不改产品功能，不进入10。最新受审执行source `7254dfe93ba72976dd0e593f00582c30de01ed5c`（只追加workflow组织整改）；作者文档HEAD `ff5d44b4841123094275e858f8649642e7845148` 仅新增本轮报告。R7原执行source `b00e4b709d5103c44a86b2111f53edcc7f82983e` 的其余实现未变。最终文档HEAD、两次候选CI、main CI和三处main读回写会话及ignored `.local/step09-final-closeout/ci-consolidation-final/completion.json`，不为自身SHA再提交文档。

## 当前技术门禁

- 限定R7 **PASS_LIMITED_CI_CONSOLIDATION**，R8 **PASS_LIMITED_CI_GATES**，均P0/P1/硬契约P2为0。R7审b0c48ab→b00e4b7九文件，R8只审6dac43c→7254dfe的workflow及直接影响，未全审01–09。见[R7 Coding](../reviews/step-09-ci-consolidation-coding.md)/[R7](../reviews/step-09-ci-consolidation-r7.md)、[集中整改](../reviews/step-09-ci-consolidation-r8-coding.md)/[R8](../reviews/step-09-ci-consolidation-r8.md)。一次集中整改/定向R8额度已使用，不自动扩轮。
- 功能R2 `0a55d9f` 的完整check450/09完整4/4、R5启动链PASS和R6独立Git夹具PASS按未变范围复用。它们不代替本轮差异确认或新SHA完整CI。T01/R01接受与产物绑定不变。
- 最新限定PASS、零P0/P1/硬契约P2及新SHA完整候选workflow整体 **completed/success** 后，Main才按本轮用户预授权记录 `APPROVED_BY_PREAUTHORIZED_ORCHESTRATOR`，正常整合/Push并等待完整main CI。必须同时核对core/development/baseline，不用局部绿色改写cancelled。该放行是用户预授权委托，不写成用户逐轮亲审。
- 不强推、改写历史、跳检查或重跑同SHA碰运气。实际失败先读当次日志，范围外或达到本窗口限制时留证停止。main CI真实成功及local main/origin/main/live remote一致前，不宣称发布完成。

## 检查执行位置与计时

| 原检查 | 当前执行位置 |
| --- | --- |
| check及API/06/07/08前置重复构建 | core一次ci:prepare运行原完整clean build，绑定当次源码/锁/配置/工具链及完整输出；ci:run每项前后验证，不凭旧dist存在放行 |
| 方向/types/lint/format/unit/build/exports | core同项仍阻断，prepared执行去掉重复build，生产JS/包导出和资源身份检查保留；公共本地命令独立能力不变 |
| check中的privacy5及第二次privacy5 | core default Vitest一次执行，原本地独立命令保留 |
| Studio原R4两模式一例 | core生产/dev独立状态用例，各新DB/资产/API/浏览器/输出；52条每模式matcher及真实COMMIT、迟到历史、实际PNG/Manifest/ZIP/preview断言保留；其余15项不删 |
| API、06/07/08、生产18、prepared7、startup26 | core原命令和顺序完整执行，真实PG/备份/任务恢复仍阻断 |
| 显式开发准备与开发18 | 独立development job同事件SHA/frozen工具链、新PG/新库/空输出/七迁移、原dev:prepare→原dev E2E及observer；无core产物或数据库依赖 |
| 原单个baseline job | core40分钟与development20分钟隔离并行；原名baseline2分钟严格needs/always汇总，双success才成功，失败/取消/跳过/缺失均拒绝 |

原b0失败CI39248620783实证：失败前10包各build7次、API/Web各2；R4开发历史末段在合并180秒窗口超时，后续未执行。第一整合候选[CI39263767830](https://github.com/y805939188/rpg-maker-maker/actions/runs/39263767830)/6dac实测10包/API各2、Web1，privacy文件仅一次；453、API3、06=23、07=17、08=3、双18、prepared7、startup26均通过，仍因新增45分钟整体job上限 **cancelled**，官方注释确认，45m2s job/45m5s workflow保持原结论。不能因全部测试局部成功将该run写PASS。

这次实际预算冲突是新增隔离并行的依据。新两个执行job各有真实PG/DB/资产/TMP/cache/输出，同一事件SHA但不跨job复制dist/receipt，不建产品缓存；依赖及浏览器工具在两runner各安装一次，开销未消失。development在dist/config.js尚不存在时直接使用公共wrapper内部相同Prisma CLI/schema迁移固定合法环回新库，实际启动仍用同一prepare/start实现和原配置验证。

R7保持一次常规完整prepare、一次开发冷prepare，第一整合候选实测两组；新workflow预计仍两组，实际新候选/main构建次数、各阶段/总耗时及排队以对应日志回执为准。b0未完成全流程，不能与新完整流程作等覆盖总耗时比较；也不把配置并行或局部一次通过宣传成永久稳定、全部历史根因已明或预设提速比例。

core40/development20/baseline2分钟预算预先固定，关键执行路径约42分钟不含runner排队，不是实际总时长保证。R5已授权开发准备与真实服务就绪分开计时：prepare120秒、真实API/前端及监听归属30秒；本轮保持其实现/门限。R4原一例180秒涵盖两模式，现每模式独立180秒，局部阈值保持，production target仍600000ms，无固定sleep或自动重试。

## 历史失败与未证实原因

原CI39151160848/e228开发30000ms超时保持FAILURE、原原因UNVERIFIED；观测CI39196257845/c8c3227成功只证明当次原门禁通过，29.030秒来自不同epoch，不计算970ms准确余量。main CI39211027987格式失败、39212002450开发就绪失败、39233755132 Git夹具失败、39248620783 R4超时及本次39263767830整体45分钟取消均保留，不回写FAIL/cancelled为PASS。夹具原Git stderr未保留，不补写推测错误。

R5、R6、R7及R8分别只证明各自范围。旧startup/R4细因仍UNVERIFIED；本次新45分钟超限有独立官方注释确认，两类原因不能混称。原作者停止记录、全部旧Review/调度遗漏记录及CI日志保留，当前CI与远端事实优先于历史发布计划。

## 同一产物的功能接受

| Case         | 实际Build                                                          | Export / Manifest SHA256                                                                                         | 接受范围                                                                                   |
| ------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| T01          | `0b212a2ba3d13b3fea3a37739a4d99fc6652e1de12363ea02455883f0e60732c` | `step05-pack-14843ed94e99-2fa57f2de435568d` / `56d14c0cec25ead99f88af65460b00baeb948896ab51358bb8f79280e580b84a` | 独立证明地面/三合成帧/mask与已接受A完全相同，复用功能测试素材接受，不重开A/B               |
| R01 final v3 | `ee01997274ca2e64d86499c67463aad0cbd8880625ed52cc4fc7ff94a3c2482f` | `step05-pack-97f6cb678940-b85cd864c7abf53d` / `affd77eb50ab40aa442959ceb6c4680ccf2c95af15f90a95ba70f7ecc1738460` | 草水可辨、池塘/孔洞/细通道无明显错格断边、Playtest动画可接受且岸线稳定：USER_REPORTED_PASS |

[用户确认记录](../evidence/step-09/final-closeout/user-functional-acceptance.json)精确绑定R Build/Export/Manifest。确认不修改任何历史Manifest或数据库视觉标志。首次R误选沙岸7423仍ROLE_FAIL保留，只纠正一次grass ROI；旧绿水失败不删除。新原图仍含场景，需产品明确选区，不宣传自动语义分割。像素、动画、布局未改，就不重复要求用户看同一画面。

本授权仅放行用户已接受的09功能测试基线，按本次明确范围将正式数值质量口径留作步骤10启动前单独确认；不因此重开本批纹理优化。不是所有素材商用美术批准、稳定高成功率或原装Host认证，也不是V1.0正式完成。

## 费用、保留集与未验边界

本轮Main/Reviewer0真实AI调用。累计6提交/6归档，3个AI pair批次，包含旧R语义失败；T复用0新增，R补测严格2/2后停止。累计报价$0.054、保守预留$0.30、实际扣费UNVERIFIED；账本和追加授权前后SHA不变。不得因余额仍在而追加批次，UNKNOWN仍占槽。

描述性均摊以两份所选功能测试Pack为分母：6提交/2=3提交/份，3 pair批次/2=1.5批次/份，全部历史报价$0.054/2=$0.027/份；不是商用可用率或实际账单单套成本。人工活跃分钟未可靠计时，保持UNVERIFIED。所有失败/手动选区与纠正计入原记录，不只展示最终截图。

H02-A由用户选定，原SHA `8b8408427cd7f1a863ae5595a3c484c93e8f4e889039a43f708aa5eb94823575`，冻结、未运行、未用于调参。正式数值阈值、正式评测/重试/人工干预预算与保留集执行须步骤10前另获批准；本轮不擅自批准。用户定性功能口径已确认。

MZ原生core1.10.0+锁定Chromium启动证据保留；用户Playtest观察记USER_REPORTED。编辑器手绘、未经修改原装Host认证仍按原NOT_EXECUTED/延期范围记录，不互相冒充，不操作全局Runtime。

## 工作台、数据与停止

原工作台 **http://127.0.0.1:4398**、PG55529/`tileset_step09_live_v1`及原功能进程继续保留，不为本轮CI/测试发布重启。原进程对应97f6功能源码；后续启动整改与本轮CI代码单独验证，不把现存进程说成运行最新启动实现。所有DB、资产、历史、预算、备份、MZ工程、共享`.env.local`及含独有ignored数据的工作树保留；只关闭本轮明确创建的临时服务。

共享Provider机制不变：只后端显式 `TILESET_PROVIDER_ENV_FILE`，进程显式值优先，Worktree DB/端口/资产独立；不复制/输出key，不source/eval，不进入VITE_/前端/日志/任务快照。普通测试固定Mock；本轮新增素材AI调用0，H02-A不运行、不调参。

正式数值质量阈值、正式评测/重试/人工干预预算仍待步骤10前单独确认；不因本批功能素材接受而批准商用美术或稳定成功率。所有本轮必要门禁完成后立即停止。**STEP_10 = NOT_STARTED。**
