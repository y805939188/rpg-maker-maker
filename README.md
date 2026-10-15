# AI Tileset Studio — 人工素材工作台

当前提供项目持久化、人工PNG素材导入、固定草地—水面岸线配方、实际构建、网页拼接/动画预览、版本历史与标准MZ素材包下载。AI功能尚未开放，步骤08–10未启动。

**步骤06、07均已发布。** 步骤07最新功能候选获第17轮独立整合PASS，候选与代码main的完整CI全部成功；正常合并、合并后回归、push和远端读回完成。 唯一状态见 [调度状态](docs/orchestration/steps-06-07-state.json)，最终发布与未执行范围见 [交付报告](docs/orchestration/steps-06-07-final-report.md)。

- 已配置的本地入口：**http://127.0.0.1:4376**。当前运行已独立通过的候选，原项目、资产和历史已备份保留。
- [手工测试清单](docs/engineering/STEP_07_MANUAL_TESTING.md)：新建验收项目 → 导入原创美术样例或六个合格PNG → 验证并采用固定配方 → 构建 → 选择实际结果 → 播放/暂停/逐状态 → 切换历史 → 下载ZIP。
- 六源为草地、水面源帧0/1/2、固定岸线遮罩、岸线颜色组件；既有规范为96×144、RGBA8/sRGB PNG、实际密度1或2。页面提供输入诊断与明确错误，不要求修改数据库或内部文件。
- 创作预览显示实际组件；交付预览与ZIP引用同一Build的真实A1/A2、Manifest和完整TargetProfile。原生水面逻辑序列0→1→2→1，播放、暂停及逐状态均可检查。
- 标准ZIP八文件：A1.png、A2.png、pack.json、history.json、layout.json、sources.json、INSTALL.md、manifest.json。完整TargetProfile嵌在Manifest中。
- 本地运行树：`/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker`，专属PostgreSQL55476/资产`.local/assets`/私有`.env`已配置。服务运行时直接用浏览器；已停止时按交付报告正常启动，勿重复init/reset数据库，不复制其他工作树凭据。

