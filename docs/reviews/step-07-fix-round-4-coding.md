# 步骤07 R4整改 Coding 交接

状态 **SELF_TESTED_READY_FOR_REVIEW_ROUND5**。三个R4阻断P2已完成作者整改与最新冻结候选自测，仍待Main正式第5轮 whole-candidate IndependentReview确认关闭。作者不独立PASS、批准、合并、推送或发布；步骤08/09/10 **NOT_STARTED**。

正式Review已用4轮，下一轮5。用户2026-10-14授权取消步骤07机械五轮上限，保留原轮数与质量门禁；后续须有可核实进展，同根因连续两轮零进展须保存并分析报告。[授权原文/原件SHA](../evidence/step-07/fix-round4/author-checkpoint/authorization.json)。不改两份plans、原报告或Main canonical。

## 精确版本和产物

| 对象                                     | 绑定                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Source / frozen parent of pure-docs HEAD | `59423201ba10ee71c3d1b04cebec69659017b7c7`                                                               |
| 上一轮 docs HEAD（历史）                 | `71933b6782b83600b1a94017f5eb5aa763553dfb`                                                               |
| 本轮 docs HEAD                           | 本报告、ledger所属的后续纯README/docs提交；完整提交SHA在最终回复和私有coding-progress，避免自引用虚构SHA |
| 工程 Build                               | `step07-59423201ba10-191301abe69ac02e`，206实际payload                                                   |
| 工程 Manifest SHA                        | `35fdc32783b4a07aff8a12bc3531385cc2dcb399f54d18da5fac1bdddd507814`                                       |
| TargetProfile完整内容hash                | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                                       |
| 正式production首个DB Build               | `754e989d322bf6d34f4e80191741babd7789a9c0453f410f431eabcd014bdec4`                                       |
| 同一标准Export BuildIdentity             | `step05-pack-59423201ba10-8482e897a99b66db`                                                              |
| 同一标准Export Manifest SHA              | `d651a28d6941d5863de45d3d3c8242ff8398e0e74dc84daf45ea6fcf5655bf19`                                       |
| 同一真实下载ZIP SHA                      | `8719851141583fb90464f3bcb7cfd6c644f27e1f8ca903c225e1e5742d5b632e`                                       |

[固化工程Manifest](../evidence/step-07/fix-round4/engineering-manifest.json)、[206文件实际重读](../evidence/step-07/fix-round4/results/engineering-verification.json)、[196非文档文件](../evidence/step-07/fix-round4/results/source-files.json)、[2951历史保护文件](../evidence/step-07/fix-round4/results/preservation.json)、[最终逐文件ledger](../evidence/step-07/fix-round4/ledger.json)。六个功能/tests路径在source提交冻结；后续只README/docs，没有执行配置、schema、锁、导出、Profile、原型、母版、Compiler或历史Manifest修改。

## 三项整改与真实反例

**STEP07-R4-001（P2 BLOCKING，待独立关闭）：** Persistence在existing/new两个合法分支，同一短写TX核对并登记标准Export/FileObject引用，再完成要求标准交付的StudioJob。existing分支还核对内部Build元数据和真实文件引用；仅事务外对象存在不再作为完成条件。文件读取/验真/不可变发布继续在TX外。合法标准八文件resume可真实重读；没有standardFiles的普通IR/Mock/内部四文件任务仍保持原契约，不套Studio交付要求。

旧06已发布c227六个真实模块转译到自有临时目录，先合法publish同一owned四文件Build，再放行真实HTTP StudioJob。原ef30正确新断言失败：COMPLETED、FinalExport0、HTTP409；最新594得到FinalExport1、preview/download200，内部Manifest原字节不变。重复发布登记数量幂等。既存标准Export、文件partial失败、延期COMMIT/DB rollback、after-commit回执丢失控制都真实PG/文件执行；失败保留last-success，独立读连接在COMMIT前看到Job RUNNING/Export0/原current，rollback后不假完成，下次合法恢复成功，不重提外部任务。[旧writer控制](../evidence/step-07/fix-round4/http-and-recovery/r4-duplicate-legacy.json)、[TX rollback](../evidence/step-07/fix-round4/http-and-recovery/r4-finalization-db-rollback.json)、[标准resume](../evidence/step-07/fix-round4/http-and-recovery/r4-finalization-existing-standard.json)、[文件失败](../evidence/step-07/fix-round4/http-and-recovery/r4-finalization-file-failure.json)、[丢回执](../evidence/step-07/fix-round4/http-and-recovery/r4-finalization-lost-receipt.json)。

