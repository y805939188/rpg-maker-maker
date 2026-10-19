# 步骤09 CI整体预算整改 Coding 交付

2026-10-19，Asia/Shanghai。**READY_FOR_LIMITED_R8 / SELF_TESTED**。仅Coding、自测、本地提交；未Review、批准、Merge、Push、触发CI或派生Agent。Main安排原序列限定R8及新SHA完整候选CI，历史编号与失败不重置。

从干净 `6dac43c391a8b924f8ed7b65335dca1802b7ce6d` 继续，保留Main的Markdown更新。执行source **`7254dfe93ba72976dd0e593f00582c30de01ed5c`**，只改 `.github/workflows/ci.yml`；本报告另提交，最终HEAD仅写ignored summary/main-request。实际CLI的cwd/model/effort/显式service_tier已核对：本树、gpt-6.1-sol、xhigh、default(Standard)；隐藏服务端字段UNVERIFIED。未改全局配置。

## 证据与预算

只读Main的job118097926640完整日志、detailed jobs、annotation、stats、final及R7独立报告。run39263767830/6dac/attempt1整体 **completed/cancelled**；官方注释明确“The job has exceeded the maximum execution time of 45m0s”。13:51:41Z至14:36:43Z共45m2s；开发测试14:36:40Z已exit0，不能据此将job记PASS。Action Node20 warning不是本轮阻断，Action版本保持。

原候选日志实证：unit453（privacy5仅一次）、API3、06=23、07=17、08=3、生产18、prepared7、startup26、开发18均通过；两个R4分别89177/89505ms。普通10包/API各编译2遍、Web1遍，prepared常规目标额外build0。原阶段相邻Run起点耗时：prepare39943、types29690、lint4662、format6460、unit54920、exports3305、API4241、06=280617、07=671965、08=28343、生产595199、prepared22183、startup76870、devprepare30826、开发至收尾785468ms，含切换开销，不是纯命令。原prepare内部38597ms/257输出、devprepare内部29473ms。

实现前已保存 `evidence/coverage-map.md`、`baseline-stats.json` 和原证据SHA。预先固定预算：**core40分钟、development20分钟、最终baseline2分钟**；两执行job在不同runner并行，各自内部串行。关键路径预算约42分钟，不含排队，不是耗时保证或实测提速；没有将45分钟直接放大。

| 原位置                                                       | 新位置与保留覆盖                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| baseline方向、完整ci:prepare、types/lint/format/unit/exports | core原命令逐条保留，privacy5仍只在unit执行一次                                                          |
| baseline真实PG迁移/API/06/07/08/生产18/prepared7/startup26   | core原命令、断言及局部期限全部保留；生产whole期限仍600000ms                                             |
| baseline最后dev:prepare→开发18及observer                     | development自有安装、DB、空输出、七迁移、原dev:prepare→原E2E_MODE=dev pnpm test:e2e，observer原配置保留 |
| 单个baseline45分钟                                           | core40与development20独立执行；原名baseline作为always聚合job，仅双success放行                           |

## 独立性与实现边界

两个执行job均在ubuntu-24.04上checkout同一事件SHA，固定pnpm10.20.0、Node22.21.1、frozen锁及Playwright锁定Chromium，各自安装工具及启动真实postgres:14.20。数据库分别tileset_ci_core/tileset_ci_development，资产分别 `.local/ci-core/assets` / `.local/ci-development/assets`，TMPDIR及XDG缓存分别在runner.temp下命名。不同VM可用相同localhost端口；不存在core→development依赖、dist/receipt/数据库传输或产品缓存。

开发job显式拒绝已有dist或准备receipt，先db:generate，再用原schema的Prisma migrate deploy应用七迁移，随后原dev:prepare。直接调用现有Prisma命令，是因为公共db:migrate包装器依赖尚未生成的dist/config.js；CI连接值固定独立loopback数据库，未改公共包装器或生产入口，也未通过TS启动替代构建JS/包导出。真实API/Vite仍经过原监听归属+HTTP门禁；无假health、固定等待、retry或残留服务复用。

baseline明确needs两个job并使用always()；实际shell命令逐一要求needs结果为success，失败/取消/跳过/空值/缺失均不能绿。两执行job没有continue-on-error或条件跳过，push/PR触发和contents:read权限保持。整个workflow被用户取消时也不能获得成功聚合。没有新增缓存平台；原setup-node的pnpm依赖缓存保留，各VM产品输出独立。每runner重复安装依赖、Chromium及DB工具的代价保留，不承诺相同计算用量。

本地公共命令、生产prepare/serve、监听信号、120秒准备/30秒服务、R4每例180秒及全部prepared目标期限逐字节不变；无产品/业务/DB模型迁移/Compiler/Profile/Pixel Contract/图片/素材/依赖版本修改。预期CI仍为core完整build1组+开发冷prepare1组，累计10包/API各2、Web1；这是代码映射，尚非新LinuxCI测量。

