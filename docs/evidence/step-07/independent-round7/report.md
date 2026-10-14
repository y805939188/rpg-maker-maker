步骤07正式独立审查，第7轮，2026-10-14（Asia/Shanghai）。**REQUIRES_REVISION，当前最新整合候选不能 whole-candidate PASS。** P0=0、P1=0、当前硬验证契约阻断P2=1（STEP07-R7-001）、新增非阻断发现=0。必要正常测试与完整负控制已完成；正常生产交付原件验真通过，但当前测试会接受central CRC损坏的ZIP。R4三个问题保持FIXED/CLOSED。

本报告只属于 Reviewer 技术审查，不是批准、CI、合并、推送或发布。未改 production/tests/config、Main/Coding/canonical 或已发布产物；未 commit/merge/push/批准。06保持 PUBLISHED，08–10 NOT_STARTED。正式轮次保留1–7，2026-10-14取消机械五轮上限的授权适用。

冻结与配置：

| 对象                           | 实际绑定                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Source / managed detached HEAD | f5740c1fd0e9e22a4f4676de51b7fd2555bc05a5                                                                     |
| Author docs HEAD，git show只读 | 2eb75dd4b91f8212a572ef92c7930ff4d17336b5                                                                     |
| Author报告 SHA256              | 5ebdd79d7231c7ee47b259d3bce1beaee60c47068eb69f668a7b4555d69475f5                                             |
| Author ledger SHA256 / payload | 6e5ad9071a76188fb8153cee30b682bcc9a5f249fd75e9e878a8fc3590c4cb38 / 90                                        |
| 独立原builder工程 Build        | step07-f5740c1fd0e9-4ddf87d606c1becc                                                                         |
| 工程 Manifest SHA256 / 文件    | 71c1bc4dbc14b854eb45ff36c1c024ef4443162817989aed762c8187dbe266d7 / 206                                       |
| 完整 Profile 实算 SHA256       | 48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793                                             |
| Native session                 | 01a13797-04c8-7940-aecb-e57f5c53bcc7                                                                         |
| reviewroot / ledger文件键      | /Users/dingshinn/.codex/worktrees/step-07-review-round7/rpg-maker-maker/.local/step07-review；所有键相对此根 |

actual turn_context 的 cwd、model=gpt-6.1-sol、effort=ultra 已核对；Main实际CLI收据请求step_reviewer/default(Standard)。**服务端最终model/effort/tier为 UNVERIFIED_NOT_EXPOSED**，不以客户端请求冒充服务端验证。无 collaboration/Fast/Priority/Ultrafast 或全局配置变更。[会话记录](evidence/session-context.json)、[Main请求](evidence/main-client-request.json)。

审查读取 AGENTS、产品V0.5、十步plan、MZruntime、STEP03–07契约与要求映射、06原R3/发布、06–07及2026-10-14授权、Main唯一canonical、R4/R5/R6原报告、Fix4/history/prerequisites与新timeout交接及原件。[阅读来源](evidence/review-reading-sources.json)。checkout旧state只作历史。未重开05全Review/MZ人工门禁。

范围与来源：从87到f574，196个非docs/README文件只有一个测试文件变化；其余195项（包含CI）逐字节相同。相对R5/594，只有CI前提和该测试文件不同，194项相同。Source后92个路径全部是资料，逐项用途和JSON已核对，没有执行影响。[执行字节映射](evidence/execution-file-byte-map.json)、[资料用途](evidence/post-source-doc-purposes.json)。

R4原430、R5原514、R6原112独立payload与报告/ledger逐SHA+bytes匹配，最新作者90项及87份私有原件索引重新核对；42份旧诊断原件和2份受控trace也验真。[原ledger审计](evidence/prior-ledger-audit.json)、[私有索引核验](evidence/private-original-audit.json)、[trace](evidence/retained-trace-audit.json)。这些不改写为本轮重跑，也不由作者/Main证明替代本轮独立判断。

