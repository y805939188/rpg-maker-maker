步骤07正式第18轮独立审查，2026-10-15（America/New_York）。**PASS_CURRENT_DIFF / 当前两行测试修复独立通过（环境适配验证）**。P0=0、P1=0、硬阻P2=0，新增开放非阻断finding=0。结论仅覆盖列表恢复夹具的时钟隔离及直接回归；不是新一轮06–07 WHOLE PASS，也不是用户批准或发布。

| 冻结绑定 | 值 |
| --- | --- |
| Source，原checkout始终detached | `d0a6f162a2b57634f7f10d0f5c49eab2168bb6a8` |
| 作者docsHEAD | `cfb3f6a88b22a4cbfce27304d841d2628e6f5a76` |
| 作者报告 SHA256 / bytes | `cdd3aa93cd16614c66b5af612496f0e6c22f53228a90e02310352fafc8fbfaf5` / 9260 |
| 作者ledger SHA256 / bytes / 文件数 | `1e143ec9dee833055be783b58846dce0446a8509a6c36162bdd223c69ca1de0b` / 40727 / 184 |
| 工程Build | `step07-d0a6f162a2b5-4d9d8ad25d20a5e7`，208文件 |
| 工程Manifest SHA256 / bytes | `85fc90888109c287e435d27c1b23da29a742db615709b6e4c3c1c3fc68b57be7` / 25776 |
| Full Profile canonical SHA256 | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793` |
| 证据root（本ledger路径基准） | `.local/step07-review/independent-round18`，在原隔离checkout内 |

角色按本轮指定step_reviewer / gpt-6.1-sol / ultra / default(Standard)执行；未使用collaboration派生、Fast/Priority/Ultrafast或修改全局配置。不可见的服务端最终model/effort/tier标为UNVERIFIED_NOT_EXPOSED，不伪造配置证明。未修改冻结生产实现、正式tests/config、Main canonical或旧Manifest，未commit/approve/merge/push。

已完整读取AGENTS、两份正式plans、MZ_RUNTIME_ENVIRONMENT，并读取当前07契约/需求映射及列表、交付/处理读取、Vite相关范围。Main最新收敛授权SHA256 `987420f2c436fa1c7c494e295502df554f9a2eee059917f24c3821e4b26b4825` / 1019bytes。作者报告/ledger物理bytes与指定docs Git对象相同；关键控制源、执行记录、两模式reporter及工程引用逐SHA/bytes/Git对象核对，未复制全历史或冒称独立验证其184项。见[引用收据](evidence/author-key-references.json)、[作者执行引用](evidence/author-execution-reference.json)。

完整`2157489dd739a8f8a02aa2c9cf47ad7319e14c7f..d0a6f162` diff仅`e2e/studio-project-list.test.ts:293–294`两行：说明注释及`await currentReady(page)`。与R17 Source比较，207个非docs/README路径中206个完全相同；唯一剩余路径也是这两行。生产Web/API/数据库/依赖锁/CI/其他tests/Profile/Compiler/Pack/像素与动画时基均无字节变化。[完整diff](evidence/candidate.diff)、[范围核验](evidence/scope-audit.json)。

新增屏障使用既有helper：先要求实际导出画布ready，再要求处理PNG的`data-project-id`等于本用例fixture且natural尺寸为96×144。列表503错误已显示，随后等待这些独立资源settle，再记录reads并安装/快进假时钟，故81秒观察针对列表不自动恢复，不再提前消耗独立交付描述的60秒读取预算。屏障不触发业务写入/重新构建。原case90秒、ready30秒、图片归属15秒、81秒窗口、1300ms卸载挂起控制、零自动重试、显式只读恢复无POST、恢复后ready和卸载断言全保留。未新增sleep/timeout/retry或降低任何阈值；没有直接生产回归面。

本轮独立执行使用独占PG55519、API4419/Web5319、Node22.21.1；NO_PROXY/no_proxy仅子进程为127.0.0.1,localhost。原checkout实跑`pnpm build` exit0 / 24.600秒，自己的空`tileset_studio`五迁移exit0 / 1.778秒；实际208个构建payload SHA/bytes全部与指定工程包一致，并核对Manifest本体，未另行发布工程包。[构建绑定](evidence/build-receipt.json)。

本轮环境适配必须与PASS一起阅读。初始运行的原失败均保留：

- 原checkout默认headless shell执行旧控制，已看到81秒后真实descriptor abort，但按钮稳定性等待及afterEach截图各触及90秒，未到达目标ready断言；不是有效的30秒反例。
- 原checkout正式生产用例exit1 / 39.746秒：新增的首次ready30秒失败，发生于安装假时钟之前。实际descriptor、A1/A2、Manifest/Profile、processed均200，但decode/画布未完成。
- 原checkout正式开发用例exit1 / 31.002秒：GET Web `/`为403，列表失败标志5秒未出现，原因是工作树实际位于`.local`下，被现有Vite `**/.local/**`规则拒绝；没有修改该保护。
- 同一默认headless shell的完全独立最小页面RAF在3秒无回调，真实PNG natural尺寸已96×144但decode再3秒未完成，截图5秒超时；重复有明确环境干预的短探针仍失败。一次临时5秒`caffeinate -u`未解决，已结束，无全局设置修改。同一已安装1248完整Chromium（156.0.8078.4）最小RAF、decode、截图均通过。该证据不把默认shell异常归因于本次两行差异，也不推定远端原因。

因此用自有物理临时镜像`/private/tmp/tileset-independent-r18-dus8la0p/checkout`执行后续验证；9588个源码文件全部SHA/bytes与冻结checkout一致，mirror为同Source detached clean，不复制.env。仅own ignored配置指定已安装`channel: chromium`及输出路径；正式用例、路由、断言、预算、workers1/retries0不变。该channel使用完整Chromium，并未把默认shell失败改写为PASS。镜像初次启动因Reviewer错误传入原树asset root被现有归属规则拒绝，未执行测试；该失败与打包ENOENT保留。随后创建自有空`tileset_r18_exec`及mirror本地root，五迁移exit0 / 2.175秒，原数据库/资产未改写或复制。属于有明确诊断依据的环境修正，不是盲重跑。[最小渲染探针](evidence/browser-environment.json)、[完整Chromium正控](evidence/environment-full-chromium/browser-environment.json)、[环境诊断](evidence/environment-diagnosis.json)、[镜像/配置核验](evidence/execution-adaptation.json)。

| 本轮独立有效执行，完整命令见各receipt | 实际结果 | 秒 |
| --- | --- | --- |
| 旧顺序，作者保存的同一有界Studio/descriptor真实200屏障；own copy | exit1，EXPECTED_COUNTEREXAMPLE_CAPTURED，原ready30000ms断言失败 | 42.973 |
| 修复顺序，同屏障；own copy，原case全部断言 | exit0，1/1，skip0/retry0 | 13.810 |
| 冻结既有用例，实际production，完整Chromium overlay | exit0，1/1，skip0/retry0 | 13.290 |
| 冻结既有用例，实际dev，完整Chromium overlay | exit0，1/1，skip0/retry0 | 33.822 |

后两条执行的测试选择均为`pnpm exec playwright test e2e/studio-project-list.test.ts --config .local/step07-review/independent-round18/formal.config.ts --grep 'project list failure' --output <own-private-results>`，dev仅另设E2E_MODE=dev。没有机械跑全18+18/check418/PG23/HTTP16或重开06。精确argv、exit、日志SHA/bytes及reporter见[执行汇总](evidence/execution-results-summary.json)和相应目录receipt。

有效旧控制独立重现：真实初始Studio200挂起至安装时钟后交付；真实preview200在页面收到前挂起。快进81000ms后该descriptor `net::ERR_ABORTED`，UI明确60秒预算耗尽。显式列表恢复实际成功，随后原30秒ready失败；backend successfulBuildId和COMPLETED Job仍正确。不是坏产物PASS或数据发布故障。[旧顺序](evidence/controlled-old-full-ready/controlled-order.json)、[原失败日志](evidence/controlled-old-full-ready/command.log.txt)、[截图](evidence/controlled-old-full-ready/controlled-final.png)。

有效新控制仅多初始屏障：首次currentReady释放同样的真实资源，实际画布和处理图先就绪；随后81秒无额外列表读、无POST/descriptor abort。显式重读才恢复真实侧栏项目，选中localStorage project、画布Build、处理图project/recipe与后端当前配方/成功构建一致，natural尺寸96×144。记录list reads=2（失败1+显式恢复1），另一次卸载待处理GET独立记录；无业务POST、pageerrors=[]。卸载前GET确已进入1300ms挂起，导航about:blank；私有trace中该待处理GET状态−1，没有页面收到200，无后续pageerror。没有在缺失的terminal字段上虚构ERR_ABORTED原因；App既有cleanup会推进listGeneration并abort listRead。每个控制afterEach另有一次明确只读Studio健康诊断，不声称总额外GET为0。[独立身份/网络/卸载观察](evidence/controlled-new-full-ready/independent-observation.json)、[原case收据](evidence/controlled-new-full-ready/failure-cancel.json)。已实际view_image检查旧失败、列表503但资源已ready、真实侧栏恢复后画布/处理图三张技术截图；不当用户美术或MZ确认。[截图索引](evidence/screenshots-viewed.json)。

远端Main215 CI38690964177/job116276522135原146082-byte日志SHA256 `62c5f7eeae7f8f23b7ce7ae8ee0a50cda7a05f47cd5f40c2ce5eaf9f8c43379e`已独立核验；只证实原恢复后ready30000ms失败、生产17pass1fail、dev未执行。无上传trace，远端当次descriptor/clock确切时序和根因仍UNVERIFIED。上述本地受控因果、当前机器shell异常和远端日志三者分别记录，不互相替代。[远端原失败引用](evidence/remote-failure-reference.json)。

继续适用的前轮证据均为**REUSED_NOT_RERUN**：R17 WHOLE PASS绑定Source `0c3dc30b0ebb4f64373fc4b3d32501a6048fe7de` / docs `fa7f562efe58ddd2ee4912b64a3ad6e5cb84de67`；Main报告SHA256 `98c93672028cfb3565a0dc27eac0625604f266f886921db17a4e0fab39a09b23` / 16434bytes，ledger `1285e8e6e3fe3f1c19b5d8c406c601647b31a76a028889f2c26a6d186dfc6189` / 35023bytes，均独立读回。该轮独立418/PG23/HTTP16/API3/privacy5/prod18/dev18及其真实ZIP/PNG/RawCanvas/DB链在相应原范围继续有效。本轮未变功能不因Source SHA不同作废，也不冒称这些为本轮执行。candidate `4cb718aceabcd772b234d86e9d2c0d9f74eda2be` CI38683352144、功能main `04e979612cfc82c7c2b5687fbb83509c995213b7` CI38686901060成功仅引用已保存历史收据，不是Reviewer本轮远端执行。R16保持INTERRUPTED/PARTIAL。[前轮SHA收据](evidence/prior-reference-receipts.json)、[候选CI历史引用](evidence/ci-reference-receipts.json)。

作者本轮冻结Source的check418、生产18、开发18通过/零跳过重试是**AUTHOR_EXECUTED_NOT_REVIEWER_EXECUTED**。本轮Reviewer的check418、PG23、HTTP16、API3/privacy5、全18+18、额外像素/ZIP/clock/native/MZ全套均NOT_EXECUTED_THIS_ROUND；本轮仅以影响分析复用其仍相同的功能范围。新MZ GUI/游戏/用户美术/OriginalHost/Map003等保持NOT_EXECUTED或原延期；JS heap不是OS/native RSS硬cap等既有限制不改写。06已发布不重审重发，08–10未启动；没有真实模型/视觉SDK/key/费用/正式Prompt体系或globalMZ/NW修改。

结束原checkout与mirror均Git clean，原HEAD未切换，9588个tracked SHA/bytes起末完全相同；聚合SHA256均`e7c0502980a354a9fbbc9da9bb1da9c9f68388db5dc0fb562aa23579714b3d29`。[源码保护](evidence/tracked-protection.json)。API4419/Web5319无listener，自有browser/native辅助已关闭；仅工具传输cua_node/node_repl保留。PG55519/PID97223真实data_directory仍为原checkout `.local/postgres/data`，两个自有库tileset_studio（3项目/3COMPLETED）与tileset_r18_exec（4项目/4COMPLETED）及各自资产root、失败、私有trace/cache/mirror全部保留，其他DB客户端0；PG留Main核归属停。own.env0600 SHA/bytes不变且未复制。未触碰用户4376/其他DB、私有素材或正版runtime。[资源](evidence/resources-final.json)。

report/progress、必要脱敏合成证据/源码副本由`evidence/ledger.json`按本root相对路径逐SHA256/bytes封存；ledger不自指，私有trace/初始全tracked清单不公开打包。真实own DSN/password只在RAM用于扫描，不公开.env/ownership/dump。Main后续正常合并Push、最新完整main CI及最终放行均NOT_EXECUTED_BY_REVIEWER，不能预写成功。**STOP_REVIEWER；Main可按本报告限定的差异及明确环境适配范围继续其既有门禁。**
