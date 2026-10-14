# 步骤07 Main CI 实际网络回执 Coding 交接

**SELF_TESTED_READY_FOR_REVIEW_ROUND15 / STOP_WAIT_MAIN_REVIEW15**。本轮仅修改 `apps/api/tests/studio/received-resources.ts` 与对应 `.test.ts`，捕获 Chromium 同一 request 的真实网络字节并严格区分传输状态和完整字节证据。生产 App/API/Persistence/导出器、六阶段 integration、CI、环境 helper、strict ZIP、schema/lock/Profile/Compiler/布局/槽位/动画/通行全部保持。未 approve/merge/push/触发远端CI/写 canonical；06 PUBLISHED，08–10 NOT_STARTED。

| 精确绑定                                | 本轮值                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 新工作树 / branch                       | `/Users/dingshinn/.codex/worktrees/step-07-main-ci-recovery/rpg-maker-maker` / `codex/step-07-main-ci-recovery`                      |
| 起点（已正常推送 Main，07尚未正式发布） | `bd9127beada7dc01b3cb8f8b326174c48fde1101`                                                                                           |
| 唯一最新冻结 Source                     | `39ec791c4b79c20f2afb3ac88ed5bc06dfb71bfd`                                                                                           |
| 中间 Source，原失败保留                 | `251f1c0cf763663fc0972f24fb44497d0bd75e95`，strict typecheck失败，不冒充最终结果                                                     |
| docs HEAD                               | 携带本报告和 ledger 的后续纯资料提交；完整SHA由提交后最终回复和 private coding-progress绑定，避免自引用hash循环                      |
| 不可变工程 Build                        | `step07-39ec791c4b79-d3464c591f56bb89`                                                                                               |
| Manifest SHA256                         | `4830c910fb373c87240e085175b0fbe015d131a8fa015c78d5536d820078c0d2`                                                                   |
| 真实工程 payload                        | 206，全部 live/immutable bytes/SHA重算；对R14 205相同，仅studio.json context.commit变化                                              |
| 完整 Profile SHA256                     | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                                                                   |
| 工程 Manifest 实际物理路径              | `artifacts/.step07-main-receipt-final-9b29a87414d94cac9d678cbb4d4cbe55/artifacts/step07-39ec791c4b79-d3464c591f56bb89/manifest.json` |

Formal used14/next15，属于步骤07 Review15；历史不清零。2026-10-14取消机械五轮上限，质量门禁不降。可见 Main 原生CLI请求与本次 cwd 一致：step_coder / gpt-6.1-sol / xhigh / default(Standard)，CID01a132c0-f44b-75f0-bea5-7f4e5e77a6ea。隐藏最终服务端 model/effort/tier **UNVERIFIED_NOT_EXPOSED**，请求不冒充服务端证明。无 Fast/Priority/Ultrafast/collaboration/global配置。

## 原失败和因果限制

完整原 Main run38586177993/job115928681977 日志实际133696bytes、SHA `4f631d59f8aef302eee71205c61471bd259275f23f08597e139eaacc77462e01`，保持FAILURE。354/API3/privacy5/PG23通过；HTTP15PASS1FAIL、两E2E未执行。首次 production processed 原5s必要body失败，非180s耗时；DOM已经96×144解码、SHA9a8c4c09f1ed0bdab87dc6e55bae41ae22ee8d15e9bb97819a49e09e3d802a72；唯一完整owner/recipe/frame GET200/image/png record=document1/currentDocument=true，transport=failed/net::ERR_ABORTED、body不可取。generic “navigated away”文本不证明真实导航。

原 CI4/CI5/CI6完整日志另逐SHA/bytes读取核验。CI4/5当次具体request机制仍UNKNOWN；CI6原180s性能问题及0cdd每Job bounded ReplaySession优化保持，不重开为本次根因。R13原301、R14原196 payload/report/ledger从Main只读原件全部核验；R14 WHOLEPASS只属于0cdd，不重标本候选独立PASS。Main原CI7全SUCCESS和正常merge/push历史不回滚，但mainCI必要门禁仍需新候选重新通过。