整改前只读审计自有72个数据库，受影响既存Job为0。后来为原反例创建的自有synthetic失败记录保留；对它先可恢复backup，公开restore到新空自有DB/新root，克隆原下载409→受保护POST export200→FinalExport1/标准ZIP200。原库Job/Export0和内部Manifest未改，dump/backup/失败现场都留私有。不批量改任何有价值数据；实际用户恢复应先定位与备份、隔离副本验证，再采用既有受保护转换入口。[只读定位](../evidence/step-07/fix-round4/author-checkpoint/existing-data-readonly-audit.json)、[备份克隆恢复](../evidence/step-07/fix-round4/results/broken-recovery-clone.json)。

**STEP07-R4-002（P2 BLOCKING，待独立关闭）：** 项目列表拥有独立请求世代/AbortController，只有真实替代列表读取使旧列表失效；上传、失败、采用等无关action不能丢弃初始合法200。StrictMode disposed、创建后的旧列表防回滚保留。中文加载、真实空、错误/旧列表与显式“重读项目列表”区分，无自动无限刷新或整页reload恢复。

新断言首先在ef30捕获侧栏实际0的失败；最新两个模式均验证持久localStorage＋初始真实200迟到＋合法上传201/非法422/采用201，完整项目列表和当前source/recipe/Build选择正确。创建后新列表先到、原初始旧列表迟到不回滚；选择/显式重读叠加、503明确错误/只读恢复、81s无自动重试、卸载取消亦通过。[生产列表](../evidence/step-07/fix-round4/browser-production/r4-project-list/initial-upload.json)、[开发列表](../evidence/step-07/fix-round4/browser-dev/r4-project-list/initial-upload.json)、[正式新tests源](../../e2e/studio-project-list.test.ts)。

**STEP07-R4-003（P2 BLOCKING，待独立关闭）：** API在一个短、只读RepeatableRead TX捕获Project、adoption、源/文件引用、recipe/processing/dependencies、Build/FinalExport、StudioJob/LogicalTask关联元数据；5000ms timeout/1000ms maxWait，有界且不做无限重读。文件/PNG处理仍在TX外。没有把历史Completed强制采用current，也不只条件补successfulBuildId字段。

原ef30真实Project读取后跨COMMIT的正确断言失败；594响应是整体旧快照（非终态、继续poll）或整体新快照。首个、组件替换、真正history-only晚完成均有真实PG屏障；production/development两个真实客户端继续到后端一致终态，current/needsRebuild、退役可操作、processed PNG96×144实际decode/SHA/RGBA、最终Canvas/ZIP身份一致；旧Job合法历史完成不能回退current。[一致首个HTTP](../evidence/step-07/fix-round4/http-and-recovery/r4-consistent-first.json)、[双客户端六阶段](../evidence/step-07/fix-round4/http-and-recovery/r4-ui-consistent-publication.json)。协作屏障只在测试既有生命周期处，未新增生产测试路由、响应JSON造假或人工改DB状态。

## 最新冻结候选实际验证

所有以下结果精确source594，原版本和prefreeze结果单列保留，不替代最新测试。计数不相加为覆盖率。

