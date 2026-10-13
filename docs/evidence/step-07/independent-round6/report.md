# 步骤07正式 Independent Review — 第6轮

2026-10-14（Asia/Shanghai）。结论：**PASS，最新整合候选当前授权范围的 whole-candidate 独立技术审查**。P0=0、P1=0、违反当前硬契约的阻断P2=0、新增非阻断发现=0。R4三项保持 **FIXED / CLOSED**，R1–R3已关闭范围保持。真实编号为6；R1–4 REQUIRES_REVISION和R5 whole-candidate PASS原件保留，不清零、不依据机械五轮上限停止。

这是独立技术结论，不是Main委托验收、用户艺术批准、远端CI成功或步骤07发布。最新candidate CI及正常main整合/postmerge/push/readback/mainCI仍由Main完成。本人未改production/tests/config、Coding/Main或canonical，未commit/merge/push/批准；08/09/10 **NOT_STARTED**，到此停止review。

## 精确绑定与会话

| 对象                                     | 实际绑定                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Source / managed HEAD                    | `87e13a8a99db3058dce8680d3ae985969b8a9bac`，detached、Git clean                                |
| Author docs HEAD                         | `1e83c986091739f76899d35eeeb5879e7bf0bf58`，git show只读                                       |
| Author report SHA256                     | `56ead43e54f2d7acc6fb884b0b7ac64b4245492713aa6ccfc820b5b65a332673`                             |
| Author ledger SHA256 / committed payload | `101b6fe7b45f255ef4c839930f7af2095986da6f66ae08f5b2875aa55c2f5cc4` / 50                        |
| 本人独立工程 Build / payload             | `step07-87e13a8a99db-cbff8b17e89c5bee` / 206                                                   |
| 本人工程 Manifest SHA256                 | `e186f5b1af6cd2cbe58f310f796cb9698119535a615a0e7db2bf94ed8f20ac97`                             |
| 完整 TargetProfile 实算 hash             | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                             |
| Reviewroot / 文件键基准                  | `/Users/dingshinn/.codex/worktrees/step-07-review-round6/rpg-maker-maker/.local/step07-review` |
| Native session                           | `01a1372f-9fb6-7922-8141-8f93411032e1`                                                         |

实际本轮turn_context核对cwd、model=`gpt-6.1-sol`、effort=`ultra`。Main客户端CLI/角色收据请求step_reviewer、default(Standard)。turn_context.service_tier为空；**服务端最终model/effort/tier为UNVERIFIED_NOT_EXPOSED**，客户端请求不冒充最终服务端证明。无collaboration、Fast/Priority/Ultrafast或全局配置变更。[配置核对](evidence/configuration.json)。

完整独立阅读AGENTS、产品V0.5、十步plan、MZruntime、STEP03–07契约、需求映射、06–07及2026-10-14恢复授权、唯一Main canonical、完整R4/R5原报告、Fix4、e195 history报告、新prerequisites报告、真实CI失败receipt及必要原log段。checkout旧state仅历史；Main canonical只读。06已PUBLISHED，不重做或重复发布。

## 整合范围、原件和影响依据

从594到87，唯一可执行差异是`.github/workflows/ci.yml`：fetch-depth0及既有Chromium install提前。其余README/docs是历史交接、要求映射、报告和证据。**195个production/tests/config/lock/schema/contracts/fixtures/Profile文件，在594/e195/87逐bytes/SHA完全一致**，逐项记录见[执行文件映射](evidence/execution-file-byte-map.json)。Source87后到docs1e的52路径全部是资料，JSON已解析、用途逐项检查；raw脚本均是JSON中的文本，标准production/test/build没有导入它们。[资料用途](evidence/post-source-doc-purposes.json)、[执行引用审计](evidence/document-runtime-audit.json)。

本人使用pnpm check的真实clean TS/API/Web构建，再在独立完整检出的clean HEAD87运行**未改**engineering builder，得到同一BuildIdentity/Manifest。全部206个实际payload逐bytes/SHA匹配作者和live文件；与R5工程比较仅`apps/api/dist/resources/studio.json`的`context.commit`改为87，JSON其余内容及205文件不变，完整Profile实际重算一致。[工程实读](evidence/engineering-verification.json)。R5/e195/87作者历史工程Manifest及每套206文件只读重新验真，未覆盖或改旧Manifest。[历史Build](evidence/retained-author-builds.json)。

新作者50、history62 committed payload逐SHA/bytes验真；作者私有原件索引47+59项重新hash，不发布其私有字节。R4原430和R5原514独立payload逐项验真，原结论不改。[来源审计](evidence/evidence-origin-audit.json)、[原件索引核验](evidence/author-original-provenance-audit.json)。