## 实证和最小修复

固定 Chromium1248 的真实 loopback HTTP 流读对照显示：完整读取并实际解码PNG，没有文档提交，也可能报告ERR_ABORTED且 Network.getResponseBody无数据；不调用abort的普通读亦有此组合。没有证据据此确定Main当次特定effect cleanup、GC、缓存或Chromium内部代码路径。20次显式GC辅助控制未复现，保留NOT_REPRODUCED，不能写GC已证实。

确定性顺序为：真实GET→200头和首8字节→协议流安装确认→发送剩余实际PNG字节→消费者读取声明完整长度后取消→真实Image.decode/Canvas。原bd helper真实requestfailed/body unavailable，find undefined；新helper通过相同请求字节/完整长度/SHA/96×144/完整RGBA。只1次GET，没有额外server读取/重处理/伪response。原期望错误由harness捕获exit0，含义是**旧helper反例正确捕获，不是坏包或旧候选PASS**。

另固定200次实际快速读取同样比较旧/新观察器：旧7次unavailable，新200次均匹配本次DOM SHA/解码，7次被明确记录为complete content-length + failed transport；不把200读取说成200独立test或无限重试。原件保留在private，公开只必要byte长度/SHA/request/document状态，无rawPNG或DSN。

观察器现在在导航前安装自己的CDP Page/Network session；主frameId、loaderId和requestId直接关联，避免用URL猜两个通道属于同一次请求。当前文档只由真正主文档commit更新；same-document、失败导航保留，newDocument/reload/iframe和wrong owner/recipe/frame/hash不能交叉使用。

普通loadingFinished按该request的Network.getResponseBody取得实际字节。PNG另用非拦截的 [Network.streamResourceContent](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json) 取得已缓冲字节和后续同request dataReceived.data，不发GET、不修改应用fetch/取消/Blob，也不从DOM/canvas/源IR造字节。

**failed不变成finished，ERR_ABORTED不是EOF。** 仅非cache/SW、无编码/Transfer-Encoding、合法正数≤4MiB Content-Length的PNG可用长度证明：buffered+stream真实bytes长度、累计wire dataLength和声明长度必须全部精确相等，再匹配当前URL/loader/GET200/SHA及原PNG解码/RGBA断言。保留channel/completion和failed原状态供审查。未知长度、压缩、部分传输、超长/不匹配长度、没有捕获bytes，即便已有正确DOM图像也仍拒绝。没有无条件接受ERR_ABORTED或接受任意partial。

## 最新冻结候选实际运行

全部下表来自独立正确物理artifact检出、自己的PG55509新空DB/root、NO.env及显式有效配置；不是原Studio API/旧dist或父候选结果。原one180000ms六阶段及5/15/60/job60/terminal30全部不变，六阶段integration原bytes未修改。

| 原命令                                                                  | 记录标签                         | exit | 秒      |
| ----------------------------------------------------------------------- | -------------------------------- | ---- | ------- |
| `pnpm check`                                                            | check                            | 0    | 80.19   |
| `pnpm exec vitest run apps/api/tests/studio/received-resources.test.ts` | latest-response-browser-controls | 0    | 5.13    |
| `pnpm test:integration`                                                 | api3                             | 0    | 11.682  |
| `pnpm test:dev-privacy`                                                 | privacy5                         | 0    | 11.114  |
| `pnpm test:step07`                                                      | http16                           | 0    | 480.574 |
| `pnpm test:e2e`                                                         | production18-noenv               | 0    | 430.647 |
| `pnpm test:e2e`                                                         | development18-noenv              | 0    | 466.645 |
| `pnpm build:step07`                                                     | engineering                      | 0    | 20.903  |

check **358/358**=父354+4新增，0skip；12真实capture包含其中，专项重跑12不相加为370。31真实环境I/O/guard、47strictZIP、2ReplaySession等原回归保持。新4控制覆盖完整声明长度后cancel的旧反例/新same-wire证据、partial/unknown/encoded拒绝、iframe同URL/SHA拒绝、正确DOM PNG但无framing或少1byte声明长度仍拒绝。原8文档/sameDoc/late/non200/wrong hash/腐败/错误尺寸/缺证据控制完整保留。

