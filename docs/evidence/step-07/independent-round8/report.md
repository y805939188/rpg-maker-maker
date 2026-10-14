步骤07正式独立审查，第8轮，2026-10-14（Asia/Shanghai）。结论：**PASS，最新整合候选当前授权范围的 whole-candidate 独立技术审查**。P0=0、P1=0、当前硬契约阻断P2=0、新增非阻断发现=0。**STEP07-R7-001 FIXED / CLOSED**；R4三个问题保持FIXED/CLOSED，R1–R3原关闭范围保持。历史轮次1–7及原失败不重置，2026-10-14取消机械五轮上限的授权适用。

这不是Main预授权验收、用户逐图艺术确认、远端CI或步骤07发布。Reviewer未改production/tests/config、Coding/Main或canonical，未commit/merge/push/批准，没有真实视觉SDK/key/API、PromptRegistry/Composer/router/AI/收费/Redis/SaaS或global MZ/NW.js/Reactor操作。06保持PUBLISHED，08/09/10 NOT_STARTED。仅自己的ignored证据、辅助诊断与生成文件被写入。

冻结绑定：

| 对象                              | 精确值                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Source / managed HEAD             | `c8d41a680df42fe565882d93d3f85a04f7a10b22`，detached、Git clean                                |
| Author docs HEAD，git show只读    | `401fc5471bef0b60bc9b5689ea8b29109f8420ab`                                                     |
| Author报告 SHA256 / bytes         | `52d24014dfbc3e3674cee02f6f6e8df2f32992bd9621e433ee2fbd1a15b025ad` / 9881                      |
| Author ledger SHA256 / payload    | `e2741224fa796e5ebd0b17334d541141a33e971438c4d050e832b0b103835a32` / 96                        |
| 工程Build / actual payload        | `step07-c8d41a680df4-773d3198403cc2e3` / 206                                                   |
| 原工程Manifest SHA256 / bytes     | `3a1933af2b34dacb939f83d1b74dd18a992fa13d61691341301016ccdf4a6feb` / 25562                     |
| 完整Profile内容 hash              | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                             |
| Native independent session        | `01a1380d-54c2-7e63-a6ae-5aec7293b315`                                                         |
| reviewroot / 所有ledger文件键基准 | `/Users/dingshinn/.codex/worktrees/step-07-review-round8/rpg-maker-maker/.local/step07-review` |

实际本轮rollout的turn_context记录cwd、model=`gpt-6.1-sol`、effort=`ultra`及default会话模式。Main原客户端命令/角色收据请求step_reviewer、gpt-6.1-sol/ultra/service_tier=default(Standard)。**服务端最终model/effort/tier UNVERIFIED_NOT_EXPOSED**；不将客户端请求当成隐藏字段的最终证明，不无限阻塞。未调用collaboration、Fast/Priority/Ultrafast或改全局配置。[实际上下文](evidence/session-context.json)、[Main请求原件](evidence/main-client-request.json)。

全部3875 tracked source/tests/config/fixtures/docs/历史证据，在开始与结束逐项SHA256/bytes完全相同，HEAD exact c8、detached、Git clean。[开始](evidence/tracked-start.json)、[结束](evidence/tracked-end.json)。唯一Main canonical只读；checkout旧state仅历史，未写canonical。完整读取AGENTS、两份正式plans、MZruntime、03–07契约和要求映射、06–07及2026-10-14恢复授权、R4/R5/R6/R7原报告、Fix4/history/prerequisites/timeout及最新ZIP整改报告与原件索引。[阅读来源](evidence/review-reading-sources.json)。不重开05全Review/MZ人工，也不重做或重复发布06。

源码与资料范围经独立Git对象和实际字节复核：父docs2eb75的3873 tracked文件，3872项不变，唯一既有变化为integration测试；新增stored-zip.ts与stored-zip.test.ts。相对f574、87的195个原production/其他tests/config/CI文件相同；相对594的194个相同，CI仅保留已审的history/browser前提差异。[父字节](evidence/source-parent-byte-audit.json)、[执行映射](evidence/execution-byte-map.json)。Source到docs401的98路径全为纯资料，JSON解析与用途检查完成，没有执行文件/锁/schema/contracts/Profile/Compiler/槽位/clock修改。[资料用途](evidence/post-source-doc-purposes.json)。

