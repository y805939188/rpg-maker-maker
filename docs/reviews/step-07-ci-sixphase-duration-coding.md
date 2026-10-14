# 步骤07 CI6六阶段耗时 Coding 报告

**READY_FOR_REVIEW_ROUND14**。Source `0cdd9ad6a61a881bbf3a9ebd7d231e927f97bb2c`；父Source `1be820a5adfbb3c41c532fbc778958774ed1c470` / docs `8e437ccfccba2c9b98cc713b002e62acfb739465`。正式已用13轮，下一14，不清零、不以五轮机械停止；06 PUBLISHED不重复，08–10 NOT_STARTED。仅本Coding branch正常提交，未approve/merge/push/canonical/远端CI。

## 原件与当前事实

完整读取R13 wholePASS报告与301份原件逐SHA/bytes核对；报告及ledger原SHA/bytes见parent-review13。R13结论只属于1be，不回填为本轮Source独立PASS。CI6 candidate0e34c40d887d713af3f7daf68f22830787036cc0 / run38553433792 / job115816658901实际FAILURE；Main135643bytes原日志SHA `a0f687988f5a4529a65d6f82e18264c6f6ec91e3501e43d080d49fa96097efda`完整读取验真。另通过GitHub connector读完成decoded日志，135643 UTF8bytes、70个阶段事件逐项一致，不用曾滞后jobs状态猜阶段。

352check/8 capture/API3/privacy5/PG06 23通过，HTTP15PASS1FAIL，single sixphase180000ms总预算超时，非requiredreceipt5s；所有已到达processed阶段完成、R4_REQUIRED_BODY标记0。devreplacement processed在152526ms开始，442ms完成；download5551ms，history prepared7771ms，随后current准备/assemble隐含约4769ms、publish7438ms，terminal从178849ms开始，原test超时后仍出现结束日志。不能把cleanup之后日志当预算内完成。两e2e未到，NOT_EXECUTED。CI5当次request原因仍UNKNOWN，不将CI6回填为同文档缺陷复发。

旧timeout/c8/R7 ZIP/后续完整源事实保留：87→f574已经消除测试额外PNG GET、重复readExport并保留actual bytes；本轮不回退，严格ZIP central/local/EOCD/CRC8成员、1be文档身份、realFS env、首browser前安装均保留。

## 可核实耗时与最小方向

在自己的正确物理隔离clone+独立依赖/新空DB/root/原Toolchain，以旧1be透明方法wrapper和AsyncLocalStorage测量，原one180s六阶段全部实际运行，命令134.896s。2217 spans是嵌套**inclusive**，不把总和伪当elapsed。gate setup最长20ms，42短TX总inclusive3168ms（最长867ms含故意COMMIT屏障），不是主要锁等待；118 state总3201ms。主要重复工作：readDomainRecipe16次17858ms、loadArchives14次13617ms、readBuild14次15681ms、prepare8次10217ms、publish8次38289ms、readExport10次22582ms（后几项嵌套不能相加）。public readExport10次由6真正descriptor和4实际download产生，本轮次数不减。

独立公共readDomainRecipe微测读取6PNG却实发12 native forks、1063ms；源码对应先readSource逐源decode，再archiveDomain序列化→publicreplayDomainArchive逐源decode。Studio Job随后loadArchives已经重建并验证同一精确源/IR/Compiler和持久descriptor，又readBuild/prepare时用不同session重放重复archive。旧coarse CI中first commit-ready约10.2s、replacement17.2s，history准备/发布约7.7/7.4s；控制证明重复工作确实存在，不宣称CI全部时间都由它产生或精确native耗时已在远端测到。

**必要生产整改仅一个Job/lease内**：Studio execute从真实loadArchives的owned记录中按持久recipe id/revision/contentHash精确选择，删除仅用于再次选同一recipe的generic IR序列化/重解码；domain public restore和generic Built定义完全未改。公开已有ReplaySession经包root/export检查登记，仍128条/32MiB内、精确canonical archive+PNG内容指纹，仅保留真实公有验真后owned source/IR/Compiler。每Job创建自己的session绑定实际gate lease.signal，供loadArchives/readBuild/prepareBuild复用；prepare要求真实类及相同signal，warm hits也检查abort。没有全局/跨Job cache，不缓存Build/Export成功，不跳过文件SHA/祖先path或metadata验证，不用cast/fakeowned。

