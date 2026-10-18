# 步骤09 首审整改候选

2026-10-18（America/Chicago）。本轮按用户“认可审查意见后更新”授权，仅做首审技术整改、自测与本地冻结；不复审、不批准/合并/推送、不新增付费、不进入10。

**当前为 SELF_TESTED / PENDING_INDEPENDENT_REVIEW，技术门禁尚未清零，人工验收材料保持 NOT_READY。** R09-01/02和同脚本R09-03已有作者整改及针对性通过证据；V09原根因未证实，不能因补测通过便自行关闭独立验证阻断。

| 状态                    | 本轮含义                                                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CODING_READY_FOR_REVIEW | **NO（完整技术门禁）**；本轮修复代码已冻结可供限定复核，但V09-01/02仍待独立处置，不能宣称全部必要自动化已根治/清零                                        |
| AI_PACK_VERIFIED        | 原T01/R01真实技术Pack 2/2独立结构核验继续有效；本轮0调用，未改任务、原图、PNG、Manifest、Compiler/Profile/Pixel Contract                                  |
| MZ_AND_ART              | 两份新工程经原装core+锁定Chromium到达Map001与(1,1)、Actor1、0插件/0 pageerror；原装Host/编辑器手绘 **NOT_EXECUTED**，人工美术 **PENDING_USER_ACCEPTANCE** |
| 正式质量阈值 / H02      | 仍未获用户批准 / 参考路径SHA仍未冻结；没有用本轮修复改变质量门槛                                                                                          |

## 冻结与审查来源

主仓库main仍为`a551dd68f65d3c92dfb93a4fca8590353f4d103b`。整改分支`codex/step-09-ai-studio`，工作树`/Users/dingshinn/.codex/worktrees/step-09-ai-studio/rpg-maker-maker`。被审候选`838a440f167a769e5b98747f37724c102f385e63`；新代码source **`3cc866b4bf0fa15a1a8c8ed0baf35b245828fe86`**。

工程`step09-3cc866b4bf0f-2933c3c2ba64c1b4`，Manifest SHA **`7b99cbb3d4ce9bafea2ffd13100fe26b384a53738a631fc5c520b237bd43fcaa`**，257文件逐SHA通过。[工程绑定](../evidence/step-09/fix-round-1/engineering.json)。文档收尾提交不改变该source或产物。

[独立首审原报告](/Users/dingshinn/.codex/worktrees/step-09-independent-review/rpg-maker-maker/.local/step09-review/report.md)与原反例只读；来源SHA及必要反例保存在[来源记录](../evidence/step-09/fix-round-1/review-source.json)。未连接/修改Reviewer数据库、资产或副本。客户端turn为step_coder/gpt-6.1-sol/xhigh，配置service_tier=default，隐藏服务端字段UNVERIFIED；全局ultra由角色覆盖且未修改。[配置](../evidence/step-09/fix-round-1/client-configuration.json)

## R09-01：共享并发1

认可原反例。共享原子锁内，所有未取得远端终态证明的预留均占用运行槽，包含KNOWN、本地FAILED/CANCELLED/DISCARDED/UNUSABLE、未证明远端结束的归档状态。不能用本地取消推断远端终止。

新增有界事件`REMOTE_SUCCEEDED`/`REMOTE_FAILED`/`REJECTED`，仅在Provider query/submit边界或已持久化远端成功结果处记录；旧ARCHIVED是已完成归档证明，原4条无需迁移。只有明确远端终态/旧归档证明才释放，UNKNOWN仍锁定且禁止自动解除；金额、次数、唯一common-dir账本、不可退还预留与事件历史保留。

两个真正独立Node进程离线验证：同时预留仅一份成功；KNOWN及各本地状态不能让第二进程购买；明确远端终态才释放；UNKNOWN不解除；旧ARCHIVED兼容。普通测试仅合成批准文件，未读用户密钥。首轮测试遗漏新REMOTE_FAILED对合法重试的前置匹配，已精确补齐后10项针对单测通过，未放宽失败前置。

## R09-02/03：可启动MZ准备与正确Profile身份

认可原`undefined.clamp`反例。`step09-native-project-v2`在创建输出前检查目标1.10.0和System/advanced对象；缺失windowOpacity时显式补192，合法0–255整数保留，非法值受控拒绝。192取自已有编辑器保存的原生基线数据；不声称1.10.0核心有fallback（实际Game_System.windowOpacity直接取字段）。原模板/核心/插件不修改。新增合成单测覆盖缺失、保留、非法值及非目标版本。

准备记录引用`pack.manifest.identity.profileHash` canonical值`488440…`，另外记录原/准备System字节SHA及规范化版本；不再把pretty JSON SHA冒充canonical hash。旧工程和旧reference均保留。

从同一**未经手补的正版newdata**经新脚本创建：

- [T01新工程](/Users/dingshinn/.codex/worktrees/step-09-ai-studio/rpg-maker-maker/.local/mz/step09-r1-T01-v2/game.rmmzproject)
- [R01新工程](/Users/dingshinn/.codex/worktrees/step-09-ai-studio/rpg-maker-maker/.local/mz/step09-r1-R01-v2/game.rmmzproject)

