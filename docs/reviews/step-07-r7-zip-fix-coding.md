# 步骤07：R7 ZIP验证缺口整改 Coding交接

状态：**SELF_TESTED_READY_FOR_REVIEW_ROUND8 / READY_FOR_REVIEW**。这是作者自测；STEP07-R7-001是否关闭由Main安排的独立R8判断。正式已用7轮，下一轮8。2026-10-14继续授权取消机械五轮上限，历史编号和质量门禁保留；08–10 NOT_STARTED。

## 精确候选与工程产物

- Source：`c8d41a680df42fe565882d93d3f85a04f7a10b22`。
- 父R7 Source：`f5740c1fd0e9e22a4f4676de51b7fd2555bc05a5`；父资料HEAD：`2eb75dd4b91f8212a572ef92c7930ff4d17336b5`。
- BuildID：`step07-c8d41a680df4-773d3198403cc2e3`，206项payload。
- 不可变Manifest SHA-256：`3a1933af2b34dacb939f83d1b74dd18a992fa13d61691341301016ccdf4a6feb`。
- 工程目录：`/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker/artifacts/.step07-r7-zip-final-d39c2d212efe4ff0bd55e15735806ac0/artifacts/step07-c8d41a680df4-773d3198403cc2e3`。全部206项在不可变目录和隔离检出live dist真实重读、SHA一致。相对原运行594的205项逐字节相同；唯一不同的`apps/api/dist/resources/studio.json`也仅`context.commit`改为本Source。
- 本报告及[evidence ledger](../evidence/step-07/r7-zip-fix/ledger.json)属于Source冻结后的纯资料提交。精确最终docsHEAD在最终交接回复和私有coding-progress记录，不在其自身commit中制造自引用SHA。ledger列出每项最终入库字节、SHA、原件路径/字节/SHA及用途，排除ledger自身；报告SHA单独绑定。

## 原独立发现与保留

Main只读R7原报告：`/Users/dingshinn/Desktop/rpg-maker-maker/docs/evidence/step-07/independent-round7/report.md`，18243 bytes，SHA `ae1e528e69a4552a4c39e580bf4f6e45ea7e5ee786d8c387ffea41751c456443`。原ledger SHA `e96e5bb9327f00ab76278134864a2686e7e69c0bc46f652c3ba8b72688d738aa`，216项原件本次逐项重核一致，未改写。结论仍REQUIRES_REVISION，P0/P1=0，唯一当前阻断P2 STEP07-R7-001。R4三项的独立CLOSED记录保持；R5/R6旧Source wholePASS及R7性能合法延迟证据仅作为历史引用。

原helper仅读local headers，完整单180秒六阶段用例可能接受central CRC/name/EOCD count违规，即使outer HTTP body SHA正确。生产原ZIP的CRC、八成员、payload SHA、Profile/PNG正常；本次不宣称生产zipFiles有缺陷。

已审计复用的prefreeze控制（来源标签不改成新Source全套PASS）：真实f574完整六阶段只改4个actual download的central CRC、重算outer SHA，退出0、139.821秒，属于**旧断言假PASS反例**；新helper同故障首次实际下载在21.332秒退出1，属于**预期拒绝负控制**；prefreeze正常六阶段136.062秒退出0。这些原log、trace、DB、资产、坏ZIP均保留。四份R7真实正常包旧/新helper均接受，四份central CRC坏包旧接受/新拒绝；另四个真实包变体涵盖central name/count/local CRC/payload损坏。12项对照与独立双目录Python oracle一致。stdlib zipfile单独未检查local CRC或EOCD计数的局限明确保留，不能用它单独替代完整容器校验。

## 最小修改与格式范围

唯一Source差异为三个test路径：

1. `apps/api/tests/studio/integration.test.ts`将旧helper替换为严格消费者。
2. `apps/api/tests/studio/stored-zip.ts`解析现有stored标准八文件。
3. `apps/api/tests/studio/stored-zip.test.ts`增加47项有意义的容器回归，已由既有CI check自动消费。

读取器同时校验EOCD/central/local：磁盘0、成员8、目录及record精确范围、安全唯一白名单名称、local offset、连续无gap/overlap的data范围、名称/CRC/length一致性和实际payload CRC。现有生产格式version20、flags/method0、time/date0、无extra/comment/descriptor/非零attributes；截断、越界、重复/不同名称、错误offset/count、前缀及尾随异物均拒绝。不引入ZIP64、压缩、多磁盘或未知扩展支持，也不改生产导出器/依赖。

整个原六阶段case文本与f574逐字比较，除读取函数名外完全一致。单case180000ms、15s/5s/60s预算、完整PNG decoded像素及身份、七payload SHA、Manifest/Profile/Build/detailDB、current/history/late/retired断言保留。没有拆case、去掉断言、增大预算、重新引入重复处理/readExport或捕错伪PASS。unit用真实zipFiles编码固定容器fixture，fixture不是PNG/艺术交付；实际包另由独立R7双目录oracle及Python zipfile验真。

