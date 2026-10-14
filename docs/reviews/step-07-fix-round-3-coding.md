# 步骤07 R3整改 Coding 交付

2026-10-13，Asia/Shanghai。**SELF_TESTED_READY_FOR_ROUND4**。正式已用3/5，R3为REQUIRES_REVISION；下一次4/5，不因恢复重置。STEP07-R3-001/002已实施与作者自测，仍待Main独立复审关闭。未IndependentPASS、Approve、Merge、Push、写Main canonical或开始08–10。

| 绑定                        | 精确值                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 完整功能source              | `ef30dc2ab011d204d1d0a4d099a335b68458cdca`                                                                  |
| 前source / docs             | `5d926ad7ad6a68bfaff7ea2a51d4d3859c95d7c0` / `36dc5cca1a7da77314e6889648d464d32ba0751f`                     |
| docsHEAD                    | 后续纯文档提交，精确SHA在最终回复/私有coding-progress；不伪造自引用SHA                                      |
| Worktree / 分支             | `/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker` / `codex/step-07-studio`                 |
| 工程Build                   | `step07-ef30dc2ab011-56e8dbed6eb81a20`，206 payload                                                         |
| 工程Manifest SHA256         | `b1d36d66ea54b8f0f65ab6a705c0c4f8d19613dddecd45f426514940afb200e9`                                          |
| TargetProfile内容hash       | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`，完整内容封装在选定Export Manifest，未改 |
| 正式生产browser首个DB Build | `f3b63f782f447ce4f55c5af4496ab0109e54b000f60563863d55637459766eb1`                                          |
| 正式生产browser最终current  | `55560699bbf2677cbf1de745c94fb4b1d4290f1f2da2e778ed5203b592a12d8e`                                          |
| 同一首个标准Export          | `step05-pack-ef30dc2ab011-d9339d41fce5e861`                                                                 |
| 同一Export Manifest SHA256  | `0743202308f99b8703f0eb1c5220c02a59a3d0876e1d5bfecc93192561f48570`                                          |
| 同一标准ZIP SHA256          | `88fd515b5ae3e291e0fe02d8bc35178b9226b9af3fb5f1448d2db4fa5b1d2fe3`；生产/开发一致                           |

原R3报告SHA `c18e713ac7e3ee14b9b342234af5d6d4fe9225a67a547ceb93b003ccbf4c6fdf`，ledger SHA `104eb01097323fcccb7f2f6f92efccbabe561f47505eafc014f9782833d67d9c`，437 payload只读逐项验真。Main原件与完整私有副本保留，原结论/初次探针失误不改。[原报告及逐SHA审计](../evidence/step-07/fix-round3/original-round3.json)。R1/R2问题由正式R3在原范围保持/新增CLOSED，本次保持回归；作者不替代正式R4结论。原探针exit0表示捕获缺陷，不能记作候选PASS。

## STEP07-R3-001：P2 BLOCKING，已实施自测，待R4

poll继续单inflight、本次settle后800ms再排。仅连续错误共有5次失败/60秒预算：首个失败尝试开始计时，使用monotonic performance.now；失败间不重置，截止时取消正在读取的请求并停止调度。成功读重置该错误episode，合法成功poll可持续超过5次；没有以5次截断长构建。project AbortController/generation/revision及取消保护保持。

状态读取错误显示“项目状态读取失败／未知”，缓存的非终态Job显示“状态未知”；不假称后台失败或新成功。自动终止后提供“只读重读项目状态”，只GET一次，不重提Job，保留last-success/历史。成功手动读重新取得真终态；若仍运行则恢复正常串行poll，若仍失败则维持停止，不开启新自动错误风暴。切项目清旧状态并取消旧读。

在未改5d production上先用本实例实际复现：81秒窗口118次自动读取继续，后台真实COMPLETED；原日志/trace保留。[旧反例](../evidence/step-07/fix-round3/old-5d-reproduction/evidence/poll-errors/evidence.json)。最新两模式各三个真实浏览器控制：契约503、429与网络失败分别精确5次后停止；可见停止入口后再覆盖81秒及20秒静默窗口，无额外请求。后台Job真实COMPLETED，UI仍明确未知/旧成功；显式只读后真实完成，POST总1，不重提任务。最终新Build Canvas及actual processed PNG decode96×144、SHA/RGBA/recipe身份有效。[生产503](../evidence/step-07/fix-round3/browser-production/r3-state-ownership/poll-503.json)、[开发网络](../evidence/step-07/fix-round3/browser-dev/r3-state-ownership/poll-network.json)、[停止截图](../evidence/step-07/fix-round3/browser-production/r3-state-ownership/poll-503-stopped.png)。注入响应不伪称真实DB故障；预期console/network错误逐项记录并与声明故障匹配，非pageerror隐藏。

原两模式1300ms合法慢成功/慢失败、快控制、旧请求/切项目继续通过。新增单元真实控制共享60s截止取消活动重试、成功重置错误episode与20次成功poll继续，原测试保留；单元不替代browser/HTTP。[实际命令与日志](../evidence/step-07/fix-round3/results/commands.json)。

## STEP07-R3-002：P2 BLOCKING，已实施自测，待R4

所有用户项目切换/选择变化同步推进对应generation。act捕获project、project generation、selection generation及action id；fn内部setSelected/setRecipe/创建后选择/验收preview与notice/error只在当前scope写入，busy释放仅属于当前project/action，选择变化不让busy永久锁住，也不让旧动作解锁新动作。refresh更新当前项目真实数据，但不会覆盖请求期间变化的用户选择；初始项目列表过期读也隔离。转换/descriptor沿原project/Build/preview generation和取消，诊断提示另有选择世代守卫。

HTTP写请求不因切换伪装成撤销：已服务端提交的旧source、recipe、Job、visual-false记录或项目继续保留，只丢弃过期UI回调。同项目选择变化也保留明确选定source/历史recipe，读取最新数据不将其清空。未引入新交互架构或改变领域revision/Slot/CAS语义。

旧5d本实例合法上传201延迟1300ms后实际清空目标草地，原反例和截图保留。[旧复现](../evidence/step-07/fix-round3/old-5d-reproduction/evidence/late-mutation-v2/evidence.json)。新候选两模式实际入口控制均通过：合法上传/采用1300ms迟到并切项目；同项目主动选旧source/历史recipe；普通上传成功仍采用新revision；真实非法PNG422迟到、已接受Build202迟到、visual需修复200及创建201迟到。目标DB完整快照不变，source/recipe选择及PNG保留，无旧成功/error/busy污染；旧实际提交通过API读回。[上传](../evidence/step-07/fix-round3/browser-production/r3-state-ownership/late-upload.json)、[采用](../evidence/step-07/fix-round3/browser-production/r3-state-ownership/late-adoption.json)、[其余动作](../evidence/step-07/fix-round3/browser-production/r3-state-ownership/late-actions.json)、[目标截图](../evidence/step-07/fix-round3/browser-production/r3-state-ownership/late-upload-target-intact.png)。每个恢复图都实际decode96×144，项目/recipe/sourceFrame、PNG SHA及DOM RGBA与真实API一致；visual仅测试false操作，不写作者/用户艺术PASS。

## 冻结候选验证与范围

source先本地冻结，所有下表结果随后绑定精确ef30；之后只README/docs。实质差异仅4路径：App、poll、原读取tests及新e2e文件。2,525历史受保护文件未变；195非文档源逐SHA核对。未改API生产/HTTP/native预算、Persistence/domain/Compiler/Profile/布局/槽位/动画/通行、contracts/schema/migrations/锁、plans/母版/原型或全局环境；Web仍contracts-only，生产Node为dist/包exports。[范围](../evidence/step-07/fix-round3/results/preservation.json)、[source ledger](../evidence/step-07/fix-round3/results/source-files.json)。新增case进入原check/test:e2e明确CI命令，远端CI未由作者执行。

| 实际命令/动作                                      | 最新冻结source结果                                                                                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                       | 26文件266/266；13读取/预算/clock单元、方向/type/lint/format/clean build/11生产exports；65.32s                                                |
| `pnpm db:migrate`                                  | 既有五项迁移无pending，无reset；1.21s                                                                                                        |
| `STEP07_TEST_API_PORT=4376 pnpm test:step07`       | 原9/9，221.21s；真实PNG/HTTP预算、Root/source/A1/JSON/ZIP/restore路径、deadline/cancel/close/cleanup、TX/CAS/late/retired/旧06/backuprestore |
| 自有新空DB/root `pnpm test:step06`                 | 四文件23/23，196.80s含build，原60000ms单项预算；故障、父lease/事务fence/Mock重启/失锁/备份恢复                                               |
| API integration / Vite privacy                     | 3/3、5/5，9.78s/10.21s；没有扩大Vite公开根                                                                                                   |
| 生产 `API_PORT=4376 WEB_PORT=5276 pnpm test:e2e`   | 全13/13，408.93s；原7及新增6全部执行                                                                                                         |
| 同端口 `E2E_MODE=dev pnpm test:e2e`                | 全13/13，439.11s；StrictMode/真实完整开发API与Web                                                                                            |
| `pnpm build:step07` / 当前磁盘SHA重读              | 新不可变206 payload与固化Manifest全匹配，19.38s；旧Build/Manifest不覆盖                                                                      |
| `pnpm build:pack-sample` / 原批准hash比较          | 八包16PNG、56payload全字节一致；source/context包装身份单列，42.55s                                                                           |
| 原public JS probe / pinned-core `verify-step05` ×8 | 78/78、8/8，20.20s；core SHA4ad828ae…ff67f，纯CPU非GUI/game/Host/美术PASS                                                                    |
| 作者重跑原独立六源UI与Python参考                   | 96.34s+0.66s；24交付scene states、4创作states、2×nearest/透明、全图集、换Build实际像素与四真ZIP一致                                          |
| 稳定实际browser clock与独立参考                    | 7.26s+0.09s；29/30、59/60、89/90、119/120、239/240、359/360，共12+12 RGBA，跨三周期一致                                                      |
| 真干净恢复实例API/browser                          | 11.15s；15 source、2recipe、5Build读取；实际新建current、history旧ZIP及processed PNG/SHA/RGBA有效；辅助服务正常关闭                          |
| 自有production entry browser                       | current Canvas及真实processed PNG就绪，无console error/pageerror/400+，API保留                                                               |

[精确命令/退出码/耗时](../evidence/step-07/fix-round3/results/commands.json)、[工程206重读](../evidence/step-07/fix-round3/results/engineering-verification.json)、[全部ledger](../evidence/step-07/fix-round3/ledger.json)、[原件/脱敏copy SHA](../evidence/step-07/fix-round3/original-file-provenance.json)。计数不相加为覆盖率，所有普通/CI调用仅人工素材/Mock，无真实模型。

人工全链为创建/刷新、非法源诊断、六源真实上传、精确revision/风格/固定岸线配方、真实构建、组件替换配对更新、current/history/retired、容量失败保留成功、实际导出双预览与同一ZIP。通用domainBuilt仍IR，内部durable4file不冒称正式标准8file；真实八文件含完整Profile封装Manifest，source/Compiler/hash绑定及旧history保持。[完整流程](../evidence/step-07/fix-round3/browser-production/evidence.json)、[六份正式ZIP验真](../evidence/step-07/fix-round3/results/zip-verification.json)。

额外场景参考沿用正式R3原独立编写probe/Python，仅改本树/端口/source/作者归属，并将旧aggregate90s等待收紧为60s；不是新IndependentReview，也不调用生产renderer生成expected。原PNG、mask/overlay、手写邻接/quarter及未修改native-core对照：isolated、edges/角、holes、channel、pond、large共24实际Canvas状态一致，原始创作四状态、完整768×576两图集及2×nearest一致，换Build真实A1网络身份/像素变化，历史ZIP同字节。[参考与ZIP核验](../evidence/step-07/fix-round3/independent-reference/browser-pixel-zip-verification.json)、[三周期实际样本](../evidence/step-07/fix-round3/independent-reference/clock-canvas-verification.json)。固定60 logical updates/s、30/状态、0→1→2→1、pause/resume/step/hidden不追赶策略保持；hidden受控visibilitychange不冒充OS后台观察。

HTTP真backup→新空DB/不存在root→restore→Studio再建后current `87e96234fde38f33b4bab82cc0c03556df1e7440e0eef8eae921b89873f0ab10`，old history `804d3696449a5191f2bcc3730c727cc3d46e5ddb7a047b5f4a187ce47c74c47b` ZIP SHA `4c5a1fa4f9749fd99392e4d5e5f65279a94fa83d0b99ad836cafad0a627662b1`不变，实际processed PNG/SHA/RGBA正确。[恢复联通](../evidence/step-07/fix-round3/restored-browser-complete/evidence.json)。源bytes/pixels独立所有权、public restore合法性、历史/retired、旧任务不回退current与失败last-success均保持。

## 资源、失败保留与未执行

PNG/HTTP/native政策不放宽：singleRGBA8/sRGB、4MiB、≤768×576、Studio96×144、density/metadata/CRC/pixel、5s codec/读取/4096chunk、JSON8KiB、16请求/下载2/读取12、处理1+等待1、native1无队列/close后释放，Host/Origin/client/ID白名单/祖先路径边界保持。当前最大真HTTP平面1,770,381 encoded→1,769,472 RGBA，Studio尺寸拒绝，child RSS106,446,848 bytes/72.41175ms；**JS heap128MiB不是OS/native RSS硬上限**。[当前入口测量](../evidence/step-07/fix-round3/http-and-recovery/largest-http-decoded-plane.json)。

所有旧候选、批准/失败、Manifest、原235/1失败、b8 dev6/7/trace、R1/R2/R3原件及本次预冻结失败原位保留。自身执行差错：bare contracts测试导入缺根依赖、Buffer BodyInit typing与无用初始赋值、select exact-label错误导致超时/正常SIGINT exit130；只修自有测试，未降阈/删case。接受旧Build占槽时新helper15s图片断言先超时，现先即时核对选择/notice，再按原30s等真实terminal后以原15s校验PNG；产品预算未改。首次collector引用上一轮专用helper失败，部分output/原脚本保留，清单修正后再收集；source未变。[执行说明](../evidence/step-07/fix-round3/execution-notes.json)、[私有快照索引](../evidence/step-07/fix-round3/retained-private-inventory.json)。R2私有collector在旧index后变更的627/628事实保留在R3原报告；本次收集脚本在最终index前固定，不把动态快照声称成未来永不变化。

已view_image查看新候选停止/迟到动作、恢复、actual/reference holes及第360更新等关键图，逐图SHA见[查看收据](../evidence/step-07/fix-round3/results/screenshots-viewed.json)。QA结构、视觉risk/局限、人工确认、Profile已有基线与这份artifact MZ分别存/呈现；技术截图/CPU对照不写USER_CONFIRMED或ARTIFACT_MZ_TESTED。

独占PG55476 PID51121、自己的.env600、`.local/postgres/data`/`.local/assets`/`.local/step07`；新regression DB `tileset_step07_r3_regression06_53fd20ade0ea4b6f96d01806710a8122`与原不存在root；restore DB `tileset_step07_53384a18ccca473ebf04a4906db6c3be`/`.local/step07/tests/8e058224-8cc0-41f6-8f8e-88f0be309aaa/restore-assets`。所有DB/源/历史/backup/dump/失败保留，无reset/他人.env复制或Reviewer/Main DB/root使用。旧自有API51670正常停止；新restore辅助API1997/reference辅助已正常关闭。当前production API **PID7819**、入口 `http://127.0.0.1:4376` 保留，Web5276无listener；Node22.21.1 PATH仅child进程，pnpm10.20.0/PG14。[服务归属](../evidence/step-07/fix-round3/results/retained-runtime.json)、[真实入口](../evidence/step-07/fix-round3/results/retained-entry-browser.json)、[启动说明](../engineering/STEP_07_BASELINE.md)。只操作确认自有服务，无自动Desktop关闭后继续开发承诺。

同一CID `01a132c0-f44b-75f0-bea5-7f4e5e77a6ea`；客户端step_coder/gpt-6.1-sol/xhigh/default(Standard)固定，服务端最终model/effort/tier **UNVERIFIED_NOT_EXPOSED**。本轮非新恢复次数，已保留两次原正常SIGINT/exit1记录及原因UNVERIFIED；无全局stateDB/role/config修复、collaboration或加速调用。[配置与未执行](../evidence/step-07/fix-round3/configuration.json)。

作者未识别额外未处理实现问题，两个P2仍 **PENDING_INDEPENDENT_ROUND4**，不自行关闭。IndependentReview/远端CI/Release为 **NOT_EXECUTED_BY_CODER**；新artifact MZ GUI/手绘/游戏、用户亲自逐图美术、Original Native Host/Map003延期、OS后台实察、RPGReactor **NOT_EXECUTED**；8CPU仅技术参考。真实Provider/SDK/视觉模型/Key/正式PromptRegistry/Composer/router/AI流程/收费/Redis/SaaS及08–10未执行。停止等待Main正式4/5轮。
