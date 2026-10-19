# 步骤09 定向功能收尾 Coding 候选

2026-10-18，America/Chicago。范围仅本轮必要Coding、自测和验收材料；没有独立Review、批准、合并、推送或进入10。主仓库main仍为`a551dd68f65d3c92dfb93a4fca8590353f4d103b`。继续原`codex/step-09-ai-studio`工作树，没有重置DB、历史或预算。

**READY_FOR_REVIEW（作者候选，不等于独立PASS或步骤09整体验收）。**

| 项目                                | 本轮状态                                                                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CODING_READY_FOR_REVIEW             | **YES，必要实现/当前可执行作者自测已完成**；首次09失败及限定补测局限如实保留                                                                              |
| 两条真实功能流程 / AI_PACK_VERIFIED | **最终T01/R01均有正式Studio完整Pack、STRUCTURAL_PASS**；T复用旧AI结果，R新增获批2调用并需明确选区，不冒充自动语义提取                                     |
| MZ_AND_ART                          | 新工程两份native core+Chromium boot PASS；编辑器手绘、原装Host、新产物人工动画/美术均**NOT_EXECUTED/PENDING_USER_ACCEPTANCE**。T已有静态功能接受不重开A/B |
| 最低定性口径 / 正式数值阈值         | 定性功能口径**用户已确认**；正式数值阈值仍**未批准**，未降低QA阈值                                                                                        |
| H02                                 | 用户选定独立CC0原图A、SHA冻结；**NOT_RUN / NOT_USED_FOR_TUNING**，本轮不跑保留集                                                                          |

## 冻结与改动

生产主source **`14843ed94e998bb9f52f569e1e33d1a657f73c46`**；最后一个生产改动source **`97f6cb6789402e823f51ca86d79e4513b2265941`**仅补参考上传在已有处理/预览busy时禁用。本文及证据的收尾提交不改生产字节。工程`step09-97f6cb678940-9b6501a8bb9ea9dc`、Manifest SHA **`a9a3290cc8685b57a88b61085d16d7f86e3994b9331c02f619c0f77ac23ff02e`**，266文件绑定见[检查摘要](../evidence/step-09/functional-closeout/checks.json)。客户端有效turn为`step_coder / gpt-6.1-sol / xhigh`，客户端tier `default(Standard)`；全局ultra由角色覆盖，未改全局配置；隐藏服务端model/role/tier **UNVERIFIED**。

选择已接受A：共享adaptive64调色及单行周期边处理，避免B额外边带插值，保留接受像素且实现较少。新增框架无关`ai-region-adaptive-source-v2`，旧`ai-periodic-source-v1`、旧快照/转换/Manifest不变。正式Studio允许候选选择、可视方框取样范围、点击移动和键盘微调；不要求用户改JSON、坐标文件或运行离线脚本。默认中心最大方形保比例取样仍可用，Mock两路径已验证；它不是自动物体识别或材质分割。

新转换保存原输入像素Hash、明确选区、调色板及输入依赖、版本、输出Hash/新revision。完整双候选共同提取最多64色；局部采用只变所选源，保留未选源、mask与bank。完整非repair双候选重新捕获新草地的bank颜色；包含repair的采用不重捕岸线。水面从同一24×24逻辑基础作0/1/2相移，输出三份96×144 RGBA8/sRGB、密度2合格源，经既有硬校验、固定mask合成、配方、Compiler、Pack、QA、实际预览/ZIP。局部修复仍按既有PACK_PAIRING重建受影响配套IR/Fragment，不改变Compiler契约。

R01旧`reference-edit@1`要求保留参考材质身份/几何，与water角色存在语义张力；旧快照**确实同时传入water提示**，没有误称漏传角色。新增`terrain-reference-role-material@2`明确参考只约束像素风格/调色家族，按目标材质重建、不继承道路/草几何；新配置`terrain-models-step09-functional-v2`把Edit strength .55→.9，模型仍flux-dev、256×256/seed4808/steps28/guidance3.5，参考准备仍v2。新任务深冻结，旧registry模板内容及默认调用者语义不变。这是两个因素一起改变的一次固定诊断，不能隔离归因或推广为普遍成功率。

## 真实产物与来源