作者96 committed payload、95项有原件索引的SHA/bytes逐项验真，仅作作者资料；R4/5/6/7原430/514/112/216 payload和各报告/ledger亦逐项匹配，不重写结论。R7原report `ae1e528e69a4552a4c39e580bf4f6e45ea7e5ee786d8c387ffea41751c456443` / 18243 bytes、ledger `e96e5bb9327f00ab76278134864a2686e7e69c0bc46f652c3ba8b72688d738aa` / 39993 bytes，仍为REQUIRES_REVISION。[作者核验](evidence/author-audit.json)、[前轮原件](evidence/prior-original-audit.json)。

本人managed tree的pnpm check和原HTTP16产生真实clean TS/API/Web构建，再在自己正确物理root的full-history detached clean辅助检出，运行**未改engineering builder**。辅助检出收集的是本人fresh构建的实际生成字节，不声称另一次独立TS编译。206实际文件与本人managed live、辅助live/immutable及作者精确immutable目录逐字节一致，独立重算BuildID匹配；后续development构建后再重读仍相同。另亲自重新hash R5、R6、R7的各206实际live文件并核对旧原Manifest：与c8的205项相同，studio.json仅context.commit更新，其余JSON字段相同。旧Manifest未改PASS。[工程实际重读](evidence/engineering-verification.json)、[原Manifest](evidence/engineering-manifest.json)。

**STEP07-R7-001：原P2 BLOCKING，FIXED / CLOSED。**

原位置为f574 `apps/api/tests/studio/integration.test.ts:1236–1266`，仅读local headers。当前位置为[stored-zip.ts:25](/Users/dingshinn/.codex/worktrees/step-07-review-round8/rpg-maker-maker/apps/api/tests/studio/stored-zip.ts:25)、[stored-zip.ts:76](/Users/dingshinn/.codex/worktrees/step-07-review-round8/rpg-maker-maker/apps/api/tests/studio/stored-zip.ts:76)、[integration.test.ts:1503](/Users/dingshinn/.codex/worktrees/step-07-review-round8/rpg-maker-maker/apps/api/tests/studio/integration.test.ts:1503)、[stored-zip.test.ts:294](/Users/dingshinn/.codex/worktrees/step-07-review-round8/rpg-maker-maker/apps/api/tests/studio/stored-zip.test.ts:294)。规格为产品§4.5/§9.2/§11.3及STEP07精确安全八成员、真实ZIP/PNG/Manifest/Profile身份验证；责任是必要消费者测试的容器可靠性，不是生产导出器缺陷。

原触发：真实download只改central CRC一bit、正确重算outer body SHA，保留local/PNG/Manifest字节；旧helper和整个六阶段case会假PASS。central name `../bad`、EOCD count9也可穿过旧helper；local CRC/payload变化则拒绝。本人从冻结f574提取原helper/CRC，仅将Vitest比较换为等价node:assert，独立重新复现这些行为。四份R7真实正常/坏包旧helper全部接受，新helper接受四正常、拒绝四坏。[新旧对照](evidence/reader-negative-comparison.json)。原R7的whole sixphase假PASS仍归属f574，不重标成c8或本轮重跑。

当前actual符合expected：读取器同时检查EOF EOCD、disk/count/extent、central/local签名、version20、flags/method/time/date、length/name/CRC/offset一致性、实际payload CRC、连续无gap/overlap/重复offset范围、ASCII安全精确唯一八成员。未知/不一致成员、非法UTF8、truncated/trailing/prefix、目录外offset、非零metadata/attributes/extra/comment、multi-disk、ZIP64及未知压缩等当前unsupported格式拒绝。范围只覆盖既有stored八文件，无顺手扩格式/remoteSource。本人local-first Python独立实现先顺序解析local，再独立遍历central并比对，使用struct/zlib、另经stdlib解码和Pillow验真；不是调用候选helper生成期望。66个控制中4正常接受、62坏包拒绝，候选读取器与该实现一致；check中的47正式回归亦执行。[独立控制](evidence/python-zip-controls.json)、[另一实现](evidence/probes/zip-oracle.py)。stdlib zipfile单独确实接受local CRC和EOCD count损坏，testzip返回None；central CRC则返回坏成员/实际read抛错，不能单独取代完整容器校验。[实际局限](evidence/stdlib-zipfile-limitations.json)。

