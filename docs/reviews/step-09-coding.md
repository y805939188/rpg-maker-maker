# 步骤09 Coding 候选交付

2026-10-18（America/Chicago）。本轮只Coding、自测、获批固定真实首批及候选交付；独立Review、批准、合并、推送、步骤10均未执行。01–08发布基线 `a551dd68f65d3c92dfb93a4fca8590353f4d103b` 保持，不重新全局审查历史。

| 报告项                  | 结论                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| CODING_READY_FOR_REVIEW | **YES：代码与当前可执行自测已完成，作者候选可审**；开发完整run的两次失败及复测局限保留，不代表独立PASS或步骤批准                 |
| AI_PACK_VERIFIED        | **两条真实路径技术完整Pack 2/2，STRUCTURAL_PASS**；这仅表示完整链路与技术检查，不表示完整可用Pack成功率100%                      |
| MZ_AND_ART              | 两份独立原装core工程准备完成；编辑器手绘/游戏运行 **NOT_EXECUTED**，人工美术 **PENDING_USER_ACCEPTANCE**，OriginalHost旧延期保持 |
| 正式质量阈值            | **PENDING_HUMAN_USER**；只批准了$1/10次固定探索预算，未批准质量阈值或步骤09验收                                                  |

当前没有获得用户认可的可用套。**T01存在48px重复孤岛/边框纹理；R01草地与水面均偏绿、格网明显、池塘轮廓难辨。** 两套都不能据技术PASS宣称美术成功。作者浏览器观察无评分，不能替代用户美术/MZ验收。实际截图见[T01](../evidence/step-09/real-T01-preview.png)和[R01](../evidence/step-09/real-R01-preview.png)。

## 候选与实现

隔离工作树 `/Users/dingshinn/.codex/worktrees/step-09-ai-studio/rpg-maker-maker`，本地分支 `codex/step-09-ai-studio`。真实任务、Pack和MZ材料绑定功能source **`6bd9b4b47b358e88c70db4bcb6f8ffadd49aece5`**；后续仅修正负控用例以跨过正确的首套双候选门禁，显式将普通09集成固定为Mock（即使外部环境是wavespeed也不读真实key），并将实际AI任务错误标签从“Mock任务”改为“AI任务”。该显示/测试差异不改变真实任务快照、像素、Compiler、Profile或已生成Pack，不新增付费或改写旧manifest。最终候选/工程构建绑定见精简证据。

客户端核对为 `step_coder / gpt-6.1-sol / xhigh`，本地配置 `service_tier=default(Standard)`；会话未暴露的服务端tier/role等为UNVERIFIED，未观察到Fast/Priority/Ultrafast。Node22.21.1/pnpm10.20.0，锁文件、Profile、Pixel Contract、Compiler/Pack规则不变。

实现了空辅助默认文字、空辅助参考图、正常材质/颜色/texture偏好的完整入口；普通用户不选模型。复用现有任务/恢复/归档、受控PNG上传/下载、配方/Compiler/Pack/QA和实际导出预览/ZIP。候选查看选择、恢复提示、本地取消/丢弃、局部修复与历史继续可用；任务COMPLETED只表示候选归档，不自动发布当前成功。

HTTP/Zod/OpenAPI由contracts维护，Web只依赖contracts；API拥有应用调度与共享预算，框架无关像素转换在material-processing。新增小型不可变AiConversion表保存转换参数、原source、任务、输出revision；纳入一致备份验真。未增加登录、支付、Redis、SaaS或像素编辑器。

## 原始结果到合格素材

四份真实原始结果均先经过既有来源/路径/HTTPS主机、字节、块数、时限、像素、CRC与metadata边界，再独立保存原文件及显式RGB→RGBA8/text metadata准备版本。**256×256归档不等于96×144合格组件。**

`ai-periodic-source-v1` 显式执行整数中心最大正方形裁切→保比例nearest采样24×24逻辑像素→sRGB数值每通道四级量化（最多64色，不作隐式ICC转换）→周期边缘处理→整数2倍及2×3重复成为96×144、密度2、RGBA8/sRGB源样板→原硬校验。水面只从同一基础作0/1/2逻辑像素相移，至少1%可见变化；三源帧共享几何/调色基础，未购买三次独立水面。固定art遮罩及首次草地bank捕获保护岸线。

局部修复生成新revision，只重新生成所选草地或水面共享基础；未选source、mask、overlay的精确ID/revision及岸线像素保持。既有PACK_PAIRING要求两个Fragment引用同一IR/recipe，因此配套IR及两个Fragment属于受影响下游一起重建；未改Compiler配对契约。自动化覆盖草地与水面修复、旧配方/旧ZIP、固定岸线和未选组件；失败/取消/UNKNOWN/迟到保护复用Executor/CAS。

