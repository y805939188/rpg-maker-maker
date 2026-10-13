# 步骤07正式独立审查 — 第4轮 / 5

审查开始2026-10-13，结束2026-10-14，Asia/Shanghai。结论：**REQUIRES_REVISION**。P0：0；P1：0；**阻断 P2：3**；新增非阻断 P3：0。原 STEP07-R3-001/002 在原范围独立关闭，R1/R2 已关闭范围保持回归。全套正式测试通过，不能抵销本轮三个真实反例。正式已用4/5，原R1–3计数和失败不重置。

这是冻结候选的独立技术 Review，不是 Main 阶段批准、用户美术确认、新产物 MZ 实测或发布。本人未改生产源码、正式tests、Main/Coding工作区或canonical状态；未commit/merge/push、自行批准或开始08–10。

## 冻结绑定和独立性

| 对象                                | 精确绑定                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Source / checkout HEAD              | `ef30dc2ab011d204d1d0a4d099a335b68458cdca`                                |
| Author docs HEAD                    | `71933b6782b83600b1a94017f5eb5aa763553dfb`                                |
| 作者报告 SHA                        | `772d78741813f1fe5bc1fb67c7081ebd92bfcab8d5895cf79d10519412a0e95a`        |
| 作者 committed ledger SHA / payload | `a09e85a5e88d1e165878f2f6753d895cde4c470c5129ed991fdff77863b70cd0` / 425  |
| fresh 工程 Build                    | `step07-ef30dc2ab011-56e8dbed6eb81a20` / 206 payload                      |
| 工程 Manifest SHA                   | `b1d36d66ea54b8f0f65ab6a705c0c4f8d19613dddecd45f426514940afb200e9`        |
| 完整 TargetProfile 内容 hash        | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`        |
| 本轮六源 UI 首个 DB Build           | `f58cc474e042c2e785f39e94c314317dec15265c01f799d0d37099e70d270da1`        |
| 同一标准 Export BuildIdentity       | `step05-pack-ef30dc2ab011-0e49c174ef9c1ff7`                               |
| 同一 Export Manifest SHA            | `f3860b2244742ec3fc709e9642c5e2602abb1f9fa1d333b472a96eba8fc1dba6`        |
| 同一标准 ZIP SHA                    | `3b334bf9e2c6c0e32e2413cb0ad0d712d5ee6c0621a546aeef7f817575420be2`        |
| Review root                         | `/Users/dingshinn/.codex/worktrees/step-07-review-round4/rpg-maker-maker` |

Native thread `01a13592-d6c5-7a91-badb-a0419a260e2a` 的实际 turn_context 核对 cwd、`gpt-6.1-sol`、`ultra`；Main 客户端 CLI/角色收据明确请求 `step_reviewer / default(Standard)`。turn_context.service_tier 为 null；服务端最终 model/effort/tier **UNVERIFIED_NOT_EXPOSED**，不以客户端请求冒充服务端证明。无 collaboration、Fast/Priority/Ultrafast、模型覆盖或全局配置更改。[配置](evidence/client-configuration.json)。

全部 **2532** tracked source/tests/config/fixtures/docs/历史证据，在开始与结束逐项 bytes/SHA 一致；HEAD 精确ef30、Git clean。[开始](evidence/source-before.json)、[结束](evidence/source-after.json)。作者资料通过git show读取，SOURCE后430路径为README/docs，用途为说明、映射、报告与脱敏证据，无执行配置/schema/profile/fixtures变更；425 payload及报告逐项验真。[资料审计](evidence/author-ledger-audit.json)。fresh build和开发启动后206实际文件与工程Manifest/独立BuildIdentity再次匹配。没有出版到根artifacts或覆盖已发布产物。

完整阅读AGENTS、两份正式plans、MZ_RUNTIME_ENVIRONMENT、STEP03–07契约与需求映射、06–07授权、06最后R3 PASS及发布记录、作者Fix3报告/ledger/原失败、07前三轮完整原报告与必要探针原件。Main canonical仅只读，冻结checkout旧state仅历史。未重开05全Review/MZ手工，也未重新判旧Host/Map003为完成。

## OPEN：STEP07-R4-001 — P2 BLOCKING，重复发布分支完成 Job 却未登记标准 Export

- **位置/原因：** [store.ts:695](/Users/dingshinn/.codex/worktrees/step-07-review-round4/rpg-maker-maker/packages/persistence/src/store.ts:695)–699 的 existing Build 分支只核对内部Manifest后调用finishJob并返回；FinalExport和对应FileObject登记位于719之后的新Build分支。677–690仅assert事务外的finalExport变量存在，没有要求事务中的FinalExport记录存在。
- **规格/责任：** 产品§7.1、§10.2、STEP07“短TX登记immutable文件引用＋同TX StudioJob.COMPLETED / FinalExport / current CAS”。责任是Persistence的幂等发布完成协议和06–07整合。普通内部四文件合法，不因此成为标准八文件交付。
- **真实触发：** 自有新空PG DB/新root，公共StudioService.enqueue创建真Job并实际prepare；探针只在真实prepare返回处设置合作式时序屏障。独立合法四文件publish先登记同一owned prepared Build，再放行Studio标准发布。先用当前公共Persistence无standardFiles调用复现，再用git show已发布c227的六个实际模块转译执行旧06 writer复现；没有编辑DB/JSON状态假造拥有对象。
- **实际：** 旧writer控制 Job `9eef5ae2-b9bc-4d9d-8e02-d62be9de1cfe` 是真 **COMPLETED**，Build `59083756d7fd70c4cb254c0e48858c5389fbf02239c2b7fc18ff73fbd7081805`；同Build FinalExport count **0**。真实GET preview/download **409 EXPORT_REQUIRED**，新Studio Build被当作旧包。标准文件已校验并固化，但缺DB标准交付引用。首个正常Studio控制有8文件和FinalExport=1。
- **独立有效控制：** 后续浏览器真正保护POST export才追加FinalExport，画布和ZIP可读；原Job已提前COMPLETED、原内部Manifest/current不改。这说明后续转换可恢复，**不能证明先前Job完成事务满足契约**；不声称源/PNG丢失或数据库指针回滚。
- **证据：** [当前公共API反例](evidence/duplicate-publication.json)、[实际旧06 writer反例](evidence/duplicate-publication-legacy.json)、[HTTP409及后续保护转换](evidence/duplicate-ui/evidence.json)、[已view_image查看控制](evidence/duplicate-ui/completed-job-lazy-conversion.png)。对应private探针的公开源码在evidence/probes。
- **最小方向：** existing分支同一短TX内核对/追加已经验真的标准Export与文件引用，再完成Job；若不能登记则不能COMPLETED。保留既有Build/current/history和同身份幂等，补已有内部Build、已有标准Build、并发旧writer、延期COMMIT rollback控制，不依赖GET或以后UI转换来补完成条件。

## OPEN：STEP07-R4-002 — P2 BLOCKING，初始项目列表被无关写动作永久作废

- **位置/原因：** [App.tsx:89](/Users/dingshinn/.codex/worktrees/step-07-review-round4/rpg-maker-maker/apps/web/src/App.tsx:89)–96 的初始listProjects把有效性绑定到全局actionGeneration；[App.tsx:250](/Users/dingshinn/.codex/worktrees/step-07-review-round4/rpg-maker-maker/apps/web/src/App.tsx:250)的任意act都会增加该世代。上传等操作没有替代项目列表查询，却使其合法200结果永远不setProjects。useEffect只挂载一次，没有列表重读入口。
- **规格/责任：** 产品§4.1项目创建/选择/刷新、计划07普通用户完整工作台；R3修复必须保护正确生命周期而不能隐藏功能。责任是Web项目列表的请求归属，属于本次Fix3引入的功能回归；与原R1混合GET身份问题不同。
- **真实触发：** 真实持久化所选projectId的普通浏览器加载，暂缓初始GET /api/projects的**真实200原字节**；当前项目Studio/画布/processed已成功时，进行合法PNG上传201；上传后再延迟1300ms送达列表。没有故障响应、JSON改写、内部DB编辑或限额放宽。
- **实际/预期：** 生产200含19个项目且含当前ID，真正上传已存新source、last-success不变；响应到达后侧栏按钮仍 **0**，项目名退为“项目”，现存项目无法从工作台选择，也无失败/重读提示。刷新控制显示19个按钮。开发Vite＋自有development-boundary API同样实际复现；正常新项目创建/列表替代控制由正式13+13通过。应接受未被更新列表查询 supersede 的有效初始列表，保留已有项目选择能力。
- **证据：** [生产网络/前后PG数据](evidence/project-list-race/evidence.json)、[开发](evidence/project-list-race-dev/evidence.json)、[已查看空列表](evidence/project-list-race/late-initial-list-lost.png)、[刷新控制](evidence/project-list-race/reload-valid-control.png)。counterexample exit0不记候选PASS。
- **最小方向：** 以列表自身的请求/替代世代保护initial GET，只在新的列表刷新（如创建后list）真正取代它时失效；保留disposed和创建后旧列表防回滚。补带既存localStorage项目、迟到列表＋上传/失败/采用、创建新列表反向返回的浏览器控制，不扩大状态框架或美术整改。

## OPEN：STEP07-R4-003 — P2 BLOCKING，健康终态响应混合旧项目指针和新完成记录

- **位置/原因：** [studio-service.ts:260](/Users/dingshinn/.codex/worktrees/step-07-review-round4/rpg-maker-maker/apps/api/src/studio-service.ts:260)–261先取Project；354–384稍后独立查询Build/FinalExport和Job，365、412–414却仍用早期Project指针。没有一致元数据快照。Web [App.tsx:85](/Users/dingshinn/.codex/worktrees/step-07-review-round4/rpg-maker-maker/apps/web/src/App.tsx:85)、170依据jobs全终态停止poll；134用obsolete successfulBuildId初始化选择，570的退役门禁因此持续禁用。
- **规格/责任：** 产品§4.4、§7.1、§10.2及07 current/history/真实终态工作流。责任是API聚合读取一致性与客户端终态消费。当前成功/HISTORICAL语义必须一致；不能把任意Completed历史Job强制采用current。
- **最初自然观察：** 本轮public-http原探针真实终态读取曾得到successfulBuildId=null，实际PG已存在成功指针。原失败/脚本/DB保留；独立真实PG基线的延期COMMIT控制另跑通过。不是将测试假设调整当产品修复。
- **有序真实复现：** 自有新空DB/root，普通UI提交首个真Build202。在真实Project查询已经返回null指针之后暂缓读取；后台继续真实文件校验、发布与PG COMMIT，确认Job/FinalExport/current都成功，再放行后续真实元数据查询。只添加合作式时序屏障，不改任何响应JSON、任务状态或Prisma查询结果。
- **实际：** 项目 `d16c54c3-51a5-44da-bae0-0fcbde8bf4d9` 的真current为 `77b41fe71f80907e15cbc82914109da167012ce2cd42fd5bcb91c38e24b8d5b3`，FinalExport=1；HTTP200同时包含该Job COMPLETED，却 successfulBuildId **null**、该Build.current **false**、needsRebuild **true**。界面停止自动状态读取（最后5个GET后1500ms无新GET），实际构建初始选择为空；用户查看真Build后仍标历史、退役按钮禁用。健康新GET/刷新控制取得正确current且按钮恢复。标准文件/PG发布本身完整，没有DB回滚或PNG缺失。
- **证据：** [真实200原body SHA、真实PG前后与浏览器](evidence/state-skew/evidence.json)、[已查看完成但无current](evidence/state-skew/completed-but-no-current.png)、[刷新有效控制](evidence/state-skew/reload-current-control.png)、[探针](evidence/probes/state-skew.mjs.txt)。屏障是在事务外的元数据读，不把像素/网络放到长写TX。
- **最小方向：** 在短一致读取中取得Project、adoption、Build/Export、Job等相关DB元数据，文件/像素验真继续在事务外；或以有界版本/指针重核获得一致组合。客户端可防御不一致终态，不能无限重读、重提或把历史Job当current。补首个/替换构建跨COMMIT读取与真正history-only完成控制，保留single inflight和原预算。

## R3/R2/R1 原范围结论

**STEP07-R3-001 CLOSED / FIXED_INDEPENDENTLY_VERIFIED。** 生产/开发原正式三个503/429/network控制均真5失败停止，81s＋20s浏览器clock静默，backend真COMPLETED，UI未知/last-success，显式GET只一次、POST总1。独立追加45s失败读取＋挂起重试共享60s，观察61.012s时停止/取消，自动只3个GET；失败manual GET仍停止，不开请求风暴。真实RUNNING时manual恢复后还有13次正常成功poll（连manual共14读），max inflight1，正常长构建未被5次预算截断。[追加](evidence/poll-budget-extra/evidence.json)、[生产](evidence/formal-production/r3-state-ownership/poll-503.json)、[开发网络](evidence/formal-dev/r3-state-ownership/poll-network.json)。clock是实际浏览器计时/网络控制，不是仅内部errorCount/frame断言；不声称真实DB掉线。新增R4-003是健康200内容一致性，原连续错误范围不重开。

**STEP07-R3-002 CLOSED / FIXED_INDEPENDENTLY_VERIFIED。** 全13+13真上传/采用迟到201、同项目旧source/历史recipe选择、422迟到错误、202已接受Build、visual-false200与创建201晚返回、普通成功均执行。旧真实提交通过API/PG读回，目标完整Studio快照/选择/Build/notice/busy不被旧回调污染；真PNG decode96×144、SHA/RGBA匹配。accepted旧Build占heavy时先立即验证目标选择/notice，再等真terminal后用原15s检查图片，未放宽原5s/15s/60s。[生产迟到动作](evidence/formal-production/r3-state-ownership/late-actions.json)、[开发上传](evidence/formal-dev/r3-state-ownership/late-upload.json)。新的R4-002是列表读取误失效，不否定原迟到写owner保护。

**R2-001/002保持CLOSED。** 两模式合法1300ms慢成功/失败、快控制和切项目旧请求最大inflight1；旧06 delivery ready但processed未done的三次普通无注入切人工项目、三源帧均实际decode96×144/SHA/RGBA。普通5秒断言不改。真实heavy＋wait压力、取消frame后ZIP，额外两客户端persistent BUSY精确5attempt、60s停止、4MiB+1、浏览器真96×143 decode拒绝、显式只读重读、owner/frame/Blob撤销均通过。[生产生命周期](evidence/lifecycle-production/evidence.json)、[开发生命周期](evidence/lifecycle-dev/evidence.json)、[开发普通切换](evidence/formal-dev/r2-recovery/ordinary-switch.json)。StrictMode disposed processed setup发送前microtask控制和旧正式case保持；不把正常GET列表的另一生命周期归为此问题。

**R1-001/002保持CLOSED。** 真source/A1/Manifest/Profile/ZIP/preview/processed八种root/ancestor/leaf/同内容移换/消失访问链，原inode恢复后SHA/字节保持、current/history不变且真重建；10 fd/ancestor控制、真实backup root/parent/assets/manifest/dump与坏restore parent（空DB/根外零文件）通过。[公共路径](evidence/public-storage.json)、[fd](evidence/storage-extra.json)、[恢复边界](evidence/restore-boundaries.json)。合法自包含Export不读原Source leaf，因此不误要求它拒绝；安全objects在仅builds违规时仍合法。合作式可观察移换/O_NOFOLLOW/fd界限、Node无openat/不防恶意ABA的局限保留。两模式原成员身份/legacy转换/反向切换通过，原P3成员身份范围保持关闭，纯美术打磨仍归步骤10。

## 本轮独立执行

Main仅frozen install/generate、新空独占PG准备，本人先check/build再migrate，未重复init/reset。PATH每条runner命令固定 `/Users/dingshinn/.nvm/versions/node/v22.21.1/bin`，Node22.21.1/pnpm10.20.0/Prisma6.19.3/PG14.20/Sharp0.35.5/vips8.18.7。normalize ownership.root/port/data_directory通过；PG55485、API4385/Web5285，自己的.env600，主资产.local/step07-review/assets。06回归、两个重复发布和state-skew均自有新空DB/新root；restore数据库 `tileset_review_restore_e9b7fcecf6e84b008cd809736068a963` 和原不存在restored-assets。无他人.env/DB/root写入。

精确argv/cwd/exit/秒数/private log SHA在[commands.jsonl](evidence/commands.jsonl)。正式06/07原config/tests从review formal-workspace运行，只链接本候选源码/dist/modules，自己的.local承载输出；e2e需repo cwd，直接运行原tests，输出另保存。没有改正式预算/删case/重置母版；pack suite在ignored pack-workspace出版。统计不相加为覆盖率。

| 实际动作                                           | 本轮结果                                                                                                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm check / 自己migrate                           | 266/266，方向/type/lint/format/build/11 exports；71.704s；空主DB全部5迁移，无reset                                                                                |
| 原step07 config/tests                              | 9/9，210.927s；真HTTP/PG/上传/预算/deadline/cancel/cleanup/COMMIT/CAS/late/retired/旧06/restore                                                                   |
| 原step06 config/tests，新回归DB/root               | 23/23，193.314s；原60000ms项预算；父lease/fence/维护队列/故障/竞态/Mock重启/备份恢复                                                                              |
| API / Vite隐私                                     | 3/3、5/5，真实HTTP/PG与Vite表面                                                                                                                                   |
| 正式production / development e2e                   | 各13/13，409.897s / 429.860s；完整开发API/React StrictMode真实执行                                                                                                |
| fresh工程与开发后重读                              | 两次206文件SHA及BuildIdentity一致，指定Manifest匹配                                                                                                               |
| 原公开JS scalar / 原Pack suite / pinned native CPU | 78/78；8包56payload/16PNG与批准05全字节一致；8/8 CPU共3600形态/状态，每套600update/601观测；不是GUI/Host/艺术                                                     |
| 六源纯UI＋独立Pillow参考                           | 创建/刷新→错误诊断→6PNG→精确revision/style/recipe→任务/Build→组件替换→history/retired/容量失败保留；24scene＋4creative、nearest1×/2×、实际换Build像素与4真ZIP一致 |
| 公共HTTP真PG基线控制                               | PNG/字段/URL/path/Host/Origin/client、同字节不同ID、延期COMMIT整体rollback、1heavy＋1wait取消后ZIP/native复用、GET只读/cross-project通过；首次旧指针反例另保留    |
| 新错误总预算/读取生命周期                          | browser60s/取消、5失败后81s＋20s、manual failure不风暴、RUNNING手动恢复后13成功poll；两模式BUSY5/body/decode/owner/Blob测试通过                                   |
| backup→空DB/新root restore→Studio/Mock             | 212.764s，完整源/recipe/current/history/retired实际重放；known同ID完成，unknown不新submit/晚结果不adopt                                                           |
| 恢复浏览器/真实重建/legacy保护转换/PNG/ZIP         | 44.199s；旧四文件真writer，不改old Manifest/current；actual processed SHA/RGBA＋4画布状态＋同网络标准ZIP匹配                                                      |
| stable actual browser clock＋独立参考              | 12+12源/交付像素，29/30、59/60、89/90、119/120、239/240、359/360三周期一致；play/pause/resume/step/hidden锚点控制                                                 |
| 真自有API SIGKILL/restart                          | 严格确认POST202/真实QUEUED及owned PID后SIGKILL；FAILED/INTERRUPTED，last-success canvas/ZIP原字节保持；5恢复ZIP真解压/CRC/hash                                    |
| 新三个边界探针                                     | **COUNTEREXAMPLE_CAPTURED**；exit0不是候选PASS；R4-001当前/旧06两控制，R4-002 prod/dev，R4-003真实PG/HTTP/UI和有效刷新控制                                        |
| 结束保护                                           | 2532 tracked SHA相同，HEADef30/git clean，API/Web无listener；PG和17个自有DB及全部private数据/失败/备份留Main                                                      |

## 交付、像素、QA和06–07范围

标准八文件精确 `A1.png、A2.png、pack.json、history.json、layout.json、sources.json、INSTALL.md、manifest.json`。完整TargetProfile封装Manifest、profile HTTP返回同内容，不是第九文件。六份正式两模式ZIP、四份独立UI ZIP、恢复current ZIP、五份恢复/中断ZIP以及重复发布后转换ZIP均为实际文件；必要独立套件真解压、CRC、8安全无重复成员、逐file bytes/SHA和Manifest/BuildIdentity/Profile验证。网络A1/A2/Manifest/Profile与同选定ZIP逐字节相同。[六源网络/ZIP](evidence/browser-pixel-zip-verification.json)、[恢复像素/网络](evidence/restored-pixels/verification.json)、[恢复5ZIP](evidence/restored-zip-verification.json)、[正式生产ZIP](evidence/formal-production-zip-verification.json)、[正式开发ZIP](evidence/formal-dev-zip-verification.json)、[全部18份标准ZIP验真](evidence/all-standard-zip-verification.json)。合法历史ZIP原字节保持，内部四文件从未冒称八文件。

独立Python/Pillow使用原始原创PNG、二值mask/overlay、手写邻接quarter坐标和occupancy，不调用生产Compiler/descriptor/renderer生成expected，也不继承旧CPU截图。24scene states与4创作states逐RGBA零差；完整A1/A2含透明保留区、2×nearest、新Build实际PNG网络身份和画布改变均实测。源bytes与像素独立所有权、通用Built只代表IR、硬source/IR/Compiler/Pack/Manifest/file/CAS链由后端执行。全部普通/CI本轮测试仅人工源/Mock，真实视觉调用、SDK、key、生产Prompt体系0；远端CI未运行。

实际60逻辑updates/s、30进位与0→1→2→1，RAF只调度；实际play/pause/resume/step、hidden冻结/恢复不追赶和多周期像素检查通过。hidden通过document.hidden/visibilitychange受控执行，不冒充OS后台标签观察/MZ游戏。Profile/旧Compiler/槽位/布局/动画/通行语义没有实质改变；56旧payload/16PNG与8 pinned-core CPU支持外围影响范围，不机械重做MZ手工，也不把Profile已有阶段基线升级成新素材实测。

QA结构、seam/repetition/均值色变/亮度flicker/低visible-animation各指标和有限阈值局限、人工美术、Profile基线与artifactMZ分别呈现。无单一质量总分；纯色无缝或三帧几乎不动不代表优质。技术截图/CPU检查没有写USER_CONFIRMED，视觉回调控制仅false。已实际view_image查看关键source/mask/overlay、6scene、actual/reference、错误预算、迟到动作、三个新问题、恢复/中断与第360更新；**仅逐图收据列明的文件**，不声称全部输出都查看。[SHA/工具/范围](evidence/screenshots-viewed.json)。

上传仍singleRGBA8/sRGB、JSON8KiB/PNG4MiB/4096chunks/5s body、CRC/metadata/真实pixel/density、≤768×576平面且Studio96×144/density1或2。16 admission/read12/download2/heavy1＋wait1/job60s/native1无队列/5s/child close后release，全部保持。最大真HTTP平面1770381 encoded→1769472 RGBA，因Studio尺寸拒绝，child RSS **105627648 bytes / 73.430833ms**；**JS heap128MiB不是OS/native RSS硬cap**，不泛称任意媒体安全。错误/timeout/cancel只清自有stage，完整orphan和失败保留。[实际Host/forwarded/Origin/fetch-site控制](evidence/http-host.json) 与精确写client、资产ID/文件白名单、root/ancestor/fd界限与Vite不公开.local/全repo保持。

## 历史、作者证据和本轮失误

R1/R2/R3 Main原件分别308/386/437 payload逐SHA/bytes全匹配，原结论及失败/探针失误保留。[历史审计](evidence/historical-ledger-audit.json)。R3报告 `c18e713ac7e3ee14b9b342234af5d6d4fe9225a67a547ceb93b003ccbf4c6fdf`、ledger `104eb01097323fcccb7f2f6f92efccbabe561f47505eafc014f9782833d67d9c` 精确匹配。复用历史独立probe只在本review适配端口/source/docs/输出，保留原字节/SHA；所有本轮数据与执行新建。[来源](evidence/prior-probe-provenance.json)。

作者425 committed和1110 private索引项全部只读验真，包括bare contracts解析失败、精确label超时、accepted旧Build占heavy时提前15s断言失败及trace。[私有审计](evidence/author-private-audit.json)、[作者执行说明](evidence/author-execution-notes.json)。这些仍为作者证据，不替代本轮独立执行。最新helper先即时验证选择/notice，再等原30s真terminal、保留原15s decode；原5s/60s不改。R2旧collector627/628历史事实、235/1旧OpenAPI失败、b8 dev6/7/trace在原范围保留，不为文档/纯P3无限循环。

本轮自己的Pack私有cwd Git归属错误exit1、public-http旧指针观察exit1、探针更正/完整原脚本/日志/现场都留private；分别以正确冻结Git worktree和真实PG基线独立控制再跑，不修改产品或旧失败。public-http读取窗口另由R4-003实质复现，不写成仅探针失误。首个只读发现曾把自己的PG ownership凭据带进工具结果；该原始session仅私有，公开report/ledger/payload不含它，未认作API泄露。额外Vite SIGTERM exit143为自有服务正常关闭收据。无平台中断或重置正式轮数。[执行说明](evidence/execution-notes.json)。

Main一次prelaunch错误引用中间ledger后因缺prompt在Popen前失败，未创建Reviewer、消耗正式round0；本轮按实际最终a09 committedledger逐项验证，425正常。该事实单列为准备失败，不当产品缺陷/Review中断。[收据](evidence/prelaunch-not-review.json)。

**NOT_EXECUTED：** 新MZ GUI/编辑器手绘/游戏、用户亲自逐图艺术、Original Native Host、Map003补证、RPGReactor、OS后台标签实察、远端CI、真实视觉Provider/SDK/key/PromptRegistry/Composer/router/AI/收费/Redis/SaaS。旧延期不标完成；8 CPU与浏览器技术不是新GUI/用户艺术。步骤08/09/10 **NOT_STARTED**。

本轮所有自启API/Web已关闭，仅杀确认自有API；PG55485与全部17个自有DB、.env600、源/Build/stage/orphan/backup/dump/Mock、全部原失败和trace保留给Main。canonical未写。报告只对本文件按项目Prettier格式后hash；report与公开evidence逐文件SHA/bytes、明确相对reviewroot见 `evidence/ledger.json`，progress见 `progress.json`。**三项阻断整改、最新冻结候选独立验证前不得技术PASS/委托放行。** Reviewer完成后停止，不自行批准、发布或进入下一编号步骤。