完整真实HTTP链负控制分四次执行**同一个原180000ms case**，分别仅在production-first、production-replacement、development-first、development-replacement的actual download consumer副本，修改central CRC一bit并正确重算x-content-sha256。PG、API业务响应、browser PNG、Manifest、Profile、source与其他下载保持真实原字节；全部原断言保留。四次case均在目标download首次遇坏包时退出1，命中`Standard ZIP: local/central CRC`，命令分别20.973/43.794/84.303/107.737s。这是**正确拒绝负控制，坏产物不是PASS**，也不声称每个预期失败run完成了失败点后的阶段。四个原件由独立Python完整容器/PNG/Profile/七payload SHA验真，四坏包被独立parser和stdlib CRC拒绝。最新四对原件再用精确旧helper全接受、新helper仅接受正常四份，关闭的是必要测试可靠性缺口。[四位置完整链](evidence/full-chain-four-fault-verification.json)、[最新真实对照](evidence/reader-latest-real-comparison.json)。blocking=0；所需最小修复已实现并独立验证，不需要生产导出器修改、增加预算、重新引入重复GET/readExport或拆case。

六阶段减负与身份检查没有回退：c8整个case与f574逐字归一比较，唯一不同是ZIP读取函数名。[case字节](evidence/sixphase-text-audit.json)。本人AST重核87原29个expect/browserExpect断言，28文本同，唯一重复GET status200由实际成功200/full origin/project/recipe/frame URL＋必需body捕获替代；原natural96×144、bodySHA、真正image→canvas RGBA对Sharp、COMMIT/Job/FinalExport/current/history/retire断言保持，新增Manifest/Profile/逐file/header/BuildDetail身份保持。[实际AST](evidence/expect-assertion-site-map.json)。页面只有该模式全部history/processed/选择断言后才close再切mode；没有旧frame/另一个PNG/项目填空、猜Completed为current、所有409改200或catch坏包伪PASS。

本轮实际独立结果（计数不相加为覆盖率）：

| 动作                      | 实际结果                                                                                                    | 命令秒数                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| pnpm check                | 27文件313测试、方向/type/lint/format/clean build/11生产exports；含47新ZIP及原privacy5                       | 75.919                             |
| 自己pnpm db:migrate       | 自己PG55493新主库全部5迁移，Project0；没有init/reset                                                        | 1.943                              |
| 原pnpm test:step07        | 最新16/16一次整套PASS；real旧c227 writer/失败/rollback/丢回执/恢复/retired/资源及双模式六阶段               | 536.480                            |
| 正常六阶段计时            | case内命名阶段133.174s，仍单一180000ms预算                                                                  | 原HTTP16内                         |
| 同1500ms真实processed延迟 | 1PASS/15SKIPPED，仅原case；全部6阶段PASS，case阶段144.774s；实际processed成功5+5                            | 151.016                            |
| 四actual CRC故障          | 四次各1FAIL/15SKIPPED，预期正确拒绝；不记坏ZIP或失败case为artifact PASS                                     | 20.973 / 43.794 / 84.303 / 107.737 |
| pnpm test:integration     | API3/3真实HTTP/PG                                                                                           | 10.132                             |
| 原项目列表e2e子集         | production5/5、development5/5；原迟到200/201/422、替代列表、只读恢复/unmount                                | 37.471 / 55.533                    |
| 独立ZIP/PNG/身份          | 66容器控制＋最新4正常实际wire包/4故障位置；完整Profile/BuildID/DB FinalExport/实际browser PNG与Manifest一致 | 独立记录                           |
| 工程/结束保护             | fresh与结束两次206实际文件；3875 tracked SHA/bytes同、exact/detached/clean                                  | 独立记录                           |

延迟只在自有ignored诊断副本调用真实StudioService.processed后统一等待1500ms，包括development切换的新实例；没有改正式tests/config或响应内容。整个case180s，page/PNG15s、expect5s、barrier/job60s、terminal30s和native/HTTP预算保留。精确argv/cwd/exit/耗时及私有raw log SHA/bytes见[命令摘要](evidence/actual-command-summary.json)。normal和负控制清楚区分。

