# 步骤09功能测试基线发布与交接

2026-10-18，America/Chicago。本文件在最终CI前冻结。用户明确预授权Main在最新独立PASS、必要验证及候选CI通过后正常合并/Push；实际 `APPROVED_BY_PREAUTHORIZED_ORCHESTRATOR` 决定、最后main SHA和main CI结果写入主仓 `.local/step09-final-closeout/completion.json` 及会话，不为记录自身SHA追加“最后文档提交”。当前文件不把未执行发布写成成功。

## 冻结对象与门禁

- 已发布main起点 `a551dd68f65d3c92dfb93a4fca8590353f4d103b`；既有01–08结果按未变范围复用。
- 最新受审文档/代码候选 `0a55d9f960bc3093843387af82561896ef16ebdc`，最后生产源码 `97f6cb6789402e823f51ca86d79e4513b2265941`。97f6之后至0a仅工程说明、Review和产物元数据/截图，无执行文件变化；本次Main提交也仅说明及脱敏证据，完整路径绑定见[release-bindings](../evidence/step-09/final-closeout/release-bindings.json)。
- [最后限定独立PASS](../reviews/step-09-independent-final.md)：450完整check、完整09 4/4；无P0/P1/硬契约P2，无Coding整改。补充08仅2/3，准备阶段codec超时及旧原因UNVERIFIED均保留，不能声称所有回归全绿。
- 候选分支只触发一次必要既有CI，成功后Fetch实时main并正常no-ff整合；执行字节与受审候选相同的范围复用证据。正常Push、远端读回和对应main CI必须真实成功。失败不禁用检查、不无依据重跑、不强推。

## 同一产物的功能接受

| Case | 实际Build | Export / Manifest SHA256 | 接受范围 |
|---|---|---|---|
| T01 | `0b212a2ba3d13b3fea3a37739a4d99fc6652e1de12363ea02455883f0e60732c` | `step05-pack-14843ed94e99-2fa57f2de435568d` / `56d14c0cec25ead99f88af65460b00baeb948896ab51358bb8f79280e580b84a` | 独立证明地面/三合成帧/mask与已接受A完全相同，复用功能测试素材接受，不重开A/B |
| R01 final v3 | `ee01997274ca2e64d86499c67463aad0cbd8880625ed52cc4fc7ff94a3c2482f` | `step05-pack-97f6cb678940-b85cd864c7abf53d` / `affd77eb50ab40aa442959ceb6c4680ccf2c95af15f90a95ba70f7ecc1738460` | 草水可辨、池塘/孔洞/细通道无明显错格断边、Playtest动画可接受且岸线稳定：USER_REPORTED_PASS |

[用户确认记录](../evidence/step-09/final-closeout/user-functional-acceptance.json)精确绑定R Build/Export/Manifest。确认不修改任何历史Manifest或数据库视觉标志。首次R误选沙岸7423仍ROLE_FAIL保留，只纠正一次grass ROI；旧绿水失败不删除。新原图仍含场景，需产品明确选区，不宣传自动语义分割。像素、动画、布局未改，就不重复要求用户看同一画面。

本授权仅放行用户已接受的09功能测试基线，按本次明确范围将正式数值质量口径留作步骤10启动前单独确认；不因此重开本批纹理优化。不是所有素材商用美术批准、稳定高成功率或原装Host认证，也不是V1.0正式完成。

## 费用、保留集与未验边界

本轮Main/Reviewer0真实AI调用。累计6提交/6归档，3个AI pair批次，包含旧R语义失败；T复用0新增，R补测严格2/2后停止。累计报价$0.054、保守预留$0.30、实际扣费UNVERIFIED；账本和追加授权前后SHA不变。不得因余额仍在而追加批次，UNKNOWN仍占槽。

描述性均摊以两份所选功能测试Pack为分母：6提交/2=3提交/份，3 pair批次/2=1.5批次/份，全部历史报价$0.054/2=$0.027/份；不是商用可用率或实际账单单套成本。人工活跃分钟未可靠计时，保持UNVERIFIED。所有失败/手动选区与纠正计入原记录，不只展示最终截图。

H02-A由用户选定，原SHA `8b8408427cd7f1a863ae5595a3c484c93e8f4e889039a43f708aa5eb94823575`，冻结、未运行、未用于调参。正式数值阈值、正式评测/重试/人工干预预算与保留集执行须步骤10前另获批准；本轮不擅自批准。用户定性功能口径已确认。

MZ原生core1.10.0+锁定Chromium启动证据保留；用户Playtest观察记USER_REPORTED。编辑器手绘、未经修改原装Host认证仍按原NOT_EXECUTED/延期范围记录，不互相冒充，不操作全局Runtime。

## 工作台与停止

既有工作台 **http://127.0.0.1:4398** 保持在Coding工作树运行，实际软件97f6执行字节与受审候选相同，无需为纯文档发布重启。PG55529、`tileset_step09_live_v1`、`.local/step09-live-assets`、历史/备份/预算及两独立MZ工程保留；Mock4399当前未启动。保留旧Studio及所有含独有ignored数据的工作树，不因Git clean删除。仅停止Reviewer本轮自有临时服务。

后续需要源码启动时，沿用[配置加载说明](../reviews/step-09-functional-closeout-coding.md)：Provider共享文件只通过显式 `TILESET_PROVIDER_ENV_FILE`，进程显式值优先，工作树DB/端口/资产独立；不复制/输出key、不source/eval、不放入VITE_/前端/日志/快照。普通测试固定Mock；本批2次已用尽，不能再Generate/Edit。

必要发布门禁与回执全部完成即停止，不新增优化或调用。**步骤10：NOT_STARTED / NOT_AUTHORIZED。**