R5原独立Source仍是`59423201ba10ee71c3d1b04cebec69659017b7c7`、docs`5c3361b9cb28a49c7cbdcabf28f03c8eba470d6d`，report SHA `81743cc098390f726ccba1c8548e253b303998b16e53d02bc62dd8b1be45ff85`、ledger SHA `8b5e8f0743b872159e2607cef4dcc6e4568565d7b596e7213734f808a183533e`。其whole-candidate审计和执行证据可用于本轮**相同执行字节**的未受影响部分；没有把这些结果重标为Source87本轮重跑。新CI前提、最新构建身份及关键真实HTTP/PG/browser/list/ZIP由本人本轮验证。整体PASS由这些独立证据共同支持，不是作者证明、Main自查或子模块局部PASS。

## 两个真实CI执行前提

原CI38464677883/head70bcdcc3cdd44da983bddb87a0ece1057175f188仍为 **FAILURE**。Main原log实际103227bytes/SHA `60a318ff8b476934fdf6a053577419b5b88b4007faa136486896b2a2eda6704b`匹配：PG06真实23PASS；HTTP16为14PASS2FAIL，旧writer的git show exit128及首个Chromium消费者缺headless-shell1248。没有用临时空/过时job steps猜阶段。[原log核验](evidence/actual-ci-failure-audit.json)。

独立创建bare origin和新shallow/full对象库，经真实file transport fetch，无alternates、共享对象目录或相关env覆盖。浅检出exact87/is-shallow=true/可达1commit，六次c227 git show均exit128；该反证保留。完整检出exact87/is-shallow=false/173可达commit，六源SHA/bytes与c227原对象相同。另核对全branch/tag refspec、无depth参数路径。正式真实旧writer发布后，实际加载的六JS逐字节等于独立ESNext/ES2022转译的旧源，没有当前writer/Mock替代。[Git控制](evidence/git-history.json)、[对象隔离](evidence/git-object-isolation.json)、[实际加载字节](evidence/actual-old-writer-transpilation.json)。

