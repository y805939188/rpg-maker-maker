# 步骤07正式独立审查 — 第5轮

2026-10-14，Asia/Shanghai。结论：**PASS（当前授权范围的 whole-candidate 独立技术审查）**。P0：0；P1：0；阻断P2：0；新增非阻断P3：0。**STEP07-R4-001/002/003 均 FIXED / CLOSED，R1–R3 已关闭范围保持回归。** 本次未发现需要继续整改的具体阻断。正式编号为5，R1–4历史不重置；2026-10-14授权取消机械五轮上限，质量门禁未降低。

本结论不表示 Main 阶段批准、发布、用户逐图艺术确认或新产物 MZ 实机验收。本人未修改生产源码、正式tests/config、Main/Coding工作区或canonical状态，未commit/merge/push、自行批准或启动08–10。仅关闭本人启动的API/Web；PG、全部私有数据与失败现场保留给Main。

## 冻结绑定与独立性

| 对象                                     | 精确绑定                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Source / checkout HEAD                   | `59423201ba10ee71c3d1b04cebec69659017b7c7`                                                     |
| Author docs HEAD                         | `5c3361b9cb28a49c7cbdcabf28f03c8eba470d6d`                                                     |
| Author报告 SHA256                        | `32e3e43d2683f6da9df1fabe36a7a10bb4e50e704d2810452d6443982d83fcfd`                             |
| Author committed ledger SHA256 / payload | `e84a2c31aa23ca609b626da95eed3a674a9fc2fceb023761fcb28908d7f6c79c` / 703                       |
| Fresh工程 Build / payload                | `step07-59423201ba10-191301abe69ac02e` / 206                                                   |
| 工程 Manifest SHA256                     | `35fdc32783b4a07aff8a12bc3531385cc2dcb399f54d18da5fac1bdddd507814`                             |
| 完整 TargetProfile hash                  | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                             |
| 本轮六源纯UI首个 DB Build                | `cde64198fb8fbdf081fa57a24dcae9022ae57f7f7d52c231c89da42e89b5d6bf`                             |
| 同一标准 Export BuildIdentity            | `step05-pack-59423201ba10-4c1d16c4a1aa32ba`                                                    |
| 同一 Export Manifest SHA256              | `c61de6148ec16cc4cd4c8177bbbcb27fe8aca5d564a836147f27ac8f69703bbf`                             |
| 同一实际 ZIP SHA256                      | `da7c79fc9c6172da65b51359d5af47337f1d4ee04b1f6e0fee9f3b80f3695a9b`                             |
| Review root                              | `/Users/dingshinn/.codex/worktrees/step-07-review-round5/rpg-maker-maker/.local/step07-review` |

原生独立 thread `01a136c1-796d-7450-8445-0b57034cd6a6` 的实际 turn_context 确认 cwd、`gpt-6.1-sol`、`ultra`；Main客户端命令/角色收据请求 `step_reviewer / default(Standard)`。service_tier未暴露，服务端最终 model/effort/tier **UNVERIFIED_NOT_EXPOSED**。没有collaboration、Fast/Priority/Ultrafast或全局配置变更。[实际上下文](evidence/actual-client-context.json)、[客户端收据](evidence/client-configuration.json)。

全部 **2960** tracked source/tests/config/fixtures/docs/历史证据在开始与结束逐项 bytes/SHA一致，HEAD精确594、Git clean。[开始](evidence/source-before.json)、[结束](evidence/source-after.json)。作者资料通过git show读取，不改变冻结HEAD；SOURCE后708路径为README、基线/映射MD、报告和脱敏证据，逐项用途检查无执行配置/data/schema/Profile/fixtures影响。703 committed payload及报告验真；Fix3/Fix4 original-file-provenance共1116条私有原件SHA/bytes匹配。[资料审计](evidence/author-audit.json)、[私有原件审计](evidence/author-private-failures-audit.json)。

完整阅读AGENTS、两份正式plans、MZ_RUNTIME_ENVIRONMENT、STEP03–07契约、需求映射、本轮恢复授权、06最后R3 PASS及发布记录、Fix3/Fix4报告/ledger/失败、07前四轮完整原报告及必要探针。Main canonical只读，checkout旧state仅历史。四轮1561 payload逐SHA/bytes匹配，R3原report/ledger c18e…/104e…及R4原9beb…/a7a…精确匹配，原失败不改写。[历史审计](evidence/historical-audit.json)。未重开05全Review/MZ手工。

## STEP07-R4-001 — 原P2 BLOCKING，FIXED / CLOSED

