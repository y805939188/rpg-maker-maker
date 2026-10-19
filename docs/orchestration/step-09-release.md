# 步骤09功能测试基线发布与交接

2026-10-19，Asia/Shanghai。本文件在最终main CI之前一次冻结。最新用户明确授权：仅对3个观测文件追加限定R3，通过后正常合并/Push并核对main CI；不再等待性能修复或继续排查。**APPROVED_BY_PREAUTHORIZED_ORCHESTRATOR** 已由 Main 在R3独立PASS后记录，范围仅为用户已接受的09功能测试基线。最终发布仍须对应main CI实际成功和三处SHA一致；实际结果写入主仓 `.local/step09-final-closeout/final-publish-20261019/completion.json` 及会话，不追加记录自身SHA的文档提交。

## 冻结对象与门禁

- 已发布main起点 `a551dd68f65d3c92dfb93a4fca8590353f4d103b`；既有01–08结果按未变范围复用。
- 功能候选 `0a55d9f960bc3093843387af82561896ef16ebdc`、最后功能source `97f6cb6789402e823f51ca86d79e4513b2265941`。[功能R2](../reviews/step-09-independent-final.md)完整check450、完整09 4/4及未变范围PASS保留，未重审或重跑。历史补充08准备超时2/3及原因UNVERIFIED保留。
- 文档基线e228；新增执行source `65a8ad44d74232b0fd8fb876b1694219c8d68799`；观测CI候选 `c8c3227d1340de9ff0c6ef4285a183ba4412eacb`；[限定R3](../reviews/step-09-observation-r3.md)冻结HEAD `e8c14b2d529670619cfe571673b88407dee7284e`。65a→c8→e8仅作者文档，之后本轮Main提交也仅说明与脱敏证据，执行字节不变。
- **R3 PASS_LIMITED_OBSERVATION**，P0/P1/硬契约P2为0，7/7观测自测、对应lint/format命令exit0，既有忽略项明示。非阻断P3：省略DB端口时观测记unconfigured；当前CI显式55432，不扩整改。角色Standard客户端已核对，服务端隐藏字段UNVERIFIED。[最新绑定](../evidence/step-09/observation-r3/release-bindings.json)及[原功能绑定](../evidence/step-09/final-closeout/release-bindings.json)分别保留。
- [唯一观测CI39196257845](https://github.com/y805939188/rpg-maker-maker/actions/runs/39196257845)完整SUCCESS：check450、privacy5、API3、06=23、07=16、08=3、生产18、开发18。复用此候选CI，不再Push候选分支或新增观测CI。原启动命令、串行build/资源准备、生产→开发相邻顺序及Playwright30000ms不变。
- 正常Fetch实时main、无冲突整合，执行字节相同范围复用证据；正常Push并等待实际main CI。不得强推、改写历史或绕过保护。若main CI失败，留原日志并停止，不盲目重跑或恢复性能排查。

## 历史启动风险的明确处理

原[CI39151160848](https://github.com/y805939188/rpg-maker-maker/actions/runs/39151160848)在e228的开发启动30000ms超时保持 **FAILURE**，原因 **UNVERIFIED**。新增观测不属于性能修复；本次没有改启动逻辑、缓存或门限，没有证明旧根因已解决或以后不偶发。29.030秒是另一observer epoch，不能计算970ms准确余量。原作者BLOCKED、旧停止回执、原日志和失败记录保留原字节。

此前“无法定位则留证停止”已履行；最新用户明确接受其作为历史稳定性风险交接，不要求查明全部原因、性能改善证明或额外重复CI作为本次发布前置。该决定只允许本次功能基线继续门禁，不把未知写成已解决。

## 同一产物的功能接受

| Case         | 实际Build                                                          | Export / Manifest SHA256                                                                                         | 接受范围                                                                                   |
| ------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| T01          | `0b212a2ba3d13b3fea3a37739a4d99fc6652e1de12363ea02455883f0e60732c` | `step05-pack-14843ed94e99-2fa57f2de435568d` / `56d14c0cec25ead99f88af65460b00baeb948896ab51358bb8f79280e580b84a` | 独立证明地面/三合成帧/mask与已接受A完全相同，复用功能测试素材接受，不重开A/B               |
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
