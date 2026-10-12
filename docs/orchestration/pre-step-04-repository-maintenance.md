# 步骤04前：已复审修复发布与仓库维护

日期：2026-10-12，Asia/Shanghai。授权范围为发布既有独立PASS候选、备份及安全仓库维护；**步骤04未授权、未启动**。本记录只写已完成的发布检查点；最终文档HEAD、对应CI及后续清理实况由Git和仓库外final-receipt.json补充，避免提交SHA自引用。

## 当前源码发布检查点

| 对象 | 已核实结果 |
| --- | --- |
| 修复功能源码 | `aad1f7223baacd042f43bd6cfbba0619e822b00f` |
| Coding文档/证据 | `d8347372174721df63455dd0c6f4d3a31a6a8267` |
| 独立复审 | [联合复审PASS](../reviews/steps-02-03-global-rereview-aad1f72.md)，GR-0203-001/002 FIXED |
| 已推送main源码检查点 | `9fb02c98e89a145dfaf46a863ce7b6d29febe4b7`，实时远端读回一致，包含aad1/d834 |
| 候选CI | [38232285621](https://github.com/y805939188/rpg-maker-maker/actions/runs/38232285621)，SUCCESS，所有必要steps通过 |
| 该main CI | [38232892665](https://github.com/y805939188/rpg-maker-maker/actions/runs/38232892665)，SUCCESS，含DB3及生产/开发浏览器 |

初始主目录在codex/orchestration-02-03 / 6129b21，main和远端为784a39f；两轮Review及89个报告/证据文件尚未提交。先从784a建立独立发布分支，正常快进d834，再仅按明确路径加入两轮原文及完整脱敏证据，形成9fb02c9。没有squash/rebase、force push、改测试阈值或夹带新的功能代码。

发布时重新运行的本地门禁：frozen install、Prisma Client生成、完整`pnpm check` **144/144**、六个生产ESM导出、公开JS标量断言 **78/78**、素材样例和原型发布；88个编译文件逐字节等于已审aad候选，素材13个payload及原型4PNG等于受审产物。main快进后又执行干净build和78断言，实际asset-core JS SHA为5633830a8debb42fb460dddc194b8e88fbeb43b83979a7b12c02da5501a3a82e，避免使用旧dist。

实际GitHub权限查询显示main未设branch protection、repository rulesets为空，已有认证可push。工作流对push/pull_request执行固定工具、工程检查、真实临时PostgreSQL、隐私和两模式浏览器。仍主动等待候选CI成功后才正常推main，未修改任何保护或工作流。

## 历史保留与当前入口

[784a联合Review](../reviews/steps-02-03-global-review.md)的REQUIRES_REVISION、旧失败反证、Coding整改和最新PASS分开保留。两轮原文/证据按原字节纳入原路径，59/26文件ledger及Coding47文件ledger验真，发布差异敏感模式检查无未解释结果；未上传.env、DB、正版Runtime、依赖/cache或私有素材。

本轮后续文档整理只涉及README、需求证据映射、最终交付入口和canonical调度状态，追加当前修复发布事实；没有生产代码、正式测试、脚本、锁文件或批准规格调整/删除。旧Orchestrator分支仅有三条独有记录路径，逐项选择整合，没有合并整个旧分支。原始Review、ledger及Manifest不改写。

当前阅读顺序：本维护记录→[最新独立复审](../reviews/steps-02-03-global-rereview-aad1f72.md)→[需求映射](../engineering/V1_REQUIREMENTS_EVIDENCE.md)→[步骤02基线](../engineering/STEP_02_BASELINE.md)/[步骤03基线](../engineering/STEP_03_BASELINE.md)→保留的两份plans。9fb是已完成源码发布检查点，文档维护后的最新main/CI以Git实况为准。

## 恢复备份与处理规则

仓库外备份：`/Users/dingshinn/Desktop/rpg-maker-maker-maintenance-backups/20261012-172302/`，目录700；敏感本地材料限制600，不在GitHub。处理清单为processing-plan.json，恢复说明RESTORE.md。

- refs-and-detached.bundle包括初始refs及八个不同Worktree HEAD，已验证list-heads、独立clone和fsck，所有HEAD可恢复。
- primary-uncommitted-reviews.tar.gz保留89个原始审查文件，并逐成员SHA验读。
- 四份local-overlay归档分别保留临时Fix231、negative4、复审137、首次准备7个有价值本地文件；都重新打开逐成员SHA验读。它们不包含.git指针；tracked源由bundle恢复，再覆盖相应本地文件。
- node_modules、dist、owned pnpm-store/cache属于可依固定版本和锁文件重建的输出，不承担唯一验收角色；未把Git bundle称为所有本地文件或数据库备份。
- DB、凭据或MZ资产所在目录保留原位，不复制正在写入的DB，也不为清理做复杂迁移。

## 安全清理与保留边界

以下是已完成盘点/备份后的处理分类；真正删除必须在最终main包含需要保留内容、latest tip未变化、无活动Agent/进程、恢复验证成立后执行。实际执行结果保存于仓库外final-receipt.json及会话交付报告，不能将计划提前写为已删除。

| 对象 | 分类与依据 |
| --- | --- |
| 主要开发目录 | KEEP；安全切到最终main，保留全部合法.local/私有资产 |
| codex/orchestration-02-03（6129b21） | KEEP；独有历史操作提交，选择性整合内容不等于合并历史，不强制删除 |
| codex/step-01-mz-prototype（f004d6c） | KEEP；用户阶段01原始基线 |
| codex/step-02-coding（85fefc1）及其Worktree | KEEP；有价值DB/0600环境凭据 |
| step-02-review、global-review-784a临时目录 | KEEP；各含保留数据库/私有配置 |
| .local/independent-review-301d3cd | KEEP；MZ验收工程及地图 |
| .local/remediation/rebuild-e795bb6 | UNKNOWN_KEEP；历史重建见证，无法证明清除必要性 |
| 现有step-02-integration | KEEP；托管归属不强行处理，空闲后正常detach释放main供主目录检出 |
| global-fix、global-fix-negative、global-rereview、首次.local/global-review准备副本 | ARCHIVE候选；已结束、无私有标记/进程、源在bundle，本地覆盖归档已验读 |
| codex/fix-steps-02-03-global-review（d834737） | DELETE_SAFE_AFTER_PUBLISH；远端main包含且关联Worktree归档确认后正常-d |
| 本轮release临时分支及工作区 | DELETE_SAFE_AFTER_PUBLISH；最终main/CI和自己的输出恢复索引确认后清理 |

不批量按codex/*删除分支，不删tags、Release、Actions、PR/Issue历史；正常删除拒绝先查原因，不自动转force。生产原型、八模块、fixtures、负向测试和原始失败文档全部保留。主目录若有与已发布main逐字节相同的未跟踪Review副本，先对照外部备份和origin/main，仅处理这些重复副本，再正常switch，不能覆盖未知文件。

## 本地运行与后续边界

主要目录保留历史.local资产和数据库；干净Git检出不包含.env/凭据，启动API仍需按步骤02基线设置正确独立数据库和私有配置。当前没有复制其他Worktree的凭据或迁移历史数据；恢复依赖只做frozen install/Client生成/build，不升级工具。必要服务只关闭本轮自己启动的实例，不中断其他会话。

- Original Native MZ Host Compatibility：NOT_EXECUTED，V1.0前必要门禁，最迟步骤10。
- Map003(4,10)：PENDING_USER_EVIDENCE；地图和原证据保留。
- esbuild Windows standalone serve/servedir的既有非阻断项保持范围条件，启用前必须修复/回归；未宣称全局audit clean。
- 未来HTTP/remote图片入口须重新验收读取/metadata/pixel/CPU/并发/native memory预算，当前没有新增入口。
- Built仍仅为处理IR，targetCompilation=NOT_EXECUTED；步骤04技术READY不等于实施授权，本轮不创建或执行步骤04任务。
