# 步骤07 CI环境入口整改 Coding交接

**READY_FOR_REVIEW / SELF_TESTED_READY_FOR_ROUND9**。正式独立已用8轮，下一轮9；是步骤07的Review9，08–10 NOT_STARTED。作者不批准、不自行关闭Independent gate、不merge/push/改Main canonical。用户2026-10-14继续授权不设机械五轮上限，历史和质量门禁不重置。

Source：`50fd6d84197b8c6d222f139a142ab24c918db0db`；父资料HEAD `401fc5471bef0b60bc9b5689ea8b29109f8420ab`；父R8 Source `c8d41a680df42fe565882d93d3f85a04f7a10b22`。新Source仅5个必要test/config路径。纯资料提交的最终docsHEAD在最终交接及私有coding-progress绑定，报告不自引用其自身commit SHA。

## 实际失败及独立历史

候选`b350aa88b8213223dbf8287ec42487d3ec19e391`的CI38500746316实际FAILURE。原job日志140051 bytes，SHA `3da8a7d12ba4e09b378da28c5bbf0089dfc22af97977a194a0121da48c229ce9`，只读Main `/Users/dingshinn/Desktop/rpg-maker-maker/.local/orchestration-06-07/step07-candidate-ci-38500746316-job.log.txt`；本树私有原件完整保留，公开仅脱敏副本及原SHA/bytes。真实PG23和HTTP16全PASS；production E2E13PASS/2FAIL/3DIDNOTRUN，development未到达。两个失败均为`process.loadEnvFile('.env')` ENOENT：studio-recovery beforeAll和studio项目切换legacy流程；不改写为外部transient或其他阶段失败。

Main独立R8 wholePASS仅属于旧c8d/docs401：报告SHA `0af72f3658763d87c922517d8b5222ed619ae838c7e6738790e70f5ae7cc1aff`，ledger SHA `5cf6f72ad7c1b1d16cdb83da274a8289ac652341ffa94faec4a4a60988f67943`，231 payload本次逐项只读验真。R7 CRC P2由R8独立CLOSED，R4三项closure保持；当前保留strict47及R8独立66控制的原件/结论，不重标本Source独立PASS。旧CI history/browser前提修复、180s失败及R7反例均未删改。

## 原因、范围及配置政策

CI workflow已有进程DATABASE_URL，并且repo不含私有.env。API的生产loadEnvironment允许可选文件、保留显式进程值，再由parseConfig校验；两处E2E却无条件读.env，合法CI配置因此在进入真实断言前失败。另一个persistence tests helper已有仅在ENOENT且显式DATABASE_URL时回退的保护，不属于同样的无条件缺陷，未修改。所有loadEnvFile入口已审计；生产dotenv加载/迁移脚本政策只读，不扩大维护范围。

- 新`e2e/environment.ts`使用Node原file loader；显式进程值优先，可选文件只忽略ENOENT。非ENOENT抛清楚顶层错误并保留native cause。不会吞掉EACCES/EISDIR等错误，也不输出配置输入/DSN/key；详细native路径仅属测试诊断，公开按私有策略脱敏。
- DATABASE_URL缺失明确拒绝，没有默认/未知/共享DB fallback。其余校验复用现有parseConfig（loopback、tileset_数据库名称、用户、无query/hash、API host/port、不同API/Web端口等），在Persistence/浏览器服务创建前完成。
- Playwright配置启动时调用helper，baseURL/health采用同一已校验端口；本地文件中的端口也在服务启动前确定。两个E2E入口使用同一helper返回的DATABASE_URL；保留已有resolveAssetRoot路径校验。
- 新20项回归进入现有check：无文件+显式CI、本地真实文件、显式值优先、必需字段缺失、13项非法配置、实际目录I/O及EACCES cause控制。配置fixture只做解析，不构造Prisma/Persistence或尝试连接fixture DB。实际无配置/非法配置Playwright --list退出1并在config停止；额外仅DATABASE_URL、无.env/无显式ports的CI样式入口成功收集18，**收集不冒称浏览器PASS**。

3973个父tracked文件中3970项字节不变，3个既有改动为两E2E及playwright.config，另新增helper和20项测试。两E2E完整文件除环境读取/已校验DB值引用归一外逐字相同，因此所有原断言、预算、CSV/ZIP/像素/Source/恢复/失败/迟到检查保留。Playwright 1 worker/0 retry/30s startup和原case240/180s等不变。生产实现、schema/lock、HTTP/PNG/native、Host/Origin/path/Vite/private-root、Compiler/Profile/slot/clock/通行、Mock/Provider协议不变。CI fetch-depth0和唯一Chromium install早于首consumer字节不变；严格ZIP三文件与c8d相同。没有.env复制到CI、repo假配置或降阈/skip/加预算。

## 对照与最新冻结候选执行

旧c8d正确物理隔离检出、真实新空DB/独立assets、无.env且显式配置端口/DB，原两条实际浏览器用例退出1，均捕获ENOENT，命令8.295s。这是旧缺陷复现，**NOT candidate PASS**。原trace/响应/错误context保留，未改成正常结果。

