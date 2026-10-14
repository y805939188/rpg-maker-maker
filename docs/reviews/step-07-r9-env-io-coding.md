# 步骤07 R9环境I/O整改 Coding交接

**READY_FOR_REVIEW / SELF_TESTED_READY_FOR_ROUND10**。正式已用9轮，下一轮为步骤07的独立Review10，08–10实施NOT_STARTED。用户2026-10-14取消机械五轮上限，历史与质量门禁不重置。STEP07-R9-001仅为作者修复验证，独立关闭仍由下一Reviewer判断；Coding不批准/merge/push或改Main canonical。

Source：`39daa13188eb401c2048a24e0606c1a91192e04a`；父Source `50fd6d84197b8c6d222f139a142ab24c918db0db`，父docsHEAD `f8f885b4dfb45f42daaed61dc08c5307a6722244`。最终纯资料docsHEAD在交接回复和私有coding-progress精确绑定，不在自身commit制造自引用SHA。

## 原件与真实根因

完整独立R9报告SHA `c5a5d36c5ea2aea42431a3cab8be4acbb954c50c858bbb1eeddd546eca268877` /17550 bytes，ledger SHA `c8f510e2cea58a1ce59b72b2504aa1436a12bafaba4c97d260d07b06c7346def` /31936 bytes，Main只读原目录`/Users/dingshinn/Desktop/rpg-maker-maker/docs/evidence/step-07/independent-round9/`。本次184原件逐项SHA/bytes核对一致，Reviewer native exit0及Main正式派发收据已核对。原结论仍REQUIRES_REVISION，唯一阻断P2 STEP07-R9-001，不把这项真实失败改为辅助探针错误。

固定Node22.21.1/UID501，自己合成mode000.env实际存在，readFileSync真实EACCES，但process.loadEnvFile真实ENOENT。旧helper只看后者，吞掉失败；实际Playwright config在禁止网络/监听/child-service守卫下错误收集18。仅process DATABASE_URL时，合成文件声明4398/5298被忽略，旧返回4310/5173。这是现存不可读失败，不是正常缺失；20原回归中的mock EACCES不能证明原真实边界。

作者在正确物理独立50fd检出复现上述同文件FS/native/实际Playwright false-accept，原log/native结果/文件保留，mode恢复600并改为私有保留名。旧入口exit0是**COUNTEREXAMPLE_CAPTURED_NOT_PASS**。新真实mode000配置断言放回精确旧helper时退出1，命中expected0→1断言，证明新增回归可抓原缺陷；新helper恢复后31项prefreeze、type/lint全过。端口诊断wrapper明确只导入真实Playwright config/helper、输出两端口并为wrapper位置设置绝对testDir，未改生产配置；旧显示4310/5173/收集18，新helper在选择端口前拒绝，守卫事件均0。这些诊断不是完整browser PASS或新Source独立PASS。

## 最小实现与边界

唯一3路径为`e2e/environment.ts`、原20回归文件`apps/api/tests/e2e-environment.test.ts`、新增真实入口回归`apps/api/tests/e2e-environment-startup.test.ts`。4110父tracked文件中4108字节不变；仅2既有修改＋1新增。原两完整E2E文件、Playwright配置、所有timeouts/retries/assertions、CI fetch-depth0/唯一Chromium早安装、严格ZIP三文件均与50fd相同；生产、锁/schema/contract、Compiler/Profile/slot/clock/通行、Root运行dist206项不变。

先以真实readFileSync做读取验证。非ENOENT一律拒绝；FS ENOENT再lstat确认可选路径确实不存在，已存在的dangling link不算absence。存在且可读时仍由原Node process.loadEnvFile解析，保留Node语法与process显式值优先；第二次读取的任何失败（包括Node再报ENOENT）均拒绝。缺文件才继续原process配置；DATABASE_URL仍必需，仍复用parseConfig的loopback/tileset_名称/用户/host/ports/无query/hash策略，Persistence和服务创建前校验，无不明DB fallback。

