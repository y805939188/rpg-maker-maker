# 步骤07 CI response生命周期整改 Coding交接

**READY_FOR_REVIEW / SELF_TESTED_READY_FOR_ROUND11**。正式已用10轮，下一轮为步骤07独立Review11，08–10实施NOT_STARTED；用户2026-10-14取消机械五轮上限，质量与历史编号保留。作者不批准/merge/push/改Main canonical，不自行关闭Independent gate。

Source `dc61fe03f64e644b7ac63057b3f7d7d26df547f8`；父Source `39daa13188eb401c2048a24e0606c1a91192e04a`，父docsHEAD `6c9d7d9a2d139482ec5b411323cdfbc4d3f22fb2`。最终纯资料docsHEAD在交接回复与私有coding-progress精确绑定，不在自身commit制造自引用SHA。

## 实际CI失败与可证实诊断

候选`e097ba156c660acdb351fc5abe62efc9db4b6f87`，CI38517441385实际FAILURE。Main原job115699301665日志128878 bytes，SHA `034727568a8fe94cf1cc107d90cd5170666ee97b394820e9372a5e79d9c7a591`；本树私有原件完整保留，公开仅脱敏全文与原SHA/bytes来源。PG23/check344/真实I/O与前提安装/API/privacy已过，HTTP16为15PASS1FAIL，case约24111ms；不是180s预算失败。两完整E2E因gate失败未执行，不能写PASS。最后阶段production:first:processed-image于23109ms开始、13ms后结束；原错误为Network.getResponseBody No data found，调用点1359 response.body()。原日志没有请求ID/URL/abort/navigation事件，因此**确切失败请求及当时具体触发仍UNKNOWN**，不虚构还原。

本地固定Node22.21.1/Chromium1248真实控制重现同一完整协议错误：先成功接收并显示96×144 PNG，再同URL第二次200头部/前8字节流、明确取消；原URL→Promise Map被已拒绝的第二响应覆盖，仍显示第一真实成功图却await错误。仅初始goto，navigation次数1，无第二次导航。页面保留成功真实PNG、旧Map错误和真实requestfailed ERR_ABORTED同时记录；不是mock body错误。原安装Playwright1.64.0 coreBundle.js primary source亦证实该“navigated away”文字对一般protocol-error附加，不证明实际导航。

产品源码中ProcessedPreview在delivery busy改变/cleanup时会取消旧读取，并保留同owner上次成功PNG；这本身符合既有恢复政策。原case用URL覆盖pending Promise无法表达该生命周期，catch只挂处理而Map仍持有rejected Promise。新控制证明这是**必要test capture缺口**；未发现必须修改App的证据，不把原CI泛称外部transient，也不盲重跑CI。原CI失败仍FAILURE，父R10 wholePASS不覆盖新Source。

Main R10原报告SHA `346e2a727b0ba029001dce1525112998484994e4d63c14b38c001668980117d7`、ledger SHA `e84431a27f7e9faef1b2a8edc3d29ae500a0be8b0dbec688ec6d8ab64aa4ea0c`，114原件逐项只读验真。R9 I/O P2由其独立CLOSED，R4/R7及R1–R3原closure保持，不由本作者重判或把旧结论重标新Candidate PASS。

## 最小测试修改

唯一3路径：integration.test.ts、received-resources.ts及其5项真实browser回归。4287父tracked文件中4286项不变，仅integration既有修改＋2新增。production/API/Web/配置/锁/schema/contracts/Profile/Compiler/slot/clock/通行、CI fetch-depth0/Chromium早安装、真实I/O helper31和strictZIP47代码均原字节保持。

捕获器使用request identity、document epoch及原full origin/project URL，记录GET/200/content-type/finished、真实body与SHA，取消/协议错误作为明确unavailable结果保留Native和transport失败信息；不会用catch把缺失body变成功。响应一到即调用原response.body()，没有server补抓/fetch/readExport。旧文档响应不会用于新文档，旧同URL取消响应不会覆盖已显示成功图的实际body；只有当前document、正确URL、transport finished且真实SHA匹配当前DOM的body可用。

