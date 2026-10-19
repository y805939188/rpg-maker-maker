# 步骤09 CI整理 Coding 交付

2026-10-19，Asia/Shanghai。**READY_FOR_R7 / SELF_TESTED**。仅本地Coding/自测/提交，未Review、批准、Merge、Push或触发/请求CI，无子Agent。用户追加授权的下一轮由Main安排R7；必要集中整改/限定R8仍由Main管理，旧R4/R5/R6历史不重置。

基线 `b0c48abc5096a19aeea3c632a410968095d0c339`，分支 `codex/step-09-startup-chain`；执行source **`b00e4b709d5103c44a86b2111f53edcc7f82983e`**。本报告另行提交，最终HEAD只写ignored summary/main-request，避免自身SHA循环。实际CLI为gpt-6.1-sol / xhigh / 显式default(Standard)及本树cwd；隐藏服务端字段UNVERIFIED。Node22.21.1/pnpm10.20.0使用显式PATH，没有改全局配置。

## 原流程与新位置

在实现前已保存 `.local/step09-ci-consolidation-coding/evidence/coverage-map.md` / `baseline-stats.json`。只读最新job118046625160原日志，没有为基线重跑旧CI。**日志实证**：失败前10个依赖包各build7次，API/Web各build2次；check起点至下一step约176691ms，重复privacy21517ms，API集成20944ms，06阶段318001ms，07起点至失败退出756752ms（Vitest713.01s，15/16通过）。相邻step差包含包装/切换开销，不是纯命令计时。旧R4开发历史terminal结束已接近整体180秒，随后timeout；精确最后页面等待原因仍UNVERIFIED。

| 原检查                                              | 新执行位置/保留方式                                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| check的方向/types/lint/format/unit450/build/exports | directions→显式ci:prepare→prepared types→lint→format→prepared unit→prepared exports，各项保留                           |
| check内privacy5和独立privacy5                       | default Vitest中只执行一次；原配置、默认环境/用例与独立test:dev-privacy命令不变，移除workflow第二次                     |
| API3、06、07、08各自前置build                       | prepared integration/step06/07/08直接执行原Vitest config，前后校验同一候选产物；原公共命令字符串全部保留                |
| Studio R4两模式一个用例                             | 两个独立mode用例，每项新DB/资产/API/浏览器/输出；其余15项setup及正文不变（仅末尾多余空行格式化）                        |
| 生产18、startup26、dev prepare→开发18               | prepared production仍走正式Playwright及生产JS入口；原startup26和最后dev:prepare/同一dev:start保持                       |
| 本地check/test:integration/test:step06/07/08/09等   | 不改造成依赖prepared开关的裸命令；原工程安装/build/DB前置与独立使用能力保留，另增内部ci:prepare/ci:run/test:ci-prepared |

**代码推断而非完整CI实测**：CI常规依赖构建收敛到一次显式prepare，最后开发冷准备仍一遍，计划共2组；旧完整流程若无失败继续至dev则为9组，旧日志只实证失败前7组。没有承诺总耗时下降、解决全部旧原因或永久稳定。默认unit预计为原450+新增清理3=453，Studio为原16拆分后17；未本地全跑这两套。

## 实现范围与门禁

source只9文件：workflow/package脚本、`scripts/ci-prepared.mjs`、step07测试配置、Studio原集成/新独立R4文件、测试清理helper及其3项用例、prepared合成测试。第10文件为本报告。没有产品功能、DB schema/迁移、Compiler/Profile/Pixel Contract/素材/动画、模型/Prompt或依赖版本变化；锁不变。

ci:prepare无条件调用原完整clean build，先使旧receipt失效，成功后绑定当前源码/配置/锁/commit、Node/pnpm可执行文件及安装元数据、全部257份输出逐文件SHA与成员完整性，并核对Studio资源context的commit/node/锁。ci:run每项执行前后重新校验；缺失/改变/错误资源绑定、失败/取消准备均拒绝，不以dist存在/同commit/曾build或环境开关放行。它只维护本树一个receipt/执行锁，没有跨Worktree/SHA缓存或服务发现平台。生产仍使用构建JS与声明导出；运行环境按允许列表固定Mock并排除真实Provider配置/NODE_OPTIONS注入。

原120秒准备、30秒服务门禁及监听归属实现均未改。测试config的per-test/hook timeout不增加、无retry或源级skip；新增whole-phase执行期限和workflow45分钟上限是对原无显式whole上限的约束。R4局部等待≤60秒、整体每用例仍180秒；注册超时/结束清理，释放本用例持有的读/COMMIT gate，逐项尝试自有browser/context/process/API/DB清理，前一项清理出错不会阻止其余项。无额外测试并行。

每模式原52处matcher表达式顺序一致，见 `r4-assertion-inventory.json`。真实COMMIT前后读交错/页面最终current、迟到旧快照仅HISTORICAL、Job/FinalExport、不可变文件与下载身份、浏览器实收PNG/Manifest/preview所选Build一致等断言保留。上传边界、失败保护、退休/备份与任务恢复的原15项/06/08覆盖未删除；完整普通用户流程仍由现有E2E承担，未以Mock/仅200或canvas存在替代。