位置：[store.ts:689](/Users/dingshinn/.codex/worktrees/step-07-review-round5/rpg-maker-maker/packages/persistence/src/store.ts:689)、[store.ts:717](/Users/dingshinn/.codex/worktrees/step-07-review-round5/rpg-maker-maker/packages/persistence/src/store.ts:717)、[store.ts:740](/Users/dingshinn/.codex/worktrees/step-07-review-round5/rpg-maker-maker/packages/persistence/src/store.ts:740)。责任是Persistence幂等发布与Studio完成协议；规格为产品§7.1/§10.2和STEP07同shortTX登记有效Export/FileObject、完成Job及current CAS。

原触发是已发布06 writer先登记同一真正owned四文件prepared Build，Studio后完成。ef30原件得到COMPLETED、FinalExport0、真实preview/download409；不是普通内部四文件非法。本轮直接运行未改正式新断言：实际c227六模块转译的旧writer先合法publish，随后Studio完成取得FinalExport1，preview/download200、八文件有效；重复两次登记数量不增加，旧内部Manifest/current/history不改。[实际旧writer](evidence/formal-http/r4-duplicate-legacy.json)。

既存标准Export、无standardFiles的真实标准resume、文件partial失败、事务失败和after-COMMIT丢回执均实际PG/文件执行。[四控制](evidence/formal-http/r4-finalization-db-rollback.json)。本人额外在**existing internal分支**装真实DEFERRABLE constraint trigger，于COMMIT拒绝Job完成：Job变FAILED、FinalExport0、原last-success和内部Manifest保持；解除故障后的幂等追加不把原失败Job伪改成功，新正常Job完成。[独立延期COMMIT控制](evidence/finalization-extra.json)。无fake owned JSON/CreateRecord/promise返回。

最小修复已实现：existing/new分支在同一短TX核对、登记真正已验真标准文件引用，finishJob核对事务中的Export；像素、文件验真/固化仍在TX外。普通domain IR/Mock/四文件接口保持原定义，23项06回归通过。无需进一步整改；关闭不表示批量修复旧数据。

## STEP07-R4-002 — 原P2 BLOCKING，FIXED / CLOSED

位置：[App.tsx:92](/Users/dingshinn/.codex/worktrees/step-07-review-round5/rpg-maker-maker/apps/web/src/App.tsx:92)、[App.tsx:119](/Users/dingshinn/.codex/worktrees/step-07-review-round5/rpg-maker-maker/apps/web/src/App.tsx:119)、api.listProjects。责任是Web列表请求归属；规格为产品§4.1/计划07正常项目创建、选择、刷新和有限恢复。

ef30正确新断言的原失败为真实list200含88项目、侧栏0（5000ms原预算），原日志/trace已审计保留；第一次端口/屏障部署失误不当产品结论。最新两个模式全部18项各自实际执行，其中新增五项真实迟到初始200＋上传201、非法422、采用201；列表数量与原200一致，persisted项目、source/recipe/Build/Canvas身份保持。创建后新列表先到、旧初始列表后到不回滚，选择/显式列表刷新、503/81s无自动重试/只GET恢复、卸载取消均通过。[生产列表](evidence/formal-production/r4-project-list/initial-upload.json)、[开发](evidence/formal-dev/r4-project-list/initial-upload.json)、[反向列表](evidence/formal-dev/r4-project-list/replacement-list.json)。

独立补查用新空PG库与真HTTP列表：加载与真实空200区分；创建后保留已有数据，在实际browser clock60s截止取消一条挂起真实200，81s无自动读，选择/标题/侧栏仍保持，再显式GET200恢复，无额外POST或整页reload。[空/加载/超时控制](evidence/list-extra/evidence.json)。

最小修复符合归属：列表自身generation/controller，只由替代列表读取或unmount失效，act不再作废唯一合法initial GET；StrictMode disposed发送前检查保留，加载/空/error与有界只读重读明确。无需进一步整改。

## STEP07-R4-003 — 原P2 BLOCKING，FIXED / CLOSED

位置：[studio-service.ts:261](/Users/dingshinn/.codex/worktrees/step-07-review-round5/rpg-maker-maker/apps/api/src/studio-service.ts:261)。责任是API相关元数据的一致读取与客户端终态消费；规格为产品§4.4/§7.1/§10.2及STEP07 current/history/终态、精确adoption。

