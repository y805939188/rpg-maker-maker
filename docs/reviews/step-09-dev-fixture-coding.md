# Step09 development fixture Coding 交付

2026-10-20，Asia/Shanghai。**READY_FOR_REVIEW（限定R11）/ SELF_TESTED**。新树 `codex/step-09-dev-fixture` 从干净main `802ac69d6219d849d23b67fda7e422595e497952` 继续；执行source **`88a7a067e82aaecd93ce323e04d91fbc8cfcca86`**，本报告另提交，docs HEAD只写ignored summary/main-request。实际CLI核对本树cwd、gpt-6.1-sol / xhigh / 显式default(Standard)，隐藏服务端字段UNVERIFIED。没有派生Agent、Review、批准、Merge、Push或触发CI，Main负责后续。

## 问题与证明

已读AGENTS、Main production-wrapper-final/completion及完整main development日志/失败节选。CI39301826626的core已成功，production18/prepared10/startup26通过，production timeout:null保持有效；development为12pass/1fail/5notrun，baseline拒绝，旧失败不改写。报告标签503case实际正文0ms，栈在terminal→第二个fixture→beforeAll，先调查公共准备链，503正文未修改。旧CI trace只留下文件名，**NOT_RETRIEVED**；没有声称取得其字节。

| 诊断问题                    | 证据与结论                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 哪个30秒到期？              | 原单个beforeAll串行准备两个完整项目，默认test-slot30秒；terminal另有poll30秒。固定Playwright1.64.0实际源码为每hook新建project.timeout slot，matcher取min(slot deadline−250ms, poll deadline)。旧错误明确为Test timeout，120秒case预算在正文才设置，尚未生效。API/Vite当时早已就绪，服务30秒门禁没有触发。                                                           |
| 原第二job到底多老、卡在哪？ | 旧日志没有提交/阶段时刻，旧trace未取回，**精确年龄与阶段UNKNOWN**。上一case完成至失败29.776秒只属相邻日志间隔，不能冒称完整hook计时。旧API退出记录在全部测试结束时，未在该hook失败前退出。                                                                                                                                                                          |
| 真实本地链是否正常？        | 新DB、原30秒设置、私有注入式观察复用原bootstrap/serve/FaultHook；正常原准备一次，两个项目7474/7237ms，job从提交响应至终态观察5024/4908ms。队列gate等待各5ms；loadArchives541–559ms、prepareBuild276–296ms，随后导出组装间隔933–959ms（含checkpoint），publish3061–3101ms；两次文件durable及after-db-commit均实际到达。无本地死锁/先前残留证据，不据此推断旧CI负载。 |
| 能否截断仍年轻的真实job？   | 一次**明确控制的负控**：两项30秒均不变，仅在测试侧把第二项目开始排到hook年龄24秒。父hook29702ms截止，第二job提交响应后仅观察3452ms，首次观察RUNNING至截止3315ms，正文0ms，出现相同Test timeout/RUNNING错误。该job已进入publish，第一组文件durable，尚未到最终DB发布。此年龄是单调时钟从提交响应计时，非DB创建精确年龄。                                             |
| 取消后的错误？              | 单case负控失败后服务立即teardown，之后才观察到publish/BUILD_FAILED；确切嵌套原因UNVERIFIED，不将它当作取消前业务故障。旧完整CI还有后续文件，不能把本地单case teardown后果套用到旧CI。失败DB/文件/trace原样保留。                                                                                                                                                    |

因此已证实的缺陷是**两个独立项目准备错误共用一个父hook期限，第二个poll被父期限截短**。旧CI各步骤为何耗去那些时间仍未测得；本轮没有全面性能研究或永久稳定/提速结论。原始问题→证据、阶段ID/时序与框架源码哈希见 `questions.md`、`diagnosis-proof.json`、`playwright-deadline-source.json`。

## 最小整改与预算语义

source只改 `e2e/studio-state-ownership.test.ts` 和 `.github/workflows/ci.yml`。源PNG加载、来源项目、目标项目分别注册准备hook；**每项目独占原默认30秒slot**。这是准备预算归属重组，整体准备不再共用原来的单一30秒上限；没有把30替换成更大数字。terminal仍为30秒且仍受自己项目hook剩余预算裁剪，没有承诺每次poll都获完整30秒。每项case、API/Vite30秒、Build60秒、prepare120秒及core40/development20/baseline2分钟保持，production timeout:null未触碰。

项目创建→preset→recipe→真实Build终态→真实上传及状态断言保留。6项case正文逐字节相同（包括503/429/network、迟到操作、真实浏览器PNG像素比较）；完整dev列表仍18项，CI原命令无过滤、workers1/retries0不变。没有TS绕生产包、假成功/状态转换、重试或跳测试。产品/DB模型/Compiler/Profile/Pixel Contract/图片算法/素材/依赖和锁均未改。