| 命令/实际动作                                | 结果                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                 | 266/266，方向/type/lint/format/clean build/11生产exports，68.78s                                                      |
| `pnpm db:migrate`                            | 既有五项迁移无pending，无reset，1.27s                                                                                 |
| `STEP07_TEST_API_PORT=4376 pnpm test:step07` | 16/16（原9＋新7），548.54s；真HTTP/PG/PNG预算、路径/恢复、取消close-release、TX/CAS/late/retired与新三问题            |
| 自有新空DB/root `pnpm test:step06`           | 23/23，211.75s含build，原60000ms单项预算；四文件/lease/fence/失锁/维护队列/故障/Mock重启/backuprestore                |
| API integration / Vite privacy               | 3/3、5/5，10.23s/10.61s，公开根不扩大                                                                                 |
| `API_PORT=4376 WEB_PORT=5276 pnpm test:e2e`  | production全18/18，466.77s；原13＋新列表5                                                                             |
| 同端口 `E2E_MODE=dev pnpm test:e2e`          | development全18/18，489.17s；真实development API和Vite/StrictMode                                                     |
| `pnpm build:step07` / 完成后实际SHA重读      | 新不可变206文件全部匹配，20.13s；未覆盖旧Build/Manifest                                                               |
| `pnpm build:pack-sample` / 批准05字节对比    | 8包56payload/16PNG原字节一致，44.21s；source/context包装身份独立记录                                                  |
| 原公开JS / pinned native CPU ×8              | 78/78、8/8，20.23s；本机未改core SHA4ad828ae…ff67f；CPU不是GUI/艺术/MZ本份artifact实测                                |
| 作者重执行原独立六源UI＋Pillow参考           | 102.87s＋0.76s；24交付scene/4创作state，完整图集/透明/nearest1×和2×/换Build实际像素/4真ZIP                            |
| 稳定真实browser clock＋独立参考              | 7.98s＋0.10s；12＋12源/交付实际RGBA样本，29/30、59/60、89/90、119/120、239/240、359/360三周期                         |
| 干净backup/restore后实际Studio/API/browser   | formal HTTP中真实恢复并重建；额外11.93s，15source/2recipe/5Build、新current/旧history及processed PNG/SHA/RGBA/ZIP可读 |
| 自有原缺陷backup→空DB/root clone→保护恢复    | 14.66s，原Job/DB不改、标准交付正确，不批量修复                                                                        |
| 当前所有实际下载ZIP重读                      | 12份，CRC/精确8安全成员/7payload bytes＋SHA/Profile全部匹配；6正式＋4原创参考＋1恢复history＋1旧反例clone             |
| 自有production入口真实browser                | source594实际Canvas/processed有效、无console error/pageerror/400+；API保留                                            |

[19项精确argv/cwd/绑定/exit/秒数](../evidence/step-07/fix-round4/results/commands.json)、[全部12份ZIP](../evidence/step-07/fix-round4/results/all-standard-zip-verification.json)、[正式六份selectedBuild/Manifest/ZIP绑定](../evidence/step-07/fix-round4/results/zip-verification.json)。本轮额外两个客户端跨COMMIT属于HTTP16中的一个聚合case，不重复计作18中的case。

原R1祖先root/fd路径边界和混合成员身份，R2 single inflight/1300ms慢成功与失败/BUSY5attempt60s/StrictMode disposed，R3错误poll5连续失败＋共享60s/只读恢复/所有写动作project-selection-action世代均保持实际回归。标准八文件与内部四文件分层、Source独立byte/pixel拥有、公开restore、历史retired/稳定slots/CAS/短TX不变。所有普通/CI命令仅人工素材和Mock，没有真实Provider/SDK/key/Prompt系统。

## 像素、资源政策及边界

创作预览读取实际Source PNG/mask/overlay/processed，交付读取真实选定Export的A1/A2/Manifest/完整TargetProfile。原创二值occupancy、手写quarter/原始素材和Pillow参考未调用生产Compiler/descriptor来生成expected；不是同表自证。isolated、edges/角、holes、channel、pond、large共24state、4creative state逐RGBA一致，nearest2×、完整768×576图集透明与Build替换真实网络/像素切换一致。[参考](../evidence/step-07/fix-round4/independent-reference/browser-pixel-zip-verification.json)、[clock](../evidence/step-07/fix-round4/independent-reference/clock-canvas-verification.json)。固定60逻辑update/s、30update推进、0→1→2→1及pause/resume/step/hidden冻结不追赶保留；受控visibilitychange不冒充OS后台观察。

只有[11张view_image收据](../evidence/step-07/fix-round4/results/screenshots-viewed.json)列明图片由本恢复作者实际查看，包含两客户端跨COMMIT、列表上传/非法上传、holes实际/参考、processed/三周期和恢复current/history/保留入口。截图与CPU是技术确认，不是用户艺术批准或本份产物MZ实机PASS。QA STRUCTURAL_PASS、有限seam/repetition/亮度/色变/flicker/低visible-animation风险、人工确认、Profile已测基线和新artifactMZ分别保留。页面仍显示AI尚未开放。

资源政策不放宽：JSON8KiB、PNG4MiB、4096chunk/5s body、singleRGBA8/sRGB/CRC/metadata/真正pixels/density、imageadapter≤768×576而Studio96×144/density1或2；16admission/read12/download2/heavy1＋wait1/job60s/native1无无限queue/5s，取消等child close后释放。Host/Origin/变更client保护、只接assetID白名单，不接服务器路径/远端URL；Vite只公开已批准web/contracts/node_modules根。最大真入口1770381 encoded→1769472 decodedRGBA，因为Studio96×144规范拒绝，child RSS107839488 bytes/76.036417ms。**JS heap128MiB不是OS/native RSS硬上限**；没有防恶意本机管理员或Node无openat下ABA路径竞态的新承诺，合作式文件协议/O_NOFOLLOW/实际fd/root守卫继续保持。[入口测量](../evidence/step-07/fix-round4/http-and-recovery/largest-http-decoded-plane.json)、[R1实际路径控制](../evidence/step-07/fix-round4/http-and-recovery/r1-public-storage-boundaries.json)。