3873个父tracked文件中3872项未变，唯一既有修改为上述integration；另新增helper和test。生产实现、CI fetch-depth0/Chromium顺序、schema/lock、Compiler/Profile/槽位/动画/通行、HTTP/native资源和路径规则不变。原运行dist206项全部保持594原字节；未重建/重新部署4376的服务。

## 最新Source绑定执行

| 实际命令/控制                  | 本轮结果                                                                                                    | 命令耗时 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- | -------- |
| `pnpm check`                   | 27 test files / 313 tests PASS；含47新容器回归、类型/边界/lint/format/build、11生产exports                  | 75.921s  |
| `pnpm test:step07`             | 原16项全PASS，包括真HTTP/PG/旧c227writer、恢复、发布故障、跨COMMIT和prod/dev全部六阶段                      | 538.505s |
| `pnpm test:integration`        | API3 PASS                                                                                                   | 10.346s  |
| `pnpm test:dev-privacy`        | privacy5 PASS；未扩大Vite allow根                                                                           | 10.839s  |
| `pnpm build:step07`            | clean c8d工程Build，206项hash真实重读                                                                       | 21.171s  |
| latest合法1500ms processed延迟 | 单180s case全部6阶段PASS，1 PASS/15按`-t`未执行；保留全部原断言，4 actual wire ZIP已捕获                    | 151.069s |
| latest actual central CRC故障  | outer body SHA自洽；原case退出1，命中`Standard ZIP: local/central CRC`；预期负控制正确拒绝，非artifact PASS | 21.107s  |

普通六阶段内计时133.044s；合法延迟内计时147.871s。诊断补丁仅在私有隔离检出临时生效：合法对照给实际processed入口每次增加1500ms并旁路捕获Response.clone，不修改返回响应；负对照复用原R7实际fetch-level故障，原PNG/数据库/业务响应不伪造。每次使用新空自有DB/root，finally恢复精确Source文件，最终隔离检出clean。两个诊断source和raw log的原SHA/bytes入证据，`-t`的15 skipped不宣称全套再次执行。

四份最新actual wire正常包由原R7独立双目录oracle与Python zipfile完整解码，八成员/CRC/七payload SHA/Profile hash `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`及Source c8d一致；latest坏包两oracle拒绝。相同六阶段断言核对actual browser PNG RGBA/natural96×144/recipe frame/Build详情和selected Export/ZIP身份，current/history/retired状态保持。普通prod/dev替换后的两张关键截图已用view_image实际查看；证据保留四张截图。此为CPU/browser技术核对，不标用户美术通过或本artifact MZ实测。

## 原失败、恢复与资源

正常客户端中断原件保留在Main私有orchestration目录；公开收据SHA `e585dbbdab03cfb60cd9382d0819f77bd0530f96eecf0a4d72f4252ec0596a2a`。Main正常owned SIGINT，wrapper exit1，不是PASS；active validation commands=0，原因`UNVERIFIED_NO_FINAL_SERVER_ERROR_EXPOSED`。同CID恢复不重置Review轮次，不修全局Codex state。本次辅助只读汇总错误（未匹配shell glob、不同JSON行的scope字段）保留并修正查询；另保留Python证据helper误读testzip返回约定及其导致后续collector缺文件的错误，修正为返回坏成员名并实际read触发BadZipFile后通过。未发生Source/产品/测试断言修改，未重复已通过套件。

固定客户端step_coder/gpt-6.1-sol/xhigh/default(Standard)，无Fast/Priority/Ultrafast/collaboration/global配置变更；server最终隐藏字段`UNVERIFIED_NOT_EXPOSED`。Node22.21.1 PATH仅设于本进程，pnpm10.20.0/PG14。

隔离检出：`/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker/artifacts/.step07-r7-zip-final-d39c2d212efe4ff0bd55e15735806ac0`，物理位置在自有ignored artifacts，未放宽.local deny；测试API4398/Web5298由本轮创建并正常close。PG55476继续原PID51121，原API4376继续PID22456；原.env600/data/assets/dist/所有价值DB和历史失败保持，不copy .env/reset/drop。新测试DB和files root均本cluster、本隔离检出生成并保留；完整DB名称/DSN/ownership和backup/trace私有字节不发布，仅hash inventory及脱敏owner摘要。Main/Reviewer PG55493/API4393/Web5293、其他tree/canonical不写。实际端口分别lsof探测，exit1只表示相应被探测端口未见listener，不推断其他服务变化。

## 未执行与后续门禁

本Source独立R8、新wholecandidate CI、Main批准/合并/push/发布均 **NOT_EXECUTED_BY_CODER**。未重跑无生产影响的整套E2E18+18、PG06独立23、旧Pack/native/MZ全量；其父候选历史证据保持，当前check/16真HTTP包含相关恢复/历史/标准交付和真实两模式六阶段。新的MZ GUI/Host/Map003/用户艺术确认仍NOT_EXECUTED/原延期，不自动继承Profile既有基线。未调用视觉模型/SDK/key/Provider AI、PromptRegistry/Composer/router，也未开始08–10。

停止状态：**STOP_WAIT_MAIN_INDEPENDENT_ROUND8**。作者不批准、不自行关闭Independent finding、不merge/push或改canonical。
