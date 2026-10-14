# 步骤07 CI六阶段超时 Coding 交接

**SELF_TESTED_READY_FOR_REVIEW_ROUND7**。本次只修改`apps/api/tests/studio/integration.test.ts`的同一个六阶段harness：验证浏览器实际收到的PNG和同次真实ZIP，消除重复处理/交付读取，增加独立ZIP绑定和阶段诊断，并及时关闭已完成模式context。生产实现、其他测试、CI前提、schema/lock/Profile/Compiler/槽位/时钟/资源政策未改；不拆case、不放宽180s/15s/5s/60s或任何阈值。

## 精确绑定

| 对象                | 绑定                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------- |
| 最新Source          | `f5740c1fd0e9e22a4f4676de51b7fd2555bc05a5`                                               |
| 父docs HEAD         | `1e83c986091739f76899d35eeeb5879e7bf0bf58`                                               |
| 原R6 Source         | `87e13a8a99db3058dce8680d3ae985969b8a9bac`                                               |
| 本轮docs HEAD       | 本报告/ledger所属后续纯资料提交；完整SHA见最终回复和私有coding-progress，无自引用虚构SHA |
| 新工程BuildIdentity | `step07-f5740c1fd0e9-4ddf87d606c1becc`                                                   |
| 工程Manifest SHA    | `71c1bc4dbc14b854eb45ff36c1c024ef4443162817989aed762c8187dbe266d7`                       |
| TargetProfile hash  | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                       |

正式已用6轮，下一轮7；2026-10-14用户取消机械五轮上限，历史不重置、质量不降低。原R5/R6 PASS仅归属原Source；不重标为本轮执行或最新IndependentPASS。[完整R6原报告/112payload验真](../evidence/step-07/ci-timeout/results/parent-r6.json)。R6 report `7f884b71d12e0159d21c9f0ec7b4e8b7b8bec6b859192d7ef6032f874f6d5e92`、ledger `ddc740ef0bef35375c2def2e43a882872e43edfd9e0e50c638de27aed8a4a4db`保持原样。

## 原CI事实与诊断边界

Main candidate `b868e351f01edcbcfc63b3b9e15dc26981427361`的CI38475532067实际 **FAILURE**。只读完整125718-byte原job log，SHA `0ee4995d5c9e1f50bb5d1bd5f44c4e063cfbaa21e1fd92164a7a0fb82d31fe41`一致。原c227 writer44753ms通过、Chromium1248安装成功、PG06 23通过；HTTP16=15PASS1FAIL，唯一六阶段case在原180000ms总预算180003ms超时。[原log/hash/脱敏副本](../evidence/step-07/ci-timeout/raw/ci-second-failure-original.log.json)。没有用stale job API步骤猜状态，没有掩盖原失败。

**原CI未记录具体pending阶段，因此其最后卡在哪一行仍UNKNOWN。** 没有证据把原因判成外部transient，也没有把“慢runner”当诊断完成。本次取得可核实的本机阶段/重复请求和合法延迟反例，实施必要最小harness改进；新远端CI仍由Main决定。

原87同一case、原全部断言和180s，在自有正确物理部署的诊断检出通过：test156.21s、命令157.41s左右。六业务阶段实际走完，最后development history发布/终态约148s结束，后续PNG检查约154s完成；没有观察到挂住的业务barrier或cleanup死锁。production phases约6.578/22.765/51.477s开始，development约82.980/99.390/128.235s开始；精确wait耗时见[原事件](../evidence/step-07/ci-timeout/retained-baseline-artifacts.json)所索引的private JSON/trace及[阶段原记录](../evidence/step-07/ci-timeout/baseline-records)。目录为资料索引，单个文件可按ledger定位。

确定重复工作：每种模式image()检查5次，浏览器真实processed请求5次，测试端又GET同一immutable recipe/frame PNG5次；合计20个backend processed调用。原诊断累计production11919ms、development11911ms，单次约1.2s。另四次`service.store.readExport`后立刻真实download；download本身再次执行相同生产全文件/IR/PNG校验。该case本机接近预算的时间可测，不是从CI摘要猜测。

合法延迟控制只在私有诊断副本将真实`service.processed`响应增加1500ms等待；不改JSON/PNG、状态、PG发布、HTTP/native预算或断言。请求约2.7s，低于原读取/图片预算。旧87同一个180s六阶段case实际失败，命令184.342s，原test180s失败；新harness同控制通过151.648s。最新冻结f574再次同控制通过150.916s。[旧受控失败](../evidence/step-07/ci-timeout/raw/baseline-legal-png-latency.log.json)、[旧命令](../evidence/step-07/ci-timeout/results/baseline-legal-latency-command.json)、[最新控制](../evidence/step-07/ci-timeout/final/legal-latency-command.json)。这是可重复的总工作量瓶颈证据，不是远端同一延迟已被证实的声明。

## 最小正确整改与断言等价

仍是**一个180000ms testcase、production/development各first/replacement/true-history-only共六阶段**。没有拆出更多预算，也没有跳过、重置母版或变更数据语义。

image()读取实际浏览器收到的200 PNG response body，按当前project/recipe/frame定位；保留data-project/recipe/frame、natural96×144、客户端PNG SHA和真实canvas RGBA对Sharp解码的检查。不再为同一已接收PNG额外GET/重处理。capture仅保存真实成功response，当前必要response失败仍抛错；取消的无关旧body rejection被处理以防unhandled，不伪造成功。