原image检查保留实际natural96×144、项目/recipe/frame/fullURL、PNG body SHA和浏览器image→canvas RGBA对Sharp，还加强recipe/frame必须同当前UI选择、content-type PNG；缺必需body在原expect5s内等正确实际响应，否则明确失败，不接受另一项目/旧frame或随意旧hash。有效旧成功图可在同owner/frame的重读被取消时继续验证它自己实际接收的成功body，不误判为该取消请求成功。DOM hash/像素变为新图时必须有新图匹配body，不能拿旧成功替代。

delivery A1/A2/Manifest按当前Build精确URL＋实际ZIP成员SHA匹配browser收到的完成body；原strict local/central/EOCD/八成员/七payload SHA/Manifest/Profile/DB FinalExport身份全部保留。descriptor按当前Build和scene匹配完成JSON，再保留原Build/export/manifest断言并增加scene核对。所有response lifecycle在成功和失败finally均留记录，便于下一次精确定位，而非依赖错误文案猜导航。

原单一180000ms六阶段、page/PNG15s/expect5s/barrier60s/terminal30s、全部HTTP/native/Queue预算、5次恢复及原strict ZIP/assertions保持。没有拆case、加预算、跳过、另一server重取图片、重复processing/readExport或改current/history/late/retired语义。最新实际normal两mode **processed成功响应5+5**，捕获本身不产生网络请求。

## 确定性真实browser控制与保留失败

5项新正式回归使用本进程owned loopback HTTP fixture和真实Chromium/response.body，无PG或业务重提：

1. 同URL成功A显示后，B在200头/partial body阶段取消，旧Map真实NoData失败；新捕获仍验证实际A的RGBA，缺B不能拿A充数；随后真实B到达更新身份。
2. 明确取消屏障后导航，旧document所有同URLbody退役；新document必须再次实际接收B才可用。
3. 同URL旧请求晚响应不能覆盖较新实际显示PNG，按真实SHA和request/document关联。
4. 缺失/wrong origin/project/recipe/frame/hash、真实foreign响应和non200均不能满足当前所需body。
5. 实际腐败PNG解码、错误DOM hash和实际错误尺寸PNG拒绝，不用合法旧body/另一frame冒充。

首版prefreeze3PASS/2原15s timeout原件、脚本和case记录保留：Chrome可让导航后的旧流继续pending，不能无条件等待requestfailed；该超时后的连续fixture也无效。修正为显式abort屏障后再导航，fixture fetch no-store使同URL顺序控制确定；不增加15s或降低断言。缓存合并是控制设计考虑，不宣称它就是原CI机制。v2/v3五项均PASS，type/lint完成后首冻01edd。该中间候选check349/专项5/API3/privacy5通过，但HTTP15PASS1FAIL：作者新增精确label定位未包含select option text，初始image inputValue原15s超时，非原协议错误。原Source/失败log/DB/root均保留。去掉三个唯一选择框的exact限制，保留身份断言后先实跑完整单180s六阶段，135.39s命令/1PASS15按-t未执行，再冻结最新Source并完整重跑。01edd不重标最终候选，prefreeze不冒称新Source fullcheck。不存在把真正CI协议失败改为辅助错误。初次读取旧版未bundled Playwright路径glob失败后，改读取实际coreBundle.js原实现，该只读错误单列保存。

## 最新冻结候选实际执行

| 动作                               | 实际结果                                                                                        | 秒数    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- | ------- |
| pnpm check                         | 30文件349/349，含新5真browser、原真实I/O31及ZIP47，方向/type/lint/format/clean build/11 exports | 74.241  |
| 最新响应专项                       | 5/5真实browser生命周期及坏输入回归，原15s case预算                                              | 2.59    |
| pnpm test:integration              | 真API3/3，新空owned regression DB                                                               | 10.468  |
| pnpm test:dev-privacy              | 5/5，原Vite私有边界                                                                             | 10.366  |
| pnpm test:step07                   | 原HTTP/PG16/16，六阶段完整及5+5 processed实际body/owner/像素/ZIP                                | 519.397 |
| pnpm test:e2e，NO.env              | production18/18，0skip/0retry，新空DB/root                                                      | 447.469 |
| E2E_MODE=dev pnpm test:e2e，NO.env | development18/18，0skip/0retry，另一新空DB/root                                                 | 470.395 |
| pnpm build:step07                  | clean精确Source，206 actual immutable/live逐SHA重读                                             | 20.543  |