最新受审Source `0c3dc30b0ebb4f64373fc4b3d32501a6048fe7de` / 作者docs `fa7f562efe58ddd2ee4912b64a3ad6e5cb84de67`，[独立第17轮](docs/reviews/step-07-independent-round-17.md)；[候选CI38683352144 SUCCESS](https://github.com/y805939188/rpg-maker-maker/actions/runs/38683352144)。正常代码main发布提交 `04e979612cfc82c7c2b5687fbb83509c995213b7`，[main CI38686901060 SUCCESS](https://github.com/y805939188/rpg-maker-maker/actions/runs/38686901060)。运行实例使用其已合入main的候选祖先4cb718a，功能代码与受审Source一致。

步骤07证明人工素材工作流和持久化基础。结构校验、基础视觉风险、用户美术确认及具体产物MZ实测分别记录；原装Native Host、Map003等延期与新产物MZ/用户艺术未执行状态保留。正式 [产品方案](docs/plans/01_PRODUCT_TECH_SPEC_V0.5.md)、[十步计划](docs/plans/02_V1_IMPLEMENTATION_PLAN.md) 与历史批准记录不改写。

---

## 历史工程入口与各轮检查点

以下保留原文，旧候选、当时授权和未发布状态属于对应历史阶段；当前状态以上方入口和canonical为准。

# 步骤07 R4整改当前作者候选

功能source `59423201ba10ee71c3d1b04cebec69659017b7c7`，**SELF_TESTED_READY_FOR_REVIEW_ROUND5**。标准Export幂等完成事务、项目列表独立请求归属、Studio一致元数据快照已整改自测。正式已用4轮、待第5轮；2026-10-14用户取消机械五轮上限，原历史和门禁保留。作者不独立关闭问题、不批准/合并/推送、不开始08–10。

最新check266、真实HTTP/PG16（原9＋新7）、06回归23、API3/privacy5、production/development18＋18、24scene/12＋12clock/实际PNG/12ZIP/干净恢复、JS78/旧56payload16PNG/8CPU通过。精确Source/Build/hash、原失败、资源和未执行项见 [R4整改Coding报告](docs/reviews/step-07-fix-round-4-coding.md) 与 [最终ledger](docs/evidence/step-07/fix-round4/ledger.json)。自有production entry `http://127.0.0.1:4376` 保留，AI尚未开放。

以下全部作者检查点为历史，原文本/报告/失败/Manifest保留；R3原两项已由独立R4关闭，本轮三个P2待第5轮独立确认。

# 步骤07 R3整改当前作者候选

功能source `ef30dc2ab011d204d1d0a4d099a335b68458cdca`，**SELF_TESTED_READY_FOR_ROUND4**。正式已用3/5，R3为REQUIRES_REVISION；连续错误poll共享5次/60s、明确未知/只读重读与project/selection/action异步写回调守卫已自测，待Main第4/5轮独立复审。未批准、合并、推送或启动08。

最新冻结check266、真实HTTP/PG9、06回归23、API3/privacy5、prod/dev完整browser13+13、24scene/12+12clock/实际PNG/ZIP/干净恢复、JS78/旧56payload16PNG/8CPU通过。精确source/Build/hash/原失败及未执行见 [R3整改Coding报告](docs/reviews/step-07-fix-round-3-coding.md)。专属生产入口 `http://127.0.0.1:4376` 保留；AI仍尚未开放。

以下作者检查点均为历史，原内容/证据保留；R1/R2问题已由独立R3在原范围关闭，R3新两P2仍待R4。

# 步骤07 R2整改作者候选（历史）

最新source `5d926ad7ad6a68bfaff7ea2a51d4d3859c95d7c0`，**READY_FOR_REVIEW / SELF_TESTED_PENDING_ROUND3**。正式已用2/5，R2为REQUIRES_REVISION；慢响应串行轮询和处理PNG可取消、有界BUSY恢复已整改自测，下一次正式3/5，由Main独立复审。未批准、合并、推送或启动08。

冻结候选check263、真实HTTP/PG9、06回归23、API3、privacy5、生产/开发browser各7、实际PNG/独立像素/ZIP/恢复及旧Pack比较通过。精确source/Build/hash、原失败、资源和未执行项见 [R2整改Coding报告](docs/reviews/step-07-fix-round-2-coding.md)。专属生产入口 `http://127.0.0.1:4376` 保留；AI仍尚未开放。

以下R1及更早作者候选为历史检查点，原内容和证据保留；R1问题在R2中由独立Reviewer关闭，R2两个新问题仍待R3确认。

# 步骤07 R1整改作者候选（历史）

最新source `d343171ca866a8d1d1c4e272823ef475229d8032`，**READY_FOR_REVIEW / SELF_TESTED_PENDING_ROUND2**。R1/5为REQUIRES_REVISION；共享存储祖先/root边界与非阻断P3项目切换已整改自测，下一次正式2/5，由Main复审。未批准、合并、推送或启动08。

冻结候选check253、真实HTTP/PG8、06回归23、API3、privacy5、生产/开发browser各3、独立实际像素/ZIP/恢复及旧Pack比较通过。精确Build/hash/运行资源/原失败与未执行项见 [R1整改Coding报告](docs/reviews/step-07-fix-round-1-coding.md)。专属生产入口4376保留；AI仍尚未开放。

以下初始07作者候选为历史检查点，已被正式R1要求整改；原内容及证据保留。

# 步骤07初始作者候选（历史）

最新source `4f6a40f3e8be990b4068dafee488249be737f7ad`，状态 **READY_FOR_REVIEW**，Main独立Review/CI/批准与发布待执行。人工PNG Studio现具备项目、精确组件/配方、构建/历史、双Pixi预览、QA和实际标准ZIP下载；AI尚未开放，不宣称V1.0完成。

运行：本工作树已有专属PG55476/.env，固定已有Node22.21.1后 `pnpm start`，生产入口 `http://127.0.0.1:4376`；停止自身生产服务后 `pnpm dev`，开发入口5276。新部署的安装/构建/迁移顺序、资源政策与用户工作流见 [步骤07基线](docs/engineering/STEP_07_BASELINE.md)，精确构建/验证/截图/未执行项见 [Coding报告](docs/reviews/step-07-coding.md)。源码只在本地codex分支冻结，作者不发布或开始08。

以下保留历史检查点；当前06已PUBLISHED，见 [06发布交接](docs/orchestration/step-06-release.md)。历史“尚未开放Studio”文字不作为07已新增HTTP入口的豁免。

# AI Tileset Studio — 当前开发基线

步骤 01–05 的已审成果现已发布至 main `fa0b4a6`，候选及 main CI 均成功。步骤 05 最新功能 `ad669a0` 已取得独立复审 PASS，原发布归属阻断已关闭，用户已批准开始步骤 06。当前本轮仅授权步骤 06、07 串行开发与独立 Review/发布，步骤 07 发布后停止；完整人工 Studio 与真实 AI 尚不能声明完成。

当前入口：[步骤 04/05 发布记录](docs/orchestration/step-05-release.md)、[本轮授权](docs/orchestration/steps-06-07-authorization.md)、[唯一步骤 06–07 状态](docs/orchestration/steps-06-07-state.json)、[步骤 05 最新独立复审](docs/reviews/step-05-fix-round-1-independent-review.md)。历史工程、Review 和 MZ 观察保留原边界。

已发布基线入口：[发布与仓库维护](docs/orchestration/pre-step-04-repository-maintenance.md)、[需求证据映射](docs/engineering/V1_REQUIREMENTS_EVIDENCE.md)、[最新独立复审](docs/reviews/steps-02-03-global-rereview-aad1f72.md)。正式范围仍以保留的[产品方案](docs/plans/01_PRODUCT_TECH_SPEC_V0.5.md)及[十步计划](docs/plans/02_V1_IMPLEMENTATION_PLAN.md)为准。

## 保留的步骤01诊断原型

Node `22.21.1`、pnpm `10.20.0`。原型业务和 `pnpm build:prototype` 不需要 AI、Web 或数据库；完整工作区检查须先生成Prisma Client。

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm check
# 编译产物要求源码/母版已提交且 Git 工作树干净
pnpm prototype
```

`prototype` 从已入库的 96×144 RGBA8 母版生成两套 768×576 A1/A2：
编号诊断与原始像素美术。结果在 `artifacts/step01-<identity>/`，打印构建 ID、
源码 commit 和 SHA-256。相同身份拒绝覆盖；新代码提交生成新目录。
原型只做固定槽位复制，不是步骤 04 正式 Compiler 或步骤 05 Pack Assembly。

```sh
# 下列路径请换成本机正版 MZ 1.10.0 的 newdata 和上一步打印的构建目录
pnpm verify:mz "/path/to/newdata/js/rmmz_core.js" "/path/to/artifacts/step01-..."
pnpm prepare:mz "/path/to/newdata" "/path/to/artifacts/step01-..."
```

`verify:mz` 执行未修改的正版 Tilemap 选图方法，穷举两个草地/两个水面槽位的
48 形态和 4 播放状态，并逐像素对照独立母版、核对 241 个更新计数。
它属于 Node 原生规则对照，不能代替编辑器和游戏测试。

`prepare:mz` 只在全新的 `.local/mz/<buildId>/` 创建正版模板测试工程，不接受任意
目标路径、不覆盖旧工程或手绘地图、不重新分发正版运行时。
Map001 是程序指定形态；Map002/003 留空供实际编辑器手绘。
完整操作见 [MZ 实机验收](docs/step-01/mz-acceptance.md)。

`pnpm fixtures` 可复现原始母版，**正常测试不会重生成母版**。修改美术脚本后
需要显式审查 PNG 差异与来源清单。原始图片为项目原创、CC0-1.0；未使用第三方 RTP
图块或付费模型。美术母版是兼容性样例，用户视觉确认单独记录。

技术契约：[Target Profile](docs/step-01/target-profile-v1.md)、
[Pixel Contract](docs/step-01/pixel-processing-contract-v1.md)、
[研究记录](docs/step-01/research.md)。最终候选与门禁见
[步骤报告](docs/reviews/step-01.md)。

# 正式工程入口（步骤 02）

Node 22.21.1 / pnpm 10.20.0。安装：`pnpm install --frozen-lockfile`；独立 PostgreSQL：`pnpm db:local init`；然后 `pnpm db:generate`、`pnpm build`、`pnpm db:migrate`。开发执行 `pnpm dev`；生产执行 `pnpm start`。统一检查：`pnpm check`，另执行 `pnpm test:integration` 和两种模式的浏览器测试。完整命令、边界与环境说明见 [工程基线](docs/engineering/STEP_02_BASELINE.md)，需求覆盖见 [要求证据映射](docs/engineering/V1_REQUIREMENTS_EVIDENCE.md)。

这是项目保存与 Pixi 画布工程壳；素材工作流和 AI 尚未开放。以下步骤 01 原型及证据全部保留，原装 Native MZ Host 验收仍未执行。

统一开发/生产启动需要按[步骤02工程基线](docs/engineering/STEP_02_BASELINE.md)配置私有.env及独立PostgreSQL。干净Git检出不包含凭据；已有数据库和验收目录保留原位，不自动搬迁或复用。新环境使用现有db:local脚本时应确认空闲专属端口（TILESET_PG_PORT），初始化拒绝已有.env/.local/postgres。原装Native MZ Host、Map003(4,10)及其他延期事项见维护记录。

## 步骤06当前 Coding 候选

本轮仅实施步骤06，功能候选 `a2878a922db93c14d29e0f128bd14e6b41fc09af`，作者状态 **READY_FOR_REVIEW**。真实 PostgreSQL/不可变文件/CAS、通用 RGBA/PNG IR 与 Native Pack 历史恢复、跨进程 Mock 执行器和一致备份恢复已完成作者验证；独立 Review 与远端 CI 由 Main 安排，未写成 PASS。步骤07未启动。

[步骤06基线](docs/engineering/STEP_06_BASELINE.md)、[Coding 报告](docs/reviews/step-06-coding.md)、[脱敏命令及哈希](docs/evidence/step-06/coding/commands.json)。工程 Build `step06-a2878a922db9-5f73046cf5c7dfac`，完整检查230/230、真实 DB 套件10/10、旧 API3/3、开发/生产浏览器各1/1、冷入口步骤05子集37/37通过。八套 Pack 的56 payload 与批准步骤05哈希一致；原生核心3600检查属于 CPU 对照，新 MZ GUI/游戏及 Original Native Host 未执行。旧授权、Review、延期证据和 plans 保留。

本 Worktree 专属 PG55466/API4366/Web5266；凭据、DB、资产、备份/失败现场仅在 .local/.env。新增测试进入明确 test:step06 与 CI，实际恢复必须新空数据库和不存在的独立资产根，禁止 reset 或覆盖已有环境。

步骤06第1轮正式独立结果为 **REQUIRES_REVISION**（3阻断P2、1非阻断P3），原记录保留。当前整改候选 `debcce716e5b563eec881eb24eaa41aebcccac30` 已完成作者复测，状态最多 **READY_FOR_REVIEW / SELF_TESTED_PENDING_ROUND2**；下次为正式第2轮，尚未发布或启动07。详情见 [第1轮整改 Coding 报告](docs/reviews/step-06-fix-round-1-coding.md)与 [整改证据](docs/evidence/step-06/fix-round1/commands.json)。原 a2878a9 作者检查点为历史结果，不是独立PASS。

步骤06第2轮正式独立结果仍为 **REQUIRES_REVISION**：IR-002/003/004独立CLOSED，嵌套gate lifetime与真实PG目录大小写别名两个阻断P2继续整改。作者新冻结候选 `c227f8c6ecfe85895937013e4687deb40247a6ee` 已完成check231/231、完整DB23/23、API3/3、两浏览器各1/1、旧JS78及8套Pack56payload/16PNG哈希回归，最多 **READY_FOR_REVIEW / SELF_TESTED_PENDING_ROUND3**。原报告/失败保留，下一次正式第3/5轮；未发布、批准、merge/push或启动07。见 [第2轮整改 Coding 报告](docs/reviews/step-06-fix-round-2-coding.md)和 [新命令/hash证据](docs/evidence/step-06/fix-round2/commands.json)。