交付保留真COMMIT屏障、Job/FinalExport/current/needsRebuild、退役、实际Canvas selected Build及真实download200/ZIP SHA。取消仅用于测试的重复readExport，改用真实FinalExport登记行与同次下载ZIP：独立stored-ZIP成员/CRC校验，精确八文件，七payload bytes/SHA、Manifest SHA与登记/HTTP header一致、context与实际资源一致、完整Profile hash488…；浏览器实际A1/A2/Manifest bytes等于该ZIP，实际contracts BuildDetail descriptor的Build/Export/Manifest同一绑定。这使交付断言面向消费者实际收到的产物；生产download的全readExport校验仍实际执行，并未弱化或缓存绕过后端边界。

已验证的production context在切development前关闭，独立模式不再并行保留无关页面；原各模式完整断言之后才关闭。bare barriers限定到现有Job60s上限，页面操作15s；原PNG视觉5s/15s、terminal30s和全局180s仍不增加。阶段start/end以`R4_STAGE`直接写stderr，记录pending/timing文件，未来CI可定位具体wait，不只有case行号。配方、真实旧snapshot历史完成和CAS语义不改。

首次新wire断言错误地把整个BuildDetail按RenderDescriptorSchema解析而失败；原20.55s失败log和root副本数据保留。改用contracts唯一BuildDetailSchema并取descriptor，不改API/schema、不删除新assertion。[原失败](../evidence/step-07/ci-timeout/raw/prefreeze-harness-normal.log.json)、[说明](../evidence/step-07/ci-timeout/results/prefreeze-helper-contract-error.json)。此前几个猜测源码文件名的read失败也保留为辅助探针失误，不当产品缺陷。

## 最新冻结候选实际自测

全部下表精确f574。prefreeze87资源/诊断、父R5/R6和原CI数据分别记录，不冒充最新执行。

| 检查                         | 最新结果                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm check`                 | exit0，266/266、方向/type/lint/format/clean TS/API/Web/11exports，75.335s                                  |
| `pnpm test:step07`           | **16/16单轮通过**，536.862s含build；原15及六阶段新harness全部实际PG/HTTP/文件/browser执行                  |
| 六阶段normal实际timing       | 132581ms（case内timing起点在setup后）；prod/dev实际PNG/RGBA/预览/ZIP/current/history/retire全断言          |
| 最新合法1500ms processed控制 | 1PASS/15SKIPPED，150.916s命令、147744ms case内timing；仍一180s case，副本测试文件随后恢复原bytes/Git clean |
| API integration / privacy    | 3/3、5/5，10.411s/10.787s                                                                                  |
| `pnpm build:step07` / 重读   | 新不可变206files，21.160s；live/immutable每项SHA/bytes一致                                                 |
| 不受影响Source保护           | 194个production/其他tests/config与87一致；3780旧tracked文件不改；运行树dist206不改                         |
| 实际view_image               | 当前production/development replacement两图已查看，仅技术检查，不写用户艺术/MZ实测                          |

[精确命令/原log SHA/bytes](../evidence/step-07/ci-timeout/final/commands.json)、[六阶段耗时](../evidence/step-07/ci-timeout/final/six-stage-timings.json)、[工程206与执行文件hash](../evidence/step-07/ci-timeout/final/engineering-verification.json)、[图像查看收据](../evidence/step-07/ci-timeout/final/screenshots-viewed.json)。计数不相加为覆盖率。

新工程与R5 payload只有studio.json的context.commit绑定f574，其余资源及205文件一致。旧R5/R6/e195/87 Build、报告/ledger/所有失败不覆盖。通用Built仍IR、内部四文件/标准八文件、TargetProfile/Compiler/slot/动画/通行语义保持；本次没有新增真实模型或业务重设计。

## 运行归属、未执行和停止

测试/构建全部本树独占`artifacts/.step07-ci-timeout*`隔离检出及`.local/step07-ci-timeout`。物理Vite源码不放私有.local，保持原allow/deny及Host/Origin/path保护，没有放宽规则。每次formal beforeAll在自己PG55476创建唯一新空testDB/root，原数据库/资产不reset；数据库名、完整ownership、dump/env、原敏感logs/trace留私有，公开证据脱敏并给原SHA/bytes。

原API22456/4376、PG51121/55476仍运行；Root .env0600、运行dist、资产未改。测试API4396/Web5296、短暂Chromium均正常关闭，全部新DB/root/失败/trace保留；Main/Reviewer/release/canonical未写。Node22.21.1仅进程PATH，pnpm10.20.0，无全局Codex/模型/服务配置改动。

**本轮NOT_RERUN：** 独立完整PG06 23（本次生产Persistence未改）、全prod/dev18+18（HTTPcase已实际六阶段两个模式）、独立24scene/4creative/12+12clock/nativeCPU/旧56payload16PNG/JS78全套。父R5/R6仅提供相同生产字节部分的历史支持。**NOT_EXECUTED_BY_CODER：** 最新IndependentR7、候选CI、批准/Merge/Push/Release。新MZ GUI/游戏、用户艺术、Host/Map003/OS hidden仍未执行/延期；真实视觉Provider/SDK/key/PromptRegistry/Composer/router/AI/收费/Redis/SaaS未调用。06不重复发布，08–10 NOT_STARTED。

角色step_coder/gpt-6.1-sol/xhigh/default(Standard)、原CID沿用，serverFinalFields **UNVERIFIED_NOT_EXPOSED**；无Fast/Priority/Ultrafast/collaboration/global config。报告/脱敏证据为唯一postSource资料，无执行影响，逐项SHA/bytes及用途见[最终ledger](../evidence/step-07/ci-timeout/ledger.json)。**STOP_WAIT_MAIN_INDEPENDENT_ROUND7**，不能自己把原CI失败或最新候选标IndependentPASS。