最新四个actual normal wire ZIP通过独立local/central/EOCD、8安全唯一成员、CRC、七payload bytes/SHA、完整Profile hash、canonicalJSON ExportBuildID、Source c8和两个768×576真实RGBA pixelHash检查。每个ZIP同一selected DBBuild的FinalExport Manifest SHA、actual browser A1/A2/Manifest原字节、Profile完整内容及BuildDetail descriptor身份均一致；六阶段processed完整owner/recipe/frame URL、成功200、SHA、Pillow decode96×144及原case真实canvasRGBA验证保持。actual browser processed成功请求production5/development5，旧10→5减负未回退。[最新wire/PNG/Profile/DB对照](evidence/latest-zip-png-profile-verification.json)。完整正常case不是只unit/local PASS。

原问题保持关闭：

| 原发现      | 原触发/规格/位置                                                                               | 最新actual与expected、独立支持                                                                                                                                                         | 当前blocking / minfix                                 |
| ----------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| R4-001 原P2 | §7.1/§10.2；store.ts:689/717/740；真实旧06四文件先登记同owned Build，Job提前COMPLETED而Export0 | 本轮原HTTP16实际c227六源转译writer后，合法四→八/重复标准resume、FileObject＋FinalExport＋Job同TX、rollback/文件失败/丢回执及readonly GET保持；普通IR/Mock仍不猜标准交付                | FIXED/CLOSED保持；0；既有registerExport→finishJob足够 |
| R4-002 原P2 | §4.1；App.tsx:92/119；唯一initial list200跨无关动作被作废                                      | 本轮原production5/dev5实际迟到list/上传201/非法422/采用201、反向替代、显式恢复/取消通过，列表自身generation满足expected                                                                | FIXED/CLOSED保持；0；无需新修复                       |
| R4-003 原P2 | §4.4/§7.1/§10.2；studio-service.ts:264/319；跨COMMIT混旧pointer与新COMPLETED                   | 本轮首个HTTP跨COMMIT及双模式first/replacement/true-history-only整体旧/新一致，历史不回退current，选择/真实PNG/Export/retire正确；只读RepeatableRead短TX5000/1000ms，files/pixels仍TX外 | FIXED/CLOSED保持；0；无需新修复                       |

R1–R3原范围由最新HTTP16/check及byte不变的R5独立全链证据支持，没有重新打开已关闭范围或只看ZIP一段。whole-candidate PASS由本轮必要最新Source实际复测、架构/差异审查及明确未受影响的前轮独立证据共同支持；作者自测、Main自查或局部绿不替代最新结论。

明确沿用而**NOT_RERUN**的独立部分：R5 Source `59423201ba10ee71c3d1b04cebec69659017b7c7` / docs `5c3361b9cb28a49c7cbdcabf28f03c8eba470d6d`，report `81743cc098390f726ccba1c8548e253b303998b16e53d02bc62dd8b1be45ff85`、ledger `8b5e8f0743b872159e2607cef4dcc6e4568565d7b596e7213734f808a183533e`。完整PG06 23、prod18+dev18（本轮只列表5+5及HTTP六阶段）、独立24scene/4creative、12+12clock三周期、16ZIP、完整backup-cleanrestore-rebuild、Mock known同ID/unknown不重提、crash last-success保护、JS78/旧56payload16PNG/nativeCPU8，按实际相同执行字节适用，不重标成c8本轮重跑。R6/R7只沿其各自原报告实际范围，旧87合法1500ms delay180003ms失败、新f574150.964s通过及R7坏ZIP假PASS原件保留。[分开归属](evidence/reused-independent-scope.json)。

原CI1 70bcdcc3…/38464677883 FAILURE和CI2 b868…/38475532067 FAILURE不改写。本人只读重hash CI2原125718 bytes、SHA `0ee4995d5c9e1f50bb5d1bd5f44c4e063cfbaa21e1fd92164a7a0fb82d31fe41`：实际旧writer44753ms、Chromium原install和PG23PASS关闭前提；原single case180003ms超时仍FAIL，其具体pending阶段因无日志保持UNKNOWN，不虚称外部transient。CI fetch-depth0/唯一Chromium install早于首consumer、版本/权限/全部预算保持。[原CI2](evidence/ci2-original-audit.json)。新candidate CI由Main执行，不由本结论替代。