HTTP **16/16**，原六阶段最后processed结束121063ms；两模式各5次实际processed GET，20/26总体receipt、全部当前文档200和真实body/SHA/96×144/CanvasRGBA。本次normal10张处理图均loading-finished/protocol-body；cancel后的完整stream证据来自另外明确分类的控制，不伪称fullHTTP发生同一Main故障。真实first/update/history、COMMIT一致快照、当前/历史不回滚、retired/last-success、标准Export登记/FileObject/Job、旧c227 writer、rollback/文件失败/回执丢失、上传预算/路径/timeout/cancel/child-close release、backup clean restore+真重建均按原断言运行。

production18/development18均 **0skip/0retry**，NO.env明确配置且不同新空DB/root，实际Studio create/refresh/import/recipe/build、精确revision/组件替换、普通切换/BUSY有界恢复、慢poll/连续错误停止及显式只读恢复、迟到action/list、processed自然像素、交付Canvas/clock/nearest/真实ZIP/current/history均执行。6次实际download经独立R7双目录/CRC/八成员/Manifest七payloadSHA/Profile/Source oracle、Python zipfile及Pillow12 PNG重读；history全bytes同first。没有新增业务请求补抓证据。

## 失败、资源、资料及未执行

原实验/负控/日志/DB/资产全部保留。初次ordered控制15s timeout、跨独立事件session状态结算假设、未end受控HTTP响应即reload的问题保留；修到明确事件屏障/取消后end，原15s不变。中间251 strict typecheck6项错误保留；仅修callback optional frame、optional fields、明确save bool、pinned CDPSession.off类型，无删case/降阈/改golden。读取辅助ledger字段/ignored log及bundle路径误探针另分类保留。

新Own资源只PG55509/API4409/Web5309、fresh.env0600、当前tree .local/main-ci-recovery和独立artifact clone。依赖frozen、Node22.21.1/pnpm10.20.0/PG14，自己的新浏览器cache实际运行原安装命令；macOS安装不是Linux证明。测试结束仅自启辅助停止，PG55509、所有新DB/root/cache/失败保留，不reset/drop历史、不copy别人.env。原Studio65421:4376/PG51121:55476/env/价值数据/assets/dist只读，初末listener及.env hash依据见resources；不写Main/Reviewer/release或canonical。

本轮未重新运行PG06整23、原24scene/4creative/12+12clock三周期、旧56payload16PNG/JS78/nativeCPU8专门全套，精确相同生产范围仅继承R14及已过CI7/mainCI23原记录，标**NOT_RERUN_THIS_ROUND**；本轮最新HTTP16与两18自行执行。Compiler/Profile/slot/动画/通行、内部4/正式8、source bytes/pixels独立所有权/public restore/硬PNG/HTTP/native/path/Host/Origin/Vite私有边界未变。JSheap不是OS/native RSS硬cap；合作式FS不扩为恶意本机管理员保证。

新MZ/用户美术/具体artifact nativeMZ/原Host与Map003补证仍NOT_EXECUTED或原延期；实际view_image只技术确认。真实模型/SDK/API/key/PromptRegistry/Composer/router/AI/费用/Redis/SaaS/globalMZ/NW/Reactor未执行。**新Independent15、full候选CI、新mainCI及批准/merge/push/正式PUBLISHED均NOT_EXECUTED_BY_CODER。** Main原FAILURE不因作者绿自动关闭。

Source后仅本报告和自己的JSON/PNG/ZIP/日志文本/静态probe文本资料，无runtime/CI执行影响。ledger按root-relative逐文件SHA/bytes、原件SHA/bytes/path/用途/provenance封存，排除自指；own密码/DSN只RAM扫描不输出，private.env/ownership/dump/license runtime/敏感trace不公开。报告与ledger最终SHA/docsHEAD见提交后handoff。**STOP_WAIT_MAIN_REVIEW15**；08–10 NOT_STARTED。