两者均注册原实际图集、地图和出生点；`verify:step09:mz`等待原生标题菜单ready后走真实New Game，到达Scene_Map/Map001/(1,1)、Actor1、opacity192、0启用插件、0 pageerror。[T01](../evidence/step-09/fix-round-1/mz-T01-boot.json) / [R01](../evidence/step-09/fix-round-1/mz-R01-boot.json)。这仅是native core+Chromium补充启动，不是原装NW.js或编辑器手绘/用户美术验收，不因此开始正式人工验收。

```sh
pnpm prepare:step09 <合法未改newdata> <原Pack八文件目录> <新独立工程目录>
pnpm verify:step09:mz <新工程目录> <新证据目录>
```

## V09-01/02：保留未确证根因

新增后端测试factory可注入的有界构建阶段观察：jobId、阶段、有限错误码/异常类型、源码模块行号；不输出原始错误消息、完整路径、环境/凭据、Prompt或图片。Codec只加ready诊断握手和timeout的startup/operation信息，仍是单native槽、每操作新隔离进程、**同一5秒总预算**、取消/超时等待close后释放；没有5+5秒、预热、worker复用或像素规则变更。

本轮首次09完整4项（原3项+新publication故障保护）为**2 PASS / 2 FAIL**。新受控发布测试在到达预期注入点前，实际得到`prepare-build / AssetError / CODEC_TIMEOUT`，这是本轮新增证据，不是原Reviewer失败已确认同因。原首项随后候选等待超时，不能无证据把两者归成同因。

加startup/operation诊断后仅对这两项做一次限定取证：**2/2 PASS**。受控故障确在publish阶段、保留旧成功指针且不泄露注入secret；两路径完整publication/修复/历史通过。未再次出现timeout，因此其startup/operation归属和原失败根因仍**UNVERIFIED**。停止重复。最终新增受控测试置于原3项之后，保留原mandatory首项顺序；上述两轮当时执行顺序和结果不改写，不声称新完整4/4绿。

V09-02只给原continuous503用例加按run隔离的请求/响应单调时序、失败时也落盘；原5000ms Canvas断言、5次轮询、身份保护和测试总时限均不改。独立新DB/资产/API4459/Web5359、无并行构建/MZ/其他codec下，只跑该项一次：**PASS**（16.4秒用例/54.2秒含启动）；新Build preview响应约1.744秒。[时序](../evidence/step-09/fix-round-1/e2e-503-summary.json)。未改生产预览逻辑，不能据此宣称旧17/18失败已根治。[V09处置与安全观察](../evidence/step-09/fix-round-1/v09-disposition.json)

原作者16/18、旧补测2/2、独立17/18，以及本轮失败/补测分别保留。V09独立验证阻断仍需新候选复核与处置，不由Coding自行关闭。

## 验证与保留记录

[精简检查摘要/日志SHA](../evidence/step-09/fix-round-1/checks.json)：

- 完整`pnpm check`一次：**41文件/441测试PASS**，方向、全类型、lint、格式、clean build、11包exports通过；旧候选独立436/436继续作为旧记录。
- 预算/Provider配置/Prompt/MZ数据针对性：**10/10 PASS**，含独立进程并发与UNKNOWN。
- 新codec影响的08回归：最终隔离环境**3/3 PASS**；07上传/取消/codec预算定向**3/3 PASS**（13未选择）。未重跑无影响的01–08全量集成或生产18浏览器。
- 08首轮我未显式传入本轮新测试env，误用本树旧自有Mock库/资产。固定fake predictionId旧记录已于10:47存在，唯一约束使新测试UNKNOWN，首轮1/3通过。只读查明冲突后，显式切本轮新DB/资产env执行一次通过；原失败/新增测试项目保留、旧行未覆盖，未删库/清历史/重置记录。测试诊断脚本曾误选不存在的provider列，修正只读查询，未修改数据。[冲突/旧时间证明](../evidence/step-09/fix-round-1/step08-collision-evidence.json)

本树PG55529保留；本轮新09集成UUID库、4459/5359专用测试库/资产保留，Reviewer与用户4376环境未动。运行中没有clean build覆盖dist；V09的build/MZ/codec取证串行。第一轮API启动准备有一次短类型检查并行，不能拿“绝无其他CPU负载”作为当时timeout的归因。

## 费用、质量与停止

真实approval/ledger前后逐字节SHA一致；仍4 ARCHIVED、报价$0.030/预留$0.20、实际扣费UNVERIFIED，本轮**0提交/0付费/0真实密钥读取**。[账本保护](../evidence/step-09/fix-round-1/real-budget-preservation.json)。原T01/R01源和Pack不改写，原技术2/2不等于可用率100%；重复孤岛/格网/草水难辨、人工认可可用0、质量阈值/H02未完成等均保持。

稳定Mock工作台4399及真实历史4398仅恢复本树原数据；没有为本次修复采购图片。当前材料不开始正式人工验收，等待新候选独立技术复核。下一位Reviewer可从3cc source、两进程反例/正例、新System规范化与boot、V09失败/时序进入；本轮不启动复审、批准、合并、推送或步骤10。交付后停止。
