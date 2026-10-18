> **最终限定复审与功能交接（2026-10-18）：** 受审候选`0a55d9f960bc3093843387af82561896ef16ebdc`已获原序列最后R2独立PASS，完整check450、完整09 4/4。T接受A精确像素复用，最终R同Build的草水/拼接/动画/岸线获USER_REPORTED功能确认。补充08准备超时2/3及旧原因UNVERIFIED保留；正式数值门槛/原装Host范围不冒充通过。仅按本次预授权发布09功能基线，实际Git/CI放行回执与边界见[发布交接](../orchestration/step-09-release.md)；10保持NOT_STARTED。下文均为历史阶段记录。

> **定向功能收尾作者候选：** 生产source `97f6cb6789402e823f51ca86d79e4513b2265941` 已接入region-v2与角色参考Prompt@2；T正式像素等于已接受A，R新增获批2调用并经一次草地选区纠正。见[本轮Coding报告](../reviews/step-09-functional-closeout-coding.md)。f613已有独立限定PASS；本轮仅作者自测/候选，不自行复审或推进10。下文为各阶段历史，不据旧待审/未冻结H02说明覆盖本轮新证据。

> **首审整改最新：** source `3cc866b4bf0fa15a1a8c8ed0baf35b245828fe86` 为本地作者整改候选。共享并发槽只由明确远端终态/旧ARCHIVED释放；本地cancel/fail/discard及未证实的归档状态不释放。MZ准备v2显式规范化缺失windowOpacity、拒绝非法值、引用canonical profileHash，新增core/Chromium启动smoke。两P2作者修复待独立复核，V09原根因未确证，正式人工材料仍NOT_READY；详见[首审整改](../reviews/step-09-fix-round-1-coding.md)。原基线与历史说明保留在下方。

# 步骤09 Coding 基线

当前授权只包含09实现、自测和本地候选。main基线为 `a551dd68f65d3c92dfb93a4fca8590353f4d103b`；既有01–08发布、独立PASS及失败记录保留。不启动Reviewer、不批准/合并/推送/进入10。

所有权延续既有分层。contracts唯一拥有AI HTTP/Zod/OpenAPI。API复用AiTaskService、Executor、Archiver、Studio配方/Compiler/Pack/QA及成功指针CAS；`AiConversion`为小型不可变转换证据。Web只依赖contracts，不选择模型、不持密钥。material-processing新增 `ai-periodic-source-v1` 和 `center-crop-square-nearest-v2`，不增加包/供应商依赖，不改Profile、原型、旧manifest或Pixel Contract。

两条路径：空辅助默认文字，或受控PNG参考上传（空辅助可用）→两项任务（草地、水面共享基础）→原文件及RGBA候选归档→显式选择→裁切/像素化/量化/周期样板→合格96×144 RGBA8/sRGB、密度2组件→共享基础三源帧→固定岸线→既有配方/Compiler/Pack/QA→实际导出图集预览与标准8文件ZIP。硬错误拒绝，不用归档/COMPLETED冒充Pack成功。

转换先取整数中心最大正方形，保持比例，nearest-explicit采样24×24逻辑像素，sRGB数值每通道四级量化（共64色），记录周期边缘处理，整数2倍及2×3重复形成96×144。水面只用同一视觉基础作0/1/2逻辑像素相移，至少1%变化；不是独立AI生成三帧。该有损策略可能丢细节/产生重复与闪烁，自动指标不判断美术。原始、准备图、参数版本、像素Hash、输出及源revision依赖均保留；不转换ICC/HDR/EXIF、不放宽上传或下载预算。

固定岸线使用既有art遮罩，首次捕获遮罩内草地像素为opaque bank overlay。局部修复只重新生成选定草地或水面基础；未选源、mask、overlay保持精确revision，固定岸线像素不变。配套Fragment按既有PACK_PAIRING必须引用同一IR/recipe，因此受影响配套IR及两个Fragment一起重建；不改变Compiler契约。失败/取消/未知/迟到任务只作为历史，采用与发布仍需当前revision检查。

参考原图作为独立source保存，09准备策略中心等比裁切后nearest到256×256，原图/准备图同时冻结。96×144参考会裁去上下共48行（面积1/3），不声称天然保真。08的旧拉伸准备策略与旧任务语义保持。

## 后端配置与隔离启动