| 最终Case                                 | Studio Build / source commit                                                                                    | 标准Export / Manifest SHA                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| T01，空辅助文字旧AI候选正式采用          | `0b212a2ba3d13b3fea3a37739a4d99fc6652e1de12363ea02455883f0e60732c` / `14843ed94e998bb9f52f569e1e33d1a657f73c46` | `step05-pack-14843ed94e99-2fa57f2de435568d` / `56d14c0cec25ead99f88af65460b00baeb948896ab51358bb8f79280e580b84a` |
| R01，空辅助参考；一次grass选区纠正后的v3 | `ee01997274ca2e64d86499c67463aad0cbd8880625ed52cc4fc7ff94a3c2482f` / `97f6cb6789402e823f51ca86d79e4513b2265941` | `step05-pack-97f6cb678940-b85cd864c7abf53d` / `affd77eb50ab40aa442959ceb6c4680ccf2c95af15f90a95ba70f7ecc1738460` |

T01原grass task `86156ed7-2cc3-4c5c-a95a-a96191746309`、water task `ab60e38c-3fd8-40a8-98fe-0f6bd3a0d8ca`，通过正式UI采用原A选区(88,84,64,64)/(184,176,64,64)，各保留原图6.25%。这些坐标仅属于该候选转换记录，产品实现没有硬编码样例。**地面、三合成帧及遮罩与用户已接受A逐像素完全相同**，无需重新比较T美术。T本轮0新增模型提交。

新R grass task **`b610fb61-a51b-4311-bd89-926a25f2ee70`**（候选SHA `6fc866e3c23870144e38465ddcf75370048260c8f5df1eb2a6abbb9e53f1e760`）、water task **`fe711ca9-3010-489d-afd8-aa88a830aef9`**（`a3b3cf081e6aedc146fecdd4349da386bbd651edb3f2badf1f9aee0edf36802f`）。[新冻结快照](../evidence/step-09/functional-closeout/frozen-reference-tasks.json)含模型/Prompt/参数/原参考与准备图版本；原参考SHA仍`1eaf10e898b7c26bc24788bf336b31842e6d292e2ade2c9de34b027a41e7c0bd`，prepared SHA仍`9065f6bb7bf68748274b78b5b5ae67dc6dd5137e9e540718e6122e76080edcc7`。96×144参考中心裁为96×96再nearest到256，丢1/3面积；未声称天然保真。

**新R两张原图仍是含树/岩/岸的场景，未完全遵守纯纹理Prompt。** 本次经正式选区得到真实grass、水区，不用替换测试图或染色伪造。首次grass误选沙岸(18,217,24,24)，Build `7423c29a…`虽结构通过，**ROLE_FAIL**；[首次错误场景](../evidence/step-09/functional-closeout/R01-first-role-fail.png)、ZIP/Manifest/转换继续保留。核对overlay确认是作者选区误判，不是UI坐标换算Bug。仅更正一次grass为(40,70,24,24)，water仍(102,113,64,64)；保留面积分别0.879%和6.25%，明显需要人工选择。草地改为新revision，water三源、mask/overlay精确身份及**A1 PNG字节全部不变**，未追加调用。看[最终草地选区](../evidence/step-09/functional-closeout/R01-final-grass-region.png)、[水面选区](../evidence/step-09/functional-closeout/R01-water-region.png)、[最终实际场景](../evidence/step-09/functional-closeout/R01-final-scene.png)。

每套8文件/ZIP经标准严格重读、actual PNG/Manifest/源依赖验证；每套9168次固定保护像素比较0差异、三帧可见变化，T接受A完全相等。实际ZIP图集与真实WebGL Canvas在池塘/大片共16状态逐像素相等，0→1→2→1源序列及源控制4步验证；不是AI自评分或MZ/人工替代。全部关键Hash/转换身份见[真实Pack记录](../evidence/step-09/functional-closeout/real-packs.json)、[Canvas/门禁](../evidence/step-09/functional-closeout/canvas-and-upload-guard.json)。原T/R旧Manifest和ZIP保留，首次R错误也不被最终截图覆盖。

## 自测、失败与局限