新增诊断最多64条，仅角色/阶段、单调时间、合成project/job ID和实际state，状态变化才记录，不逐次poll刷屏。afterAll以独立原默认slot写一份 `.local/e2e/fixture-setup/dev-*.json`；不记录env/密钥/argv/HTTP body/DB URL/敏感路径。原断言失败照常抛出。

开发job失败后增加官方[upload-artifact v4.6.2](https://github.com/actions/upload-artifact/tree/ea165f8d65b6e75b540449e92b4886f43607fa02)，固定commit `ea165f8d65b6e75b540449e92b4886f43607fa02`，官方tag API已核对。仅上传 `.local/e2e/dev.json`、`.local/e2e/fixture-setup/dev-*.json`、`test-results/**/trace.zip`、`test-results/**/error-context.md`；hidden开启只服务上述明确JSON路径，没有whole.local/env/DB/assets。缺文件报错，保留7天，无continue-on-error；严格baseline与所有旧step/预算对象等价，只有这一新增上传step。上传本身尚未在新CI执行。

## 实际验证与所有失败

| 命令/验证                      | 实际结果                                                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 全新本树frozen install         | PASS，56223ms，独立store/node_modules；Node22.21.1/pnpm10.20.0；无升级                                                                                     |
| 原准备+503定向诊断             | 正常1项PASS，37492ms；诊断版真实链，原数值/断言不变；不是旧CI自然失败复现                                                                                  |
| 24秒调度负控                   | **预期1项FAIL**，34055ms，正文0ms，保留Playwright JSON及实际trace/error-context；不将负控写PASS                                                            |
| 修复后原始ownership文件全部6项 | **6/6 PASS**，外层184070ms、Playwright183329ms，flaky/skip/unexpected均0；全新独立DB/资产，原dev:start、opt-in observer、锁定Chromium；没有使用私有API注入 |
| 修复后两项目/Job               | 项目8777/8437ms，job提交响应至终态5800/5765ms，均真实COMPLETED；API/Vite就绪1667ms                                                                         |
| 构建/资源                      | 两次必要dev:prepare均PASS：基线23660ms（内部22340）、新source17810ms（内部16494），各244输出；每次10包/API各build1、Web生产build0；服务运行期间未clean     |
| 类型/Lint/格式/上下文          | 相关tsc最终PASS3528ms、ESLint PASS896ms；实际固定actionlint1.7.12完整workflow PASS3203ms；全仓Prettier/git diff --check含本报告PASS，最终命令日志记录耗时  |

作者准备错误也保留：第一次私有诊断beforeAll参数用了_args，Playwright要求对象解构，启动后收集失败（7371ms），尚未执行fixture；改为{}后上述正常诊断通过。首次类型检查两处exactOptionalPropertyTypes错误（3339ms），诊断state显式接受未观察值undefined后通过，没有改业务契约。无重复无证据失败尝试；未本地跑完整18、450/full09/双18/MZ，新CI/独立R11尚未执行。完整命令/环境键/exit/耗时在evidence/*.command.json和同名log。

## 隔离、数据与交接

先确认本轮55659/49359/4539空闲，再初始化本树独立PG14.20；4398/PG55529未探测/操作。三份新测试DB均七迁移，baseline为2项目/3Build/3Export，owner-probe为2项目/1Build/1Export及保留的失败job，fixed为3项目/6Build/6Export；结束客户端均0、LogicalTask/AiConversion均0。fixed的118份不可变文件逐文件SHA留证且无写权限。未reset/drop任何库，所有新旧DB/资产/历史/失败保留。

Chromium1248/156.0.8078.4从已有工具缓存只读复制三个明确目录到本树独立缓存，24个可执行文件SHA一致；复制前已设置PLAYWRIGHT_BROWSERS_PATH，不写共享.links/注册。外部TMPDIR `/private/tmp/step09-dev-fixture-cbra95un/tmp` 父根Git探测exit128。仅合成本树.env/允许列表Mock，未读取main/共享.env.local、Provider密钥或预算，不调用WaveSpeed、H02/accepted Manifest/MZ，AI调用0，STEP10 NOT_STARTED。

旧树及全部历史报告未改。基线输出/receipt先保存到本轮preserved-baseline-outputs，新source输出与源码/锁/工具链重新绑定验证；ignored数据不清空。自有API/Vite/浏览器已退出，仅关闭本轮PG，数据/cache/外部temp/全部证据保留；最终三个自有端口空闲、启动锁不存在。

新证据 `.local/step09-dev-fixture-coding/`，launcher文件保留；关键入口为diagnosis-proof、scope-and-coverage-proof、owner-probe JSON/trace、fixed-playwright、fixed-fixture-phases、final-data-audit及最终static日志。summary/main-request绑定source/docs HEAD、准确范围/命令/失败/未测/保护边界。**READY_FOR_REVIEW后停止，由Main安排限定R11、候选CI与条件发布；不声称完整18/新CI/发布已通过。**