固定actions/checkout pin的action.yml、input helper、source provider、Git manager和实际dist bundle原件已独立取得/hash。默认1和0走全history路径在真实运行bundle中成立；扩展history是执行前提，不是新模型功能。来源：[固定input helper](https://raw.githubusercontent.com/actions/checkout/11d5960a326750d5838078e36cf38b85af677262/src/input-helper.ts)、[固定source provider](https://raw.githubusercontent.com/actions/checkout/11d5960a326750d5838078e36cf38b85af677262/src/git-source-provider.ts)。本机没有执行整个GitHub action或修改global safe.directory/credentials。

新专属浏览器缓存最初不存在且创建后为空；项目真实1.64.0 Chromium launch复现缺1248二进制，捕获反证的exit0不等于launch PASS。随后本人在同一空缓存执行**工作流原命令**`pnpm exec playwright install --with-deps chromium`一次，实际下载Chromium/headless-shell1248；正常默认launch、DOM、版本156.0.8078.4及close通过。CDP浏览器PID/ps确认实际启动headless-shell，二进制176747664bytes/SHA `77d8278b1ac9d0687fad4e817ea83023ede09b1deef36e1864b49ba194ac9634`，无executablePath/channel覆盖。[空缓存](evidence/browser-empty.json)、[实际进程](evidence/browser-actual-process.json)。Mac本地安装不冒充Linux系统依赖或Ubuntu CI执行。

独立YAML语义比较只允许上述history/order差异：安装精确一次（index10），严格早于首个浏览器消费者step07（index11）和两模式e2e；actions pin、services、权限、Node/pnpm/Playwright、所有tests/assertions/budgets不变。check/privacy/API/step06没有更早Chromium launch。[实际workflow语义](evidence/workflow-semantics.json)。[Playwright官方CI要求](https://playwright.dev/docs/ci)支持先安装browser及依赖的顺序；本结论主要由原失败、空缓存控制与实际安装/消费者执行确定。

## 本轮实际执行与失败保留

Main仅install/generate、新空专属PG init。本人生效PATH固定Node22.21.1、pnpm10.20.0；PG14.20来自`/opt/homebrew/opt/postgresql@14/bin`。本人先验证PG55489/data_directory归属和public schema为空，再施行五个迁移；不重复init/reset已有数据。自己的.env0600只在进程RAM读取，额外DB均在本cluster新建，源/资产/备份根均为自己的新ignored目录。[环境](evidence/environment.json)、[准确命令/exit/耗时/私有log SHA](evidence/commands.jsonl)。

| 本轮实际动作                  | 准确结果                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| pnpm check                    | 266/266，26文件、方向/type/lint/format/clean build/11生产exports，76.650s                                           |
| check内原Vite privacy         | 5个case包含在266内；实际530 probe，Source87；非另一次test:dev-privacy，计数不重复相加                               |
| 本人五迁移                    | 新空主库全部5迁移成功，1.827s；无reset                                                                              |
| 原test:step07首次全16         | **15PASS1FAIL**，414.703s；1为辅助checkout Web root处于私有.local下被原Vite策略403，原失败不删除                    |
| 正确部署的原双模式COMMIT case | **1PASS、15SKIPPED**，156.470s；原180000ms预算/全部断言未改，production/development首个、替换、真history-only六阶段 |
| 本轮distinct HTTP/PG16覆盖    | 首轮15成功＋纠正部署后原第16项成功；**不声称一轮全16首次PASS**                                                      |
| API原integration              | 3/3，1.245s，INTEGRATION_API_PORT=4389                                                                              |
| 原项目列表e2e子集             | production5/5、development5/5，39.864s/55.729s；仅原列表文件，没有声称全18+18重跑                                   |
| 本人selected Export GET读回   | 29.139s；6份真实current/history ZIP，PNG/Manifest/Profile/QA/descriptor同selected Build                             |
| 独立ZIP验真                   | 6份CRC、精确8安全无重复成员、7payload bytes/SHA、网络PNG/Manifest/Profile全部匹配Source87                           |
| 本人view_image                | 实际查看production/development替换构建2张关键图，逐图SHA收据；技术查看不写用户艺术PASS                              |
| 结束保护                      | 全3729 tracked bytes/SHA相同；HEADexact87/detached/git clean；live206仍匹配Manifest；API4389/Web5289已正常关闭      |

首次正式HTTP部署失败的原因在原`vite.config.ts`的`**/.local/**`deny规则：新物理checkout放在.local内不属于正常Web部署。没有删除规则、扩根、修改正式test/config或把403误报产品缺陷。改用自有formal-browser工作目录，仅链接未改的top-level源码/正式tests，另有自己独立Git对象库和私有输出；实际原Vite页面200控制与随后双模式原case PASS确认部署。[部署纠正](evidence/formal-browser-deployment-correction.json)、[真实200](evidence/proper-vite-200-control.json)。首轮PG/文件/HTTP数据保留，定向case使用新的自有DB。engineering首次辅助目录symlink被trailing-slash ignore判为untracked，clean gate正确拒绝；换成普通生成目录后原builder成功，原log/说明保留。探索中猜错两个源码文件名仅read失败，未改产品。没有平台中断、模型/速度/权限绕过或正式编号重置。

## 前轮发现状态与整合支持

| 原发现/严重性            | 文件+行、规格、原触发                                                                               | 当前actual/expected、独立repro、blocking、最小修复                                                                                                                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R4-001 原P2              | `packages/persistence/src/store.ts:689,717,740`；产品§7.1/§10.2；真实旧06四文件先登记同owned Build  | **FIXED/CLOSED**。本轮真实c227先publish，Job COMPLETED时FinalExport1、preview/ZIP200，重复两次登记不增；既存标准resume、文件失败、TX rollback/丢回执保持历史和last-success。expected同TX Export/FileObject＋Job满足；blocking=0；既有registerExport→finishJob修复足够，无新minimal fix。R5额外existing分支真实延期COMMIT控制按相同字节继续适用。 |
| R4-002 原P2              | `apps/web/src/App.tsx:92,119`；产品§4.1；迟到合法initial list200跨上传/失败/采用，被无关action失效  | **FIXED/CLOSED**。本轮原5+5真200/201/422、persisted selection、反向创建替代列表、只读恢复/取消通过；expected列表自身世代而非action世代满足；blocking=0；既有listGeneration/controller足够，无新fix。                                                                                                                                             |
| R4-003 原P2              | `apps/api/src/studio-service.ts:264,319`；产品§4.4/§7.1/§10.2；跨真实COMMIT混旧pointer和新COMPLETED | **FIXED/CLOSED**。本轮首个HTTP跨COMMIT及两个客户端六阶段整体旧/新快照正确；true history不回退current，processed decode/SHA/RGBA、preview/ZIP及退役状态一致。expected5000ms/1000ms只读RepeatableRead短TX满足，文件/pixel仍TX外；blocking=0；无需新fix。R5 adoption/source/recipe额外跨COMMIT按相同字节适用。                                      |
| R1–R3 原范围             | root/ancestor/fd与成员身份；single inflight/processed BUSY；5连续错误60s/迟到写scope                | **FIXED/CLOSED_IN_ORIGINAL_SCOPE保持**。本轮15个正式HTTP成功、check及列表5+5覆盖适用边界；其余独立动态探针明确归属R5原记录，不重标本轮。blocking=0，无新fix。                                                                                                                                                                                    |
| 新CI history/browser前提 | `.github/workflows/ci.yml:24,26,41,42`；计划工程CI与真实旧writer/Chromium消费者                     | 本轮浅反证/完整对象六源/旧writer实际PG、空缓存/原install/真实consumer验证完成。最新workflow前提 **FIXED_INDEPENDENTLY_SUPPORTED**；旧CI FAILURE保留，新远端CI **NOT_EXECUTED**，是Main剩余发布门禁。                                                                                                                                             |

完整[双客户端本轮收据](evidence/formal-http-browser/r4-ui-consistent-publication.json)、[旧writer](evidence/formal-http/r4-duplicate-legacy.json)、[标准8文件/网络ZIP](evidence/download/independent-zip-verification.json)、[列表生产](evidence/list-production/initial-upload.json)、[列表开发](evidence/list-development/initial-upload.json)。R5 independent原件提供未受影响部分的适用支持，作者证据不替代独立结论。

模块方向、源/像素独立所有权、domain Built仅IR、真实source→IR→Compiler→Pack→immutable files→FinalExport→Job/current→下载/UI链保持。HTTP/PNG/native/Host/Origin/client/path/Vite预算不放宽：JSON8KiB、PNG4MiB/4096chunk/5s、≤768×576且Studio96×144/density1或2、16admission/read12/download2/heavy1+wait1/native1/5s/child close后release。最大真HTTP平面、路径替换、取消、cleanup及真实TX/CAS/late/retired/backup-cleanrestore-rebuild均在本轮成功的原15项中实际执行。JS heap128MiB仍非OS/native RSS硬上限，合作式路径/O_NOFOLLOW/fd而非恶意管理员ABA承诺保持。

当前metadata/Manifest context绑定87；历史Build/Manifest不改Source。QA STRUCTURAL_PASS、有限视觉risk、Profile阶段基线、用户艺术和具体产物MZ实測分开。本轮真实GET QA保持artifactMz=NOT_EXECUTED、未USER_CONFIRMED；亲自查看两图可见AI尚未开放。普通tests/CI仅人工公共fixture/Mock；没有真实视觉API/key/SDK/PromptRegistry/Composer/router/收费/Redis/SaaS调用。

## 明确未重跑与保留

R5原独立记录为check266/HTTP16/PG06 23/API3/privacy5/prod18+dev18、24scene/4creative、12+12clock/3cycle、16ZIP、backup-cleanrestore-rebuild、Mock known同ID/unknown不重提、真API SIGKILL/restart last-success保持。本人已验真其514payload和报告，执行文件195及205compiled payload相同，因此这些**不受CI整改影响**的独立证明继续适用；本轮只声明上述实际执行范围。[分开统计](evidence/scope-results.json)。

**本轮NOT_RERUN：** 完整PG06 23、完整prod/dev18+18（只列表5+5及HTTP双模式六阶段）、独立24scene/4creative像素reference、12+12clock三cycle、旧56payload16PNG/JS78/nativeCPU8、完整Mock known/unknown探针、API SIGKILL/restart。没有必要机械重复不变的MZ手工/艺术/AI。

**NOT_EXECUTED：** 新GitHub candidate/main CI、Linux系统依赖安装/GitHub action/Ubuntu runner、Main技术验收/merge/postmerge/push/readback/publication、新MZ GUI/编辑器手绘/游戏、用户艺术、Original Native Host/Map003补证/RPGReactor/OS后台标签实察、真实视觉模型等08–10能力。旧延期不标完成；独立PASS不表示上述门禁已完成。

更正服务收据已独立核对：e195旧组合lsof exit1的原stdout实际含API22456/PG51121；新报告明确撤回“全部无listener”及UNVERIFIED_EXTERNAL_STATE_CHANGE推断。原280bytes/SHA661c…和六份单端口/pg_ctl/两端口/原组合原log均匹配，新Main同PID只读receipt适用。没有实际restart证据；本人未操作Coding服务。[原件核对](evidence/service-erratum-audit.json)。这不是产品失败或外部状态变化证明。

结束时PG55489仍运行，**5个自有tileset_数据库**、.env0600、所有源/Build/stage/orphan/backup/dump/Mock/原失败/browser缓存和私有logs保留Main安全处理；自启API/Web及短暂browser正常关闭。标准check固定的自身ignored privacy输出原件留本树，公开副本已hash；不改正式test输出策略。全3729 tracked原字节不变，未写canonical。[保留](evidence/preservation.json)、[DB归属](evidence/retained-databases.json)。

报告、progress与evidence的文件键以本reviewroot相对路径表示，SHA256+bytes由`evidence/ledger.json`封存。凭据/env/PG ownership全值/dump/runtime/私有输入/敏感raw logs不入public，RAM凭据扫描记录单列。Reviewer停止；Main可按预授权继续必要candidate CI及发布门禁，08–10保持NOT_STARTED。