参考原图与准备图独立保存并冻结；09新策略 `center-crop-square-nearest-v2` 先等比中心裁切再到256×256，不沿用08拉伸策略解释旧任务。当前96×144参考上下共裁48行、损失1/3面积，像素化/量化进一步减少细节，**不承诺天然保真**。转换描述符、输入/输出Hash、模型/Prompt/参考版本和来源依赖见[真实任务及转换](../evidence/step-09/real-tasks-and-conversions.json)。

S08-IR1-N01定向修复text子串误拒texture/textured；正常中英文颜色/纹理通过，真正文字/图集/帧数/模型/平台覆盖冲突仍拒绝。平台主Prompt内容仍 `terrain-source-main@1`，09配置 `terrain-models-step09-v1`；旧任务快照不改写。

## 两条真实技术Pack

| Case                 | 实际项目 / 持久构建                                                                                         | 标准Export / Manifest SHA-256                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| T01 默认文字、空辅助 | `454a0d5e-18de-46e6-8ea7-b3ca7c54ea80` / `1ab8271346caa065b82aebeb50aaf9025fb38e3d934b77c4cf90cde04e6fe24e` | `step05-pack-6bd9b4b47b35-6bcb8af9fa10da8a` / `12faf1934ab85279cf86459a67b9513c4cc4f6d6871915e9b3ca3b47ee114378` |
| R01 固定参考、空辅助 | `af0ba136-1345-4e6e-b425-3fdefd893bed` / `7ec65b520372d46be85049050c572d18c893507cce47241dd203e4f427865b63` | `step05-pack-6bd9b4b47b35-67318eed3d1fe966` / `eefea85181695771d47dea1760115b6fb349615f4e431195eb45d5a66b2aca44` |

每套均是实际A1/A2、Manifest、Pack、历史、布局、源归档、INSTALL共8文件；作者真实浏览器查看实际拼接动画/源状态及下载，ZIP与7份payload逐SHA对应实际预览。标准导出ID沿用既有exporter命名，不把历史前缀当作步骤状态。关键A1/A2/ZIP Hash及QA见[真实Pack摘要](../evidence/step-09/real-packs.json)。

本地标准目录 `.local/step09/live/packs/T01`、`R01`，ZIP `.local/step09/live/T01.zip`、`R01.zip`；原始文件、归档和转换保存在独立live资产根，不覆盖Mock Studio或用户历史。

已自动创建 `.local/mz/step09-T01-6bd9b4b` 和 `.local/mz/step09-R01-6bd9b4b`，各有图集注册、池塘/孔洞地图和出生点(地图1/1,1)。只读正版模板并核对core SHA `4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f`，未修改全局MZ/NW.js或旧用户工程；[准备记录](../evidence/step-09/mz-preparation.json)。这些脚本地图不是编辑器手绘证据，CPU/网页不冒充MZ或人工PASS。

## 探索、质量与费用

人类明确批准的[固定清单](../evidence/step-09/exploration-v1.json)/[批准原文](../evidence/step-09/budget-approval.json)：1配置、T01/R01两Case、每Case草地+共享水面各1次，首次4提交；总$1/最多10次/并发1，允许失败时每Case一次完整重试和一次组件修复，人工≤15分钟。实际首批已完成并停止；没有追加剩余6次、换模型或调Prompt。独立10验收集未调用、未参与09调参。

| 口径                                             | 全部实际尝试结果                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Pack尝试 / 技术完整Pack                          | 2 / 2；仅技术2/2，不是完整可用成功率100%                                                                |
| 提交 / 失败 / UNKNOWN / 硬拒绝候选 / 归档 / 丢弃 | 4 / 0 / 0 / 0 / 4 / 0；2套存在待人工质量问题，不能混入“硬拒绝0”掩盖                                     |
| 完整重试 / 组件修复 / 人工像素绘制               | 0 / 0 / 0                                                                                               |
| 本次管线墙钟耗时                                 | T01 21.565秒，R01 30.033秒；含创建、归档、转换、编译，不当成纯模型延迟                                  |
| 报价 / 保守预留 / 实际扣费                       | **$0.030 / $0.20 / UNVERIFIED**；分别T01报价$0.006、R01报价$0.024，未核实账单，不声称供应商侧金额硬限制 |
| 技术平均尝试 / 每技术套报价                      | 1次 / $0.015，仅技术诊断口径                                                                            |
| 完整可用成功率、每可用套平均尝试/成本            | **PENDING / N/A / N/A**，用户已接受可用套=0；实际费用不可核实                                           |
| 人工干预计时                                     | 修复0次/0分钟，无像素绘制；作者浏览器观察未单独计时，UNVERIFIED，不算人工美术PASS                       |

T01在实际池塘中重复孤岛/边框纹理，QA SEAM=33.728>32。R01四个可见颜色且草/水均绿，QA三项REPETITION，轮廓难辨。自动指标只检查风险，低接缝/非零动画都不保证风格、自然度或参考契合。完整记录含所有尝试，见[统计](../evidence/step-09/real-statistics.json)。