错误顶层信息保持清晰，cause只保留有限安全I/O代码，不输出原message/path/contents或哨兵DSN/key。真实EACCES不能被归一成可选缺失；未知错误同样拒绝。原20项全部保留：旧模拟native错误用实际可读文件触发第二阶段，断言未降低。此mock仅补充第二次loader失败分支；真实权限证据来自真实文件和guarded配置入口。

**合作式竞态范围**：这是可信本地配置的两次同步读取，不宣称原子内容快照。预检成功后移除/权限变化导致loader错误会拒绝；若合作方在两次读取之间替换为另一份合法可读内容，Node会解析第二次内容；真实absence判断后新建文件也不提供恶意同UID/admin竞态防护。启动期间操作者需保持配置稳定。未改OS权限策略/全局安全，只有自身合成fixture被chmod并finally还原；不复制user.env、不造GitHub配置文件。

## 最新Source实际验证

| 动作                       | 结果                                                                                                           | 秒数    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | ------- |
| pnpm check                 | 29文件344/344，含原20＋5新直接I/O＋6真实启动/guard（31），及47 ZIP；方向/type/lint/format/build/11exports      | 73.831  |
| 最新真实guard专项          | 6/6；9子控制，mode000/目录/缺必需/非法拒绝，真absence/本地文件优先可用；网络/监听/child launch自测在操作前阻断 | 3.209   |
| pnpm test:integration      | 真API3/3，新空自有regression DB                                                                                | 10.565  |
| pnpm test:dev-privacy      | 5/5，原私有Vite边界                                                                                            | 10.275  |
| pnpm test:step07           | 原完整HTTP/PG16/16，旧writer/恢复/资源/发布/跨COMMIT/prod-dev六阶段                                            | 520.676 |
| pnpm test:e2e              | production18/18，0skip/0retry，NO.env                                                                          | 458.467 |
| E2E_MODE=dev pnpm test:e2e | development18/18，0skip/0retry，NO.env                                                                         | 478.717 |
| pnpm build:step07          | clean Source206项immutable/live实际重读SHA                                                                     | 20.509  |

新直接I/O用实际mode000普通文件、mode000祖先、ENOTDIR文件祖先、ELOOP与dangling entry，目录原控制仍真实执行；permission contract要求非root实际EACCES，不skip。EPERM未以本机强制制造，不冒称真实EPERM通过；已有模拟错误仅作明确辅助分支。所有自身权限fixture finally还原，所有原失败保留。

最新check内及独立专项两次，每次9真实child控制：三项守卫自测确实阻断NETWORK/LISTEN/SERVICE，所有配置控制guard log空，证明未尝试网络/service/DB；native权限错误路径不靠mock。真实Playwright --list正常18仅称收集，完整两模式18另独立实跑。错误stdout/stderr不含内容哨兵和临时配置路径全值；详细guard log及原hash入证据。

完整两模式保留真实创建/refresh/上传诊断/配方/构建/组件替换/旧history/retired/失败last-success/迟到任务及selection-action世代/慢poll、5连续失败/60s和只读恢复。每模式isolated/edges各4state真实canvas像素对独立reference、其他四scene截图/创作源及processed解码/nearest/播放暂停逐状态均走原入口，没有仅assert beforeAll/canvas初始化/frameIndex。R9原mode000反例与辅助控制清楚分开；本Source下拒绝的是坏输入，坏配置不是artifact PASS。

六份实际browser ZIP（first/second/history各两模式，history逐字节同first）由保留的独立双目录Python oracle验证8成员/目录/CRC/七payload SHA/完整Profile hash `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`/Source，Pillow另解码12次PNG为RGBA768×576。六个下载位置/四个first-second登记位置并不意味着六个独立内容产物；具体ExportBuildID与hash见实际记录，不凑覆盖率。关键current reload及switch稳定截图四张已view_image查看；reload截图可有在途processed PNG，不能单张证明其解码，稳定switch与原imageReady/RGBA断言提供相应证据。技术查看不标用户艺术或新artifact MZ实机PASS。

