# 步骤07 CI5必需body捕获 Coding 报告

**READY_FOR_REVIEW_ROUND13**。正式已用12轮、下一独立13；用户2026-10-14取消机械五轮上限，编号和质量门禁不重置。只提交本Coding branch，未Approve/Merge/Push/canonical。06 PUBLISHED不重复，08–10 NOT_STARTED。

Source `1be820a5adfbb3c41c532fbc778958774ed1c470`；父Source `a8f23ef5ad218278447cca2d22c7014adb16ca02`、父docs `428d981925bc265527b32409f51f9cc5cc149c8c`。只有3个必要测试路径：`apps/api/tests/studio/received-resources.ts`、`received-resources.test.ts`和`integration.test.ts`。4496个其他已跟踪路径逐SHA/bytes相同，生产实现/CI/环境helper/严格ZIP/锁/schema/Compiler/Profile/槽位/动画/通行/HTTP/native预算均未改变。

## 确认的事实与因果限制

已完整读取R12报告并逐SHA/bytes核对51原件：report `d16099de484b782d786372a66d3f6f2c6b3e99c394210a3312d55511daa39307`（23896bytes）；ledger `8880fb91dad5087a8848c089d087e1d33e28d204a1052b932337f054189f48bd`。R12 wholePASS仅属于a8f，其真实冷安装→check349/0skip及5个浏览器控制关闭R11安装前提；本轮保留首消费者前唯一安装、fetch-depth0、Node22.21.1/pnpm10.20.0/Playwright1.64.0/Chromium1248全部原配置。CI5这些Linux前提确已执行成功，未重新打开。

原候选a3885c60d5c3629148a4d273cfb8542d507a7a9a、CI38539713893仍FAILURE。完整原135570bytes SHA `dcf8d8eaa758ff9f515ae0e4d2406883b4e8b816c44ec5b75153b78aaf1b6d10`已读取并验真。HTTP15PASS1FAIL，单case96870ms未超过180s；development首次COMMIT→processed→ZIP已成功，随后replacement前processed读取在5s内未匹配DOM SHA `31d0b0469e1aebabb84dd9f6d7cbd9234ac646d588da09aa365b570ae0d7d456`。两e2e因失败门禁未执行，不能说PASS。

GitHub run artifacts接口正常返回空列表，workflow没有upload步骤，故**当次request/document/state/transport/body错误记录不可取得，CI5精确触发机制 UNVERIFIED_NO_CAPTURE_ARTIFACT**。未据摘要猜abort、缓存、慢runner或navigation，也没有宣称已证明外部transient。最初gh CLI不可用的辅助失败保留；改用现有GitHub只读artifact工具，未安装CLI/改配置/重放远端CI。

在自己的正确物理隔离检出，以真实Chromium/HTTP/实际PNG/Blob解码运行控制矩阵。完整read后立即abort、解码后abort、chunked与cacheable-header首读均正常；最后一项只是可缓存首读，不能冒称cache-hit或实际CI缓存反例。真实same-document pushState则稳定复现：DOM已显示96×144 PNG，SHA与已完成的网络body一致，旧helper收到framenavigated后document++，把其错误退休，find返回undefined。原矩阵和旧helper专项正确断言失败均保留。

**这是已确认的捕获身份缺陷，不是已确认的CI5根因。** a8没有证据表明当次发生pushState/hash事件。本轮既修正这个真实生命周期缺陷，又把下一次必需body失败的有限安全状态输出到现有CI日志。没有用本机正常或这个反例把CI5失败改写为PASS；最新GitHub full CI仍是Main必须执行的发布门禁。

## 最小观察修复与负控制

捕获helper仅在已固定Chromium的CDP `Page.frameNavigated`实际主文档commit上更新document；同文档pushState/hash、取消的navigation及子frame不会作为新主document。安装该观察器在goto前完成。原网络Request身份、主frame、origin/project完整URL、GET200、transport finished、实际body SHA严格要求全部保留；没有放宽failed/unavailable为成功，没有读取DOM Blob补body、额外GET、改App方便捕获、重做processing/readExport或使用源IR/旧frame/其他项目替代。

新增3项真实浏览器回归，加原5共8：same-document保持已解码实际PNG且无新增PNG请求；取消navigation保留实际文档但同URL真正reload退休旧receipt并要求新body；8条上限诊断只含状态/长度/SHA等元数据，迟到安装的observer即使看到实际已显示PNG也必须拒绝无网络证据。原partial/cancel、late同URL、wrongowner/origin/recipe/frame/hash、non200、坏PNG和尺寸/Canvas独立对比仍执行。

六阶段case每mode在首张图像已经有实际SHA时施加一次真实same-document replaceState，仍只有原5个成功processed读取，每mode原first/replacement/history-only和一个180000ms case不拆。这个新控制不是原CI5时已观察到的事件。旧a8 helper只加无行为setup/diagnostic接口适配，在相同完整HTTP case上13.55s正确FAIL：production初始processed的真实DOM/已完成body SHA相同，currentDocument=false，5s匹配失败；1FAIL/15SKIP是有意单case负控制，不是artifact或候选PASS。旧matrix、旧专项FAIL、旧完整caseFAIL、所有原日志和资源保留。