loadArchives14/readBuild14/prepare8/publish8/readExport10次数不减；每次文件重读、source/FileObject SHA/path、revision/descriptor、bundle/PNG/Layout/Manifest/Profile、标准Export验证、旧4/标准8、TX/CAS/Job完成条件全部仍运行。实际prefreeze同context1be下六张PNG与4份实际ZIP/Manifest SHA新旧逐字节同值；readDomainRecipe16→10（仅10处理预览，6重复Job调用移除）。新增2项session回归验证实际owned source bytes/pixels独立、warm不同PNG/validationHash拒绝及已结束signal拒绝。

最新Source真实PG/文件额外控制：warm session后把自己objects祖先临时改为同内容真实symlink，loadArchives仍拒绝；恢复原目录后原sources可读；未overwrite immutable文件，失败link保留私有。不同signal session在当前真实lease下prepare拒绝。证明warm不会绕过新鲜文件root或生命周期边界，非mock body。

## 旧/新受控反例与限制

使用同一个case/双模式三阶段、原全部assertions/180s，以精确studio-job scope在实际readDomainRecipe返回前延9秒，实际数据/算法、单native5s、HTTP/15s/5s/60s/terminal30s均不改。各Job预算仍60s内；这是有序可控额外工作成本，不是声称远端有同样9s延迟。旧1be原case正确180003ms FAIL，命令185.019s；新未冻结改动118.884s PASS，精确冻结0cdd9ad6a61a881bbf3a9ebd7d231e927f97bb2c另独立新DB/root/context对应控制124.771s PASS。旧timeout是expected negative，不是产物PASS。六阶段未拆、未skip断言、未额外生成测试Job；subset1case有15skip只因正常testNamePattern，fullHTTP下面16全部执行。

首版误用gate.current()作为Job条件，实际也包含公共read leases；旧182.849s失败保留，新比较正常SIGTERM仅own12个已验PID子树取消，**NOT_PASS**。初次精确python3名字guard失败前未发signal，修到确切script argv并排除原API22456/PG51121。随后按scope.startsWith studio-job重做。所有错误/原日志/目录数据保留，无将坏探针伪成产品缺陷或候选PASS。

六阶段新增细分step/checkpoint，仅观察上传/recipe、UI terminal/metadata/select/canvas、ZIP body/验证、实际文件/descriptor、history snapshot/adopt/current prepare/assemble；原82个AST断言call表达式全保留（嵌套call计数，不当82独立用例）。新阶段明确区分原case setup计时起点与test180总预算，checkpoint不增加等待预算。

## 最新冻结候选实际验证

全部以下来自clean Source、NO.env、自己的PG55476全新DB/root与正确物理artifact clone；不使用原Source594 API或原dist冒称最新。Chromium1248为本人task-private已安装cache，不冒称本轮冷安装。

| 本轮精确冻结Source实际命令                                              | exit | 秒      |
| ----------------------------------------------------------------------- | ---- | ------- |
| `pnpm check`                                                            | 0    | 77.459  |
| `pnpm exec vitest run apps/api/tests/studio/received-resources.test.ts` | 0    | 3.785   |
| `pnpm test:integration`                                                 | 0    | 11.226  |
| `pnpm test:dev-privacy`                                                 | 0    | 10.826  |
| `pnpm test:step06`                                                      | 0    | 207.059 |
| `pnpm test:step07`                                                      | 0    | 460.12  |
| `pnpm test:e2e`                                                         | 0    | 415.673 |
| `pnpm test:e2e`（E2E_MODE=dev）                                         | 0    | 439.315 |
| `pnpm build:step07`                                                     | 0    | 20.041  |