## 本轮实际自测

证据根 `.local/step09-ci-consolidation-r8-coding/`，launcher文件及所有旧报告/失败未覆盖。每条命令的完整参数、允许列表环境键、exit及外层耗时见 `evidence/*.command.json` 和同名log。只改workflow，没有新增受产品tsc/ESLint收集的代码；相关静态为YAML解析、全部run的bash语法、覆盖映射、全仓Prettier及diff检查。构建与被测服务串行。

| 检查                                              | 实际结果                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| YAML/全部run bash -n/原→新命令与固定版本映射      | PASS；core旧run逐条保留，dev两原命令及observer原值保持                                                                                          |
| 实际聚合shell36组合                               | PASS，1290ms含映射/探针；仅1组双success退出0，其余35组拒绝，含两侧failure/cancelled/skipped/空值/缺失                                           |
| 实际空输出shell合成正负控5组                      | PASS；空目录放行，已有root/API dist或任一receipt均拒绝；真实空输出也直接执行同一命令通过                                                        |
| 新数据库、db:generate、七迁移                     | PASS；新DB初始public表0；generate2793ms、deploy891ms，七条finished且未rollback，与源码目录逐项一致                                              |
| 空输出原pnpm dev:prepare                          | PASS，外层19322ms、内部18020ms，244输出；10依赖包/API各build1，Web build0                                                                       |
| 同一dev:start及opt-in observer+锁定浏览器代表检查 | **2/2 PASS**，外层6768ms、Playwright5924ms；原shell用例全部断言保留，仅截图路径改私有目录，另验真实浏览器代理health DB connected和Vite源码      |
| 真实服务归属/就绪/退出                            | 同一次nonce的API49309、Vite4489监听证据均在LOCAL_DEV_READY前；service_ms3011；正常Playwright teardown后test:e2e exit0，两服务端口空闲、锁不存在 |
| 冷准备输出JS包导出                                | PASS，887ms，全部11包生产Node ESM声明导出，无额外build                                                                                          |
| 全仓Prettier / git diff --check                   | PASS，包含本报告；精确耗时见format-final/diff-final.command.json                                                                                |

本次原launcher记录total_ms30778，是receipt准备起点至就绪，包含两命令间采集证据的间隔；不冒称纯准备+启动之和或CI总耗时。真实浏览器仅两项代表检查，未冒充完整开发18。R7及原候选已通过的未改范围（包括startup26与外部临时Git夹具）复用，没有机械重跑453/full09/历史双18/MZ。

## 失败、清理与交接

首次私有探针在允许列表PATH选中的Python缺PyYAML而exit1，门禁尚未执行；定位后改用本机已有 `/Users/dingshinn/miniconda3/bin/python3`，未安装依赖/改全局配置，完整探针通过。原失败log保留。另一次25组合初验通过，补充空字符串后最终36组合通过；没有产品测试失败、重试求绿或门限放宽。

外部父根 `/private/tmp/tileset-r8-qj40_krq` 规范路径在仓库外，Git探测exit128；TMPDIR为其tmp子目录。仅使用允许列表Mock/合成环境、本树合成DB凭据，未读main .env.local/Provider密钥。锁定Chromium1248/156.0.8078.4复用自有工具缓存，24个可执行文件SHA前后相同；无旧产品产物复用。

先确认55609/49309/4489空闲和本树PG所有权。新数据库 `tileset_r8_development_qj40_krq` 使用template0创建，最终七迁移、Project1、LogicalTask/AssetRevision/FinalExport0、其他客户端0。旧13个输出根及两receipt先移到本轮preserved-preexisting-outputs完整保存，逐文件SHA未变；新冷准备后ci receipt及生产Web dist仍不存在，证明未依赖core产物。最终自有browser/API/Vite/PG全部关闭，三个端口空闲；新旧DB、资产、输出、缓存、截图、外部temp和证据保留，没有reset/drop旧库。4398/55529及其他会话未探测/操作。

预算/H02/T01/R01/Manifest/全局MZ未读写，新增AI调用0。所有原tracked路径除workflow逐字节未变，最终再增加本报告；Main文档及历史保留。新完整LinuxCI/跨runner实际调度与总耗时 **NOT_EXECUTED**，由Main在限定R8后安排新SHA候选；旧整体cancelled不清除。原启动全部原因仍UNVERIFIED，质量数字待用户，10 NOT_STARTED。

Reviewer入口：本source diff、coverage-map/workflow-probe-result、empty-output-binding、database-initial、migration-browser-binding、development-preparation-receipt、browser-result、final-audit、cleanup；新 `main-request.json` / `summary.json` 绑定source/最终HEAD及所有实际命令。**READY_FOR_LIMITED_R8后停止，不自行安排Review或CI。**