必需body5s失败时仍原样throw。新增 `R4_REQUIRED_BODY`日志在关闭context前记录mode/stage、required和当前DOM owner/recipe/frame/SHA/尺寸及该URL最新8条网络记录：doc/current、status/method/mime、transport/body state、长度/SHA、短失败原因。不输出rawPNG、DSN、env、credentials、私有文件内容或全DB data；无无限队列/重试/新增预算。现有finally全记录保留。

## 最新Source实际验证

以下均来自新clean detached Source物理检出，独立frozen依赖/Prisma generate、明确自己的PG55476新空DB/root、NO.env；原服务dist/.env/资产/价值DB不使用。浏览器为本人前轮真实安装保留的task-private1248缓存，本轮不冒称再次冷安装。prefreeze实验和旧helper反例与最新Source执行严格区分。

| 本轮最新冻结Source实际命令                                              | exit | 秒      |
| ----------------------------------------------------------------------- | ---- | ------- |
| `pnpm check`                                                            | 0    | 74.965  |
| `pnpm exec vitest run apps/api/tests/studio/received-resources.test.ts` | 0    | 3.604   |
| `pnpm test:integration`                                                 | 0    | 10.714  |
| `pnpm test:dev-privacy`                                                 | 0    | 10.353  |
| `pnpm test:step07`                                                      | 0    | 520.59  |
| `pnpm test:e2e`                                                         | 0    | 457.788 |
| `pnpm test:e2e`（development E2E_MODE=dev）                             | 0    | 476.436 |
| `pnpm build:step07`                                                     | 0    | 20.267  |

完整check：352/352、0skip，含原349+3新增；8专项已包括在352，重复执行不能相加成360独立用例。check包含boundary/type/lint/format/clean build/11公开exports，真实env I/O31及strictZIP47回归。API3/privacy5全部通过。HTTP16全部通过，单一六阶段128.900s，production/dev 5+5成功processed实际网络body；完整96×144 decode/Canvas RGBA、精确owner/recipe/frame/currentdoc/URL/SHA、actual A1/A2/Manifest/Profile与同实际ZIP/DB FinalExport身份仍核对。

两模式NO.env完整18+18、0skip/0retry，真实create/refresh/upload/recipe/build/current/history/retired/失败保留lastsuccess/旧晚到/列表/动作世代/慢poll/连续错误有界停止与只读恢复/BUSY取消重读/processed和真正交付素材联通。每mode8 Canvas样本与独立字面quarter参考比较，clock源帧/12+12边界及三周期断言保持；6实际标准下载ZIP经独立R7双目录/CRC安全8成员oracle及Python zipfile/Pillow12 PNG重读，Source/Profile/Build/Manifest绑定，history与first全字节相同。

已执行view_image的截图逐文件hash和观察见screenshots-viewed；仅技术确认实际处理PNG、交付画布、current/retired/history状态。新人工美术确认、新artifact Native MZ实机测试 NOT_EXECUTED，旧Host/Map003延期保持。

## 工程身份、资料与资源

Build `step07-1be820a5adfb-b0249713e2495dce`；Manifest SHA `dadf5d7fca44ff54ce65547d3a22362eb0f667b1db2cdbc7accba9bc2efb1e77`，路径 `artifacts/.step07-required-body-final-83766ea69ddb4594953515ca22b8f6b1/artifacts/step07-1be820a5adfb-b0249713e2495dce/manifest.json`。206 actual live/immutable文件逐SHA/bytes核对；205与原594工程包字节相同，唯一 `apps/api/dist/resources/studio.json` 只context.commit变化。Profile完整hash48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793重算；未改旧Manifest或母版。

最终docsHEAD在纯资料commit完成后的交接/private coding-progress绑定，避免自引用hash。ledger `docs/evidence/step-07/ci-required-body/ledger.json`逐文件sha/bytes/原件path/hash/用途；所有source之后路径仅本报告及脱敏JSON、实际合成PNG截图/标准ZIP资料，无运行引用。原私有失败、临时目录、备份、dump、trace/缓存保持；只公开元数据和明确合成技术产物，私有敏感字节RAM扫描。

原API22456:4376、PG51121:55476、env600、Source594 live206再次读回保持，本轮未stop/restart、copy.env、reset/drop既有DB或写其他tree。只使用本任务新空DB/root并保留所有结果；自启临时API/Web/browser正常关闭。JSheap≠OS/native RSS硬上限政策未变，没有增加PNG/HTTP/native/queue/codec/close-release预算。

本轮未重跑PG06完整23、旧Pack56payload/16PNG/JS78/8 native CPU oracle；CI5 PG23和R5/R12未变生产字节证据保持原归属，不重标本轮实跑。新IndependentR13、full candidate GitHubCI、Main审批合并推送发布 **NOT_EXECUTED_BY_CODER**。没有真实视觉模型/SDK/key/PromptRegistry/Composer/router/AI/付费/Redis/SaaS调用，global Codex/MZ/NW/Reactor不变。

客户端沿正式step_coder/gpt-6.1-sol/xhigh/default(Standard)会话，未Fast/Priority/Ultrafast/collaboration/global修改；隐藏server finalmodel/effort/tier **UNVERIFIED_NOT_EXPOSED**。Remaining：CI5当次具体原因仍不可判定，下一full CI必须真正成功；若再失败，新的有限日志用于定位，不能无限盲重放或降低断言。交接 **STOP_WAIT_MAIN_INDEPENDENT_ROUND13**；08–10 NOT_STARTED。