- 本轮唯一完整`pnpm check`：**43文件/450测试PASS**，类型、lint、格式、build及11包exports通过。后续有限guard/取证和上传禁用变更做增量API/Web build、lint/format/typecheck及实际浏览器取证，没有重复全量。
- 首次完整09：**1/4 PASS**；API双路径、草/水修复、未选源/岸线、历史/旧ZIP主项通过。浏览器未在原30秒出现完成提示；随后两项出现BUSY。只读新UUID库证明浏览器任务及Build其实COMPLETED，没有buildFailure observation。保留原失败，不能称已根治。
- 加有限trace/页面/网络/槽状态取证后，只跑原失败3项：**3/3 PASS，主项未重跑**；text/reference新UI选区、可选texture、转换版本/参数、修复、取消/UNKNOWN/硬拒绝、publication失败保护通过。末态occupied/waiting均false。**不把跨run覆盖写成最后完整4/4，也不把旧V09原因写成已确证。**
- 受Prompt可选配置影响的08网络Mock回归**3/3 PASS**；独立新UUID库避免旧fake prediction冲突。8份本轮不可变转换（含拒绝）真实备份/空库恢复，逐行及全DB/文件digest PASS；[恢复](../evidence/step-09/functional-closeout/conversion-restore.json)。预算旧边界/跨两进程并发1/UNKNOWN、新scope缺授权/2次上限/持久停止均在相关单测及450完整check通过。
- 真实R第一次上传遇旧预览占槽，**没有create/模型提交**；补上传控件使用已有blocked门禁。之后一次采集器inspector body cache错误也在create前，改为status采集；均保留日志，不当模型失败或隐去。最后两套实际浏览器都验证上传pending预览时disabled→释放后enabled，0 POST/0 pageerror。严格5秒codec、原像素/QA阈值未改。

检查/必要日志SHA见[checks](../evidence/step-09/functional-closeout/checks.json)。父任务仅做一次只读作者走查：R当前v3→保留的v2→T当前v2→R当前v3，画布及页上Build/Export/Manifest/download身份一致，没有create/repair/apply/discard/视觉确认；**不是独立Review或人工美术PASS**。

T仍有SEAM约35.956–36.488>32风险，未降低阈值；R启发式未触发风险也不能掩盖明显重复母题。两套只定位功能测试素材，不宣称自然动画、商业美术、自动参考保真或自动材质分割。首次09提示/BUSY原因、历史V09瞬时根因仍UNVERIFIED。

## 真实批次与完整统计

[追加明确授权](../evidence/step-09/functional-closeout/authorization.json)仅`step09-functional-reference-v2`：原固定参考、flux-dev grass1+water1、最大2/并发1/无付费重试或修复，金额上限$0.20、实时单价≤$0.012、每次预留$0.05，累计仍受旧$1/10限制。已提交2/2并停止，不把余额当新授权。

全部Agent/Worktree继续共用主仓`.local/step09-budget`，原子预留、明确远端终态释放、UNKNOWN冻结不变。只追加scope批准文件/记录，旧approval及旧4条entry精确保留；新scope硬拒绝/UNKNOWN/preflight价限失败持久停止，旧失败与预留不退款、不重置。普通CI/测试固定Mock，不读真实key或付费。

| 口径                                         | 本轮 / 累计                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| 新模型提交、归档、模型失败/UNKNOWN/硬拒绝    | 2/2/0/0/0；累计6提交/6归档                                                       |
| AI pair批次 / 新正式采用                     | 本轮1个R pair；累计3个AI pair；本轮3次采用=T正式复用、R首次ROLE_FAIL、R一次纠正  |
| 未采用旧R错误水面 / 丢弃task                 | 1 / 0；旧绿水候选仍归档保存，不能据ARCHIVED当语义合格                            |
| 付费重试 / 付费组件修复 / ROI纠正 / 手绘像素 | 0 / 0 / 1 / 0；T复用2旧选区，R初选2后纠正grass1次                                |
| 报价 / 保守预留 / 实际扣费                   | 本轮 **$0.024 / $0.10 / UNVERIFIED**；累计 **$0.054 / $0.30 / UNVERIFIED**       |
| 完整可用成功率、每可用套尝试/成本            | **PENDING / N/A / N/A**；不能剔除旧R语义失败及首次新R错误ROI，只统计最终成功截图 |

真实时间戳、全部6条预留/事件、原Hash、面积及统计口径见[statistics](../evidence/step-09/functional-closeout/statistics.json)。选区操作由操作者自动化控制正式UI，人工活跃分钟没有可靠计时，写UNVERIFIED，不伪称0人工或已实测≤15分钟。没有核实供应商账单，不能声称供应商侧硬金额限制。原08记录未动。