## 工程、资料与资源

BuildID `step07-39daa13188eb-9ce9cd91866896c3`；Manifest SHA `c375e0ef0d7b8b59cb319002b4e026cb6c7cd769d8b34f5886acda4bb75ac1e2`；实际目录`/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker/artifacts/.step07-r9-env-io-final-1ad0228add11482fa1058db6ed7fd5f9/artifacts/step07-39daa13188eb-9ce9cd91866896c3`。206项live/immutable真实重读一致，205项与原594运行文件字节相同，studio.json仅context.commit更新；原4376自身dist206项也未改变。旧Manifest不覆盖或加PASS。

[最终ledger](../evidence/step-07/r9-env-io/ledger.json)逐文件绑定最终committed SHA/bytes/原件origin/SHA/bytes/用途；报告SHA另列，排除ledger自身。脚本均JSON包装的脱敏文档，不引入Source后的执行文件。私有env/DB/ownership/dump/trace/license/输入不公开，只保留原件和hash-only inventory。公开整体扫描实际自有DSN/password；运行stdout/stderr核对内容哨兵未泄漏。文档源中的合成fixture marker是测试定义，不是读取私有.env的输出。

隔离检出`/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker/artifacts/.step07-r9-env-io-final-1ad0228add11482fa1058db6ed7fd5f9`，位于自己ignored artifacts的正确物理源码根，不位于.local祖先，不放宽Vite。所有真实regression/production/development DB和assets root均新空自有PG55476资源；HTTP内部恢复也另建本cluster新DB/root。原API22456/4376、PG51121/55476、.env600、原数据/资产/备份/dist/历史失败保留，不reset/drop/stop/restart；本轮4398/5298测试服务正常close。Main/Reviewer/release其他tree/DB/root/canonical不写。真实入口仍原pnpm start/dev，由两模式浏览器实际使用。

无本轮候选失败被删或降阈；旧native误归一码、原helper错误放行、原断言在旧helper失败均作为正式反例保存，不伪作辅助error。prefreeze31不是新Source fullcheck；旧50fd的check333/API/HTTP/18+18全绿仍属旧R9记录。若存在辅助probe纠正，以私有原log和证据清楚分类，不替换原失败。客户端同CID step_coder/gpt-6.1-sol/xhigh/default(Standard)，无Fast/Priority/Ultrafast/collaboration/global配置改动；server最终隐藏`UNVERIFIED_NOT_EXPOSED`。Node22.21.1 PATH只本进程，pnpm10.20.0/PG14。JS heap不等于OS/native RSS硬cap的原说明与资源预算保留。

## 未执行与停止

本Source独立R10、新wholecandidate CI、Main批准/merge/push/发布 **NOT_EXECUTED_BY_CODER**。R9保持REQUIRES_REVISION原结论，R4/R7原closure及R5/R8适用独立历史仅按未变执行字节引用，不重标本轮。PG06完整23、24scene/4creative、12+12clock三周期专项、完整cleanbackup/restore/Mock专项、旧56payload16PNG/JS78/nativeCPU8未重新整套跑；当前HTTP16自带真实恢复/重建，原完整18两模式则本轮实跑。1500ms六阶段专项/四位置坏ZIPwire/66独立容器沿原适用记录，没有倒退同一180s优化及strict47代码。新MZ GUI/Host/Map003/用户艺术仍NOT_EXECUTED/原延期；不把CPU/browser/Profile基线升级为当前artifact MZ或用户艺术PASS。

没有真实视觉模型/SDK/key/PromptRegistry/Composer/router/AI流程/收费/Redis/SaaS调用；06已PUBLISHED不重复，08–10 NOT_STARTED。**STOP_WAIT_MAIN_INDEPENDENT_ROUND10**。