建议正式阈值保持提出时版本：技术硬校验100%、保护区逐像素相同、水面可见变化≥1%；风格/无缝性/动画/参考契合人工各≥4/5、严重缺陷0；每Case最多2次整套尝试+1次组件修复、人工≤15分钟。**均待用户批准，没有因这批问题事后下调。** 若继续质量整改，需要用户决定当前09候选/方案和新工作范围；本次不自动进入10。

## 自测、失败保留与Reviewer入口

精确命令、日志Hash和最终结果见[检查摘要](../evidence/step-09/checks.json)。原则是先定位失败，再跑失败项及受影响回归，没有仅因SHA/文档改变重跑全部历史。

- `pnpm check`：方向/全类型/lint/格式通过，首轮436项中435 PASS，唯一失败为OpenAPI精确路由清单遗漏新增5路；补全后契约/预算/像素定向9/9 PASS，未删用例或改阈值。构建/11个生产exports随后完成。
- 09真实独立PG+Mock+Chromium：核心两路径/草地及水面修复/固定岸线/旧历史PASS；最终Chromium和新负控分别PASS。负控含非法参考/模型字段、未批准不读密钥、UNKNOWN不重提、取消幂等、flat水面拒绝、转换不可变。
- 08集成3 PASS，既有Executor5 PASS；06一致备份恢复定向1 PASS；07来源/预算/慢/取消HTTP定向3 PASS（其余既有项未机械重跑）。另对**6条实际转换记录**完成独立DB+文件一致备份、空库恢复及逐行/全digest复核PASS。
- 既有Studio生产18/18 PASS；开发完整run为16/18，两失败在原阈值/稳定实例分别定向复测2/2 PASS。原422读取/5秒提示等待的瞬时原因未确证，不声称已根治或开发初次全绿；全部日志与trace保留。常规测试都为Mock/合成配置，未读真实共享key或付费。
- 作者CUA与真实浏览器/ZIP都是作者自测，独立Review **NOT_EXECUTED_BY_DESIGN**；新CI未运行，无推送。

保留的失败包括负例提前命中隐藏RGB、MZ脚本flags类型、OpenAPI清单遗漏、丢弃候选缺CAS版本递增、新binary路由未进白名单、浏览器断言误把DB exportId当Manifest buildId，以及环境恢复后的Chromium缓存缺失；均有定向纠正/复测。运行中clean build曾导致旧历史读取瞬时失败的推断单独保留；稳定实例同一旧Build预览与旧ZIP重下SHA随后完全一致。未删除原失败日志、历史08预算或任何已发布manifest。

Reviewer从当前候选、[工程基线](../engineering/STEP_09_BASELINE.md)、固定探索/预算、转换/修复/来源边界及现有负控进入即可；无需重新全局审查01–08。未发现可稳定复现的P0/P1/当前硬契约阻断；开发完整回归的两次瞬时失败原因未确证，需Reviewer关注复测局限。**质量、MZ/人工和阈值批准仍是步骤验收剩余门禁**，不是作者可以批准的状态。

## 运行与用户集中验收

本树独立PG55529，Mock Studio使用本树`.env`/`.local/assets`、API4399/Web5299；真实数据单独DB `tileset_step09_live_v1`、`.local/step09/live/assets`、`.env.step09-live`/API4398。数据库/资产均不复用用户Studio，主仓库共享私有文件只承载Provider配置。

共享凭据优先级：显式进程 `WAVESPEED_API_KEY` > 显式函数路径 / `TILESET_PROVIDER_ENV_FILE` > 当前checkout根`.env.local`。后两者是文件路径选择优先级；不source/eval、不覆盖进程、不复制key、不引入VITE_变量/日志/快照。普通启动默认Mock；真实模式创建前先检查人类预算。**密钥存在不等于预算获批。**

```sh
export PATH=/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:$PATH
pnpm db:local start          # 仅本树专属集群；已运行时无需重复
pnpm start                  # Mock本地工作台
# 操作者显式指定共享文件，不硬编码用户路径到产品
TILESET_PROVIDER_ENV_FILE="$SHARED_PROVIDER_FILE" TILESET_AI_MODE=wavespeed pnpm start
# 查看保留的真实数据：专属live env无key，仅含独立DB/端口/资产与共享文件路径
node --env-file=.env.step09-live apps/api/dist/main.js
pnpm report:step09 <new-output.json>
```

当前真实固定批次只授权空辅助/默认风格/固定参考SHA；其他合法辅助是正常产品输入，可用Mock验证，真实调用需被纳入用户预算批准，报“本批次未授权该输入”，不误判Prompt冲突。

用户剩余肉眼工作集中为两份已准备MZ工程的拼接/边角、三源帧往返动画、草水区分/重复纹理/参考契合，以及决定正式质量阈值。未做前仍NOT_EXECUTED/PENDING，作者不自行批准或推进10。