已审计ef30正确原断言：真正COMMIT之后的HTTP200含COMPLETED但pointer=null；首次时序探针timeout单列保留。最新真实PG屏障读取首个构建跨COMMIT，响应为完整旧快照或完整新快照。production/development六阶段（首个、替换、真正history-only）实际浏览器保持整组Project/adoption/Build/Export/Job一致，正常继续poll到终态；current/needsRebuild、退役、processed真decode96×144/SHA/RGBA、selected Canvas/ZIP正确。旧Completed只历史，不回退current。[首个HTTP](evidence/formal-http/r4-consistent-first.json)、[两个客户端六阶段](evidence/formal-http/r4-ui-consistent-publication.json)。这些是HTTP16中的聚合case，不重复计作e2e18。

另独立在实际Project读后暂停，跨adoption COMMIT及真实upload＋recipe COMMIT：整组旧响应与此前完整快照相同；新GET取得新revision、source/recipe选择与needsRebuild，last-success保持。[额外一致性](evidence/metadata-extra.json)。没有改HTTP JSON、Prisma返回、Job状态或单独补pointer。

最小修复为5000ms timeout/1000ms maxWait、READ ONLY RepeatableRead短TX，关联DB元数据同快照捕获；文件/PNG/像素仍TX外，没有无限重试或任意Completed强制current。无需进一步整改。

## 原R1–R3回归

R3-001持续503/429/network，两模式精确五失败后实际browser clock81s＋20s静默，未知/last-success明确，显式只GET恢复真实COMPLETED、POST1。独立45s失败＋挂起重试共享截止 **61013ms / 3自动读**，manual failure保持停止；RUNNING时manual恢复后 **16正常读取**，max inflight1，成功poll不被五次预算截断。[额外预算](evidence/poll-budget-extra/evidence.json)。R3-002真上传/采用迟到201、同项目明确旧source/recipe、422、202、visual-false200、create201及正常成功全部prod/dev通过，旧提交真实保留，目标选择/notice/error/busy/Build无污染。

R2合法1300ms慢成功/失败、快控制/切项目取消保持single inflight；两个模式原三次无注入旧06 delivery-ready/processed未done窗口立即切人工项目，真PNG96×144/SHA/RGBA有效。原5s/15s/60s预算不变。实际heavy/wait压力、取消frame后ZIP、badPNG/timeout明确错误与只读恢复通过。独立两个正确部署模式各补persistent BUSY精确5attempt、4MiB+1、真96×143 decode拒绝、60s截止、old-frame/owner/Blob撤销；POST0，jobs/current不变。[开发生命周期](evidence/lifecycle-dev/evidence.json)。StrictMode disposed processed/list setup发送前microtask与原case保持。

R1八组真实source/A1/Manifest/Profile/ZIP/preview/processed root/ancestor/leaf/同内容移换与消失访问链拒绝，原inode恢复后SHA/bytes保持，current/history不变并真重建。10个独立fd/ancestor控制、真实backup输入root/parent/assets/manifest/dump、坏restore parent（新空DB/根外零文件）通过。合法自包含Export不读无关Source leaf，builds违规不误阻断安全objects。[公共访问链](evidence/public-storage.json)、[fd](evidence/storage-extra.json)、[恢复边界](evidence/restore-boundaries.json)。合作式可观察移换、O_NOFOLLOW/fd、Node无openat/不防恶意管理员ABA的局限保持。

## 本轮独立实际执行

Main只准备frozen install/generate与独占新空PG；本人check/build后migrate，不重复init/reset。所有验证child PATH固定Node22.21.1；pnpm10.20.0、PG14.20、Prisma6.19.3、Sharp0.35.5/vips8.18.7。PG55487/API4387/Web5287、.env600、归属root normalize trailingSlash实际验证。额外数据库均本cluster新空DB，资产根原不存在；所有原数据/失败保留。

正式06/07 tests/config从自己的formal-workspace运行，只链接冻结源码/dist/modules；实际e2e需repo cwd，从本checkout运行未改原tests，输出由自有ignored路径承载。Vite privacy原test的临时synthetic canary在自己的允许树创建/清除，不改tracked文件。pack原dist脚本只出版review内ignored pack-workspace，未写根artifacts。准确argv/cwd/exit/耗时及private log SHA/bytes见[commands](evidence/commands.jsonl)。

