步骤07正式独立 Review，第9轮，2026-10-14（Asia/Shanghai）。结论：**REQUIRES_REVISION**。P0=0、P1=0、当前硬契约阻断P2=1：**STEP07-R9-001 OPEN**。必要正常套件和本轮独立反例均已执行；正常测试全绿不能抵销真实配置拒绝策略缺陷。R4三项与R7 ZIP问题在原范围保持FIXED/CLOSED，R1–R3原关闭范围保持。真实编号1–9不清零；2026-10-14取消机械五轮上限的授权适用，本轮有实质独立定位与验证进展。

这是冻结候选的独立技术审查，未批准、commit/merge/push、改production/tests/config、Coding/Main/release/canonical或旧Manifest。没有collaboration、Fast/Priority/Ultrafast、globalconfig或全局MZ/NW.js/Reactor操作；无真实视觉模型/SDK/key/API、PromptRegistry/Composer/router/AI/收费/Redis/SaaS。06保持PUBLISHED；08/09/10 NOT_STARTED。Reviewer在交接后停止。

| 冻结对象 | 精确值 |
| --- | --- |
| Source / managed HEAD | `50fd6d84197b8c6d222f139a142ab24c918db0db`，detached、Git clean |
| Author docs HEAD，只读git show | `f8f885b4dfb45f42daaed61dc08c5307a6722244` |
| Author report SHA256 / bytes | `c129c80793943495e72f0cec086e7f32a48f78255995ecf8d4f869b1f57f8a27` / 10493 |
| Author ledger SHA256 / committed payload | `d348e75b3cf9a4f139f752fda0efaf9494c6be1edb7959c37cbe672ee6669736` / 133 |
| Build / actual payload | `step07-50fd6d84197b-36e0d7916d98bdba` / 206 |
| Actual engineering Manifest SHA256 | `0c63f67e4444c8719bb5b196f72150561ec150302fd4a20650a2f50133f74484` |
| Full Profile hash | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793` |
| Native independent session | `01a13877-13d1-7951-a638-1a4fbb10949f` |
| reviewroot / ledger所有文件键基准 | `/Users/dingshinn/.codex/worktrees/step-07-review-round9/rpg-maker-maker/.local/step07-review` |

actual turn_context核对cwd、model=`gpt-6.1-sol`、effort=`ultra`、default设置。Main原生客户端实际请求step_reviewer/gpt-6.1-sol/ultra/service_tier=default(Standard)。**最终服务端model/effort/tier UNVERIFIED_NOT_EXPOSED**；客户端请求不冒充隐藏服务端字段证明。[实际上下文](evidence/session-context.json)、[Main请求](evidence/main-client-request.json)。无平台中断、模型/权限/速度绕过或轮数重置。

完整读取AGENTS、正式两份plans、MZruntime、03–07工程契约和要求映射、06发布及06–07原授权/2026-10-14恢复授权、唯一Main canonical、Fix4/history/prerequisites/timeout/ZIP及最新env报告、R4–R8原独立报告。[阅读索引](evidence/review-reading-sources.json)。checkout旧state仅历史，Main canonical只读。不重开05全Review/MZ手工，不重复06发布。

全部3975个managed tracked文件在开始/结束逐项SHA256和bytes相同；辅助最新CI检出的全部3975 tracked也逐项等于冻结Source。[开始](evidence/tracked-start.json)、[结束](evidence/tracked-end.json)、[辅助结束](evidence/aux-tracked-end.json)。相对父docs401的3973项，3970不变，3个既有test/config修改＋2个新增文件，正是预期5路径。两个完整E2E文件按环境读取/validated DATABASE_URL替换归一后逐字等于c8：所有旧expect、headers、路径、像素、ZIP、恢复及240/180/90/60/15/5秒预算保留；Playwright仍1worker/0retry/30s启动。Production、schema/lock/contracts、模型、HTTP/native/Vite、Profile/Compiler/slots/clock/通行不变。[源审计](evidence/source-parent-byte-audit.json)、[完整归一](evidence/e2e-normalization-audit.json)、[执行映射](evidence/execution-byte-map.json)。Source后135路径均为docs资料，JSON已解析，运行入口无引用。[用途](evidence/post-source-doc-purposes.json)。作者133 committed及132 private原件索引逐SHA/bytes匹配；R4/5/6/7/8原430/514/112/216/231 payload及报告/ledger均匹配，不重写结论。[作者](evidence/author-audit.json)、[原件](evidence/author-private-origin-audit.json)、[前轮](evidence/prior-original-audit.json)。

**STEP07-R9-001 — P2 BLOCKING，真实不可读.env被误当成缺失，静默放行配置。**

- 文件/行：`e2e/environment.ts:7–10`，尤其第9行只依据native error.code忽略ENOENT；相关回归`apps/api/tests/e2e-environment.test.ts:75–87`用mock直接抛EACCES。
- 规格/责任：本轮明确硬要求“optional.env仅ENOENT可缺；EACCES/EISDIR/坏file读错误不可悄悄吞；环境在数据库或服务创建之前校验”。责任是新的共享E2E环境加载政策及真实I/O回归，不是生产parseConfig或数据库实现。
- 真实触发：固定Node22.21.1/UID501，在自己的ignored控制中创建实际存在、mode000的合成.env；显式进程DATABASE_URL/ports合法且属于本人。`readFileSync`真实拒绝EACCES；**同一文件**的`process.loadEnvFile`却把底层拒绝映射为ENOENT。无mock、无Prisma、无数据库连接。
- actual：helper吞掉native ENOENT并返回有效配置。实际最新Playwright配置入口在该真实不可读.env存在时exit0、收集18；preload守卫禁止网络连接和child/service启动，未触发守卫。只显式提供DATABASE_URL时，不可读文件声明API4395/Web5295仍被静默忽略，helper返回默认4310/5173。expected：现存但不可读文件明确拒绝；只有真实不存在的可选文件才可忽略。
- 独立repro：[同文件FS/native/实际配置入口](evidence/unreadable-counterexample.json)、[静默默认端口](evidence/unreadable-port-counterexample.json)、[原EACCES断言失败](evidence/logs/environment-controls-corrected.log)、[native原结果](evidence/logs/unreadable-native.log)、[实际Playwright接受](evidence/logs/unreadable-playwright.log)。这些exit0仅表示**COUNTEREXAMPLE_CAPTURED**，不是候选PASS；--list只证明入口接受，不冒称browser flow通过。
- 最小整改方向：通过真实文件读取/文件系统错误语义区分“确实不存在”和“存在但读取失败”，不能单靠Node loader已归一的errno；保留显式process优先、合法本地文件、原生产parseConfig及既有预算。在固定Node增加实际不可读文件回归，不能只mock一个native实际不会给出的EACCES。Reviewer未自行整改。blocking=1，需新冻结候选及独立复审。

20个作者新增环境单测本轮确在check333内通过，但mock EACCES不能证明上述真实边界。本人另有13个正常/拒绝政策控制以及1个真实不可读反例：真本地文件、显式值优先、缺必需配置、非法loopback/DB名称/query/Host/ports/mode和实际目录拒绝；缺失/非法配置的真实Playwright入口均在网络/服务守卫下exit1。仅DATABASE_URL＋无.env/无显式ports的既有默认配置入口收集18，**不是完整browser PASS**。[启动控制](evidence/startup-controls.json)。所有控制仅owned ignored文件，不生成普通CI假.env，不改源码让通过。真实不可读配置控制已完成后将合成文件保留为其他私有名称，并在最新两完整模式前后实际检查.env不存在。

本轮实际独立结果，统计不相加为覆盖率：

| 实际动作 | 结果 | 命令秒数 |
| --- | --- | --- |
| pnpm check | 28文件333/333；含20环境、47严格ZIP；方向/type/lint/format/clean TS/API/Web及11 exports | 74.491 |
| 新空regression DB的原五迁移/API | 五迁移成功，API3/3，真实200/201/非法body/CSRF/media等原断言 | 1.845 / 10.666 |
| pnpm test:dev-privacy | 5/5；原Vite公开根/私有路径/Origin策略 | 10.203 |
| pnpm test:step07 | 最新单次完整16/16，真实HTTP/PG/文件/native取消close/恢复/旧writer/COMMIT/幂等/失败last-success/双模式六阶段 | 521.936 |
| old c8真实两browser入口 | 独立完整c8检出/构建、无.env、新空专属DB/root，2真实ENOENT失败复现；不是latest PASS | 7.183 |
| pnpm test:e2e，无.env | production18/18，0skip/0retry，新空DB/asset root | 453.868 |
| E2E_MODE=dev pnpm test:e2e，无.env | development18/18，0skip/0retry，另一个新空DB/asset root，真实Vite/StrictMode | 470.227 |
| 最新实际ZIP/PNG/独立像素 | 6真下载/12次atlas PNG解码、PNG chunk CRC/八成员/七payload SHA/完整Profile/ExportBuildID；history原字节等于first；每模式8独立reference canvas样本 | 单列证据 |
| 最新实际包负控制 | 独立Python与候选reader均6正常接受、18损坏拒绝；仅local consumer控制，未重标R8四位置完整wire faults为本轮 | 单列证据 |
| 真实不可读.env | EACCES→native ENOENT→接受/静默默认，P2反例 | 单列证据 |
| 工程/保护 | 206 actual文件及独立BuildID，全部tracked原bytes保持 | 单列证据 |

准确argv/cwd/exit/耗时及raw日志SHA/bytes见[命令](evidence/actual-command-summary.json)、[原log到脱敏copy](evidence/raw-log-provenance.json)。新环境full18+18确实执行完整创建/导入/配方/真正PNG与canvasRGBA/播放暂停逐状态/替换/失败/刷新恢复/current/history/retired/legacy转换/项目列表200、上传和采用201、非法422、异步选择/动作边界及console/pageerror原检查；没有只跑beforeAll或collect。原six-stage单180000ms、阶段日志至末processed读约128.5s；原1500ms delay专项本轮NOT_RERUN。两模式独立新DB/asset root、正确物理artifacts源码根与实际独立依赖，不位于.local祖先中，也未放宽Vite。

[6实际ZIP及完整身份](evidence/latest-browser-archive-verification.json)、[独立损坏控制](evidence/latest-archive-negative-verification.json)、[候选严格reader实测](evidence/logs/latest-candidate-zip-controls.log)。Python local-first struct/zlib＋stdlib/Pillow参考与候选central-first TS算法独立，未用同实现expectedParser；PNG实际RGBA核对Manifest，ExportBuildID独立canonical hash，full Profile为同一48844001…身份。包括重复history的6份下载、两模式各first/second的4个交付登记位置；其内容实际只有2个不同ExportBuildID，不把12次PNG解码说成12张独立产物。另独立只读核对4个不同DB Build/FinalExport ID、COMPLETED Job/项目/保留current指针、每个实际ZIP与8份immutable objects及标准目录文件逐字节相同，见[DB和文件链](evidence/latest-db-export-file-links.json)。[原始参考来源](evidence/zip-oracle-provenance.json)。

fresh工程由本人managed check真实clean构建后运行未改engineering builder产生；206 live/immutable/作者精确immutable/本轮独立辅助clean build逐字节一致，Manifest和独立重算BuildID相同。R8真实live206与其原Manifest再次核对，205与本轮相同，studio.json仅context.commit。另只读重算Coding原594运行dist206仍匹配旧Manifest，205与本轮相同；没有覆盖原API4376的dist、旧Build或旧Manifest。[工程](evidence/engineering-verification.json)、[原运行](evidence/coding-retained-runtime-readonly-audit.json)。

原问题状态：

| 发现/原严重性/规格/位置 | 当前actual/expected、独立支持 | 状态 / blocking / minfix |
| --- | --- | --- |
| R4-001 P2；§7.1/§10.2；store.ts:689/717/740 | 本轮真实c227六模块旧writer合法四文件先publish，后标准Export/FileObject＋Job同TX；重复、既存标准resume、文件失败/真实rollback/丢回执及last-success由原HTTP16执行，PNG/preview/ZIP200 | FIXED/CLOSED保持；0；既有registerExport→finishJob满足，无新fix |
| R4-002 P2；§4.1；App.tsx:92/119 | 本轮两完整18各含迟到initial200跨上传201/非法422/采用201、创建反向替代、只读恢复和unmount，列表自身世代与selected项目/assets一致 | FIXED/CLOSED保持；0；无需新fix |
| R4-003 P2；§4.4/§7.1/§10.2；studio-service.ts:261/319 | 本轮首个HTTP跨COMMIT、真实双模式first/replacement/history-only整体旧/新快照、Job/FinalExport/current/PNG/Canvas/ZIP/retire一致；read-only RepeatableRead5000/1000，文件像素仍TX外 | FIXED/CLOSED保持；0；无需新fix |
| R7-001 P2；§4.5/§9.2/§11.3；stored-zip.ts:25/76与integration:1503 | strict三测试文件与R8逐字节相同，check47/HTTP真实consumer＋本轮6真下载/18新负控制支持；R8原66parser＋4位置actual CRC拒绝保留原归属 | FIXED/CLOSED保持；0；无新fix |
| R1–R3原范围 | 当前HTTP16/check及两完整18覆盖路径、cancel/close、single inflight、5连续失败/60s、迟到写与成员身份；其余原专门探针按相同执行字节引用R5 | 原FIXED/CLOSED范围保持；0 |

明确沿用而NOT_RERUN：R5 Source `59423201ba10ee71c3d1b04cebec69659017b7c7` / docs `5c3361b9cb28a49c7cbdcabf28f03c8eba470d6d`，report `81743cc098390f726ccba1c8548e253b303998b16e53d02bc62dd8b1be45ff85`，ledger `8b5e8f0743b872159e2607cef4dcc6e4568565d7b596e7213734f808a183533e`，514 payload。完整PG06 23、独立24scene/4creative、12+12 clock三周期、完整cleanbackup/restore专项/Mock known同ID及unknown不重提/真API SIGKILL-lastsuccess、JS78/旧56payload16PNG/nativeCPU8仅沿原独立适用范围。当前HTTP16自带真实恢复和重建，不冒充重跑全部专项。R8 Source c8/docs401，report `0af72f3658763d87c922517d8b5222ed619ae838c7e6738790e70f5ae7cc1aff`、ledger `5cf6f72ad7c1b1d16cdb83da274a8289ac652341ffa94faec4a4a60988f67943`，231 payload；其1500ms151.016s、66控制和4位置fault拒绝仅归原Source。作者/Main/前轮或局部绿不能替代本轮整体结论；本轮整体仍因R9-001而REQUIRES_REVISION。

原CI1/2/3失败原件重新hash并实读必要日志，未覆盖。CI3 b350/38500746316真实140051 bytes、SHA `3da8a7d12ba4e09b378da28c5bbf0089dfc22af97977a194a0121da48c229ce9`：check313/PG23/HTTP16及six-stage/strictZIP已过，prod13PASS2FAIL3NOTRUN，两个无条件.env ENOENT；dev未到。本轮旧c8复现、新50fd完整18+18证明缺文件场景修复，但不能证明新的不可读文件政策正确，也不替代新的candidate CI。CI1浅历史/Chromium前提与CI2单180003ms失败保留；CI2最后pending具体phase仍UNKNOWN。fetch-depth0、唯一Chromium安装早于首consumer及版本/权限/预算字节未退回。[CI3](evidence/ci3-original-audit.json)、[CI1/2](evidence/prior-ci-original-audit.json)。

资源、安全与语义保持：源bytes和pixels独立拥有、domain Built仅IR、内部四文件与标准八文件分层、public restore真实重放、旧快照仅历史、失败last-success/精确依赖/retired不复用。JSON8KiB、PNG4MiB/4096chunk/5s读取、singleRGBA8/sRGB/真实CRC/metadata/decode/density、≤768×576而Studio96×144、16admission/read12/download2/heavy1+wait1/native1/5s/child close后释放、Host/Origin/client/pathID白名单/Vite私有根政策未放宽。本轮最大真实HTTP平面1770381编码→1769472 RGBA，因Studio尺寸拒绝；child RSS105775104 bytes /73.360583ms，**JS heap128MiB不是OS/native RSS硬cap**。不泛称任意媒体绝对安全，合作式root/fd前后检查不扩大为恶意管理员ABA保证。

实际view_image仅以[逐图收据](evidence/screenshots-viewed.json)列出的本轮图片为准；技术查看不写USER_CONFIRMED。full production reload图中processed区域仍loading，收据明确它不能单独证明processed解码；HTTP replacement与原完整browser断言提供相应证据。QA STRUCTURAL_PASS、有限risk、已有Profile阶段基线、人工视觉和具体artifactMZ分层保留。NOT_EXECUTED：新MZ GUI/手绘/游戏、用户逐图美术、Original Native Host/Map003补证、OS hidden实察、RPGReactor、真实视觉调用及08–10能力、最新远端candidate/main CI、Main preauth/merge/postmerge/push/readback/publication。不把CPU/browser/Profile升级为本artifact MZ或用户艺术PASS。

自己的原失败完整保留：首个目录I/O探针错误要求EISDIR而实际native为ERR_INVALID_ARG_TYPE，属probe expectation错误；纠正该期望后的真实EACCES“Missing expected exception”是本轮产品/测试硬政策反例，**没有改成仅辅助错误**。engineering独立算ID初次错误包含validation/note，按原builder身份范围纠正后匹配；未改builder或manifest。原脚本/输出及native私有指针保留。[分类](evidence/auxiliary-errors.json)。作者先migrate未build缺dist/config.js的原exit1/log和其后同新空DB正确顺序成功已逐原件核验，未重置或改写。没有删有效失败、降expect、调预算、重置母版或以新上下文清零。

结束单端口检查API4395/Web5295无listener，短暂browser正常结束。PG55495/PID49687仍运行，actual data_directory/ownership root/port核对；其他DB clients0、8个tileset_数据库、.env600、所有assets/Build/stage/orphan/backup/dump/cache/原失败及辅助检出均保留Main安全normalstop。仅本人的ignored证据/控制/生成文件写入；原CodingAPI4376/PG55476只读观察，未stop/restart，其他tree/canonical未写。[资源](evidence/resources-final.json)。凭据/DSN/env/PG ownership全值/dump/licensed runtime/敏感trace及rawlogs排除公开，保留私有原字节和按需脱敏pointer。

report.md/progress.json及公开evidence以本reviewroot相对键SHA256+bytes封存于evidence/ledger.json，ledger排除自引用；本报告不虚构自己的SHA。**STOP_REVIEWER，需整改STEP07-R9-001。** 最新独立PASS后仍须Main新candidate CI ALLSUCCESS→fetch/liveMain guard→预授权验收→normal merge→actual postmerge→normal push/readback/mainCI→正式publication docs并STOP07；本报告不是发布，08/09/10 NOT_STARTED。