R5原 Source=59423201ba10ee71c3d1b04cebec69659017b7c7、docs=5c3361b9cb28a49c7cbdcabf28f03c8eba470d6d、report=81743cc098390f726ccba1c8548e253b303998b16e53d02bc62dd8b1be45ff85、ledger=8b5e8f0743b872159e2607cef4dcc6e4568565d7b596e7213734f808a183533e。R6原 Source=87e13a8a99db3058dce8680d3ae985969b8a9bac、docs=1e83c986091739f76899d35eeeb5879e7bf0bf58、report=7f884b71d12e0159d21c9f0ec7b4e8b7b8bec6b859192d7ef6032f874f6d5e92、ledger=ddc740ef0bef35375c2def2e43a882872e43edfd9e0e50c638de27aed8a4a4db。R5完整check266/HTTP16/PG23/API3/privacy5/prod18+dev18、24scene/4creative、12+12clock/3cycle、16ZIP、cleanrestore/rebuild、Mock known同ID/unknown不重提、真SIGKILL/restart等只支持相同执行字节的未影响部分。R6范围仅其报告所列执行，首次HTTP15PASS1辅助部署FAIL和正确部署定向1PASS15SKIPPED保留，不写成R6全18/PG23重跑。

本轮独立 clean clone运行未改 `pnpm build:step07`，206个不可变文件与作者、managed live dist及clone live dist逐bytes/SHA一致。与R5只有studio.json的context.commit更新，205文件及该JSON其余字段相同。[工程](evidence/engineering-verification.json)、[compiled影响](evidence/compiled-compatibility.json)。R5/e195/87三套旧206文件只读验真并保护，不向根共享artifacts出版。

**新发现 STEP07-R7-001：ZIP helper未检查central directory/EOCD，必要损坏负控制可假PASS。**

- severity：P2 BLOCKING，当前必要测试强度门禁阻断，完整负控制已确认。位置：[integration.test.ts:1236](/Users/dingshinn/.codex/worktrees/step-07-review-round7/rpg-maker-maker/apps/api/tests/studio/integration.test.ts:1236)，while仅遍历local headers，1266直接返回；1541后消费者身份断言继续使用这些local文件。
- spec：产品§4.5/§9.2/§11.3，STEP07精确安全八成员的实际ZIP交付；本轮明确要求独立CRC/成员/逐文件/PNG/Manifest/Profile身份验证，损坏CRC或成员不得假PASS。
- trigger/repro：从原R6已验真的真实下载取原件，保持八个local文件、local CRC、Manifest与全部PNG原字节，只改第一个central CRC一bit。当前helper接受；Python zipfile.testzip及本轮独立local/central/EOCD校验拒绝。修改central成员名为../bad或EOCD成员数9，也被helper接受；local CRC和真实payload变化则正确拒绝。
- actual/expected：actual接受损坏的消费者ZIP；expected核对central与local的姓名、CRC、长度、offset、flags/method、精确八成员和EOCD范围，并拒绝不一致。ZIP消费器依据central记录验真；仅local文件相同不足以证明archive有效。
- evidence：[精确helper反证](evidence/zip-negative-controls.json)、[独立双目录oracle](evidence/strict-zip-negative-oracle.json)、[完整wire/PNG/Profile负控制](evidence/wire-file-profile-png-negatives.json)。原helper+CRC从冻结源码提取，只有Vitest比较方法等价替换为node:assert；无生产修改或fake-owned状态。完整六阶段负控制已确认：未删任何原/新增断言，四份实际download仅改central CRC一bit且整体body hash正确重算，原case仍1PASS/15SKIPPED（136.158s）；本轮独立双目录CRC校验拒绝全部四份坏ZIP。这个诊断在接收到真实HTTP原body后，只对consumer副本施加一bit CRC故障，正确重算对应body SHA，模拟导出容器内部有误但传输摘要自洽；不修改PG、来源、PNG、Manifest、生产zipFiles或任何断言。此exit0仅COUNTEREXAMPLE_CAPTURED，绝不是candidate PASS。[完整反证与四组原件](evidence/full-case-zip-counterexample.json)。
- blocking/minfix：这是必要消费者校验的具体测试缺陷，不宣称当前生产zipFiles已生成坏包。保留新捕获/六阶段/所有原预算和断言，在helper补central/EOCD一致性与安全成员检查，补真实ZIP腐败控制；无需重加重复处理请求、加预算、拆case或改生产导出器。

原断言与减负判断：[语义映射](evidence/assertion-semantic-map.json)、[真正expect断言逐项AST映射](evidence/expect-assertion-site-map.json)。原29个expect/browserExpect断言中28个文本相同，唯一重复GET的status200由“只捕获实际200+完整owner/URL且必需body存在”替代。自然96×144、字节SHA、实际image→Canvas RGBA、真实COMMIT、Job/FinalExport、current/needsRebuild、退役、选定Canvas、true-history-only均保留。实际PNG map依完整浏览器origin/project/recipe/frame URL，不使用另造PNG或内部frameIndex代替像素。body错误catch只防无关旧读取unhandled，必需Promise仍由await抛错。

