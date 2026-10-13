# 步骤07正式独立审查 — 第3轮 / 5

2026-10-13，Asia/Shanghai。结论：**REQUIRES_REVISION**。P0：0；P1：0；**阻断 P2：2**；新增 P3：0。原 STEP07-R2-001/002 在原范围独立关闭，R1 已关闭问题保持回归；新增持续错误轮询和迟到写响应改变新项目选择两个问题，不能技术放行。正式套件通过不抵销独立反例。

本轮是唯一原生独立 step_reviewer。正式轮次为 **3/5**，R1/R2 已用 2/5，不重置。没有修改生产源码、正式 tests、Main/Coding 目录或 canonical 调度状态，没有 commit/merge/push、自行批准或启动08–10。技术 Review 与用户逐图美术/MZ确认分开。

## 冻结绑定与客户端配置

| 对象                               | 精确值                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------- |
| Source / checkout HEAD             | `5d926ad7ad6a68bfaff7ea2a51d4d3859c95d7c0`                                |
| Author docs HEAD                   | `36dc5cca1a7da77314e6889648d464d32ba0751f`                                |
| Author Coding report SHA           | `1a4b31584691ba4625ab8ee9ac540e5983a5aaf1e997b1fad850e1d3816b08dd`        |
| Author ledger SHA / payload        | `15d9d4a737dbc9f03c318f7b4640911f1fabbe6a08b82021914ec6cfd8c0e9ec` / 290  |
| Fresh engineering Build            | `step07-5d926ad7ad6a-20f941ea79f60296` / 206 payload                      |
| Engineering Manifest SHA           | `f9e96a59d295a66f77afc9b508a6f964b821f9f633f2d28080395b0aceadaca8`        |
| Profile content identity           | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`        |
| Independent first DB Build         | `db4cae70d72d3478d6c3536bf4c81f3fac336fde21faf14f45fd366e19dd6f11`        |
| Same standard Export BuildIdentity | `step05-pack-5d926ad7ad6a-b2b4e35bae2777c2`                               |
| Same Export Manifest SHA           | `2f50a990ebbaa549af2baa35c1dc503f111ec21ca4053655013d5acbc42ee8d2`        |
| Same standard ZIP SHA              | `94ff2e8c7a6d1e7ecc0a5dee4545ca9360db55308ef0c96b0a80cb7389c4c808`        |
| A1 PNG SHA                         | `c97ad74df1a85796133c950281873431f09876d78a7a4dd89c5f5f1958f22c91`        |
| A2 PNG SHA                         | `ce800dd337e00e1dc37caf86b7e03eabf7673666b25b47806d5405be1247b2e0`        |
| Review root                        | `/Users/dingshinn/.codex/worktrees/step-07-review-round3/rpg-maker-maker` |

Native thread `01a134f2-b8b9-7731-a6fe-fd34db11c2fd` 的本地 turn_context 核对 cwd、`gpt-6.1-sol`、`ultra`；明确 developer 角色为 step_reviewer。客户端要求/default 无加速或模型覆盖，turn_context 的 service_tier 为 null；**不可见服务端最终 model/effort/tier = UNVERIFIED_NOT_EXPOSED**。未使用 collaboration、Priority/Fast/Ultrafast 或修改全局配置。[配置收据](evidence/client-configuration.json)。

全部 **2239** tracked 文件在开始/结束逐项SHA相同，涵盖 source、正式tests、fixtures、Profile、plans、配置、锁、历史证据及checkout旧state；HEAD始终精确5d、Git clean。[开始哈希](evidence/source-before.json)、[结束哈希与PG/服务核对](evidence/source-after.json)。作者docs使用git show读取，source→docs 295条路径全部README/docs，无执行材料变更。[作者/资料审计](evidence/author-ledger-audit.json)。开发启动后206工程文件再次复核一致，没有在根artifacts出版/覆盖工程构建。

完整阅读AGENTS、两份正式plans、MZ_RUNTIME_ENVIRONMENT、STEP03–07契约、需求映射、本轮授权、最新Coding报告/失败/ledger、06最后R3 PASS及发布记录、R2原报告及问题/失误。Main canonical只读，冻结checkout旧state仅历史快照。按07与相关跨模块差异审查，未重开05全Review/MZ手工。

## OPEN：STEP07-R3-001 — P2 BLOCKING，错误轮询没有共享次数/总时限

- **冻结位置：** [poll.ts:9](/Users/dingshinn/.codex/worktrees/step-07-review-round3/rpg-maker-maker/apps/web/src/poll.ts:9)、[poll.ts:12](/Users/dingshinn/.codex/worktrees/step-07-review-round3/rpg-maker-maker/apps/web/src/poll.ts:12)；[App.tsx:130](/Users/dingshinn/.codex/worktrees/step-07-review-round3/rpg-maker-maker/apps/web/src/App.tsx:130)。`read().finally(schedule)`在失败后继续排队；App catch只写error，不终止poll。App:77–80的60秒是每次单独请求的deadline，每个失败后重新开始，不能约束自动错误重试总量。
- **规格/责任：** 本轮明确“额外轮询/重试必须有次数/总时限/取消与旧项目隔离”“不得无限请求”；产品§4.4/§7及计划07真实任务状态/恢复、有限资源。责任是Web项目状态错误恢复策略，非backend/native预算调整。
- **触发：** 真实PG/部署API，普通浏览器选本轮人工项目，合法构建POST202；首次真正Studio响应含RUNNING。之后仅对该只读Studio请求注入契约合法503；Build继续真实完成，响应未伪造成功。使用实际浏览器Clock覆盖超过80秒窗口。
- **实际：** 真任务 `3418b2e1-6d12-4eb8-87da-9e4d45014a91` 已COMPLETED，Build `739da84a8c25699c2906d4b2bdb46df9246667b0d621296a60a06d8d9cbc6b82`。后端完成时已15次读取；再覆盖 `82861`ms 后总 **118** 次读取，自动请求仍继续，UI是“正在构建 · 3418b2e1”，构建/采用/上传保持禁用、旧成功仍显示current。解除503后同一真实任务正常显示完成；不是重复构建、PG失败或R2合法慢响应饥饿。503属于受控故障响应，未声称本次真实数据库掉线。
- **预期：** 连续读取失败须在明确共享次数/总时限内停止自动恢复、显示状态读取失败/未知及显式只读重读；保留上次成功历史，不能宣称失败请求取得了新current。合法慢成功/失败仍应推进终态，项目切换继续取消旧请求。
- **证据：** [实际请求/后台终态/恢复控制](evidence/poll-errors/evidence.json)、[已view_image查看截图](evidence/poll-errors/after80s.png)、[独立探针](evidence/probes/r3-poll-errors.mjs.txt)。探针exit0表示捕获反例，**不是候选PASS**；完整trace留private。
- **最小整改：** 为连续错误poll增加共享失败次数与总时间预算，结束自动调度并提供不重提任务的只读恢复入口；保留同项目single inflight、generation/revision保护和取消。预算不可简单限制正常成功poll到5次从而截断合法长构建；补持续503/429/网络失败、正常1300ms/快响应、停止后显式读取及切项目回归。

## OPEN：STEP07-R3-002 — P2 BLOCKING，旧上传回调清空新项目草地选择

- **冻结位置：** [App.tsx:350](/Users/dingshinn/.codex/worktrees/step-07-review-round3/rpg-maker-maker/apps/web/src/App.tsx:350)、[App.tsx:351](/Users/dingshinn/.codex/worktrees/step-07-review-round3/rpg-maker-maker/apps/web/src/App.tsx:351)，关联 [App.tsx:182](/Users/dingshinn/.codex/worktrees/step-07-review-round3/rpg-maker-maker/apps/web/src/App.tsx:182)。`await upload(id,...)`后无owner/generation检查便`setSelected(...[c]:'')`；act的notice/error/busy也写全局。仅refresh受projectRef保护，不能保护fn内部迟到状态修改。
- **规格/责任：** 本轮“旧任务迟到不得当前/UI回滚”，产品§4.1/§4.3/§4.4、§7.2旧结果不得覆盖当前项目、精确组件revision流程。责任为Web写动作完成回调/项目与选择生命周期。
- **触发：** 来源项目 `480ba389-5d7b-40a4-86c2-85ba61769239` 创作/交付/processed均已正常就绪；UI上传合格真实PNG，后端真实201、新source `2e67788ae0b747bda8b49838a6ec6a95a2cceeba5f2aa3681338fb7a99c14e78` 已保存。仅将该201响应延迟1300ms，期间普通点击目标项目 `26156fd2-1c5e-4035-b759-e14cc6d4daa4`。目标项目数据已到、草地已有正常精确版本，未编辑JSON/DB/路径/图集。
- **实际：** 新项目草地选择原 `5a09efa4c9f469db6b1d6ec104ae610d42c5054506fa3af8d83336e319490d36`，旧201抵达后变为空字符串；原PNG消失，显示“尚未导入”，采用按钮禁用，并在新项目显示“草地新 revision 已保存，历史不会改变。”。当前project仍目标ID，目标DB完整Studio快照前后相同。属于迟到旧动作回调污染新选择；原R1 GET资源成员保护仍正确，没有重开原404/422错配范围。
- **预期：** 旧项目上传可以保留真实已提交revision，但旧回调不得清空新项目选择或向新项目写成功/error/busy状态；项目/选择身份变化应使过期UI结果失效。
- **证据：** [真实201、前后选择与目标HTTP快照](evidence/late-mutation-v2/evidence.json)、[已view_image查看缺草地/错误成功提示](evidence/late-mutation-v2/late-upload-clears-new-project.png)、[独立探针](evidence/probes/r3-late-mutation.mjs.txt)。正常201控制真实通过后捕获；未扩大native并发、未放宽时间/源门禁。exit0表示反例捕获。
- **最小整改：** 用捕获的project/selection generation保护所有异步写动作UI回调，包括fn内部setSelected/setRecipe以及act的notice/error/busy；保留已提交旧项目资产，不冒称abort撤销服务器提交。补合法上传/采用返回迟到、切项目和同项目选择变化的浏览器控制。

初次迟到上传探针未等旧preview/processed结束，得到真实合法429；另因精确accessible-label选择器不匹配而超时。初稿、日志、trace、截图全部保留在`prior-originals/r3-late-mutation.initial.mjs`、`late-mutation.log`及`evidence/late-mutation/`。只修独立探针：等待正常就绪、使用已存在的组件select、强制201控制；未修改产品/正式tests或把原失败覆盖为green。

## R1/R2原范围结论

**STEP07-R2-001：CLOSED / FIXED_INDEPENDENTLY_VERIFIED。** App:68–139 同项目共享inflight，poll本次settle后800ms安排。生产/开发全部正式7项实际执行，合法1300ms慢成功、容量慢失败、快控制、旧项目迟到均真实HTTP/PG/browser一致，最大inflight各1。恢复实例另重跑原R2 poll-latency，延迟时已显示完成，移除延迟后正常控制亦完成。[生产](evidence/formal-production/r2-recovery/poll.json)、[开发](evidence/formal-dev/r2-recovery/poll.json)、[原探针新执行](evidence/poll-latency/evidence.json)。新增R3-001是连续错误的总预算问题，未否定合法慢响应修复。

**STEP07-R2-002：CLOSED / FIXED_INDEPENDENTLY_VERIFIED。** ProcessedPreview/resource-read按project/recipe/frame取消/隔离，descriptor settle后读processed，BUSY-only5次/60s；StrictMode发送前microtask检查disposed。两模式各三次新context，无延迟/故障注入，旧06交付已就绪但旧processed仍未完成时立即切人工项目：旧请求cancel，三个源帧实际decode/naturalWidth96×144，PNG SHA及DOM RGBA与真实API吻合，无400+/普通console error/pageError。[生产普通切换](evidence/formal-production/r2-recovery/ordinary-switch.json)、[开发](evidence/formal-dev/r2-recovery/ordinary-switch.json)。原5秒采用processed断言不改，两模式正式全7通过；没有只跑生产或单元。

真实两descriptor槽压力造成429后客户端有界恢复，取消frame再离开后紧接ZIP200；9项真HTTP含取消wait-slot再下载及随后native复用。[真实压力](evidence/formal-production/r2-recovery/pressure.json)、[HTTP取消](evidence/formal-http/r2-processed-busy-cancel-download.json)。独立另在生产与开发客户端验证持续BUSY**精确5次后停止**、4MiB+1 PNG body拒绝、真实浏览器96×143 decode后拒绝、60s共享deadline一次请求停止、显式只读重读、上次成功frame标识、换owner不显旧图及Blob URL撤销；jobs/current不变、POST0。[独立生产](evidence/lifecycle-production/evidence.json)、[独立开发客户端](evidence/lifecycle-dev/evidence.json)。此追加dev资源探针使用真实Vite客户端＋已恢复production API只读资源；完整development API/写工作流由此前正式dev7验证，二者不混称。坏PNG/408是受控响应，真实codec/read timeout另由HTTP套件执行。

**STEP07-R1-001保持CLOSED。** 重跑相关source/A1/Manifest/Profile/ZIP/preview/processed访问链：objects/builds/root/leaf/standard目录symlink、同内容plain root replacement/root消失拒绝；合法恢复原inode后读原bytes/SHA，current/history不变且实际重建。10个独立storage/fd/ancestor控制及真实备份/restore root/parent/leaf边界通过。[公共8组](evidence/public-storage.json)、[10文件控制](evidence/storage-extra.json)、[真实备份/恢复控制](evidence/restore-boundaries.json)。合法自包含Export不读取原Source叶，所以该source-leaf案例不错误要求ZIP拒绝；安全objects读在仅builds违规时仍200。Node无openat目录链的合作式可观察/ABA局限保留。

**STEP07-R1-002保持CLOSED（原P3身份范围）。** 两模式原项目数据延迟/旧06转换/三次反向切换完成，加载时无旧画布或旧资源错配，selected Build/recipe请求属于当前project。[生产R1](evidence/formal-production/r1-project-switch.json)、[开发R1](evidence/formal-dev/r1-project-switch.json)。R3-002是新写回调范围，无要求重开已经关闭的GET成员问题。没有新增纯风格P3循环；界面美术打磨仍归步骤10。

## 独立命令与环境

Node22.21.1 的PATH每个实际命令显式固定 `/Users/dingshinn/.nvm/versions/node/v22.21.1/bin`；pnpm10.20.0，Prisma6.19.3，PG14.20，Sharp0.35.5/vips8.18.7。先核对Main准备的专属ownership/55483及端口，没有重复init/reset。自己的.env600，API4383/Web5283，资产`.local/step07-review/assets`。regression DB `tileset_review06_22f50813a704476fb864a500dce6c43a` 与新root；restore DB `tileset_review_restore_bdc106b19fb7413fae28fd1ad94e57fa`、原本不存在的`restored-assets`。未复制他人.env、使用他人可写PG/资产/端口或修改全局MZ/NW.js/Reactor。

准确argv/cwd/exit/秒数及日志SHA见[commands.jsonl](evidence/commands.jsonl)。formal06/07直接调用原config/tests、cwd为本review的formal-workspace，仅链接冻结source/dist/node_modules；必要build/正式e2e从repo cwd运行，原tests/预算未改。原固定输出目录的本轮新生成成果移入本review private保留，脱敏副本在evidence，没删除其他会话成果。[输出归属](evidence/output-ownership.json)。根dist等为必要构建生成文件；根artifacts未出版，Pack suite在ignored pack-workspace内执行冻结dist脚本。

| 本轮命令/动作                                       | 真实结果                                                                                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| frozen install / generate                           | exit0；工具链/锁固定，无依赖升级                                                                                                        |
| migrate第一次                                       | exit1；Reviewer构建前误调用，缺dist/config.js，原日志保留；未触碰DB                                                                     |
| check，随后migrate                                  | exit0；263/263、方向/type/lint/format/build/11 exports；空本实例全部5迁移                                                               |
| 原step07 config/tests                               | exit0，9/9，204.892s；HTTP上传/预算/失败清理/取消、COMMIT/CAS/late/retired/旧06/restore/path                                            |
| 原step06 config/tests，新regression DB/root         | exit0，23/23，185.952s；原60000ms预算，父链/fence/维护队列/失锁/真实故障/竞态/Mock重启/backuprestore                                    |
| API integration / Vite privacy                      | exit0，3/3与5/5；真实HTTP/PG、实际Vite私有树/路径/Origin控制                                                                            |
| 正式production / dev e2e                            | exit0，各7/7，246.546s / 264.456s；全部原3+新4，无删case/放宽5秒                                                                        |
| fresh engineering及开发后重读                       | exit0，两次206 SHA与独立BuildIdentity/指定Manifest一致                                                                                  |
| 原public JS scalar probe                            | exit0，78/78，源/IR/所有权/像素/版本/标量边界                                                                                           |
| 原Pack suite脚本，独立出版目录                      | exit0；八套真实标准导出/重读；56payload/16PNG与批准05全字节相同                                                                         |
| pinned native-core CPU ×8                           | exit0；3600形态/状态，600次update每套601观测；安装core只读且严格SHA4ad828ae…ff67f，不是GUI/game/Host/艺术PASS                           |
| 独立六源纯UI/browser/Python reference               | exit0；24scene states、4creative states、2×nearest、完整A1/A2、真正换Build像素/文件变化、4ZIP/网络身份                                  |
| 公共HTTP独立故障/有效控制                           | exit0；实际延期PG COMMIT整体rollback、同PNG不同ID、Host/Origin/client/字段/path/URL拒绝、1处理+1等待取消后下载、GET纯只读/cross-project |
| 独立PNG读取生命周期两客户端                         | exit0；5attempt终止/body4MiB/真实decode geometry/60s clock/owner/frame/Blob URL与只读重读                                               |
| 06旧writer→一致backup→空DB/root restore→Studio/Mock | exit0，143.595s；真实原四文件、源/recipe/Pack/history/current/retired、known同ID/unknown不重提、late不adopt                             |
| 恢复实际browser/重建/legacy转换/PNG/ZIP             | exit0；只读GET409、坏POST403、合法UI POST转换，不改old Manifest/current；真正再建、处理PNG/SHA/RGBA及四独立canvas状态同网络ZIP          |
| 原R2 poll-latency/稳定clock参考                     | exit0；合法1300ms成功已显示终态；12+12 actual source/delivery边界样本跨3周期逐像素一致                                                  |
| own API SIGKILL / restart / browser                 | exit0；accepted Job→FAILED/INTERRUPTED，last success Canvas与ZIP原字节保持；5恢复ZIP真CRC/解压/hash                                     |
| 新R3两个边界探针                                    | **捕获2个阻断反例**；exit0表示反例捕获，不转为候选PASS                                                                                  |
| 最后冻结/服务检查                                   | exit0，2239 SHA未变、HEAD5d/git clean、API4383/Web5283无listener；PG55483数据留存                                                       |

计数不相加为覆盖率。所有普通/CI脚本和本轮调用仅人工素材/Mock，真实视觉模型/SDK/key/收费调用0；未执行远端CI。client额外Vite由本会话启动并SIGINT关闭，该wrapper退出1是停止服务收据，不是测试失败；恢复API使用明确generation/PID的owned控制关闭。

## 实际产物、时钟、QA与06–07整合判断

普通用户流程是真UI项目创建/刷新数据库持久化→失败PNG中文诊断→六份合格PNG分别上传→精确revision/基线风格→固定草地/三水帧/mask/overlay配方采用→真实任务/Build→替换单组件新revision及受影响水草重建→current/history/retired/容量失败→在线预览→ZIP。无内部JSON、DB、server path、图集编辑或用户美术确认点击。正常路径成功和新迟到动作反例分别记录。

交付读取同一真实八文件Export：`A1.png、A2.png、pack.json、history.json、layout.json、sources.json、INSTALL.md、manifest.json`；完整TargetProfile封装Manifest，profile HTTP资源返回同内容，不是第九文件。四份本轮ZIP用Python真实解压、CRC/精确8安全文件名/无重复/逐file bytes+SHA、canonical BuildIdentity/Profile hash验真；浏览器网络A1/A2/Manifest/Profile与对应ZIP字节一致，历史ZIP与首份同字节。[独立验证](evidence/browser-pixel-zip-verification.json)。恢复current额外ZIP `ae6e4627f6c7f0e1c72982047f1caf56169d02ed0fbc1e7c05965a894fefe68b`、Manifest `d793927a4b945d36ff23bb6843cfb4cb7e14999393e2aeee21a9b65cb7e815bc`、BuildIdentity `step05-pack-5d926ad7ad6a-6ae64ac146ac3e3b` 同PNG/Profile网络与实际canvas。[恢复验证](evidence/restored-pixels/verification.json)。公共取消后ZIP和5份恢复ZIP同样记录。

Python/Pillow使用原始PNG、二值mask/overlay、手写邻接quarter坐标和场景occupancy建立独立expected，不调用Compiler/descriptor/生产renderer或用旧CPU截图。孤立格、直边/内外角、孔洞、窄通道、池塘、大片共24状态，与实际canvas RGBA逐字节一致；创作三源0→1→2→1四状态、完整图集透明保留区、2×integer nearest也一致。换实际Build改变A1网络身份与canvas像素，迟到旧descriptor不回退，旧成功/历史下载不变。

actual browser clock覆盖29/30、59/60、89/90、119/120、239/240、359/360边界，共12+12源/交付像素跨3周期一致。[clock RGBA](evidence/clock-canvas-verification.json)。RAF只调度，60逻辑updates/s、30推进、0→1→2→1；播放/暂停/恢复/step与hidden锚点冻结/不追赶实际受控执行。hidden通过document.hidden/visibilitychange控制，不冒充OS后台标签观察或MZ游戏。没有未声明smooth，nearest/整数1×/2×的actual像素证明保留。

已调用view_image实际查看 **25** 张关键截图/实际canvas与独立reference，含源/mask/overlay、六种典型场景的相关画面、慢成功/失败、开发快切、失败保留成功、旧06转换、恢复再建、三周期及两个新缺陷。逐图SHA/工具/时间在[查看收据](evidence/screenshots-viewed.json)；未声称222张输出全部人工查看。技术查看不写USER_CONFIRMED。

06整合使用git show已发布c227的6个实际Persistence模块在本review转译执行旧writer，产生真实四文件Build `3ca077cf97edcce571ddc2b5cfbe97f1ee3aa9b5749b10cd7c5cb7d689d7745a`，内部Manifest `dd01d72d80a720e247786d70c8cbf12f17cc8a6b7b03931ae97bb222c0af0051`；不是把JSON/state改字符串伪造旧包，也不冒充重做c227完整clean发行。备份恢复后的源/recipe与真实IR/Compiler/完整Pack历史均实际重放；当前/retired依赖不重写。旧06转换前GET preview/download409且DB counts/current/old Build/Pack/Slot不变；坏Origin/缺client POST403；UI合法保护POST追加标准Export后真实预览/ZIP可用，old内部Manifest/current/historical identity不变。[恢复浏览器](evidence/restored-browser/evidence.json)。四文件从未称作标准八文件Pack。

恢复known `815dce4e-eb81-4044-b71a-ca571f252428` 保留原prediction ID并查询/完成；unknown `be97b71c-4d1e-481d-b6f6-8764426ef2c1` 保持SUBMISSION_UNKNOWN；实际Mock remote IDs前后仍两项，不重当新请求、不新submit，迟到候选不adopt current。23真实06回归另覆盖取消本地不等provider取消、重启不改旧model/配置/prompt snapshot、归档失败不重提、反向完成/同槽/父lease/fence/备份取消。[整合](evidence/integrated-recovery.json)。真实SIGKILL明确自己的restored API，重启任务FAILED/INTERRUPTED，last success `c2b8c86eab5799e8aec60bb105e4de551e78d471788e7d40e23d1b61fd1d5ae1` 与ZIP不变。[中断后](evidence/interruption-after.json)。

新增schema、StudioJob/FinalExport、shared pack-export抽取、imageadapter abort/close后释放、Compiler只读render描述、路径/storage/backup和持久化Export引用均按完整差异检查、正式测试和独立公共控制验证。Web仍contracts-only，生产只用构建JS/声明exports。Profile/旧Compiler/布局/槽位/三源帧/时基/通行实际语义未变；56旧payload和8 pinned-core CPU支持此范围。没有未审新实质代码夹带或将旧MZ截图继承为每个新Build实机PASS。

HTTP PNG保持single RGBA8/sRGB、4MiB、4096chunks/5s、container/CRC/metadata/pixel/density与Studio96×144；JSON8KiB、总16/下载2/读12、处理1+等待1、native1无队列/5s/close后释放。原native隔离预算未提高。真实最大入口平面1770381 encoded bytes→1769472 RGBA，最终因96×144目标尺寸拒绝；实测RSS106561536 bytes/73.228084ms，**JS heap128MiB不是OS/native RSS硬上限**。[测量](evidence/formal-http/largest-http-decoded-plane.json)。慢body/codec/abort、失败只清自有stage、完整immutable orphan、symlink/fd和合法读取均验证。

QA源/IR/Compiler/Pack/文件硬验证在backend有效，失败不交付。seam/repetition/颜色均值/亮度flicker/低可见动画分别有阈值与局限，不以单一分数、纯色无缝或Profile曾实测冒充质量；结构、risk、人工美术、Profile阶段基线、具体ARTIFACT_MZ_TESTED分别呈现。本次产物MZ/用户美术仍NOT_EXECUTED。

## 历史/作者证据、失误与未执行

Main R2原report SHA `1411559d5e0d8376ef34caae414f643392b63b59ad45d59c36363fdf9f200a6d`、ledger SHA `8e1eb20f132622968bf21f1c4204628bed94fc3a583fa30a88aaf62b7e25bf9a`及386 payload逐项核对；原REQUIRES_REVISION、不正确探针控制/访问链假设/平台中断/失败均保留，未转成本轮PASS。[历史审计](evidence/round2-ledger-audit.json)。沿用独立原R2探针时保存原字节与SHA，仅适配本实例/candidate/docs/路径及明确新增断言。[来源](evidence/prior-probe-provenance.json)。

作者290 committed payload/report SHA全匹配，作者结果单列，未替代本轮运行。628项私有inventory实际只读核对627匹配；唯`collect-evidence.py`私有证据收集脚本已在index后变更，不是产品/正式test或原失败日志变更，期望/实际SHA如实保留，不把该快照索引声称为628全匹配。[私有/失败审计](evidence/author-private-and-failures-audit.json)。235PASS/1FAIL原日志（旧OpenAPI三路inventory对新增routes）仍在，最新严格routes清单合理扩展；b8 dev6/7原5000ms失败、trace、旧source与失败现场hash保持，最新5d两个7/7重新执行。原限额、母版、正式tests预算未放宽。[235原失败](evidence/historical235-failure.json)。私有collector动态索引差异不替代产品新finding、不无限展开文档/风格循环。

本轮自身错误只有构建前migrate提前失败、只读路径探索、初次迟到写探针BUSY/selector失败；全部日志/初稿/trace保留，有限修独立探针后有效控制。新两个反例是产品边界FAIL，不能因探针exit0改作PASS。没有修生产/正式tests、降低预算、reset数据或平台绕过。

**NOT_EXECUTED：** 新MZ GUI/手绘/游戏、用户亲自逐图艺术、Original Native Host、Map003补证、RPGReactor、OS后台标签实察、远端CI、真实视觉Provider/SDK/Key/Prompt体系。旧原装Host与Map003延期保留，不标完成；8 CPU只技术参考。步骤08/09/10 **NOT_STARTED**。

本会话所有自启HTTP服务已关闭，只SIGKILL明确自己的API；PG55483、.env600、全部新DB/源/Build/备份/dump/Mock/stage/orphan/失败trace和私有日志保留本checkout.local给Main核对。报告仅本文件按项目Prettier格式后hash，最终report与脱敏逐文件SHA/明确相对根见[evidence/ledger.json](evidence/ledger.json)，progress在`progress.json`。**本轮无法PASS/技术委托放行；后续需同一步下一轮整改冻结候选独立验证。** Reviewer不自行批准/合并/发布或继续下一编号步骤。