Node22.21.1/pnpm10.20.0。先 `pnpm install --frozen-lockfile && pnpm db:generate`；新Worktree用独立 `.env`、`TILESET_PG_PORT=55529 pnpm db:local init`，设置独立API4399/Web5299/资产根后 `pnpm build && pnpm db:migrate`。

`.env`仍只加载本树配置且不覆盖显式进程环境。Provider凭据单独返回，不安装到process.env：`WAVESPEED_API_KEY`进程值优先；否则显式传入的共享文件路径优先于 `TILESET_PROVIDER_ENV_FILE`，最后为当前checkout根 `.env.local`。共享文件只接受 `WAVESPEED_API_KEY`，8KiB上限，用dotenv.parse作为数据解析，不source/eval。DB/端口/资产配置不得放进共享Provider文件；不复制密钥到Worktree，不用VITE_变量/日志/快照保存密钥。配置出错仅返回受控错误。

```sh
# Worktree自己的.env已独立配置；默认Mock，零真实调用
pnpm start
# 显式共享文件（路径由操作者提供，产品不硬编码主仓库绝对路径）
TILESET_PROVIDER_ENV_FILE="$SHARED_PROVIDER_FILE" TILESET_AI_MODE=wavespeed pnpm start
```

真实mode创建任务前先检查人工预算批准，再读后端凭据。Mock/普通测试/CI不会读取共享文件或真实key。`TILESET_AI_MODE=disabled`可关闭AI；普通用户不设置模型。

## 唯一09探索与预算

固定清单见 [exploration-v1](../evidence/step-09/exploration-v1.json)，预算已获本轮用户本人明确批准（见09 budget-approval.json）；正式质量阈值仍待人类批准。原提案中的PENDING作为提出时历史保留。初批T01/R01各草地+共享水面2调用，共4；总上限$1/10提交、并发1、每次保守预留$0.05，单价实时核验0.003/0.012上限。每Case最多一次完整重试和一次组件修复，重试/修复前须已有明确失败/不可用/丢弃记录；人工≤15分钟。UNKNOWN/未决预留冻结新增，归档失败仅恢复归档，不自动购买或扩额。

通过Git common-dir推导主仓库 `.local/step09-budget`，所有会话/Worktree共用；无预算root环境覆盖。`approval.json`仅能在用户本人明确批准后由操作者写入，应用没有自动批准入口。其字段为version、approvedBy=HUMAN_USER、authorization、approvedAt、totalUsd=1、maxSubmissions=10。提交前独占文件锁原子检查/写入并fsync；预留不退还，事件历史保留。锁残留/UNKNOWN由人工核对，不能删ledger重来。报价、保守预留与实际扣费分开，供应商账单不可核实时UNVERIFIED；这不是供应商侧金额硬限制。

本批次真实调用只授权清单的空辅助/默认风格/固定R01原图SHA；其他合法偏好是正常产品输入，可在Mock使用，真实调用须纳入用户批准的预算范围，不能被当作Prompt冲突。主Prompt版本不变；S08-IR1-N01修复text子串误拒texture，结构/模型冲突仍拒绝。

`pnpm report:step09 <new-output.json>`导出本树DB及共享账本统计，不读key。完整可用Pack才是成功单位；提交、失败、UNKNOWN、不可用候选、归档、丢弃、重试、修复、时间和费用保留，零分母N/A。Mock不进入真实成功率。正式质量建议、人工评分局限与未调参的10保留集均在固定清单中；尚未获批，不依据结果降低。H01保留文字场景已固定；H02保留场景固定但参考原图路径/SHA待用户，参考数据尚未冻结，不声称完整验收数据冻结。

实际Pack标准目录准备原生MZ材料：`pnpm prepare:step09 <合法原装newdata> <该Pack八文件目录> <新独立工程目录>`。会验证原装core、拒绝覆盖、注册图集并生成地图和出生点；脚本成功只表示准备完成。新产物MZ编辑器/动画/美术未执行时仍写NOT_EXECUTED/PENDING_USER_ACCEPTANCE，原装Host等旧延期保持。

验证入口 `pnpm check`、`pnpm test:step09`（真实独立PG+Mock供应商+真实Chromium）、既有 `pnpm test:step08` 与必要06/07/双模式浏览器回归。Reviewer入口和最终SHA/证据见 [Coding交付](../reviews/step-09-coding.md)。