移除的readExport是重复校验：真实download仍实际执行StudioService.export→Persistence.readExport→源/IR/Compiler/Pack/Layout/PNG/context/文件引用验真。新Manifest/完整Profile/每项bytes+SHA、同浏览器A1/A2/Manifest、BuildDetail descriptor与DB FinalExport身份断言是额外支持；上述central缺口独立列出。页面在true-history-only实际COMPLETED/current未回退、选定Canvas、退役按钮和processed实际RGBA均已验证后关闭；取消仅本地读取，不假称任务/供应商撤销。

独立测量确认作者旧normal156.21s、最后development历史终态148205ms；每模式5次image检查、10次processed调用，累计11919/11911ms，重复5次约1.2s。受控trace/事件无业务barrier卡死支持；readExport紧接download的重复完整处理也从调用源码确认。[原测量实读](evidence/author-measurement-readback.json)。**原Linux CI2没有命名阶段日志，其最后等待行仍UNKNOWN**，不以本机对照虚称已定位Linux具体卡点。

本轮实际执行（计数不相加为覆盖率）：

| 动作                             | 结果与归属                                                                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm check                       | Sourcef574，266/266、26文件、方向/type/lint/format/clean build/11 exports，75.136s；privacy5包含其中                                                                                                                 |
| 自己迁移/环境                    | 自己PG55491，五个原迁移成功，1.925s，无reset；actual data_directory、PG14.20、.env0600、primary Project0核对                                                                                                         |
| 原step07 config/tests            | 最新原HTTP16全部PASS，517.342s；六阶段timing132591ms，仍单一180000ms case                                                                                                                                            |
| 旧87 harness合法1500ms延迟       | 诊断副本，原断言/budgets不变；CLI exit1、case180003ms FAIL、命令184.036s；不是counterexample exit0被当旧PASS                                                                                                         |
| 新f574 harness相同延迟           | 诊断副本，1PASS/15SKIPPED，命令150.964s、case内147405ms；实际processed5+5，单请求约2.7s                                                                                                                              |
| 完整ZIP腐败六阶段                | **COUNTEREXAMPLE_CAPTURED**，命令136.158s；六阶段全部走完、四份坏ZIP穿过所有原/新增断言；四份原下载独立CRC/精确安全8成员/逐file SHA/完整Profile/Manifest/两个768×576 RGBA pixelHash均PASS，四份坏central CRC全部拒绝 |
| API integration / 项目列表两模式 | API3/3，1.319s；原列表生产5/5（40.726s）及开发5/5（57.495s），实际200/201/422/反向列表/有界只读恢复/unmount；完整18+18不重标本轮                                                                                     |
| clean工程 / 实际查看             | 新206文件完整匹配；production/development replacement两张自己的实际截图已view_image，技术观察，不写USER_CONFIRMED或artifact MZ PASS                                                                                  |

准确argv/cwd/exit/秒数、所有失败原log SHA+bytes见[commands](evidence/commands.jsonl)。旧/new诊断仅自己的ignored副本，原config保持180000ms/60000ms；PNG原15s/expect5s/terminal30s、job/native/HTTP budgets不扩大。旧测试语义来自Source87；两个诊断runtime为f574，相同生产执行字节仅资源context.commit不同，已明确记录，不能冒称重跑Source87整套应用。[对照](evidence/independent-delay-comparison.json)。

R4持续关闭范围：R4-001（store.ts:689/717/740，产品§7.1/§10.2）正式真实c227四文件writer→FinalExport同TX→COMPLETED/preview/ZIP200、幂等、文件失败/rollback/丢回执保持；R4-003（studio-service.ts:264/319，§4.4/§7.1/§10.2）原HTTP跨COMMIT与两个客户端首个/替换/history-only保持完整旧或新元数据，历史不回退current；R4-002（App.tsx:92/119，§4.1）列表自身世代修复字节未变，R5/R6独立记录适用，本轮两模式5+5定向原回归全部通过。R1–R3原范围保持，未重开已关闭且执行字节相同的发现。

原问题状态（全部原P2，无新开放项）：

