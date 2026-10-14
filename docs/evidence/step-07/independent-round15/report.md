步骤07正式 Independent Review，第15轮，2026-10-15（Asia/Shanghai）。**REQUIRES_REVISION / CHANGES_REQUESTED；不能 WHOLEPASS。** P0=0、P1=0、当前必要测试硬契约阻断 **P2=1：STEP07-R15-001 OPEN**。正常必要套件均通过，但真实网络坏 PNG 的负控能穿过当前完整六阶段消费者。此前1–14轮的编号、失败和PASS保留；本轮有独立定位及完整反例进展，不清零轮次或降低门禁。

Reviewer没有改生产实现、正式tests/config、Main/Coding/canonical或旧Manifest，没有approve/commit/merge/push/release，没有collaboration、Fast/Priority/Ultrafast或global配置操作。仅本树ignored审查资料、受控诊断fixture及正常命令生成物有写入。06仍PUBLISHED，08–10 NOT_STARTED。

| 冻结对象 | 精确绑定 |
| --- | --- |
| Source / detached clean HEAD | `39ec791c4b79c20f2afb3ac88ed5bc06dfb71bfd` |
| authorDocs，只读Git对象 | `2320e9e9fbfea2ad8e60ab29dafdeef91f0075eb` |
| Author report SHA256 / bytes | `4012c07c3cc28699b7ec625653e9c899df8c948a0dc6cd2778e8461da836fe8d` / 12583 |
| Author ledger SHA256 / payload | `8f4babb831b0efe974653200272b0e89284c0271a72b927088f996dc5f289242` / 183 |
| Engineering Build / actual files | `step07-39ec791c4b79-d3464c591f56bb89` / 206 |
| Engineering Manifest SHA256 | `4830c910fb373c87240e085175b0fbe015d131a8fa015c78d5536d820078c0d2` |
| Full Profile hash | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793` |
| 本reviewroot，所有ledger文件键相对此根 | `/Users/dingshinn/.codex/worktrees/step-07-review-round15/rpg-maker-maker/.local/step07-review/independent-round15` |
| Native independent session | `01a13b44-1d10-76e0-bd99-fa3b4152cd64` |

本轮actual turn_context可见model=gpt-6.1-sol、effort=ultra、精确cwd及default会话模式；本轮原生CLI明确请求step_reviewer、gpt-6.1-sol、ultra、service_tier=default(Standard)。**隐藏effectiveTier、服务端最终model/effort/tier均UNVERIFIED_NOT_EXPOSED**，不把default会话模式或CLI请求冒充最终服务端字段。[可见配置](evidence/session-preflight.json)。

完整独立读取AGENTS、两份正式plans、MZruntime、03–07契约及要求映射、06最后R3/发布、06–07原授权和2026-10-14恢复授权、R4–R14完整报告及真实范围、最新作者报告/差异。Main唯一canonical只读，checkout旧state仅历史；原装Host、旧Map003和新产物MZ/用户美术延期保留，不重复开发/发布06或机械新增外围MZ手工门禁。[阅读索引](evidence/reading-index.json)、[canonical只读](evidence/canonical-readonly.json)。

**STEP07-R15-001 — P2 BLOCKING：真实坏PNG的强制CRC不验，完整必要消费者可假PASS。**

- **位置/责任：** `apps/api/tests/studio/integration.test.ts:1429–1440`的必需processed图像消费者，以及`apps/api/tests/studio/received-resources.test.ts:117–130`的正式rendered控制，只有SHA、Sharp解码、尺寸/DOM RGBA，没有PNG容器/chunk CRC验证。新`received-resources.ts:190–212`可保存完整Content-Length且ERR_ABORTED的实际流字节；运输完整并不证明这些字节构成合格PNG。责任是本轮新增网络回执的必要测试可靠性，**不是已证实的生产编码器坏包缺陷**。
- **规格：** 本轮明确要求同request完整字节、PNG CRC/结构、96×144解码与DOM RGBA一致，坏PNG须在原预算拒绝；Pixel Contract第30行明确“每个PNG chunk校验CRC；坏checksum即使Sharp能够解码也必须拒绝”。产品§11.1/§11.3要求硬校验和可信实际产物证据。仅解码不满足此项。
- **独立单请求真复现：** 从当前正式test AST精确提取`rendered`，只加export/同名imports并转译，全部断言原字保留；没有编辑正式test。真实loopback GET200/image/png，先发8字节、确认实际协议流，再发剩余PNG，消费者读完声明长度后取消。仅将821字节原PNG最后一个IEND CRC bit翻转，长度不变；浏览器真实decode96×144，DOM SHA=`003dcacef36fa73338fbdbdfc98f69046e7581f1fc147be6ebc945c95ea20f57`，同request实际捕获字节/SHA完全一致、transport仍failed/ERR_ABORTED。**当前正式rendered函数返回成功**；有效控制也成功。独立CRC得到应为2923585666、实际存储2923585667，明确拒绝。没有从DOM/Blob/canvas反造网络字节、fakeResponse或补GET。[原消费者反例](evidence/wire/crc-candidate-counterexample.json)、[实际坏PNG](evidence/wire/crc-invalid.png)。
- **完整原六阶段真复现：** 自有ignored setup仅在真实`StudioService.processed`执行完成后，对其返回的实际HTTP fixture字节做同一IEND CRC bit翻转。真实处理、源/IR/DB/Build/Export不改；服务端发送真实body、正确新长度/SHA，真实浏览器实际收到并显示这些字节。运行未改原case及所有断言、180000ms总预算、5s必需回执/15s PNG/60s job与barrier/30s终态。**完整production/development first/update/true-history-only结束，CLI exit0，1PASS/15个selector SKIP，119.523s**；两模式各5个processed GET，10张实际坏CRC图全部被接受。末processed结束115852ms，非超时后的清理伪成功。独立Python zlib逐chunk拒绝10张坏PNG；10张原件全部CRC合法，坏件仅IEND一位不同，Pillow仍解码同样96×144和相同RGBA。[完整反例与10份wire身份](evidence/crc-full-case-verification.json)、[原阶段日志](evidence/crc-sixphase-counterexample.log.txt)、[实际mutation](evidence/crc-sixphase-counterexample/actual-network-mutations.json)、[必要受控fixture](evidence/reproduction/crc-sixphase.setup.ts.txt)。此exit0只表示COUNTEREXAMPLE_CAPTURED，**不记坏PNG、候选或该负控为PASS**；15 skip只是原16项中选择单case，不冒充全16重跑。
- **actual / expected：** actual：完整字节+相同SHA+可解码/相同RGBA使无效强制CRC的PNG通过必需gate；expected：在同一实际request字节上验证PNG signature/chunk边界/CRC/IEND完整结构，再结合现有身份/尺寸/像素验证，原预算拒绝此坏件。
- **最小整改：** 在必需PNG消费边界增加有界结构/逐chunk CRC验证，保留真正request/loader/document/fullURL、两通道、完整长度及所有取消/失败保护；增加真实200完整长度坏CRC、有效PNG控制，并让该完整六阶段负控在首次坏图处明确失败。可由Coding选择合适的共享test helper位置，不需要为此改变生产编码器、Profile、HTTP资源政策或增加处理请求/预算。重新冻结后独立复审。当前blocking=1，Reviewer未自行修复。
- **与前轮关系：** 这是当前明确PNG结构负控范围的新测试缺口；没有复开R7已关闭的ZIP local/central/EOCD CRC，也没有把R13 same-document或R14 Job重放优化判回未修。旧finished通道也可能受同一消费者弱校验影响；本轮另证明新增complete-abort通道接受坏CRC。此前PASS仍只保留其原Source和实际验证范围。

Main原首轮CI失败本轮完整hash读取：run38586177993/job115928681977，133696bytes/SHA `4f631d59f8aef302eee71205c61471bd259275f23f08597e139eaacc77462e01`，仍FAILURE。354/API3/privacy5/PG23通过、HTTP15PASS1FAIL，两E2E未执行。first processed从6232ms开始，原5s必要回执失败；DOM96×144/SHA9a8c…，唯一正确owner/recipe/frame GET200/document1/currentDoc记录为failed/ERR_ABORTED、getResponseBody无数据。generic navigated-away文字不证明有导航。**当次确切app cleanup/缓存/GC/Chromium内部取消因果未证实；CI5具体request原因仍UNKNOWN**。不能用本机受控复现填补旧远端因果。[原失败诊断](evidence/main-ci-original.json)。

新回执机制本身获得独立支持：当前`received-resources.ts:165/202/235/244`直接按CDP requestId、主frameId和loaderId关联真实Network事件。普通loadingFinished取得该request的真实getResponseBody；完整取消路径只允许非disk cache/SW、无Content-/Transfer-Encoding、合法正数≤4MiB Content-Length，且实际bufferedData+同request dataReceived字节长度、累计dataLength、声明长度全部相等，失败理由只允许ERR_ABORTED。failed仍failed，completion明确content-length；没有把abort当EOF或任意接受partial。协议依据为[CDP Network](https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-streamResourceContent)和实际pinned协议类型/真实调用，[来源边界](evidence/protocol-primary-scope.json)。PNG结构缺口由上项单列，不能由运输机制正确抵销。

本人old BD alone→new alone在独立新context依次运行，均只1 GET；首8字节**实际读入**后发送余下PNG并取消，旧body无数据/找不到，新同request完整821字节。另同时观察两版本的同一次请求，独立CDP监视的request/loader/frame、200、真实dataLength总821及ERR_ABORTED与新receipt匹配，原PNG CRC/96×144/实际DOM Canvas完整RGBA均一致。[有序旧/新](evidence/wire/isolated-old-new.json)、[同请求完整证据](evidence/wire/summary.json)。

11组控制包含partial、无长度、声明多1字节（后两者即便正确DOM PNG也不合格）、错误owner/recipe/frame/hash/iframe、sameDoc、失败导航、reload、新文档新真实请求及独立坏PNG/尺寸验证。这里**独立CRC oracle拒绝坏件不等于候选拒绝**；随后精确原消费者与完整case揭示R15-001，所有原结果保留。额外两种真实协议Promise结算顺序：实际stream command已返回但暂缓交付，完整字节/失败事件先到，再交付未改变的真实bufferedData，当前请求可以结算；若先有真正新文档commit，旧stream完整字节也不能命中新文档。[真实异步顺序](evidence/wire/stream-settlement.json)。没有伪造CDP响应值或业务Response。

固定128次快速实际读取（64无显式abort、64 EOF后abort）新128次均有对应完整当前字节；**本轮旧observer也128次均未失败**，没有重现作者200次中的7次自然观察。它是有界观测，不循环至复现，不当Main因果证明；确定性旧false-failure由前述有序控制支持。[128次原记录](evidence/wire/fast-observation.json)。

| 本轮真正执行，计数不重复相加 | 结果 | 秒数 |
| --- | --- | --- |
| 本人fresh build→五迁移 | build exit0，随后自有新空主库原5迁移；无reset/drop旧库 | 25.246 / 1.994 |
| pnpm check | 30文件358/358，0skip；含12真实capture（父8+新4）、31环境I/O/guard、47严格ZIP、2 ReplaySession，方向/type/lint/format/clean build/11 exports | 79.329 |
| pnpm test:step07 | **正常完整16/16一次通过**；六阶段末processed122676ms，single180s及5/15/60/30预算不变 | 484.145 |
| API / Vite privacy | 3/3、5/5 | 10.986 / 11.461 |
| 正常production NO.env完整原E2E | **18/18，0skip/0retry**，独立新空DB/root；两个启动环境失败另保留 | 423.321 |
| 正常development NO.env完整原E2E | **18/18，0skip/0retry**，另一个新空DB/root，真实Vite/StrictMode | 450.908 |
| 本人独立交付重读 | 6实际ZIP、12次Pillow atlas解码、16个实际RawCanvas样本、4个DBBuild/FinalExport链；6正常与18本地损坏ZIP由独立Python及当前TS读取器正确接受/拒绝 | 0.178 / 0.426 |
| PNG CRC完整六阶段负控 | **反例：坏PNG全被接受，原case1PASS/15 selector SKIP**；不是候选PASS或第二轮正常HTTP16 | 119.523 |

正常HTTP16原COMMIT一致快照、真实c227六模块旧writer、FinalExport/FileObject＋Job同TX、标准resume/幂等、文件失败/延期COMMIT rollback/丢回执、current/history/retired/late/last-success、backup/clean restore再建、上传预算/Host/Origin/client/path/Vite、native timeout/cancel/close-release均原断言实际执行。正常两模式各5个processed实际GET，20/26资源receipt、200/currentDocument及原SHA/96×144/DOM RGBA检查均成立；本次正常这些processed通过protocol-body/loading-finished，不冒称自然重现Main complete-abort。[正常HTTP资料](evidence/http16/r4-ui-consistent-publication.json)、[捕获生产](evidence/http16/r4-received-resources-production.json)、[开发](evidence/http16/r4-received-resources-development.json)。CRC负控与正常数据各自独立，不混用。

两完整18包含创建/刷新、六源与硬拒绝、精确revision/配方/替换、真正Build/选定Export、旧四文件保护POST转换、失败保留/历史/退役、普通切换/BUSY有界恢复、慢poll/single-inflight、连续错误5次/60s停止和显式只GET恢复、迟到项目/选择/动作/列表归属。实际pageerrors=[]，console仅预期422。[生产完整reporter](evidence/browser/production/playwright.json)、[开发完整reporter](evidence/browser/dev/playwright.json)。各新DB/root、NO.env前后、生产运行时absence/owned listener核对另存；.env原字节0600恢复。开发没有单独伪造一张运行时lsof快照，以原runner的整段NO.env保持和前后记录为证。

六份first/second/history实际下载由独立local-first Python struct/zlib双目录/EOCD、安全唯一八成员/CRC、stdlib和Pillow重读；七payload bytes/SHA、full Profile、canonical ExportBuildID、Source、PNG全部chunk CRC和768×576实际RGBA匹配。history全字节等于first。六下载位置、十二次解码、四DB Build/FinalExport登记、两种不同content ExportBuildID分开计数。对应8份FileObject、objects及standard目录逐字节同ZIP，同项目COMPLETED Job/精确ProjectSnapshot/保留current相符，内部BuildFile仍4份。[实际包](evidence/current-archive-verification.json)、[18 ZIP负控](evidence/current-zip-negatives.json)、[候选consumer](evidence/current-candidate-reader-controls.json)、[DB/文件链](evidence/current-db-export-file-links.json)。这些是有效正常标准包，不把processed坏PNG负控污染持久产物。

16个actual RawCanvas SHA来自未改原test的canvas.toDataURL→RGBA；本人用原始PNG、独立字面quarter和Pillow构造完整平面，逐项完全一致。locator截图的CSS圆角/分数边界与RawCanvas分开，不能直接把截图当整块raw plane。[16平面独立重建](evidence/independent-canvas-verification.json)。实际view_image只有逐图收据所列6张，含原网络图、两模式替换、坏CRC仍解码图、实际CSS截图和独立参考；技术查看不写USER_CONFIRMED或ARTIFACT_MZ_TESTED。[逐图收据](evidence/screenshots-viewed.json)。

| 原finding / 原severity / 文件行 / spec | 当前actual/expected、独立支持；状态 / blocking / minfix |
| --- | --- |
| R4-001 P2；store.ts:689/717/740；§7.1/§10.2 | 正常HTTP16真实旧writer四文件先publish、existing/new标准文件同TX→COMPLETED/交付，幂等/rollback/文件失败/丢回执保持last-success；**CLOSED原范围保持，0**，无需新fix。 |
| R4-002 P2；App.tsx:92/119；§4.1 | 两完整18迟到initial200跨upload201/422/adopt201、反向创建新列表、只读恢复/unmount通过，列表自身generation满足expected；**CLOSED保持，0**。 |
| R4-003 P2；studio-service.ts:261/319；§4.4/§7.1/§10.2 | 原HTTP及两客户端跨COMMIT first/update/history-only为完整旧/新metadata；历史不回退current。5000/1000ms只读RepeatableRead短TX，files/pixels在外；**CLOSED保持，0**。 |
| R7-001 P2；stored-zip.ts:25/76；§4.5/§9.2/§11.3 | 三严格ZIP文件原字节保持、当前47与HTTP/实际6包18坏容器控制正确拒绝；**CLOSED保持，0**。R15是PNG chunk CRC，不复开ZIP。 |
| R9-001 P2；environment.ts:30/33/47；true absence政策 | realFS/helper与R10相同，当前31真实I/O/guard和两NO.env完整18通过；**CLOSED保持，0**，R10额外33仅原范围。 |
| R11-001 P2；ci.yml:36/37；首consumer前安装 | CI唯一安装仍在check前；自己的精确1248默认启动和12真实capture通过；**CLOSED保持，0**。本机安装不冒称Linux CI。 |
| CAPTURE-DOC-13；原同文档误退休 | 当前12正式capture及本轮actual old/new、sameDoc/失败导航/reload/iframe/旧doc晚stream顺序支持原身份保护；原问题保持关闭。R13额外24次立即fetch未重跑，不用旧observer替本轮新通道。 |
| PERF07-R14-ROOT；同Job有界重放 | 201个其他执行文件和当前生产/缓存/lease路径同R14；正常HTTP16/两18未退回重复处理。R14 PG23、11缓存变体/4实际文件租约控制及正常/合成成本旧新对照只引用原Source，**NOT_RERUN_THIS_ROUND**，不复开为本轮远端cause。 |
| R1–R3原关闭范围 | 当前HTTP16/check/两18覆盖root/fd/成员身份、cancel/close、BUSY5/60s、single-inflight、poll5/60s/晚写保护；相同字节的原专门独立范围保留，0。 |

R14准确Source `0cdd9ad6a61a881bbf3a9ebd7d231e927f97bb2c`、docs `65b4330e7d83d065e88ed10d62e6b058d5ae8078`，report `123faf3fbe5e6dcc77d5a5d66be936de4dd015b1a8b7cc33257419391c092be3` /19385bytes，ledger `2a79775d6712bc8751605ca7f1564c2393064677dbd559f7f4d7155d2cbfb6ac` /196 payload。未重跑PG23、专门缓存/lease/performance；旧24scene/4creative、12+12clock三周期、专门API crash/Mock探针、56旧payload/16PNG/JS78/nativeCPU8也只沿各原独立Source实际适用范围。不能把R14的旧capture或作者/Main结果替当前新通道验证。

全部203个非docs/README执行文件相对R14与BD仅两个test路径变化，其余201逐字节相同；原integration六阶段文件与两个完整E2E、CI/strictZIP/realFS/env/生产/Core/锁/schema/Profile/slots/clock全保持。原8个capture test body逐字不变，新增4，未删失败/降断言或扩预算。[执行SHA映射](evidence/source-execution-map.json)、[断言/预算](evidence/assertion-budget-audit.json)。Source后184路径全docs，183 author payload、178条有明确原件指针逐SHA/bytes验真；是作者资料，不重标本轮。[作者核验](evidence/author-audit.json)、[资料用途](evidence/post-source-docs.json)。

R1–R14全部原report/ledger及列明payload逐SHA/bytes匹配；当前Git snapshot缺的69个ignored历史log只读核对Main**精确原证据路径**，未修改旧文件或读取其他树实现/凭据。R14全部196亦验真。首次快照路径读取失败保留并分类，不把它说成旧证据损坏。[历史审计](evidence/prior-ledgers-audit.json)。

本轮fresh/最终live206与指定作者物理immutable包逐文件全字节相同，独立重算BuildIdentity/Profile/锁/schema一致；相对R14实际205文件相同，仅studio.json的context.commit变39ec。将该唯一字段恢复为0cdd后重新序列化得到R14已绑定SHA，证明Public runtime source macro没有Compiler/Profile/槽位/时基/通行语义变化。没有新工程出版、覆盖旧Manifest或补PASS。[最终206](evidence/engineering-live-final.json)、[原Manifest](evidence/engineering-manifest.json)。

正常Main历史保留：CI7 candidate1d5ad26/run38576897358原SUCCESS；normal no-ff merge321bbb及后续normal push BD均为当前Source祖先，没有rewind/force push。Main原354/16/23/API/privacy/prod18的postmerge收据按原归属保留，不能替本轮。**首次main CI38586177993仍FAILURE，步骤07未PUBLISHED；新forward candidateCI、正常merge/postmerge/push/readback/mainCI均不是Reviewer已执行的门禁。** [前向历史](evidence/forward-history-scope.json)。

本人环境与辅助失误如实保留。Main仅准备install/generate和独占PG init；本人build后迁移。Node22.21.1/pnpm10.20.0/PG14.20，只ownPG55511/API4411/Web5311/cache。首次新cache实际下载完成，但运行中移动自己的证据sink导致外层结果写入FileNotFoundError，首次child exit没有可靠记录，不虚称该次exit0；原下载log/原native错误保留。同一cache原安装命令再执行exit0，自己的默认headless1248/version156.0.8078.4/DOM/OS PID/176747664bytes二进制SHA77d8278b…及close实际验证，未用global cache或覆盖executablePath。[安装记录失误](evidence/install-wrapper-error.json)、[真实browser](evidence/browser-identity.json)。原冷安装顺序关闭证据只按R12/R14原范围引用，不冒称本机Ubuntu安装。

前两次production NO.env在原30000ms webserver门禁超时，**0 tests执行**；两个新DB/root/原日志/JSON全保留。独立同配置启动4411成功；第二次pw:webserver记录API ready但health经继承lowercase proxy返回502，同一实际API直接Node fetch200/database connected。只给本轮child设置NO_PROXY/no_proxy环回例外后原健康检查200、原完整18成功；不改global代理、app、测试或启动预算。正确生产/开发各用另一个新空DB和不存在asset root，失败库不reset/drop。代理值不打印/不公开。[诊断与纠正](evidence/proxy-environment-correction.json)、[两个失败收据](evidence/failures/attempt2-e2e-production.result.json)、[正常NO.env恢复](evidence/noenv-production-after.json)。自己的路径猜测/忽略log快照读取错误、原脚本版本及native原输出留private，[指针](evidence/native-error-pointers.json)。无平台中断或换模型/加速绕过。

源字节/像素独立拥有、domain Built仅处理IR、内部4/标准8、public restore实际重放、精确历史/retired/CAS/失败last-success、创建时深冻结模型/任务快照和Web contracts-only边界不变。JSON8KiB、PNG4MiB/4096chunks/5s、singleRGBA8/sRGB/metadata/真实pixel/density、≤768×576且Studio96×144/density1或2、16 admission/read12/download2/heavy1+wait1/native1/5s/child close后release、Host/Origin/client/opaque ID/path/Vite私有根未放宽。**JS heap128MiB不是OS/native RSS硬cap**，合作式FS不扩大为恶意管理员ABA保证。

新MZ GUI/编辑器手绘/游戏/用户美术/Original Host/Map003补证/OS真实后台/nativeRSS硬cap/RPGReactor是NOT_EXECUTED或原延期；结构、有限risk、Profile已有阶段基线、用户艺术及具体artifactMZ分开。无视觉SDK/API/key、生产Prompt体系/AI/费用/Redis/SaaS/globalMZ/NW/Reactor操作，08–10 NOT_STARTED。

结束全部**8564 tracked**起止SHA256/bytes相同，exact Source/detached/Git clean；API4411/Web5311无listener，own browser/native codec进程0。PG55511归属/data_directory匹配、其他DB clients0，**9个自有数据库**、全部资产/stage/orphan/backup/cache/失败和受控坏PNG原件留Main核归属后正常stop；自己的.env原208bytes/SHA与0600保持。其他用户Studio、Coding、Review/release环境未操作。Main canonical仅记录并发start/end只读hash，不声称其恒定或推断写入者。[源码保护](evidence/tracked-protection.json)、[资源](evidence/resources-final.json)。

report/progress及必要公开evidence以本reviewroot相对键、SHA256+bytes封存在evidence/ledger.json，排除ledger自指。公开仅必要合成fixture、脱敏资料/日志/技术截图；真实own密码/DSN只在RAM扫描，不打印值，env/ownership全值/dump/license runtime/私有源/敏感trace不公开。私有失败原件保留SHA/bytes指针，正常结果与反例、作者/历史/本轮/未执行分别记录。

**STOP_REVIEWER。** 当前必须由Coding整改STEP07-R15-001、重新冻结并取得最新独立wholePASS；不能用358/16/18+18全绿或作者/Main结果跳过该硬负控。Main仍须full forward candidateCI→正常merge→实际postmerge→normal push/readback→mainCI真实成功→正式PUBLISHED并STOP07。本报告不approve/commit/merge/push/release，06 PUBLISHED，08–10 NOT_STARTED。
