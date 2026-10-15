步骤07正式 Independent Review，第17轮，2026-10-15（America/New_York）。**PASS_WHOLE_CANDIDATE / WHOLEPASS：冻结整合候选在当前授权范围的独立技术审查通过。** P0=0、P1=0、硬阻断P2=0，新增开放非阻断发现=0。STEP07-R16-001与R15-001本轮独立确认FIXED；R4三项及既有关闭范围保持。1–16轮与旧失败保留，**R16仍是INTERRUPTED/PARTIAL，无正式报告、ledger或PASS**。

Reviewer仅写本树ignored审查证据、辅助脚本与正式命令生成物，未修改生产、正式tests/config、旧Manifest、Main canonical或他树环境，未commit/approve/merge/push。06=PUBLISHED，08–10=NOT_STARTED。本结论不是阶段批准或发布，不把未来CI/合并/主控验收写成成功。

| 冻结绑定 | 实际值 |
| --- | --- |
| Source / detached clean | `0c3dc30b0ebb4f64373fc4b3d32501a6048fe7de` |
| Author docs，仅只读git/物理文件 | `fa7f562efe58ddd2ee4912b64a3ad6e5cb84de67` |
| Author report SHA256 / bytes | `3d39d1350116e9197782abb0c51310be08129c2f173a0ea150d7df077404b57d` / 11999 |
| Author ledger SHA256 / bytes / payload | `06815c6ef2daf6325fd60f7bd98ef66e886359fb933e354ffb7044106d319661` / 45422 / 222 |
| Engineering Build / 文件 | `step07-0c3dc30b0ebb-63b9289040076990` / **208** |
| Manifest SHA256 | `7f42de70aef9d6e4be0cb3644a18c4fec561c98330af9619f4dd30d1325069e1` |
| Full Profile canonical SHA256 | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793` |
| 本轮root / ledger键基准 | `/Users/dingshinn/.codex/worktrees/step-07-review-round17/rpg-maker-maker/.local/step07-review/independent-round17` |
| Native session | `01a13dc1-eed8-7fa2-b0b1-ad6a2fa55958` |

实际客户端收据及本轮角色请求为step_reviewer / gpt-6.1-sol / ultra / default(Standard)，cwd核对。**未暴露的服务端最终model/effort/tier为UNVERIFIED_NOT_EXPOSED**，不把请求值当最终服务端证明。本轮没有collaboration、Fast/Priority/Ultrafast、全局设置修改或平台拒绝。旧16原平台提示、原件SHA/bytes和中断状态保持；本轮是用户授权的新修复候选正常独立17轮。[配置/资料基线](evidence/baseline-audit.json)、[R16精确原件/平台指针](evidence/r16-original-audit.json)。

本轮完整读取两份正式plans，并读取AGENTS/MZ环境、STEP06–07契约与需求映射、指定R4三发现/R5关闭、R14生产范围/R15CRC与R16部分原件、收敛授权及最新作者交接。Main canonical只读，checkout旧状态文字不取代最新绑定。作者222 payload逐项实际SHA/bytes读回且与docs Git对象一致，source后223路径全docs；这些是**作者资料，不是本人测试PASS**。不无差别重放历史日志。精确阅读/版本引用及五条当前非docs变化见baseline-audit。

**STEP07-R16-001 — 原P2 BLOCKING，FIXED / CLOSED。**

责任位置`packages/image-adapter/src/png-policy.ts:52–64`，公用inspect/decode、HTTP上传和实际received PNG消费者共用该政策。规格为产品§11.1/11.3/13.2、Pixel Contract及STEP07严格容器验真：四个原始type字节只能ASCII字母，第三字节reserved-bit保持为0，逐chunk CRC/边界/order/metadata/预算在native前生效。旧实现先toString('ascii')丢弃高位再regex，实际saved IEND反例可被inspect/native和两个通道的精确rendered消费者接受。期望是即使字节/SHA/DOM/native RGBA相同也拒绝非法type。

本人从原R16精确路径重读821-byte合法/坏IEND原件并对Main保全索引逐SHA/bytes核验。以Git `abd035a` 原policy/index/isolation/worker闭包独立转译（只调整模块位置）重现旧公共decode接受；当前公共inspect/decode拒绝PNG_STRUCTURE，合法正控通过。另以独立Node native crc32构造7个允许chunk×4位置，**28个旧inspect接受反例→当前全拒**；合法混合大小写与3个reserved-bit拒绝控制保持。当前check中的4个public decode位置全部实际执行，不将作者旧32失败当本人运行数。

在真实loopback GET200上，两通道各一次合法/坏件，共**4次真实请求**；每次仅1 GET。实际capture确认同requestId、loader/frame/currentDocument、完整URL/长度/字节/SHA；原AST精确rendered函数比较真实DOM图像与Sharp完整RGBA。旧policy接受坏件，新policy明确PNG_STRUCTURE；true loading-finished与声明长度完整后ERR_ABORTED均成立，后者仍标failed/content-length，不当普通EOF。实际查看坏件仍能显示的截图，不能用可解码替代结构检查。[独立对照/原函数/截图](evidence/type-wire/result.json)、[辅助脚本](evidence/probes/type-wire.mjs.txt)。

当前正常完整HTTP16另外实际上传四个IEND高位位置：全部422/PNG_STRUCTURE、native measurement未更新、AssetRevision不增加；正式合法PNG入口正常。静态调用顺序确认inspect先于runIsolated，native worker仍再验同政策。最小修复就是字符串解释前原始四字节检查，已实现；blocking=0，无需追加生产修改。[真实HTTP四位置](evidence/HTTP16/raw-chunk-type-http-rejections.json)。

**STEP07-R15-001 — 原P2 BLOCKING，FIXED / CLOSED。**

原责任为`integration.test.ts:1450–1455`及`received-resources.test.ts:117–130`必需图像消费者只验SHA/decode/RGBA，坏CRC可能假PASS。规格是每个PNG chunk CRC/结构必须在同request实际字节上验证。当前`received-png.ts:5–10`调用公共inspectPng，完整六阶段消费者在native/像素前调用；current check实际执行20项PNG结构/CRC消费者控制和两个真实wire CRC拒绝及合法正控，raw-type新控制也使用同一精确函数。旧R15完整六阶段反例只引用原Source39ec的报告，不冒充本轮重跑；R16部分关闭证据不是wholePASS。当前CRC实现、decoder、golden、fixture期望和原时限未改。R16根因是更早公用type解释，**不是CRC修复回退或ZIP CRC复开**；blocking=0，无需新fix。[正式本轮wire/CRC控制](evidence/formal-wire-provenance.json)、[旧R15精确报告SHA](evidence/baseline-audit.json)。

| 本轮独立命令，计数不重复相加 | 实际结果 | 秒 |
| --- | --- | --- |
| `pnpm check` (check) | 418/418，零skip，11 production exports；exit0 | 78.224 |
| `pnpm db:migrate` (migration) | 构建后新空主库五迁移；exit0 | 1.998 |
| `pnpm test:integration` (api3) | 3/3；exit0 | 11.119 |
| `pnpm test:dev-privacy` (privacy5) | 5/5；exit0 | 10.905 |
| `pnpm test:step06` (PG06-full23) | 真实PG完整23/23；exit0 | 207.449 |
| `pnpm test:step07` (HTTP07-full16) | 完整16/16，原单180秒；exit0 | 474.050 |
| `pnpm test:e2e` (production18-noenv) | 18/18，零skip/retry；exit0 | 426.381 |
| `pnpm test:e2e` (dev18-noenv) | 18/18，零skip/retry；exit0 | 446.456 |
| `node scripts/build-engineering.mjs step07` (engineering) | 208文件，identity独立重算；exit0 | 0.242 |

`pnpm check`自含fresh clean build，本人随后才migrate；工程命令为已fresh build上的实际publisher，未虚报另跑pnpm build:step07整条wrapper。418包含36 raw-type、16真实wire和20PNG消费者等；未重复跑72再相加。每套必要全量仅跑一次，零正式失败，未删断言/skip、调decoder/CRC/母版或放宽180s/5s/15s/60s/job60s/terminal30s。准确argv、exit、耗时和脱敏UTF8日志见[命令](evidence/commands/results.json)。

本轮PG23在独占PG55515/新主库及新root真实执行：版本不可变、CAS/并发/lease/late、文件与延期COMMIT故障、Mock冻结输入/已知ID重启查询、未知不重提、仅重试归档/重复完成、backup到干净新库/root后真实重建。HTTP16覆盖正常upload/recipe/adopt/build/replace、current/history/retired、失败last-success、public restore联通、真实c227旧writer四文件幂等、标准八文件FinalExport/FileObject与需交付Job同TX、文件失败/回滚/丢回执、跨COMMIT完整旧/新读取。[PG必要摘要](evidence/PG06-provenance.json)、[HTTP证据](evidence/HTTP16-provenance.json)。

HTTP六阶段末processed在119417ms前后完成，未改变原180秒。生产/开发各5个processed GET全部200/current document、同owner/recipe/frame/fullURL/SHA/完整字节且通过容器/96×144/native/DOM RGBA；正常这些回执均loading-finished。完整abort通道由本轮受控单请求另证明，**不声称正常套件自然复现旧Main取消原因**。观察器原件相对R16逐字节不变，12种wire/document/partial/no-length/encoding/wrong-owner/frame/hash/iframe/reload/sameDoc原保护和新CRC/type控制均在当前418实际运行。[10个正常PNG回执](evidence/http-current-response-summary.json)。

生产和开发18分别使用新DB/root，进程显式配置且本树`.env`真实不存在；运行中核对监听cwd、health200，结束恢复原bytes/SHA/0600。实际默认Chromium1248 headless shell/156.0.8078.4由本Node子进程ppid/OS可执行路径、二进制SHA和真实DOM核验，无executablePath override，不使用全局cache。[默认browser](evidence/browser-identity.json)、[NO.env生产](evidence/noenv-production-during.json)、[NO.env开发](evidence/noenv-dev-during.json)。18均包含普通用户真实上传/组件revision/固定配方采用/构建/当前历史退役/失败恢复/旧包转换，慢poll/single-inflight、BUSY有界恢复、五连续错误/60s停止且显式只GET、迟到项目/选择/动作/列表隔离；不要求用户编辑DB/内部文件或填写key。

两模式本人实际查看关键技术截图并检查console/pageerrors，pageerrors=[]，console error仅预期422。独立Python struct/zlib双目录/EOCD/八个安全唯一ZIP成员/CRC+stdlib/Pillow重读**6份实际下载、12次768×576 PNG解码**，每个PNG逐原始type/CRC/边界、7 payload逐bytes/SHA、fullProfile/canonical ExportBuildID/source/pixelHash全匹配，history全bytes等于first。6正常与18既有局部ZIP CRC/EOCD负控由独立Python及当前TS reader实际接受/拒绝，不当额外整套或route注入。[实际下载](evidence/current-archive-verification.json)、[局部负控](evidence/current-candidate-reader-controls.json)。

**16个实际RawCanvas完整平面**由未改原test的canvas.toDataURL→RGBA SHA取得；本人以原创PNG、独立字面quarter坐标和Pillow构造参考，全部逐SHA相同并核对参考图。不是Canvas存在或frameIndex断言，也不把CSS locator截图当raw plane。[16平面](evidence/independent-canvas-verification.json)。实际4条DB Build/FinalExport/FileObject/COMPLETED Job/ProjectSnapshot引用链只读核对，8份标准文件的objects和不可变standard目录逐字节同ZIP，内部BuildFile仍4份；首个/替换及当前retired指针正确，同一Export的PNG/MF/Profile/preview/download一致。[数据库/实际文件链](evidence/current-db-export-file-links.json)。

| 旧finding / 原位置与规格 | 本轮actual/expected与复现证据 | 状态 / blocking / minfix |
| --- | --- | --- |
| R4-001 P2，store.ts:689/717/740；§7.1/10.2 | 原existing四文件先COMPLETED而无Export；当前旧writer、existing/new/resume/rollback/丢回执真实HTTP16同TX完整交付，四/八文件分明 | FIXED保持，0，无新fix；HTTP16/r4-duplicate-legacy及finalization四JSON |
| R4-002 P2，App.tsx:92/119；§4.1 | 原无关动作作废初始列表；当前prod/dev全部列表迟到200跨upload201/422/adopt201、创建反向列表、显式只读恢复/unmount通过 | FIXED保持，0，无新fix；两18完整reporter |
| R4-003 P2，studio-service.ts:261/319；§4.4/7.1/10.2 | 原旧pointer混新COMPLETED；当前5000/1000ms只读RepeatableRead短TX、首个/替换/history跨COMMIT完整旧或新、历史不回退current | FIXED保持，0，无新fix；HTTP16/r4-consistent-first及r4-ui-consistent-publication |
| R7 ZIP / R9 env-I/O / R11首consumer前browser安装 | 当前418严格ZIP/31环境case、全HTTP/两18、6正常包/18局部负控、owncache默认启动；相应代码未变 | 原关闭保持，0；当前本机不冒称新Linux CI |
| R1–R3及R14有界Job重放 | 当前PG23/HTTP16/两18覆盖path/fd/Host/Origin/client/BUSY/取消/close/late/失败保护、冻结Mock恢复，生产实现相对R14未变 | 原范围关闭保持，0，无新fix；R14额外缓存11变体/成本对照只引用原source |

R4/R5/R14/R15原report/ledger精确SHA/bytes在baseline-audit，只引用原范围。R14 source0cdd/doc65b4原wholePASS，report `123faf3fbe5e6dcc77d5a5d66be936de4dd015b1a8b7cc33257419391c092be3`/19385bytes；ledger `2a79775d6712bc8751605ca7f1564c2393064677dbd559f7f4d7155d2cbfb6ac`。专门旧24scene/4creative、12+12 clock三周期/OS hidden、旧56payload16PNG/JS78/nativeCPU8和R14额外缓存/受控成本**NOT_RERUN_THIS_ROUND**；仅适用原Source和当前相同实现，不把原PASS扩成新artifact MZ/用户艺术。当前原clock tests（含resume/suspend）与实际E2E播放/暂停/逐状态、创作2×nearest和交付1×像素、60逻辑updates/Profile30/0→1→2→1断言保持并执行；旧专门resume/hidden/两倍交付像素仅按原范围引用。

实际工程起末208文件与指定作者物理immutable包、own immutable和live逐项bytes/SHA一致，BuildIdentity独立重算匹配。相对R14的207个非docs/README tracked路径，199相同、8项精确变更；唯一生产变化是raw type检查，其余是必要消费者/回归/fixture。Profile/Compiler/slots/布局/时基/通行、锁/schema/HTTP边界和全部Web/persistence/executor实现未变。新增test fixture按既有root构建收集输出JS/dts，两项是真实208的一部分，不硬套206或删除凑数。Manifest仍保持原独立验证/用户/MZ未执行字段，不补写PASS。[初始208](evidence/engineering-verification.json)、[最终208](evidence/engineering-final.json)。

源bytes/像素各自拥有、domain Built仅IR、短TX/CAS/精确依赖/历史/retired、未知不重提、public restore/路径身份、immutable发布均保持。JSON8KiB、PNG4MiB/4096chunks/5s、RGBA8/sRGB/metadata/真实pixel/density、最大768×576/Studio96×144、admission16/read12/download2/heavy1+wait1/native1/5s/close后释放不放宽。**child JS heap128MiB不是OS/native RSS硬cap**；当前最大HTTP平面测量单列。合作式FS边界不扩大为恶意本机管理员ABA保证。

新MZ GUI/编辑器手绘/游戏/用户美术/Original Host/Map003补证/RPGReactor/真实OS后台或RSS硬cap为NOT_EXECUTED或原延期；未重做05/MZ，不把技术view_image当艺术或ARTIFACT_MZ_TESTED。无视觉SDK/provider/key/生产PromptRegistry/Composer/router、真实AI/费用/Redis/SaaS/globalMZ/NW变更，08–10 NOT_STARTED。

必要正式全套没有失败。本人辅助probe的provenance字段、非法测试id、旧parent混用current native policy、只读路径猜测、CDP commandline不可用与Profile序列化hash标签错误均保留原日志/脚本，修正仅在own ignored资料；不当产品finding或隐去失败。[辅助错误](evidence/auxiliary-errors.json)。独立ZIP/Canvas参考只从已保存的精确Reviewer脚本读取并适配当前路径/source/DB，附来源SHA，不复制全量旧payload。

结束**8946 tracked**起止逐文件SHA/bytes完全相同，精确HEAD/detached/Git clean。API4415/Web5315无listener，ownbrowser/native辅助0，PG55515/PID86022与真实data_directory核对，其他DB clients0；**13个自有tileset_数据库**、env/资产/backup/cache/stage/orphan/失败均保留Main核归属后正常停，不reset/drop。完整ownership/env/DSN/password/dump/license runtime/private user art/trace不公开，真实own DSN/password仅RAM扫描，公开证据零匹配。[保护](evidence/tracked-protection.json)、[资源](evidence/resources-final.json)、[扫描](evidence/secret-scan.json)。

Main canonical和旧CI仅只读/引用：旧candidate7CI38576897358及merge321bbb/postmerge是历史；main CI38586177993仍FAILURE的原记录不补PASS。**新candidate8 CI、委托放行、正常forward merge、postmerge、push/readback/mainCI和正式PUBLISHED均NOT_EXECUTED_BY_REVIEWER，仍由Main完成。** 本报告不会伪造旧失败的精确取消因果。

report/progress和必要合成脱敏PNG/ZIP/JSON/log/脚本在`evidence/ledger.json`按本reviewroot相对路径逐SHA256/bytes封存，ledger不自指。无需读取作者结果即可复核本轮命令、原反例、当前拒绝和交付链。

**STOP_REVIEWER。**