check354=父352+2新增；8 capture包含于354，重复执行不能相加为362。PG06完整23保持原60000ms，各故障恢复/Mock/backup/restore真实PG通过；HTTP16保持R1路径/上传/native预算/取消close-release、R4原三项/旧c227 writer/realCOMMIT.rollback/history/current/retired/干净恢复联通。最新normal六阶段114.264s、5+5成功processed actual200/finished/currentdocument/fullURL/project/recipe/frame/SHA/96×144/CanvasRGBA；selected actualA1/A2/Manifest/Profile与同ZIP/DBFinalExport/FileObjects/Build/Job绑定不变。

NO.env production18/development18均0skip0retry，慢poll/有限错误5+60/late动作/列表/普通切换5s/BUSY/timeout/lastsuccess/实际像素/clock/ZIP/current/history均原真实流程。6 actual browser ZIP经独立R7双目录/CRC/安全8-member oracle和Python zipfile/Pillow12 PNG解码；history同first bytes，Source/Profile/Manifest绑定。未重跑旧56payload16PNG/JS78/nativeCPU8与MZ GUI手工：Compiler/Profile/布局/通行未改，继承证据只按原范围，不重标本轮实跑；当前所需新生产回归已如上执行。

## 工程/资料/资源及未执行

Build `step07-0cdd9ad6a61a-1c6e73ce7d2c3713`；Manifest SHA `0dae573d54c309fea0223815235dc2b688e1c04fd65b6ee7097ff5ed758caac6`；路径 `artifacts/.step07-sixphase-duration-final-c9ef9bcf03d04492bb6cb93551e011b1/artifacts/step07-0cdd9ad6a61a-1c6e73ce7d2c3713/manifest.json`。206 payload每项live/immutable实际重算SHA/bytes，真实不同项为：apps/api/dist/resources/studio.json, apps/api/dist/studio-service.js, apps/api/dist/studio-service.js.map, packages/persistence/dist/index.d.ts, packages/persistence/dist/index.js, packages/persistence/dist/index.js.map, packages/persistence/dist/replay.js, packages/persistence/dist/replay.js.map, packages/persistence/dist/store.d.ts, packages/persistence/dist/store.js, packages/persistence/dist/store.js.map；其余195项与1be相同。不宣称205生产字节不变。完整Profile hash48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793、旧母版/Manifest原样。

Source只7个必要代码/tests/export登记路径；其余4640源路径逐bytes保护。Source之后仅本报告、Baseline追加及JSON/合成PNG/实际标准ZIP资料，无执行影响。最终docsHEAD在纯docs提交后的handoff/private coding-progress绑定，无自引用hash。ledger根相对逐sha/bytes/原件path/hash/用途见 `docs/evidence/step-07/ci-sixphase-duration/ledger.json`；原dump/trace/完整ownership/credential私有保留，RAM secretByteScan不泄漏，取消/旧失败不得删除。

原API22456:4376/PG51121:55476/env600/原liveSource594树不变。仅本任务新空DB/root/临时服务，所有数据、cache、备份/旧失败留存；只关闭本任务自启辅助，无reset/drop旧DB/copy.env/其他tree写入。PNG/HTTP/native/Host/Origin/path/Vite范围不变；JSheap≠OS/native RSS硬上限，非恶意本机管理员保证。

可见client-configuration原件明确step_coder/gpt-6.1-sol/xhigh/default(Standard)；无Fast/Priority/Ultrafast/collaboration/global修改。server final hidden **UNVERIFIED_NOT_EXPOSED**。无真实视觉SDK/model/key/PromptRegistry/Composer/router/AI/收费/Redis/SaaS或全局MZ/NW/Reactor。view_image只是实际技术图检查，艺术/具体artifact NativeMZ NOT_EXECUTED，旧Host/Map003延期保持。

新独立R14、full candidate LinuxCI、批准/merge/push/publication **NOT_EXECUTED_BY_CODER**。CI6真实超时原件仍FAILURE，不能仅凭作者本机成功说已远端通过；下一fullCI归Main。本轮证实并减少了具体重复工作，不泛slow runner/transient或无限replay。CI5当次机制依旧UNKNOWN。**STOP_WAIT_MAIN_REVIEW14**；06PUBLISHED，08–10 NOT_STARTED。