## 启动、人工入口及Reviewer差异

本树独立PG55529、真实DB `tileset_step09_live_v1`、资产`.local/step09-live-assets`、API4398；Mock用本树`.env`及独立资产/API4399，普通启动默认Mock。没有覆盖用户Studio、原MZ/Reviewer工程或全局Runtime。自有服务在clean build前停止；有一次Web增量build时4398仍在运行且没有活动页面，随后立即停服务、冻结新source和重新生成资源后恢复稳定；没有据该短窗口取验收或新增调用，原记录保留。

```sh
export PATH=/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:$PATH
pnpm start  # 本树.env，Mock；无需真实key
# 查看既有真实历史：本树专属live配置，Provider只通过共享文件显式选择
node --env-file=.env.step09-live apps/api/dist/main.js
# 新Worktree运行时由操作者传入共享Provider路径
TILESET_PROVIDER_ENV_FILE="$SHARED_PROVIDER_FILE" TILESET_AI_MODE=wavespeed pnpm start
```

`WAVESPEED_API_KEY`显式进程值优先，其次显式函数路径/`TILESET_PROVIDER_ENV_FILE`，最后checkout根`.env.local`。共享文件只承载Provider配置，不复制key、不source/eval、不覆盖进程配置、不进VITE_/前端/日志/快照。DB/端口/资产仍各Worktree独立；本轮新批次2次已用尽，不再生成。

[最小人工指南](/Users/dingshinn/.codex/worktrees/step-09-ai-studio/rpg-maker-maker/.local/step09-functional/manual-review-guide.md)：两份独立MZ工程已注册实际图集、代表地图和出生点。core+锁定Chromium从New Game进入Map001/(1,1)、Actor1、opacity192、0插件/0 pageerror（[T](../evidence/step-09/functional-closeout/mz-T01-boot.json)、[R](../evidence/step-09/functional-closeout/mz-R01-boot.json)）。原装Host旧延期不重新展开；脚本地图不当编辑器手绘。T像素相同不重开A/B，只集中看最终R草水/参考特征及新产物必要拼接/动画/岸线。新产物人工结果继续PENDING。

用户已确认“测试素材可接受、两正式完整流程、草水可辨、拼接/动画/固定岸线可接受、版本失败保护、预览下载同Build”的定性口径；**未批准所有新产物或具体数值质量指标**。旧正式数值提案未下调，仍待人类决定，本轮不追加反复询问。[H02-A](../evidence/step-09/functional-closeout/holdout.json)为GboxMikeFozzy作者声明CC0上传，原SHA `8b8408427cd7f1a863ae5595a3c484c93e8f4e889039a43f708aa5eb94823575`，与T/R探索不同；用户选定后仅核Hash、未准备/运行/调参，留给10。

Reviewer从**已独立PASS的f613**限定看差异即可：

1. `f613→3b19`：19个离线实验/诊断证据文件及package命令；`scripts/step09-art-offline(-core).ts`、4项实验回归、图/报告/绑定，彼时未切生产默认。不能把f613独立PASS扩到这些新增实验。
2. `3b19→14843ed`：新框架无关region-v2/回归；contracts选区/候选尺寸与配置身份；API采用及immutable转换/共享palette依赖、非repair双候选bank捕获与repair保护；Web可视选区；新增可选Prompt@2和Studio模型配置（旧默认不变）；唯一账本scope追加授权/累计限额/停止边界及回归；两路径浏览器ROI断言与有限取证。没有Prisma迁移、Compiler/Profile/Pixel Contract/锁文件/母版变更。
3. `14843ed→97f6cb6`：上传控件`disabled={busy || blocked}`一行，实际两套浏览器disabled→enabled已测；T148产物不为该UI改动重建。`f613→97f6`共34文件的源码/既有实验差异，不包含本文新交付证据。
4. 本收尾文档/精简产物Hash、失败/费用/人工入口；没有独立Review结果。历史f613的441/441、09完整4/4与必要回归继续按未变范围复用，不能声称本轮重新执行了这些历史审查。

固定清单完成，候选交付后停止。后续由独立Reviewer对本差异限定确认；不批准、合并、推送或进入10。步骤09整体验收与商业美术质量均未宣称通过。