两个完整浏览器模式保留创建/refresh/诊断导入/六源与recipe精确revision/构建/组件替换/失败last-success/current/history/retired/legacy转换/slowpoll/预算停止及只读恢复/迟到动作和列表控制。每模式isolated/edges各4state actual canvas→independent reference、其他四scene截图、源PNG/processed真实解码、nearest和播放/暂停/逐状态均执行；非仅canvas/frameIndex/collect。24scene/12+12clock三周期及1500ms专项本轮未整套重跑，沿旧独立原Scope，不能冒称本轮全专项。

六份实际browser ZIP（first/second/history×2，history原bytes等于first）由独立local-first Python双目录/CRC/七payload SHA/完整Profile hash `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`/Source与Pillow12次RGBA768×576解码核验。六下载位置/四first-second登记位置与不同content ExportBuildID分别统计，不凑覆盖率。四张关键current reload/switch截图实际view_image并hash；reload可仍在途processed，不能单张证明解码，稳定switch和原像素/decoded断言提供证据。技术查看不写USER艺术或新artifact MZ实机PASS。

## 工程、资料和资源

BuildID `step07-dc61fe03f64e-a84e6c675d40997d`；Manifest SHA `798eb69ca61ca16146dc28a0bacb9c24f503129f37c417b5d78414aff431bc24`；实际目录`/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker/artifacts/.step07-ci-response-latest-3c87eec0449f4160a87849bd633ec735/artifacts/step07-dc61fe03f64e-a84e6c675d40997d`。206 immutable/live真实重读一致，相对原594运行文件205逐字节同，studio.json仅context.commit更新；原4376本身dist206保持。旧Manifest不覆盖或补PASS。

[最终ledger](../evidence/step-07/ci-response-lifecycle/ledger.json)逐文件finalcommitted SHA/bytes、原件来源/SHA/bytes/用途；报告SHA单列，排除ledger自引用。脚本均JSON包裹的脱敏非执行文档，冻结后只本报告/evidence提交。实际own DSN/password内存扫描，值不打印；env/完整DB ownership/dump/license/private输入/trace敏感字节不公开，私有原件及hash-only inventory保留。

正确物理隔离源码`/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker/artifacts/.step07-ci-response-latest-3c87eec0449f4160a87849bd633ec735`，不处于.local祖先，Vite roots/deny未扩。所有regression/production/development及HTTP内恢复DB/root只在自己PG55476新建、从不存在assets root，不reset/drop旧数据、不copy .env/凭据、不重复业务任务污染主库。原API22456/4376、PG51121/55476/.env600/data/assets/dist保持，原服务未stop/restart；自启4398/5298正常close，其他Main/Reviewer/release树与DB/root不写。真实start/dev由两模式实际调用；只Coder本地codex分支commit。

同nativeCID01a132c0-f44b-75f0-bea5-7f4e5e77a6ea、step_coder/gpt-6.1-sol/xhigh/default(Standard)，无Fast/Priority/Ultrafast/collaboration/globalCodex/MZ/NW/Reactor修复；server最终字段`UNVERIFIED_NOT_EXPOSED`。Node22.21.1 PATH仅本进程，pnpm10.20.0/PG14，Chromium1248。JS heap不是OS/native RSS硬cap、PNG/HTTP/native/close-release/PathRoot安全与Source bytes/pixels独立所有权等原约束不变。

## 未执行与停止

本Source独立R11、新candidate whole CI、Main批准/merge/postmerge/push/readback/发布均**NOT_EXECUTED_BY_CODER**。R10 wholePASS只属于旧39daa/docs6c9；R9/R7/R4 closure按原独立Scope保留，旧原失败/CI1–4/report/ledger/build均未改写。本轮未整套重跑PG06独立23、完整cleanbackup/restore/Mock专项、旧56payload16PNG/JS78/nativeCPU8及新MZ GUI/Host/Map003/用户艺术；HTTP16自身真实恢复/重建已执行，production核心字节不变的其余专项仅沿原独立适用记录。没有真实视觉模型/SDK/key/PromptRegistry/Composer/router/AI流程/付费/Redis/SaaS；06已PUBLISHED不重复，08–10 NOT_STARTED。

**STOP_WAIT_MAIN_INDEPENDENT_ROUND11**。
