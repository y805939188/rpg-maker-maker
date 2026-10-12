# 步骤05第一轮Coding整改 — STEP05-IR-001

2026-10-13，Asia/Shanghai。本轮用户明确要求修复当前阻塞点，仅实施步骤05小范围整改、回归、冻结构建及文档；没有调度Reviewer、合并、推送、创建PR或启动步骤06。

| 项目             | 状态                                                                           |
| ---------------- | ------------------------------------------------------------------------------ |
| Coding整改       | COMPLETE                                                                       |
| 自动复测         | PASS                                                                           |
| STEP05-IR-001    | IMPLEMENTED_AND_SELF_TESTED_PENDING_INDEPENDENT_REVIEW                         |
| 新候选独立Review | NOT_EXECUTED_BY_DESIGN                                                         |
| 人工材料影响     | PASS：既有PASS_USER_REPORTED观察引用到不变PNG/布局；本会话GUI/游戏NOT_EXECUTED |
| 当前步骤         | READY_FOR_REVIEW；未APPROVED，仍需新候选独立PASS及用户批准                     |

## 实际基线、配置和候选

开工主目录 `codex/step-05-pack-assembly` / `23d8386c6131610ce5351e55d6afb8b97da79b9e`，无未提交实现，仅三份人工准备/观察报告和脱敏receipt尚未入库。先以165a2a0保存原字节，未改原观察/独立结论。正式受审功能基线 `c09027f921e7d67469b301083db89acc44433d9e`，[独立报告](step-05-independent-review.md)为REQUIRES_REVISION、1个阻断P2 STEP05-IR-001；其验证支持部分保留。main/origin/main仍 `fc407198eefad9336ba97fb9482bdd832ca78f83`，其他worktree/refs/原产物保留。

**最终冻结功能候选：`ad669a06218b6cf775f32b8333d75d9dd3f9186f`。** 文档/证据为之后单独提交，实际HEAD以Git/最终回复和.local结束receipt为准，不为本报告自引用反复提交。没有将新文档HEAD冒充受测功能SHA。

当前有效turn_context明确gpt-6.1-sol/xhigh；客户端service_tier=default。全局默认推理设置为ultra，和当前会话实际xhigh字段分开记录，不把全局默认当本轮有效配置，也未更改设置。逐请求/服务端最终tier UNVERIFIED_NOT_EXPOSED；无Priority子Agent。见 [配置](../evidence/step-05/fix-ir001-ad669a06218b/client-configuration.json)。已核对AGENTS、原独立反例/ledger、人工receipt、运行环境、既有完整plans/契约/维护基线及四入口/正式测试。

## 根因与最小修改

四入口finally均无条件递归删除预测stage路径，目标提前拒绝、stage已存在/mkdir失败时，也会删掉不属于本次的数据。同一根因影响 `scripts/pack-export.ts:publishDirectory`、`scripts/build-pack-sample.ts`、`scripts/prepare-step05.ts` 和 `scripts/build-engineering.mjs`（共享02/03/04/05入口，继承缺陷同样修正）。

每个入口新增局部stageOwned，默认false，只在独占mkdir成功后设true。prepare明确mkdir取得空目录，再cp来源；已有目录检查与mkdir竞态均不会取得归属。rename成功后立即设false，旧stage路径后来被别的目录占据也不清理。finally仅清理本次仍拥有的stage，lock释放放独立finally，保持本次部分写入/验证失败的清理及成功目标不覆盖语义。

仅修改上述四生产文件、新增一个归属测试文件、扩展test:step05选择器；无新依赖/锁版本、Compiler/Pack/像素/Profile/Pixel Contract/源母版/领域/API/Web/CI更改，没有借机引入数据库/CAS/分布式锁/任务平台。

## 正式回归与反证

新增15项归属回归：四入口各自“新目标已有stage”“旧成功目标＋无关stage”“已拥有stage的部分处理失败”，再覆盖publisher/prepare/engineering发布后同名stage路径被重新占用。要求无关sentinel逐字节保留、旧成功目标保留、无半成功目标、自有失败stage清理、lock释放；错误消息也断言，避免无关前置失败造成假通过。