| 动作                                                   | 本轮结果                                                                                                                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm check / 本人migrate                               | 266/266，方向/type/lint/format/build/11生产exports；空主库全部5迁移，无reset                                                                                           |
| 原step07 config/tests                                  | 16/16，542.100s；HTTP/PG/输入/预算/取消/child close/cleanup、COMMIT/CAS/late/retired/旧06/restore/新三个反例                                                           |
| 原step06 config/tests，新独占regression DB/root        | 23/23，203.168s，原60000ms预算；lease/fence/维护队列/并发/真实故障/Mock重启/备份恢复                                                                                   |
| API integration / Vite privacy                         | 3/3、5/5，真HTTP/PG、实际Vite/private/Origin/symlink保护                                                                                                               |
| 原production / development e2e                         | 18/18 + 18/18，458.842s / 486.175s；原13＋列表5，两个完整API/Web模式                                                                                                   |
| Fresh工程＋开发/补查后复核                             | 两次206文件SHA、独立BuildIdentity和Manifest匹配                                                                                                                        |
| 生产JS / 原Pack suite / pinned native CPU              | 78/78；8包56旧payload/16PNG字节相同；8/8、3600形态/状态，CPU非GUI/game/art                                                                                             |
| 独立六源纯UI＋手写Pillow参考                           | 97.321s＋0.704s；24scene/4creative/nearest/真实换Build/完整透明图集/4ZIP                                                                                               |
| 本人新增PG/列表边界                                    | existing分支真实延期COMMIT rollback；adoption/source/recipe跨COMMIT；真实空列表/60s/81s只读恢复                                                                        |
| 独立poll/资源生命周期/公共路径                         | 共享60s及>5正常成功poll；两个模式BUSY5/真实decode/body/Blob；root/fd/HTTP访问链                                                                                        |
| 旧06 writer→一致backup→空DB+新root restore→Studio/Mock | 221.559s，真六模块旧writer4文件、source/recipe/current/history/retired重放；known同ID、unknown不重提、late不adopt                                                      |
| 恢复实际UI/再建/保护转换/PNG/ZIP                       | 46.977s＋13.368s；GET409只读、坏Origin/缺client POST403、合法UI POST200；old Manifest/current/history不改，真再建和同网络像素/ZIP                                      |
| 稳定实际browser clock＋独立参考                        | 7.453s＋0.094s；12+12源/交付actual RGBA、29/30、59/60、89/90、119/120、239/240、359/360三周期                                                                          |
| 真自有API SIGKILL/restart                              | POST202/QUEUED及PID25980 ownership先核对；恢复FAILED/INTERRUPTED，last-success `9d43118cbad617495000e36bcabee8d47121b158e8cc4863f5393bd3d3c9797c` Canvas/ZIP原字节保持 |
| 所有实际标准ZIP                                        | 16份真解压/CRC、精确8安全无重复成员、每项bytes/SHA、BuildIdentity/Profile及768×576 rawRGBA一致                                                                         |
| 结束保护                                               | 2960 tracked bytes/SHA相同；精确HEAD/git clean；API/Web无listener，PG/所有private现场保留                                                                              |

计数不相加为覆盖率。以上全部是本轮独立执行；作者check/703证据与ef30反证单列，不替代本轮执行。必要正式套件及新增实质探针均首次通过；无平台中断/恢复次数或正式编号重置。

## 交付、像素、恢复与质量边界

标准八文件精确A1.png、A2.png、pack.json、history.json、layout.json、sources.json、INSTALL.md、manifest.json。完整TargetProfile封装Manifest，profile HTTP返回同内容，不是第九文件。实际网络A1/A2/Manifest/Profile、selected DB Build/Export、真正下载ZIP逐字节一致；内部四文件从未冒充标准八文件。[16 ZIP](evidence/all-standard-zip-verification.json)、[独立像素/网络](evidence/browser-pixel-zip-verification.json)、[恢复像素](evidence/restored-pixels/verification.json)。

原创输入来自保留公共母版原PNG，独立Python/Pillow以手写quarter坐标、occupancy、原mask/overlay构造expected，不调用生产Compiler/descriptor/renderer、不继承旧CPU截图。24场景、4创作state、完整透明保留区、integer nearest1×/2×和实际换Build像素全部相等。actual play/pause/resume/step、60逻辑updates/s、Profile30进位和0→1→2→1、hidden冻结/不catchup及12+12三周期像素通过。hidden用document.hidden/visibilitychange受控执行，不冒充OS后台观察。[clock](evidence/clock-canvas-verification.json)。