| 最新Source实际动作         | 结果                                                                                       | 命令秒数 |
| -------------------------- | ------------------------------------------------------------------------------------------ | -------- |
| pnpm check                 | 28文件333测试PASS（含20环境、47 ZIP、既有privacy）；类型/方向/lint/format/build/11 exports | 72.951   |
| pnpm test:integration      | 真实API3 PASS；新空自有regression DB                                                       | 10.429   |
| pnpm test:dev-privacy      | privacy5 PASS，Vite规则未放宽                                                              | 10.295   |
| pnpm test:step07           | 完整HTTP/PG16 PASS，真实旧writer/恢复/发布/资源/跨COMMIT双模式六阶段                       | 522.165  |
| pnpm test:e2e              | production18/18 PASS，0 skipped，NO.env                                                    | 448.177  |
| E2E_MODE=dev pnpm test:e2e | development18/18 PASS，0 skipped，NO.env                                                   | 474.164  |
| pnpm build:step07          | clean冻结候选206项工程Build，live/immutable逐项重读SHA                                     | 20.167   |

两模式真实浏览器覆盖原创建/refresh/上传诊断、固定配方、构建、实际创作/处理PNG与交付canvas RGBA独立reference、isolated/edges各4state独立reference像素、其他4scene截图/源播放/交付pause-step/nearest、替换/失败last-success/current/history/retired、慢poll/失败预算/显式恢复/项目selection-action世代/列表与legacy转换。没有只验证beforeAll不抛错、canvas初始化或frameIndex。关键production/dev current及切换截图已view_image查看并hash；属于技术确认，非用户艺术/新artifact MZ实机PASS。

本次实际6份browser ZIP（两模式first/second/history，4个独立Export）由保留的独立双目录Python oracle完整校验八成员/local-central-EOCD/CRC/七payload SHA/Profile hash `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`/Source，Pillow另解码12PNG为RGBA768×576。每模式history原字节等于first；对应原E2E actual download/selectedBuild/Manifest/PNG身份和UI断言均保留。证据包含原实际ZIP，非JSON/源PNG替代交付。

## 工程绑定及资料完整性

Build：`step07-50fd6d84197b-36e0d7916d98bdba`；Manifest SHA `0c63f67e4444c8719bb5b196f72150561ec150302fd4a20650a2f50133f74484`；实际目录`/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker/artifacts/.step07-ci-env-final-9f394e589f9f449ab7ccfe1d561c8c97/artifacts/step07-50fd6d84197b-36e0d7916d98bdba`。206项immutable/live实际重算一致。相对原594运行dist，205项逐字节相同，studio.json也仅context.commit更新；原4376 dist206项自身未改。旧Manifest、作者/Reviewer ledger及历史批准不加PASS。

[最终ledger](../evidence/step-07/ci-env/ledger.json)列最终committed每文件SHA/bytes、原件路径/原SHA/bytes和用途，报告SHA单独绑定，排除ledger自引用。资料中的脚本为JSON包装的非执行文档，公开扫描实际自有DSN/password字节并遮蔽DB/ownership全值；raw dump/env/trace/license/私有输入不发布，仅保留私有原件hash inventory。Source冻结后仅本报告和本轮证据提交，无隐藏执行变化。

## 辅助失败、资源与未执行

本轮prefreeze lint最初要求保留caught cause，原exit1/log保留；加入native cause后20unit/type/lint通过再冻结。自有final driver最初在首次API构建前调用db:migrate，缺dist/config.js退出1；原脚本/失败保留。按CI先check构建再迁移**同一个自有新空regression DB**后通过，未reset/drop、没有产品补丁或重跑已通过case。最终commands.json保留失败行，不把它改成PASS。截图汇总曾相对/绝对路径混用导致只读ValueError，修正路径后记录四张实际view_image；服务读回辅助Python空格警告exit0及断言成功也保留，未修改候选或数据。

隔离检出：`/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker/artifacts/.step07-ci-env-final-9f394e589f9f449ab7ccfe1d561c8c97`，物理ignored artifacts下，未处于.local祖先内，未扩大Vite允许根。新regression/production/development DB及所有HTTP内部restore/regression均在自有PG55476新建，独立从未存在的asset roots，所有数据/原失败/备份/trace保留。原API22456/4376、PG51121/55476、Root.env600/data/assets/dist保留，没有stop/restart；本轮API4398/Web5298由本测试正常close。Main/Reviewer/release其他tree/PG/root不写，不复制其他.env/凭据。启动入口为已有pnpm start/dev，均由真实Playwright使用；不对Root旧运行服务重部署。

角色同nativeCID `01a132c0-f44b-75f0-bea5-7f4e5e77a6ea`，step_coder/gpt-6.1-sol/xhigh/default(Standard)，无Fast/Priority/Ultrafast/collaboration/global改动。server最终隐藏字段`UNVERIFIED_NOT_EXPOSED`。Node22.21.1 PATH仅本进程；pnpm10.20.0，PG14。JS heap仍不等于OS/native RSS硬cap；资源政策无改变。

本Source独立R9、最新候选whole CI/Main批准/合并/push/发布 **NOT_EXECUTED_BY_CODER**。本轮PG06独立23/完整cleanrestore专项/独立全24scene及12+12clock三周期专项/旧56payload16PNG/JS78/nativeCPU8未重复重跑，依据生产字节无变化按影响沿用原独立适用范围；当前HTTP16自带真实恢复/历史/发布检查。不将父R8/R5或远端旧Source测试重标最新Source执行。新MZ GUI/Host/Map003/用户艺术确认保持NOT_EXECUTED/原延期。无真实视觉模型/SDK/key/PromptRegistry/Composer/router/AI工作流/Redis/SaaS调用。06已PUBLISHED不重复，08–10未开始。

**STOP_WAIT_MAIN_INDEPENDENT_ROUND9**。