子进程用IPC门禁先给出PID，父进程完成碰撞设置再载入正式生产JS，避免启动时序竞争。工程用最小正规payload及固定Git身份；prepare以合成只读预检输出隔离正版MZ/private.env要求，实际mkdir/cp/write/rename/finally执行正式代码。文件系统故障和重新占用只在测试专属目录注入。实际完整Pack/core/PNG/prepare链路另外无这些mock重建，测试没有将合成PNG当MZ证据。

原c090存档JS与Git原engineering源码的相同回归为 **11失败、4自有失败清理控制通过**；新候选 **15/15通过**。[red](../evidence/step-05/fix-ir001-ad669a06218b/ownership-red-complete.log.txt)、[green](../evidence/step-05/fix-ir001-ad669a06218b/step05-frozen.log.txt)。开发中修正了测试注入路径的macOS /var→/private/var规范化、旧版本fixture的node_modules连接，并增加错误断言；原失败日志保留，未删测试/降阈值/重置母版。

| 最终候选实际执行                          | 结果                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| pnpm check                                | PASS：20文件225/225，Strict/lint/format、10workspace方向、干净build、8真实生产ESM exports           |
| pnpm test:step05                          | 3文件37/37（原22＋新增15），包含在225中，不相加为覆盖率                                             |
| 原公开scalars.mjs                         | 78/78；脚本原字节保留，不依赖TS cast                                                                |
| node scripts/build-engineering.mjs step05 | PASS，123生产/工程payload；绑定冻结候选                                                             |
| node dist/scripts/build-pack-sample.js    | 八套正式Pack/16PNG成功，容量拒绝仍生效                                                              |
| 原生core verify-step05.js                 | 八套全部PASS，3600形态/状态检查、8,294,400像素；每套600次update/601观测，CPU不是GUI/游戏/独立Review |
| prepare-step05.js真实旧手绘来源           | 新专属副本成功；Map001/002/003/System/Tilesets五文件保持原字节                                      |
| 重复suite/engineering                     | 非零拒绝，既有成功构建保留                                                                          |

[精确命令/退出码/时间](../evidence/step-05/fix-ir001-ad669a06218b/commands.json)，[摘要](../evidence/step-05/fix-ir001-ad669a06218b/validation-summary.json)。原命令日志留.local，Git镜像仅替换仓库绝对路径为&lt;repo&gt;；raw/sanitized SHA分别记录。自动复测是作者执行，不能替代新候选独立PASS。

DB集成/迁移、Playwright开发/生产、远端CI、本会话MZ GUI/Host/真实游戏为NOT_EXECUTED。本修订无API/Web/Prisma/HTTP/页面/启动/DB行为变化，原unit/Vite隐私检查随check执行，故不复用私有数据库/.env或重做无关浏览器流程。既有Vite大chunk提示、codec预算及native RSS限制不变。

## 新构建与人工观察影响

工程Build `step05-ad669a06218b-deec5d4376173aaf`，Manifest SHA `a262d9f49d95b3bf97db947e846b6e3d1e11559726c8733a4725748aaeb524b2`。完整新suite：`artifacts/step05-suite-ad669a06218b/`，每套八文件、可执行的原始request在suite根。旧构建/ZIP不覆盖，原Manifest不追加PASS。

