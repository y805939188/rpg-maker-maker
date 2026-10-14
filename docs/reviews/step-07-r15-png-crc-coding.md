# 步骤07 R15 PNG CRC 消费边界整改

**SELF_TESTED_READY_FOR_INDEPENDENT16 / STOP_WAIT_MAIN_REVIEW16**。本轮只在四个test路径补实际PNG消费验证与负控，生产实现、PNG编码器/政策、Profile/Compiler/布局/槽位/动画/通行、锁/schema、HTTP预算、传输观察器、环境helper、strictZIP和CI均未改。Coding不自行关闭独立finding，不approve/merge/push/publish/触发远端CI/写Main canonical；06 PUBLISHED，08–10 NOT_STARTED。

| 精确绑定             | 本轮值                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| worktree / branch    | `/Users/dingshinn/.codex/worktrees/step-07-main-ci-recovery/rpg-maker-maker` / `codex/step-07-main-ci-recovery`                 |
| 原Source / docs      | `39ec791c4b79c20f2afb3ac88ed5bc06dfb71bfd` / `2320e9e9fbfea2ad8e60ab29dafdeef91f0075eb`                                         |
| 唯一最新冻结Source   | `abd035ac20e6c4de5d19609d932935b99851b2b0`                                                                                      |
| 本轮docsHEAD         | 本报告/ledger所属后续纯资料提交，完整SHA在提交后final handoff/private progress绑定，无自引用SHA循环                             |
| 工程Build            | `step07-abd035ac20e6-84593cfe8bf38f0d`                                                                                          |
| Manifest SHA256      | `4f1ce51a6df70eb4bf6325654c6dd03726f513f8a499db6c1e019dde85075e67`                                                              |
| 工程实际文件         | 206，live/immutable逐bytes/SHA重算；205对39ec不变，studio.json只有context.commit变化                                            |
| 完整Profile SHA      | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                                                              |
| 工程Manifest物理路径 | `artifacts/.step07-r15-png-final-3b0da1c36f3d4402ada473f26b54a7e5/artifacts/step07-abd035ac20e6-84593cfe8bf38f0d/manifest.json` |

正式used15/next16（步骤07 Review16），2026-10-14取消机械五轮上限而质量不降。当前Main客户端请求原件可见step_coder/gpt-6.1-sol/xhigh/default(Standard)、本CWD及原CID01a132c0-f44b-75f0-bea5-7f4e5e77a6ea；隐藏最终server model/effort/tier **UNVERIFIED_NOT_EXPOSED**。无Fast/Priority/Ultrafast/collaboration/global配置改变。

## R15原件和责任

完整读取Main原R15报告、全部166 ledger项逐SHA/bytes核验；report SHA `83207c1ab20234ab0c3027f5ad11e6f2cb2b211935b26a0f8b667d2bf50881c1`、ledger SHA `6d2b15f29531b340e3f99a24948bc334f1fd0130d32ed27d34f1fb1e9d172dc3`，仍 **REQUIRES_REVISION / STEP07-R15-001 P2 BLOCKING**。源、原报告/坏PNG/日志/fixture不改写。核对AGENTS、两plans原字节、MZ环境、STEP07、PixelContract及2026-10-14授权，历史停止/轮数保留。

R15定位准确：旧integration的真正processed消费和rendered函数只有实际SHA、解码尺寸、RGBA相同，没有逐chunk CRC。其821byte IEND CRC一bit坏件仍被Chrome/Sharp解码，原精确函数成功；原完整production/development first/update/history case119.523s退出0接受10张坏PNG。该exit0是 **COUNTEREXAMPLE_CAPTURED，不是坏PNG、候选或测试门禁PASS**。问题属必要测试可靠性，未证明生产编码器发错PNG。

本轮同样以AST提取旧39ec与最新rendered函数，只加import/export和TS转译、原断言不改。在真实loopback GET200和相同requestId/frame/loader/currentDoc/fullURL字节上，finished与complete-abort各一合法/一坏CRC，共4次GET；旧函数两坏件返回成功，**新的reject断言在旧函数上确实AssertionError**；新函数两坏件明确PNG_CRC，合法正控通过。SHA/实际字节/自然96×144/像素均保存，不从DOM造body、不伪response、不另GET/重处理补证据。

