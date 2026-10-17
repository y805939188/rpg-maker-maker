# 步骤08 Coding 交付

2026-10-17（America/Chicago）。**Status: BLOCKED**。本轮仅Coding、自测与预算内真实API联调；未启动独立Review、批准、合并、推送或09/10。

候选 `ea7925ae8b4589af79e0053feef06249764624c9`，分支 `codex/step-08-ai-gateway`，工作树 `/Users/dingshinn/.codex/worktrees/step-08-ai-gateway/rpg-maker-maker`。最后功能改动为 `5179002d20cd50cdbc77adb77ca203d4d1e99605`；候选额外固化真实Edit尺寸失败的回归，未再改变生产行为。基线main `75c65571a592a389853b30531ef6cea3d46c5402` 与主工作区保持不变；06/07最终CI38701042983和用户拼接/动画观察不重判。

## 唯一当前阻断

`STEP08-LIVE-EDIT-DIMENSIONS`：真实Edit请求冻结 `size=256*256`、源组件尺寸256×256，但供应商返回168×256。远端成功、下载和显式PNG转换均可执行；最终尺寸硬校验拒绝归档，平台任务保持 `FETCHING_RESULT / RETRY_REQUIRED`，没有TaskArtifact，也没有伪造COMPLETED。返回尺寸的供应商内部原因尚未证实。

Generate已成功归档；Edit最低完整链路尚未通过，**不能宣称两条真实链路完成或步骤08 READY_FOR_REVIEW**。两次模型提交上限已用完，故停止新付费请求。没有缩放结果、放宽尺寸阈值、改写创建快照或购买替代样本。下一安全动作是核对Edit模型的尺寸输入/输出语义，提出明确的新候选及新任务契约，再由用户另行授权额外真实Edit验证；本轮不执行。

## 实现与边界

- `ai-gateway`：版本化平台主Prompt及草地、水纹、固定岸线、参考图编辑模板；可选补充留空可用，结构冲突拒绝，严格结构化输入不能选择模型或替换核心模板。Composer冻结模板内容/版本、模型/配置/参数、补充、Style/Target及参考asset/revision/SHA。Worker只读快照。文本过滤不保证模型服从，仍须结果硬校验。
- 中心配置 `terrain-models-20261017-v1`：Generate=`wavespeed-ai/flux-schnell`，Edit=`wavespeed-ai/flux-dev`的image-to-image模式。单图PNG、请求256×256、seed4808；Edit strength0.55/28steps/guidance3.5。模型与模板变更仅影响新任务，无普通用户模型选择器；端点日期标签不证明供应商权重版本固定。
- API后端Adapter使用官方 `wavespeed@0.3.4` 上传受控引用。SDK公开run方法不能在轮询前交回ID，因此Adapter内REST负责单次提交、已知ID查询、价格核对及受控错误映射。SDK自动replacement/query重试均关闭。Adapter不持有DB、任务恢复或归档调度。
- 沿用Executor、LogicalTask、SubmissionAttempt、Archiver与不可变资产存储。意图先入库；未知不重提；已知ID恢复查询；远端成功仅重归档；重复完成幂等；候选不自动采用、不倒退当前项目或成功Build。没有另造任务系统。
- 结果下载精确HTTPS域名允许列表、禁重定向/认证/自定义端口，5秒/4MiB/4096块。保留原CRC/chunk/metadata/解码像素、RGBA8/sRGB/透明/密度及隔离codec硬校验。显式RGB→RGBA8保留原始文件；普通上传仍拒绝RGB。
- 真实Generate首先因实际CDN不在列表而归档失败，修复只新增已认证结果确认的精确域名 `d2h7xmz5gqybh9.cloudfront.net`，恶意后缀仍拒绝。随后39字节tEXt触发原metadata规则；新增显式 `--repair-png-text-metadata`，先验证原文件全部CRC/结构/预算，只移除未压缩tEXt生成独立副本。ICC/HDR/EXIF/压缩text等不获豁免。TaskArtifact分别记录原始文件引用、`opaque-rgb-to-rgba8-v1`及`png-text-drop-v1`；原任务快照不改写。

没有新增HTTP/Studio AI产品入口；08交付可复用后端服务与显式CLI。完整AI生产UI、整套素材、质量/商用评测属于09。Compiler、Profile、Pixel Contract、槽位、动画、母版、正式导出及既有MZ工程未改。

## 环境与命令

客户端当前会话model/effort读回 `gpt-6.1-sol / xhigh`，本地配置 `service_tier=default(Standard)`；角色由用户指定为step_coder。未暴露的服务端最终tier/原生role记 **UNVERIFIED_NOT_EXPOSED**。未委托Fast/Priority/Ultrafast Agent。

Node22.21.1、pnpm10.20.0、专属PG55528/API4388/Web5288、独立`.env`/`.local/postgres`/`.local/assets`/`.local/step08`。复测额外使用本集群新建的独立回归/浏览器数据库与资产根，不复用用户Studio数据库。用户密钥文件只显式作为数据解析，不source/eval、不复制、不改写、不注入process.env，不发送前端或冻结快照。日常启动、测试和CI不加载该文件或自动调用模型。