恢复库 `tileset_review_restore_72ccba6ceb8940ea98f07bfb4060c0ef`、新restored-assets实读8 source/2recipe/6 Build（含独立追加及historical Mock候选），随后UI真实再建；known external ID保持，unknown同记录不新submit。旧06 writer真实四文件 `6667a3771a904e74c9d79ce6b48d4bc5edb77c3f53cacd52991a203535c5bf3c`，GET不写、保护POST追加标准包，不改内部Manifest/Pack/Slot/current。恢复current标准BuildIdentity `step05-pack-59423201ba10-f7758b1095043157`、Manifest `dd7bfae2ba072f2919e7040a8ac022a988bd468d9276fe499b59c9fadf664185`、ZIP `82ecc85e532926466e8775c669520ea58e6b42b5d2db664176e69ab0bb18d043`。[整合](evidence/integrated-recovery.json)、[中断](evidence/interruption-after.json)。

模块方向、源/像素独立所有权、通用Built仅IR、后端PNG/source/IR/Compiler/Pack/Manifest/file/CAS硬校验保持。结构失败不能交付；失败Build不替换last-success、旧快照只历史、反向完成/同旧槽位竞争/retired精确依赖恢复由真实06和07链路验证。Profile/Compiler/槽位/时间/通行实质语义未变，旧56payload/16PNG及8 CPU支持外围范围；不机械新增MZ手工门禁。

HTTP政策没有放宽：JSON8KiB、PNG4MiB/4096chunks/5s body、singleRGBA8/sRGB/CRC/metadata/真正pixels/density，adapter≤768×576且Studio96×144/density1或2；16 admission/read12/download2/heavy1+wait1/job60s/native1无无限queue/5s、取消等child close后释放、仅清自有stage。最大实际入口1770381 encoded→1769472 RGBA，因Studio尺寸拒绝，child RSS **106496000 bytes / 74.191125ms**。**JS heap128MiB不是OS/native RSS硬cap**，不泛称任意媒体安全。精确Host/Origin/写client、assetID/文件白名单/root/ancestor/fd和Vite不公开.local/全repo通过。[入口测量](evidence/formal-http/largest-http-decoded-plane.json)、[Host控制](evidence/http-host.json)。

QA STRUCTURAL_PASS、seam/repetition/颜色均值/亮度flicker/低visible-animation有限风险与阈值局限、人工视觉、Profile已有阶段基线、具体artifactMZ分别展示；没有单指标质量总分或把纯色无缝当优质。本轮10张关键图已实际view_image，范围/SHA/工具逐图记录，不声称全部输出人工查看，也不写USER_CONFIRMED。[查看收据](evidence/screenshots-viewed.jsonl)。旧探针界面文字R4只是保留的fixture label，本轮数据/执行/正式编号均为5。

## 失败保留、未执行与结束

Fix3根contracts解析失败、exact label超时、accepted旧Build占heavy时提前15s图片要求失败的原日志/trace保留；最终helper立即验证目标选择/notice，然后原30s等真terminal、原15s decode，原5s/15s/60s未放宽。Fix4初次屏障/端口/类型/about:blank/错误prod→dev部署失败亦保留。最新正确断言在ef30触发真实0 Export、sidebar0和mixed null pointer；不是把探针假设修正当产品修复。[原反证](evidence/author-old-ef30-new-consistency-assertion-corrected.log.json)。

本人探索中的ambiguous ef30、尚未创建的pack cwd、错误文件名/lsof参数及继承receipt的unused regression-root label均只修探针/收据，原件/说明保留，不改产品。actual regression root为formal-workspace/.local/assets。一次own ownership工具打印包含私有密码，只在native原session，公开report/ledger/payload无该值，不当API泄露或PASS证据。[执行说明](evidence/execution-notes.json)。

**NOT_EXECUTED：** 新MZ GUI/编辑器手绘/游戏、用户亲自逐图艺术、Original Native Host、Map003补证、RPGReactor、OS后台标签实察、远端CI、真实视觉Provider/SDK/key/PromptRegistry/Composer/router/AI/收费/Redis/SaaS。旧Host/Map003延期不标完成；CPU/browser技术不升级为新GUI、用户艺术或新artifact实机通过。步骤08/09/10 **NOT_STARTED**。

所有自启API/Web已正常关闭（SIGKILL仅上述确认自有API），PG55487与所有自有DB/.env600/source/Build/stage/orphan/backup/dump/Mock/失败/trace保留，Main安全确认后管理；canonical未写。[保留收据](evidence/preservation.json)。报告仅自身按项目Prettier格式后hash，报告/进度及公开payload逐项SHA/bytes、明确相对reviewroot见 `evidence/ledger.json`。Reviewer到此停止，不自行批准、发布、合并、推送或开始下一编号步骤。