## 最小共享校验与原边界

`received-png.ts`仅复用既有公开`@tileset/image-adapter.inspectPng`并断言消费者期待的尺寸，不拷贝新算法/规则、不增加native decode。既有检查包含≤4MiB、4096chunks、签名、IHDR/singleRGBA8/sRGB/允许metadata、chunk边界/每块CRC、连续IDAT、合法IEND精确结束/无尾随异物；未知/ICC/HDR/APNG/非sRGB等仍按已审政策拒绝。source bytes/pixels/Owned/public restore语义未改变，不将inspect所得dimensions冒充ValidatedSource。

真实processed捕获Buffer在原SHA验证后、原Sharp/Canvas比较前调用；rendered亦同。标准实际ZIP的A1/A2及浏览器捕获同选定Export的A1/A2同时检查，原七payloadSHA/Manifest/Profile/八文件strict ZIP/DBFinalExport/FileObject和byte-equal断言全保留。没有生产encoder/HTTP改动或额外业务请求。

`received-resources.ts`整文件与39ec相同：协议两通道、完整ContentLength/累计dataLength/真实bytes、mainframe/request/loader/currentDoc/URL/GET200/SHA、partial/unknown/encoded/late/iframe/newdoc拒绝、failed仍failed，原全部12控制保留。原one180000ms双模式三阶段、5s回执/15s PNG/60s读与job/barrier/30s终态不变；原断言未删、case未拆、母版/阈值未改。

新增20纯政策unit以独立PNG fixture覆盖合法容器/消费者尺寸、IHDR/sRGB/gAMA/cHRM/pHYs/IDAT/IEND七类CRC破坏、截断头/CRC/越界长度/缺IEND/尾随/重复/APNG/ICC/非sRGB/byte及chunk预算。新增2真实wire负控验证普通完成和complete-abort坏IEND在真实捕获bytes上拒绝，同时保留可解码/同RGBA事实、再读合法正控。20+14=34包含于380，不与专项重跑相加为414。

## 最新冻结Source实际验证

全部源绑定`abd035...`，自己的正确物理artifact clone与PG55509新空DB/root、NO.env显式配置、child-only NO_PROXY/no_proxy loopback。此例外仅子进程，不读取/打印代理值或改全局代理；原用户step-07-studio不写/构建/测试/停止。

| 原命令                                                                                                             | scope标签                        | exit | 秒      |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ---- | ------- |
| `pnpm check`                                                                                                       | check                            | 0    | 78.828  |
| `pnpm exec vitest run apps/api/tests/studio/received-resources.test.ts apps/api/tests/studio/received-png.test.ts` | latest-response-browser-controls | 0    | 5.699   |
| `pnpm test:integration`                                                                                            | api3                             | 0    | 10.873  |
| `pnpm test:dev-privacy`                                                                                            | privacy5                         | 0    | 10.797  |
| `pnpm exec vitest run --config .local/r15-png/control/negative.config.ts -t R4 real COMMIT first/update/history`   | bound-sixphase-badCRC-negative   | 1    | 7.53    |
| `pnpm test:step07`                                                                                                 | http16                           | 0    | 472.283 |
| `pnpm test:e2e`                                                                                                    | production18-noenv               | 0    | 428.821 |
| `pnpm test:e2e`                                                                                                    | development18-noenv              | 0    | 451.969 |
| `pnpm build:step07`                                                                                                | engineering                      | 0    | 21.652  |

最新check **380/380**，0skip：原358+20政策+2wire，34包含其中且另重复专项。方向/type/lint/format/clean build/11exports、31 realFS env/guard、47strictZIP、R14 session回归保持。