```sh
export PATH=/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:$PATH
pnpm install --frozen-lockfile
pnpm db:generate
# 新环境须自建独立 .env/PG/资产根；不得复制本文工作树或用户Studio凭据
pnpm build
pnpm db:migrate
pnpm check
pnpm test:step08
# 已执行的显式联调命令；本轮2/2提交已用完，勿删除ledger重新购买
pnpm test:step08:real --provider-env /Users/dingshinn/Desktop/rpg-maker-maker/.local/step08/provider.env --repair-png-text-metadata
```

`.local/step08/live` 保留独占run锁协议、task ID、不可复用且fsync的Generate/Edit预算预留、最终结果记录。正常恢复只处理原任务。模型费用先按完整输入查价，按固定单图全价上限$0.003/$0.012保守预留并核对累计预算。价格不明/上涨、预算不足、未知提交均停止新购买。该护栏不是供应商侧硬额度或跨工作树共享账本。

## 自测与构建

| 检查                                                                     | 实际结果                                                                                             |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `pnpm check`：类型、方向、Lint、格式、单元、clean build、11个生产exports | PASS，427项；含原隐私5项及新增Prompt/SDK/预算/下载/图片用例                                          |
| 08真实PG与注入供应商网络                                                 | 2/2 PASS；显式元数据修复后执行                                                                       |
| 新增Edit尺寸失败回归 `-t "wrong geometry"`                               | 选定1/1 PASS，另外2项未选，复用上一行通过证据                                                        |
| 06持久化/Mock/故障/备份恢复                                              | 23/23 PASS；新增显式修复后再跑实际受影响的通用Executor 5/5 PASS                                      |
| API / 07 HTTP图片与发布                                                  | 3/3及16/16 PASS；原Studio默认路径未启用元数据修复                                                    |
| 生产 / 开发 Playwright                                                   | 18/18 + 18/18 PASS，零skip、零flaky，retries=0                                                       |
| 实际密钥边界                                                             | 检查78个变更/前端/日志/记录文件与2份真实任务记录，实际密钥匹配0；用户文件字节未变，未注入process.env |

原完整回归后只因共同PNG处理代码的具体修改重跑了必要check及受影响归档测试；新增尺寸回归只补跑该项，没有因SHA或文档变更机械重跑全套。

本轮初始独立环境依赖/构建顺序、严格TS索引及Lint问题均已定位修正；首次08 PG失败为完整Profile误传给只允许id/version的快照边界，修复应用映射后通过。真实CDN和tEXt失败保留原日志，分别在有具体定位后整改，只恢复同Prediction ID。最新Edit尺寸失败已加回归，仍明确阻断。没有删除用例、降低阈值或重置母版。

工程构建：`step08-ea7925ae8b45-bc6dd7ba816981d3`，Manifest SHA `0131d9d56399f335aa959bebef0b635851aed1cb075445668d3be6b935a9c691`，231文件。Profile SHA `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`；Task `task-snapshot-v1`、HTTP `http-v1` 保持。完整逐文件哈希在私有不可变构建manifest，关键文件/锁文件哈希、命令摘要、日志SHA及真实调用收据统一见[精简证据](../evidence/step-08/coding-summary.json)。文档提交不改变该功能代码或已受测构建，不为回写自身SHA重复全套回归。

## 真实调用与费用

用户文件实际预算 **$5.00**；共 **2次模型提交、并发1**。报价和保守预留合计 **$0.015**，实际扣费 **UNVERIFIED**，不把报价当账单。

| 链路     | 模型 / Prediction ID                                             | 结果                                                                                              |
| -------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Generate | `wavespeed-ai/flux-schnell` / `c1d1de1d1659408c9269c9b42a9cc6ae` | COMPLETED/DURABLE，TaskArtifact 1份；先前两次归档失败后恢复同ID，始终仅一次提交                   |
| Edit     | `wavespeed-ai/flux-dev` / `a101208d47d5444c9bc46d39f8b31c6e`     | SDK参考图上传、远端编辑、下载完成；168×256不符冻结256×256，归档失败，TaskArtifact 0份；仅一次提交 |

Generate源文件SHA `8942ba6e5058649d66d155f05232c636d7fb2152a11f51298ee104105cf63a5c`，验证归档PNG SHA `5f0e2c54e4181311a667b0e4222fd1e077d9d24728e2298249918414117813c8`。Edit原始PNG SHA `7746fe31c3c6f11a377c32ba8bce22eb3ed515912937ad6082050b8cf51b5e59`，59,828字节，作为私有失败证据保留，不冒充已完成资产。原始下载与日志位于本树`.local/step08`；数据库、文件、预算记录均保留。

## 后续Reviewer入口与未验证事项

后续Reviewer可从候选 `ea7925ae8b4589af79e0053feef06249764624c9`、[08工程基线](../engineering/STEP_08_BASELINE.md)、上述精简证据和 `apps/api/tests/step08/integration.test.ts` 的尺寸失败回归开始。独立Review **NOT_EXECUTED_BY_DESIGN**；本报告不代替批准。

唯一已知当前硬阻断为真实Edit归档。实际扣费、供应商权重版本、AI质量/整套Pack、此次AI输出MZ实机均未验证；后两类属于09/10，既有06/07证据不变。本树PG/API/Web测试服务均已停止，数据、资产、失败输出及预算记录保留；主工作区仍为干净的已确认main，用户Studio及MZ环境未修改。