## 本轮实际验证

全部构建、测试服务启动串行，没有测服运行时clean。外部TMPDIR `/private/tmp/tileset-ci-consolidation-jowmsodw/tmp`，父根Git探测exit128，不借主仓HEAD；R6的26项及独立Git helper逐字节未改，按已PASS范围复用，未机械重跑26。

| 验证                                   | 结果/外层耗时                                                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| prepared最终合成套件                   | **7/7 PASS，23230ms**；复用、缺失/改变/额外输出、源/配置/安装元数据、错误context、失败/取消失效、执行前拒绝/执行后变更拒绝及环境允许列表        |
| test-lifecycle测试                     | **3/3 PASS，4237ms**；阶段期限/取消、清理失败后仍执行余项、leader退出后清理后代                                                                 |
| 冷ci:prepare                           | PASS，24502ms（prepare字段23244ms），一次完整build、257输出                                                                                     |
| prepared exports/types                 | PASS，11包导出3032ms；完整types15469ms，无再次package build                                                                                     |
| prepared default-config privacy        | **5/5 PASS，4061ms**，仅执行一次，实际Vite与私有合成哨兵；独立命令保留                                                                          |
| prepared API集成                       | **3/3 PASS，3810ms**；本树迁移7项无待执行，无reset                                                                                              |
| Studio事务首次定向选择                 | **2/3 PASS、1 FAIL，40979ms**：snapshot交错与duplicate db-rollback通过；deferred项因遗漏原共享配方前置，在build前缺current recipe，不能写成全绿 |
| 补齐原前置的备份/恢复+deferred事务     | **2/2 PASS，121703ms**；原backup/retirement/failure保护95793ms、真实PG deferred COMMIT rollback/recovery20289ms；只改选择，未改断言/产品        |
| prepared06真实maintenance/Mock CLI恢复 | **1项PASS，26623ms**；含真实备份/恢复/重建及拒绝已有目标；其余22项为定向过滤未执行，不冒称全23                                                  |
| 独立R4真实production/development       | **2/2 PASS，127743ms**；用例分别61731/62268ms，各独立DB/输出；真实PG、锁定Chromium、PNG/ZIP/Manifest/preview/历史断言通过                       |
| 类型/Lint/方向/格式                    | 相关测试tsc、prepared完整types、定向ESLint、13成员方向、全仓Prettier、直接新测试格式、git diff --check均PASS，含本报告                          |

Studio定向事务命令的其余用例仅被CLI选择过滤；CI不带过滤完整执行17项，源码未skip/delete。15项正文与原R4 matcher清单的静态核对是覆盖证据，不冒充未执行用例通过。当前本地所有prepared常规阶段**package build增量0**；仅冷准备中10包各1、API/Web各1，完整原始日志统计在 `candidate-build-binding.json`。Studio业务Build/Export照常执行，不与工程package build混称。

## 失败、更正与保护数据

失败均保留：首次Lint为移走浏览器case后6个unused import，移除后PASS；首次格式/diff为原文件移除末尾case后的多余空行，修正后PASS。上述事务过滤遗漏前置导致1 FAIL，补选原前置后通过，未重做其余已通过两项。两次证据脚本产物JSON与外层元数据同名导致FileExistsError，实际断言清单/只读SQL审计JSON与stdout均已保存；外层元数据另记，丢失的命令耗时写null，没有重跑产品来补数。

Chromium首次下载在50%时由作者取消（exit-15，569870ms），只终止可核对父子归属的自有下载进程。随后从本机已安装缓存只读复制revision1248/ffmpeg1013到本轮私有browser目录；23个可执行文件SHA前后相同，实际 `--version` 为156.0.8078.4，匹配Playwright1.64.0注册表。复用的是锁定工具缓存，未复用其他Worktree/旧SHA的产品产物，未写全局浏览器配置；原下载日志和私有partial数据保留。

本树独立PG55609/API49309/Vite4489先核对归属/空闲；仅重启本树原PG，未reset/drop。两个R4数据库各3个COMPLETED Job、4份FinalExport，结束后客户端0；本树基库Project/LogicalTask/AssetRevision仍0、迁移7。所有新DB/资产/截图/trace/cache保留。最终本轮browser/API/Vite/PG均关闭，三个自有端口空闲、ci/dev锁不存在；4398/55529未探测/操作，旧DB/预算/H02/T/R/Manifest/MZ未访问或修改，真实Provider/.env.local未读，新增素材AI调用0。

新证据仅 `.local/step09-ci-consolidation-coding/`，launcher及全部历史报告/失败不覆盖。原R2完整450/09=4、T01接受A/R01功能确认、R5/R6按未变范围复用；本轮没有完整450/full09/双18/MZ或Linux候选CI，原启动完整原因与旧R4最后页面延迟仍UNVERIFIED，正式质量数字待用户、10 NOT_STARTED。

交接入口 `main-request.json` / `summary.json` 绑定source/最终HEAD、scope、实际命令/结果、输出SHA及未测项。**READY_FOR_R7后立即停止；R7及完整候选CI仅由Main安排，本作者不请求或执行发布。**