| 发现 / 文件 / 规格                                     | 原触发、当前actual/expected与独立支持                                                                                                                        | blocking / minfix                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| R4-001 / store.ts:689,717,740 / §7.1、§10.2            | 旧06四文件同owned Build先publish；本轮真实c227后Studio COMPLETED时FinalExport1、preview/download200，幂等/失败/rollback/丢回执保持；同TX交付完成满足expected | FIXED/CLOSED，0；已有registerExport→finishJob足够，无新修复                               |
| R4-002 / App.tsx:92,119 / §4.1                         | 初始唯一list200跨无关上传/失败/采用被误丢；本轮prod5+dev5的真实迟到200、201、422与反向替代/显式恢复/取消全部通过，列表自身世代expected满足                   | FIXED/CLOSED，0；已有listGeneration/controller足够，无新修复                              |
| R4-003 / studio-service.ts:264,319 / §4.4、§7.1、§10.2 | 元数据读跨真COMMIT混旧pointer/new COMPLETED；本轮首个HTTP和双客户端六阶段完整旧/新snapshot，true-history-only不回退current，actualPNG/Canvas/ZIP/retire一致  | FIXED/CLOSED，0；5000ms/1000ms READ ONLY RepeatableRead短TX满足expected，文件/pixel仍TX外 |

CI1 head70bcdcc3…/38464677883 FAILURE及CI2 b868e351f01edcbcfc63b3b9e15dc26981427361/38475532067 FAILURE保留；CI2原125718bytes/SHA0ee4995d5c9e1f50bb5d1bd5f44c4e063cfbaa21e1fd92164a7a0fb82d31fe41已实读。真实writer44753ms、Chromium1248安装/launch及PG23PASS明确关闭前两前提，唯一HTTP180003ms失败如实保留。[原CI2](evidence/ci2-original-audit.json)。fetch-depth0、唯一Chromium install早于首消费者、全部版本/permissions/CI预算保持；本轮HTTP真实旧writer与Chromium消费者支持这些前提。[CI前提](evidence/retained-ci-prerequisites.json)。远端新candidateCI、Main验收/merge/postmerge/push/readback/mainCI/发布仍是Main门禁，Reviewer结论不替代。

辅助失误如实保留：初始独立环境脚本从根裸导入@prisma/client失败，随后从API声明依赖解析；最初live public表数读取未执行，后续自己五迁移log及data_directory/Project0核对明确区分。初始AST selector包含toBuffer/toString，原计数保留且不作为覆盖率；语义映射另纠正。若干猜错文件名的只读错误留native原session，不作产品缺陷。没有改正式tests/config使通过。

**NOT_RERUN：** R5完整PG06 23、全prod/dev18+18、独立24scene/4creative、12+12clock三周期、旧56payload/16PNG/JS78/nativeCPU8、完整Mock known/unknown及SIGKILL/restart；仅相同执行字节部分沿用明确原Source独立证据。**NOT_EXECUTED：** 新远端CI/发布、MZ GUI/编辑器/游戏、用户艺术、Original Native Host/Map003補证、OS后台标签、真实视觉Provider/SDK/key/正式PromptRegistry/Composer/router/AI/收费/Redis/SaaS。当前硬PNG/HTTP/HostOrigin/client/path/Vite/close-release预算与heap≠nativeRSS说明保持，domain Built仅IR、内部四文件/标准八文件分层未变。

结束保护已核对：全部3781 tracked bytes/SHA相同、HEAD exact/detached/Git clean；live206仍匹配，旧R5/e195/87三套206文件/Manifest原字节保护。自己的API4391/Web5291与短暂browser均已结束，single-port lsof各自无stdout，自己pg_ctl status正常、actual data_directory核对、其他DB client=0。PG55491、7个自有tileset_数据库、.env0600、源/Build/stage/orphan、备份/dump、原失败/trace全部保留给Main正常安全stop；CodingAPI4376/PG55476未操作。自己check/e2e的固定.local输出完整移入reviewroot/private保留，未丢弃失败。[资源](evidence/resources-final.json)、[保护](evidence/preservation.json)、[输出归属](evidence/fixed-output-retention.json)。公开payload只保留脱敏证据，排除env/PG ownership全值/dump/licensedruntime/私有输入/敏感raw logs，凭据bytes扫描由最终ledger绑定。Reviewer到此停止，交Main安排这个最小测试整改及最新冻结候选独立复审；不能批准、发布或开启下一步骤。