| Pack                  | Build ID                                    | Manifest SHA-256                                                   |
| --------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| incremental-v1        | `step05-pack-ad669a06218b-9466611b22a364e5` | `0c642f779bb24227cb4c8b9317873fd51f6ce62a0ed9f645ab77e7ad48e4c516` |
| incremental-v2        | `step05-pack-ad669a06218b-6da291a3cced76f9` | `2aa0291272156080367f678943d73c394ea1366b29fbc5fdda183020f42b1a45` |
| incremental-v3        | `step05-pack-ad669a06218b-8a87ac9ce6ec06c4` | `10428be35217523661b0025032a99dbc566ed3a09d38544282f1de9ea16fcb8d` |
| incremental-v4        | `step05-pack-ad669a06218b-b8e5bd4fe9129ff4` | `5c3348d73090cd1502175b5b49606a748c2b6451dc0a71098cbf892e115a6c0d` |
| art-old-map-v1        | `step05-pack-ad669a06218b-d90fdfef4b410c53` | `a8316e2b41be099ae50cdf7141194bca2838fafc37349c8cd57e3386cfbb73e7` |
| art-old-map-v2        | `step05-pack-ad669a06218b-cca566875cf228c9` | `c318365621a0a442fcb411222cee94685e326f357b65591caca6102f44bd20ae` |
| diagnostic-old-map-v1 | `step05-pack-ad669a06218b-0dbc9d5f11bb8e5d` | `47ffa2ecdde2aed765bcc3831a0d609f97d6f2110aadb1ecd2c0995d75895a63` |
| diagnostic-old-map-v2 | `step05-pack-ad669a06218b-ea9a5c62f1760054` | `054d0dcc3a68070b21977429bd0ef2fa49ae1d9a33a5dfbda2c5899c98fee5f9` |

[新旧比较](../evidence/step-05/fix-ir001-ad669a06218b/payload-comparison.json)证明八套的A1/A2、pack/history/layout/sources JSON和INSTALL共 **56/56文件逐字节不变**（16张PNG包含完整保留透明区与退役内容）。Manifest/Build身份因源码commit变化正常不同；功能只涉及发布失败路径，像素/布局/来源算法未改。

[用户receipt](../evidence/step-05/user-manual-20261013-025315/receipt.json)仍绑定原c090具体产物：绘图/邻居重算、动画/岸线/通行、新增/更新/退役和两张旧图为PASS_USER_REPORTED，保存数据与图集为PASS_READ_ONLY，截图/录像未提供、runtime观察日志未采得、实际Host未在该次独立验证。按用户本次明确的影响复核规则，可引用到这批不变PNG/布局，[复用引用](../evidence/step-05/fix-ir001-ad669a06218b/manual-observation-impact.json)关联原receipt SHA和新候选，未修改原receipt或伪造新GUI执行。无需现在重做整套人工测试；不同像素/布局的后续候选不能自动继承此结论。

旧地图新的准备副本为 `.local/mz/step05-ir001-ad669a06218b/game.rmmzproject`；五JSON与原步骤04真实手绘来源相同，只安装本轮最终四PNG并另存新build-reference。用户既有Step-5-test/kit和旧工程未改。此前95成员ZIP仍可用于同像素观察，新增构建身份/影响引用以本报告和证据为准，无需复制或分发正版Runtime/RTP。Original Native Host按既有授权最迟步骤10，旧步骤01Map003待补事项和截图/录像缺失如实保留。

## 保护、交接与停止

3097个开工保护对象中仅5个预期生产/命令登记文件改变；其余旧artifact、人工工程地图/图集/receipt、原Review/Coding/ledger/Manifest均SHA匹配，无缺失。新测试/产物另存，refs/worktrees未整理、主分支未动，没有启动/迁移数据库或修改全局MZ/NW.js/RPGReactor、模型/Prompt、用户工程。程序测试/codec临时进程均退出，无本轮长期服务。[保护结果](../evidence/step-05/fix-ir001-ad669a06218b/protection-after.json)。

独立Reviewer下一轮重点核对四入口完整分支、mkdir成功才取得归属、prepare先mkdir再cp、成功rename后旧路径不再归属、lock释放与自有失败清理、回归反证的隔离范围及实际无mock重建，并确认56不变文件与人工观察引用。旧c090 REQUIRES_REVISION报告保持原结论，本轮不自行宣布独立关闭。

**整改与作者复测完成，在READY_FOR_REVIEW停止；新候选独立Review NOT_EXECUTED_BY_DESIGN，未合并/推送/PR，步骤06未启动。**
