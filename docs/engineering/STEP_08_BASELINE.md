# 步骤08 Coding 基线

本轮按用户2026-10-17授权，从已发布main `75c65571a592a389853b30531ef6cea3d46c5402` 在独立 `codex/step-08-ai-gateway` 工作树实施。06/07最终CI38701042983及用户拼接/动画观察继续有效；旧文档的待CI状态不作为重做依据。初始授权为Coding、自测及两次以内预算真实联调；同日补充授权在原5美元总预算内最多再提交一次Edit；独立Review、批准、Merge、Push和09/10均不在本轮。

所有权：`ai-gateway` 维护无框架的版本化平台主Prompt、草地/水纹/固定岸线/参考图编辑模板、Composer与默认模型配置；仍不拥有网络、DB或任务调度。`apps/api` 独占官方SDK `wavespeed@0.3.4`、供应商协议Adapter、受控资产ID→冻结参考版本映射及显式联调入口。`local-executor` 复用原Executor/Archiver，增加通用受限HTTPS结果读取；`persistence` 复用任务/attempt/归档事务与不可变文件。Web、HTTP契约、Compiler、Profile、槽位、动画不变；完整AI产品入口和生产配方留09。

`composeTaskSnapshot` 允许空补充，结构化字段严格限定；明显结构/角色/引擎冲突拒绝。原补充作为从属美术数据呈现，不能设置模型、系统模板或参数。文本过滤不能保证模型服从；结果仍经过图片硬校验，且本步候选不代表MZ源样板或美术质量达标。`renderFrozenPrompt` 只读创建时快照，不查询新Registry。快照保存模型/配置/模板内容及版本、用户补充、Style/Target、参考asset/revision/SHA；集中默认变化只影响新任务。

SDK的公开`run`/`runNoThrow`要等轮询结束才交回ID，因此Adapter用官方REST单次Submit及已知ID查询，用SDK上传受控源字节产生的临时私有文件；该文件由应用创建并在上传结束清理，不接受用户本地路径。Provider错误只保留受控代码。提交意图先落库，UNKNOWN不重提，已知ID恢复查询，已成功远端只重归档；候选始终历史，不自动采用或发布。SDK明确关闭replacement/query自动重试，应用轮询有界。

下载仅允许Adapter配置中精确官方对象域名的HTTPS、禁止重定向/认证/自定义端口；5秒、4MiB、4096块。图片仍执行原CRC/chunk/metadata/像素/透明/密度与隔离codec预算。新增显式`opaque-rgb-to-rgba8-v1`只允许原政策中的8bit RGB/RGBA单帧sRGB PNG，添加opaque alpha并重编码为新文件，不缩放或改变色彩策略。默认仍拒绝不支持的metadata。真实供应商返回39字节tEXt触发METADATA_REPAIR后，新增显式操作参数`--repair-png-text-metadata`：先对原文件执行相同CRC/结构/64KiB metadata/byte/pixel预算，仅剔除未压缩tEXt生成独立副本，随后才执行RGB转换和原严格RGBA8校验；iCCP/EXIF/HDR/压缩text/其他metadata不因此接受。TaskArtifact单独记录`metadataRepair: png-text-drop-v1`，旧任务创建快照不改写。原始供应商文件单独固化，事务登记FileObject，并在不可变TaskArtifact.sourceRef.originalDownload保存原文件引用及转换版本；验证后的文件独立持有。普通上传/inspect/decode仍拒绝RGB，原失败用例不降级。

本树独立`.env`、PG55528、API4388/Web5288、`.local/assets`及`.local/step08`；不复制其他数据库或凭据。首次准备依次 `pnpm install --frozen-lockfile`、`pnpm db:generate`、独立`db:local init`、`pnpm build`、`pnpm db:migrate`。日常启动不加载用户provider文件，不会自动提交AI任务。

```sh
export PATH=/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:$PATH
pnpm check
pnpm test:step08                 # 真实独立PG + 注入供应商网络，零付费
pnpm test:step08:real --provider-env /Users/dingshinn/Desktop/rpg-maker-maker/.local/step08/provider.env --repair-png-text-metadata
```

只有最后一条显式命令读用户指定文件；通过dotenv.parse作为数据读取，不source/eval，不修改用户文件或process.env。密钥只传给后端SDK/REST，不进快照、日志或前端。文本/参考图会传给WaveSpeed。初始联调固定Generate一次、Edit一次；本次补充授权仅允许固定`edit-size-fix`槽再提交一次Edit，不重提Generate或旧失败Edit，并发1；持久化run锁与不可复用的reservation，先查完整输入价格，按固定单图全价上限$0.003/$0.012保守预留，累计不得超用户文件预算。价格错误/上涨、预算不足或UNKNOWN停止新付费；不是供应商计费硬额度或跨工作树共享账本。禁止删除本次ledger来重复购买；重跑只恢复同任务。供应商实际费用未返回时写UNVERIFIED，与估算分开。

官方依据（核对2026-10-17）：[SDK与公开方法](https://github.com/WaveSpeedAI/wavespeed-javascript)、[Submit](https://wavespeed.ai/docs/submit-task)、[上传](https://wavespeed.ai/docs/upload-files-api)、[定价API](https://wavespeed.ai/docs/pricing-api)、[Generate模型](https://wavespeed.ai/docs/docs-api/wavespeed-ai/flux-schnell)、[Edit模型的image-to-image模式](https://wavespeed.ai/docs/docs-api/wavespeed-ai/flux-dev)。模型为连通候选，不构成09质量/商用许可结论。实际结果及Reviewer入口见[步骤08 Coding报告](../reviews/step-08-coding.md)。

## 2026-10-17 Edit尺寸补修

新配置`terrain-models-20261017-v2`通过既有`resizeNearest/nearest-explicit`显式将参考输入准备为256×256独立source，记录`match-output-nearest-explicit-v1`及原source父依赖。任务冻结原图、准备图两份asset/revision/SHA；Adapter上传第二份前校验尺寸。旧v1单引用快照仍按原语义解释，不改写旧任务。输出校验和Archiver不变，不缩放供应商输出。额外真实Edit已返回原生256×256并成功归档，累计报价预留$0.027、实扣UNVERIFIED；当前READY_FOR_REVIEW，详情见更新后的Coding报告。

官方概述提到width/height，但实际`GET /api/v3/models` Schema禁止额外字段且仅定义size；旧请求size本已正确。参考图影响输出比例是由96×144→168×256推断，未冒称已取得供应商内部实现。新输入准备会调整参考图比例，不属于输出尺寸阈值豁免或美术质量保证。额外授权入口为显式`--additional-edit-size-fix`，原两个reservation保留并累计计费，一次追加槽用完后不再提交。