资源/质量/安全契约保持：源bytes/pixels独立、domain Built仅处理IR、内部四文件与标准八文件区分、旧Source/Manifest不改，public restore/历史/retired/CAS仍真实校验。原PNG singleRGBA8/sRGB、JSON8KiB/PNG4MiB/4096chunks/5s读取、≤768×576且Studio96×144/density1或2、Host/Origin/client/path/Vite、16admission/read12/download2/heavy1+wait1/native1/5s/child close后release未放宽。最大真实HTTP平面1770381 encoded→1769472 RGBA，因Studio尺寸拒绝；本轮child实际RSS107511808 bytes/75.521792ms；**heap128MiB不是OS/native RSS硬cap**。合作式路径/O_NOFOLLOW/fd不扩大成恶意管理员ABA保证。Profile/Compiler/slots/anim/passability及母版不变，旧外部pixel/target oracle只支持其原范围，不机械新增MZ手工。

本人实际view_image查看本轮production/development replacement两张关键截图并hash：源、mask、overlay、处理PNG、selected current Export画布/ZIP链接和分层QA可见；AI尚未开放。本次为技术查看，不写USER_CONFIRMED或新artifact MZ PASS。[逐图收据](evidence/screenshots-viewed.json)。STRUCTURAL_PASS、有限视觉risk、已有Profile阶段基线、用户艺术和具体artifactMZ分别保持。

所有普通/CI命令只用人工公共fixture/Mock，没有真实视觉调用或key/SDK。**NOT_EXECUTED：** 新candidate/main远端CI、Main preauth/merge/postmerge/push/readback/publication、新MZ GUI/手绘/游戏、用户逐图艺术、Original Native Host/Map003补证、RPGReactor、OS后台标签实察及08–10能力。CPU/browser技术不冒称新GUI/用户艺术/本artifact实机；旧延期不标完成。

自己的辅助错误保留且不冒充PASS：psql多语句仅返回末项导致两次探针assert失败，纠正单SELECT；engineering初次依赖顶层symlink不被trailing-slash ignore识别，原clean gate正确拒绝，改为ordinary owned容器后原builder通过；Python oracle首次猜错atlasPixels字段KeyError，原脚本/错误保留后按actual atlases.pixelHash核对；CI数字/ms间ANSI造成首次substring错判，原byte不改，仅分析strip；诊断副本初次缺API声明Prisma/contracts，均0tests；辅助CJS resolver误用于import-only导出及capture目录重复也保留。首次真正latency副本生产三阶段完成，development因辅助dependency子链接指到allow-root外模块而失败（原15s click）；源根本身位于正确ignored artifacts，未扩大Vite规则。保存旧链接/失败DB/zip/原log后复制本人精确依赖到自有physical目录，额外实际React模块全200/no-pageerror控制通过，再完整151.016s及四故障控制通过。未修改正式tests/config或用局部结果替代whole结论。[失败/纠正范围](evidence/auxiliary-errors.json)、[正确物理部署](evidence/aux-vite-physical-root-control.json)。原失败记录中早期“meaning”不表示PASS，以correct=false/实际exit及本解释为准。没有平台中断/换模型/权限/速度绕过或正式轮次重置。

结束单端口lsof确认API4393/Web5293无listener；全部自启API/Web与短暂browser正常结束。PG55493仍运行，actual cwd/data_directory和ownership root/port匹配、其他DB clients0、10个自有tileset_数据库保留，.env600及主资产root不改，所有源/Build/stage/orphan/backup/dump/cache/原失败/诊断与私有logs留Main安全normalstop。未操作CodingAPI4376/PG55476或release。本人固定.local输出整体移入reviewroot/private，原记录字符串不改，搬移索引另存；辅助检出全部私有数据亦保留。[资源交接](evidence/resources-final.json)、[原输出保留](evidence/fixed-output-retention.json)。凭据/DSN/env/DB/dump/ownership全值/licensed runtime/敏感raw日志不公开，公开文件以RAM内实际凭据扫描后封存。

report.md、progress.json及公开evidence按reviewroot相对键SHA256+bytes封存在evidence/ledger.json；报告不自引用自身SHA，旧Manifest不加PASS。**STOP_REVIEWER**。Main仍须最新candidate CI ALLPASS→fetch/live main guard→preauth→normal merge→actual postmerge→normal push/readback/main CI→publication docs；步骤07发布后STOP，08–10 NOT_STARTED。