## 原件、失败、恢复和运行归属

R4原report SHA `9beb4c15e0be0753384e89e0dc1f48ba32be17f599f876eb961012b2c218a24e`；原ledger SHA `a7a11c82b6584134df78324c454d1a8c7552a332eae651b36939a0005a803fd6`，430payload逐SHA/bytes匹配，原结论REQUIRES_REVISION不改。R1/R2旧问题由原Reviewer关闭，R3两项由R4原范围关闭；本三项仍待R5。[原报告与全原件审计](../evidence/step-07/fix-round4/original-round4.json)。ef30新正确断言的三项真实失败和全部旧报告/Build/Manifest/失败/trace/DB保留；counterexample exit0只是捕获缺陷，不是candidatePASS。

本轮prefreeze真实失误：初次prepare屏障时序不准导致timeout，正确跨COMMIT断言补实；自己API端口碰撞、TS/test类型错误、about:blank localStorage init、以production API接dev客户端403及其180s超时均保存。资料审计首次因继承旧轮报告路径断言失败，原helper和失败保存；新helper仅修正本轮文档目标。仅修探针部署/假设后再验证真实正常/失败控制，没有靠改探针掩盖产品。原5s/60s/60000ms/母版/阈值未降低。[原失败与说明](../evidence/step-07/fix-round4/execution-notes.json)、[原文件/脱敏copy SHA](../evidence/step-07/fix-round4/original-file-provenance.json)、[私有原件固定快照](../evidence/step-07/fix-round4/retained-private-inventory.json)。

第3次正常客户端恢复仍同CID；Main正常SIGINT、8条websocketclosed断开重试和无活动命令的诊断原件保留。serverCause UNVERIFIED，不当PASS、新步骤或新轮数，不修全局Codex stateDB。[恢复收据](../evidence/step-07/fix-round4/author-checkpoint/normal-recovery3.json)。实际客户端配置收据确认step_coder/gpt-6.1-sol/xhigh/default；服务端最终字段 **UNVERIFIED_NOT_EXPOSED**，不虚称服务端verified，无collaboration/加速/全局配置修改。[配置收据](../evidence/step-07/fix-round4/author-checkpoint/client-configuration.json)。

资源只本树`codex/step-07-studio`；Node22.21.1显式进程PATH、pnpm10.20.0、PG14.20。PG55476/PID51121/.local/postgres保留，自有cluster91个tileset_数据库不reset；.env0600/.local/assets/全部dump/backup/失败/orphan保留。旧ownedAPI7819已正常停止；临时reference/restore/recovery/正式API/Web辅助服务均正常关闭。新production API PID22456保留，entry `http://127.0.0.1:4376` 实际浏览器通过；5276无listener，生产Web由API提供。[最终归属](../evidence/step-07/fix-round4/results/resource-ownership-final.json)、[入口](../evidence/step-07/fix-round4/results/retained-runtime.json)。Reviewer/Main所有PG/root/asset/.env只读或未触碰，无复制、reset或写入。

已有本树生产启动：确认自己服务/端口后，`PATH=/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:$PATH NODE_ENV=production pnpm start`；entry4376。生产API正在运行时不重复启动。开发只正常停确知自己API后同PATH `pnpm dev`（API4376/Web5276）；此次两模式真实执行均有证据，不建installer或改全局MZ/NW.js/RPGReactor。

**NOT_EXECUTED_BY_CODER：** 本轮独立Review、远端CI、批准/合并/推送/Release。**NOT_EXECUTED：** 新artifact MZ GUI/编辑器手绘/游戏、用户亲自艺术确认、Original Native Host、Map003补证、RPGReactor、OS后台标签实察、真实视觉Provider/SDK/key/PromptRegistry/Composer/router/AI/收费/Redis/SaaS。原Host/Map003延期不标完成。步骤08–10 NOT_STARTED。

完成后 **STOP_WAIT_MAIN_INDEPENDENT_ROUND5**。剩余门禁是最新whole-candidate独立复审及Main后续CI/发布；作者不自行关闭Independent findings。
