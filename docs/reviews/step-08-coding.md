# 步骤08 Coding 交付

2026-10-17（America/Chicago）。**Status: READY_FOR_REVIEW**，本地功能候选 `06ec3d92e1e5579dbc8cdad3de13c2c997fb1ab1`，分支 `codex/step-08-ai-gateway`，工作树 `/Users/dingshinn/.codex/worktrees/step-08-ai-gateway/rpg-maker-maker`。本轮只Coding、自测与获准的一次追加Edit；独立Review、批准、合并、推送及09/10均未执行。

从已确认main `75c65571a592a389853b30531ef6cea3d46c5402` 开始；06/07最终CI38701042983及用户拼接/动画观察继续有效。原08候选ea7925a、报告提交e3bd9c8及所有失败保留为历史。本报告不把旧失败任务改成成功。

## Edit尺寸阻断的修复

核对[官方Flux Dev页面](https://wavespeed.ai/docs/docs-api/wavespeed-ai/flux-dev)、[模型目录协议](https://wavespeed.ai/docs/list-models)及实际已认证`GET /api/v3/models`：概述提到width/height，但实际Schema为`additionalProperties:false`，支持的尺寸字段为`size`。旧请求确实冻结并发送了`size=256*256`；没有添加Schema不支持的width/height。96×144参考图产生168×256输出提示参考图比例影响了结果，供应商内部实现仍未证实。

新默认配置 `terrain-models-20261017-v2` 在**任务创建时**显式准备输入参考图：复用既有框架无关 `resizeNearest(..., method: nearest-explicit)` 到256×256，编码并执行原PNG硬校验，保存为独立不可变source。准备图记录`match-output-nearest-explicit-v1`及原source revision父依赖；新任务同时冻结原图与准备图的asset ID/revision/SHA。该操作会调整参考图比例，仅用于模型输入，不声称像素保留或美术质量。

Adapter依据冻结的准备策略选择第二份引用，并在SDK上传前硬验256×256及SHA。没有准备标记的旧快照仍按原单引用协议解释。原图、旧Generate任务、旧失败Edit任务和它们的快照均不修改；输出尺寸硬校验完全未变，**不会缩放供应商输出以凑合通过**。新真实Edit原始输出本身就是256×256。

## 实现范围与配置

平台主Prompt Registry/Composer仍为 `terrain-source-main@1`，内置草地、水纹、固定岸线和参考图编辑模板；补充可为空，结构冲突拒绝。模型、参数、模板内容与版本、Style/Target、补充与参考版本创建时深冻结。默认Generate仍是`wavespeed-ai/flux-schnell`，Edit仍是`wavespeed-ai/flux-dev`；普通用户没有模型选择器。默认配置变化只作用于新任务。

后端使用官方 `wavespeed@0.3.4` 上传受控引用；Adapter内REST提供单次提交、已知ID查询、价格核对和受控错误映射。沿用Executor/Persistence/Archiver：先落提交意图、UNKNOWN不重提、已知ID恢复、远端成功仅重归档、重复完成幂等、迟到候选不覆盖当前项目。没有新增任务系统或HTTP/Studio AI入口，完整AI生产与质量评测留09。

下载域名、禁重定向、字节/时间/chunk/像素预算、RGBA8/sRGB/CRC/metadata/透明/密度硬校验均保持。保留上一轮显式RGB转换及`--repair-png-text-metadata`，原始文件与验证PNG分别固化；tEXt修复不放开ICC/HDR/EXIF等。Compiler、Profile、Pixel Contract、槽位、动画、母版与用户MZ工程不变。

客户端有效model/effort读回 `gpt-6.1-sol / xhigh`，本地 `service_tier=default(Standard)`；用户指定step_coder。服务端最终tier/原生role未暴露，记UNVERIFIED。未委托Fast/Priority/Ultrafast Agent。

## 真实链路、费用及旧记录保护

| 调用                        | Prediction ID                      | 结果                                                                      | 报价预留 |
| --------------------------- | ---------------------------------- | ------------------------------------------------------------------------- | -------- |
| 原Generate，**未重提**      | `c1d1de1d1659408c9269c9b42a9cc6ae` | 原COMPLETED/DURABLE保留                                                   | $0.003   |
| 原Edit失败，**未重提/改写** | `a101208d47d5444c9bc46d39f8b31c6e` | 168×256被拒绝，原FETCHING_RESULT/RETRY_REQUIRED保留                       | $0.012   |
| 本轮唯一追加Edit            | `b2792999b3d740a09999ea5a7519dfb0` | SDK上传准备图→编辑→下载→256×256硬校验→COMPLETED/DURABLE，TaskArtifact 1份 | $0.012   |

累计3次模型提交，其中本轮新增Edit **1/1**，并发1；累计报价/保守预留 **$0.027 / $5.00**。实际扣费UNVERIFIED，不把报价当账单。追加槽为固定`edit-size-fix`，与原两份reservation累计校验并fsync、拒绝重复使用和Generate模型；不会删除/重置原预算记录。预算不足、价格异常或提交未知均停止新购买。

新Task ID `54ca5748-31d6-47ee-9beb-826cf9828d65`，快照SHA `a75d2734938752e9ae56595897c695d104d84cbbc966f6de835f08abc6dfdd16`。原始输入SHA `1eaf10e898b7c26bc24788bf336b31842e6d292e2ade2c9de34b027a41e7c0bd`；准备图SHA `8d939eb27c7a0682721772c5befda77f279ce41c7cb72a1eca80f726bb18e234`。供应商原始256×256 PNG SHA `bb9898fd722266c8a64433ae117abff9822f48bdf1a2b1b907945780e372e497`，96,445字节；归档PNG SHA `af63fe02ffbf430b0f715f315e9d73c9e14919d36117f5abce8edad10d05c956`。

追加运行前后核对原两份任务完整记录摘要，`priorTasksUnchanged=true`，两份旧快照SHA也保持不变。用户密钥文件字节未变，59个变更/日志/记录文件及3份任务记录实际密钥匹配0；未注入process.env、前端或任务快照。私有源文件、数据库、旧失败和所有预留记录保留。

## 本轮自测与构建

| 检查                                                               | 结果                                                                                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`：方向/类型/Lint/格式/单元/clean build/11个生产exports | **429 PASS**                                                                                                        |
| Prompt/Adapter/预算定向测试                                        | **9 PASS**，含v1旧引用与v2准备策略、尺寸不符上传前拒绝、一次追加槽及累计预算                                        |
| 新预算Generate禁止断言补证                                         | **2 PASS**，`pnpm exec vitest run apps/api/tests/step08-budget.test.ts`                                             |
| 真实独立PG、网络注入的08集成                                       | **3 PASS**，含准备图持久化、原图哈希不变、快照冻结、已知ID恢复、UNKNOWN/拒绝、只重归档、重复/迟到及错误尺寸继续拒绝 |
| 实际追加Edit                                                       | **COMPLETED/DURABLE**，原始及归档均256×256，提交attempt=1                                                           |

首轮PG发现准备图ID超过领域64字符上限，已使用合规确定性ID修复，未放宽ID规则；失败日志保留。失败遗留的独立测试库保留，后续在本集群新空测试库验证，未reset或删失败用例。其他06/07/API/Web/Codec/Compiler路径未改，沿用上一轮23/3/16及生产18/开发18证据，**本轮没有重跑这些无代码影响的全套测试**。

工程构建 `step08-06ec3d92e1e5-b8d043b4452ec9e8`，Manifest SHA `de6a155258bba1a5adc381c4f6afdafdd4bf8c99d73382c82e9446a5eae84946`，234文件。Profile SHA `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`；Task `task-snapshot-v1`、HTTP `http-v1`、锁文件及Pixel Contract保持。当前候选、关键构建哈希、日志摘要、官方Schema核对与真实调用收据见[精简证据](../evidence/step-08/coding-summary.json)。纯文档提交不改变功能代码或构建，不为自身SHA回写重复全套验证。

## 运行与Reviewer入口

Node22.21.1 / pnpm10.20.0。本树独立PG55528/API4388/Web5288、`.env`/`.local/postgres`/`.local/assets`；额外回归库与资产根独立。只显式命令将用户文件作为数据解析，不source/eval、不复制或修改密钥文件；普通启动、测试和CI不加载该文件或自动调用模型。

```sh
export PATH=/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:$PATH
pnpm install --frozen-lockfile
pnpm db:generate
# Reviewer须自行配置独立 .env/PG/资产根，不复制用户Studio凭据
pnpm build
pnpm db:migrate
pnpm check
pnpm test:step08
# 本轮已执行完唯一追加授权；禁止删除ledger重新购买
pnpm test:step08:real --provider-env /Users/dingshinn/Desktop/rpg-maker-maker/.local/step08/provider.env --repair-png-text-metadata --additional-edit-size-fix
```

Reviewer入口为候选 `06ec3d92e1e5579dbc8cdad3de13c2c997fb1ab1`、[08工程基线](../engineering/STEP_08_BASELINE.md)、精简证据及`apps/api/tests/step08/integration.test.ts`。当前开放硬阻断0；**独立Review NOT_EXECUTED_BY_DESIGN**，不等于已批准。实际扣费、供应商权重版本、整套AI素材质量/Pack和此次AI输出MZ实机仍未验证；后两类留09/10。自有PG已正常停止，数据/失败/预算/产物保留；主工作区和用户Studio/MZ环境未修改。交付后停止。