原R15相同“真实processed完成后，仅返HTTP字节IEND CRC xor1”的受控setup在冻结候选原单180s六阶段运行：**首次实际坏PNG明确PNG_CRC退出1，7.53s；15个selector SKIP不是全16**。fixture只影响该负控返回byte，原PNG/IR/DB/Build/Export不改；随后独立Python struct/zlib逐chunk证明原合法/坏IEND仅1bit、Pillow仍相同RGBA，真实被拒网络SHA匹配。预期拒绝不是有效产物PASS。

正常完整HTTP **16/16**另用独立新库，六阶段末processed119767ms，含两个模式5+5实际processed与相同PNG/DOM/SHA/96×144/RGBA、实际交付图集/Manifest/Profile/ZIP身份和新增CRC。原旧c227 writer、标准finalize与Job同TX、幂等/COMMIT rollback/回执丢失、metadata跨COMMIT/current/history/retired/late、failed-last-success、source上传/path/budget/cancel/native child-close、backup clean restore+真重建均原断言实际执行。

NO.env **production18/development18各0skip/0retry**，不同新空DB/root；真实持久选择/创建/源上传/recipe/revision/采用/构建/替换/current/history/retired/失败恢复、processed原图、交付场景/像素/nearest/clock、慢poll/single-inflight/连续错误5+60s与只读恢复、迟到action/list和正常切换全部执行。6实际标准下载独立双目录/CRC/八成员/Manifest七payload SHA/full Profile/Source重读，Python逐PNG全部chunk CRC及Pillow12张768×576 RGBA通过；history字节同first。没有把旧R15正常18或父PASS重标本轮。

## 保留失败、资源、未执行和交接

唯一本轮辅助执行错误：private runner用`normalHTTP`产生混合大小写的新DB名，既有配置白名单在迁移前拒绝exit1。原新库、原日志/hash/命令保留；Source/政策不放宽，改用另一个全新小写`normalhttp`库后迁移0并继续。已通过的冻结checks不重复，失败未改为PASS。prefreeze34/旧新4对照与冻结后34/对照/完整suite分别记录。

仅自有PG55509/API4409/Web5309/.env0600及本树ignored clone/output；依赖frozen、Node22.21.1/pnpm10.20.0/PG14，已有本树1248cache。结束自启API/Web/browser/native辅助均关闭，PG、所有新DB、资产、backup、cache、原失败/受控坏件保留，不reset/drop价值数据、不copy别人env、不读取model/API密钥；不写Main/Reviewer/release或canonical。资源/目录归属及数量见ledger，不保证其他独立用户活动静止。

本轮test-only无生产变化，完整PG06独立23、旧专门lease/cache/performance、24scene/4creative/12+12clock三周期、旧56payload16PNG/JS78/nativeCPU8 **NOT_RERUN_THIS_ROUND**，精确相同生产范围只引用原R14/CI7/mainCI23等真实归属；当前HTTP16真实恢复/故障/版本和两18自行运行，不用旧绿代本候选。

四/八文件分层、domain Built仅IR、Root/ancestor/File hash检查、预算/Host/Origin/private Vite、CAS/短TX、兼容承诺均不变。JSheap不是OS/native RSS硬cap。技术view_image查看含坏CRC仍显示图和两实际正常Studio替换图，不等于USER_ART_CONFIRMED或新artifact MZ实测；原Host/Map003/GUI/用户艺术延期待。新Independent16、full候选CI/mainCI、批准/merge/push/publish **NOT_EXECUTED_BY_CODER**；STEP07-R15-001由下一Reviewer独立决定关闭。Main旧失败与CI5具体取消因果UNKNOWN保留，不回填。

纯资料后续commit只含本报告和合成脱敏PNG/ZIP/JSON/log/probe文本证据，无执行影响。ledger逐root-relative SHA/bytes/原件path/hash/用途，排除自指；own DSN/password只RAM扫描、不输出、不公开env/ownership全值/dump/license runtime/敏感trace。最终完整docsHEAD/report/ledger SHA在提交后final/progress。**STOP_WAIT_MAIN_REVIEW16**；06保持PUBLISHED，08–10 NOT_STARTED，无真实视觉SDK/API/AI/key/PromptRegistry/Composer/router/付费/Redis/SaaS/globalMZ/NW/Reactor。
