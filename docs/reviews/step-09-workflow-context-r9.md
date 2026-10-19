# 步骤09 workflow上下文限定独立确认 R9

2026-10-19，America/Chicago。独立结论 **PASS_LIMITED_WORKFLOW_CONTEXT**，P0=0、P1=0、当前硬契约P2=0。Main转录独立结果，不以Main自查替代Review，不把本报告写成完整候选CI或发布成功。

受审基线`6678f0021ed454014987d158f98aea56322e3796`，执行source **`3c2d405ecb9ce3e8d69ef325cf6213991ad5f7a8`**，冻结文档HEAD `aa9e5555a8ca45b0bcbffc5f2e91e0e77efb8a8b`。三执行文件为workflow、固定校验入口和package的一个命令；source后仅报告，产品与全部原测试未变。参见[Coding](step-09-workflow-context-coding.md)。

角色是原序列step_reviewer / gpt-6.1-sol / ultra / default(Standard)，本机原生CLI显式参数及实际turn context已核对；隐藏服务端字段UNVERIFIED，无全局配置更改或递归派生。独立冻结树位于项目.local之外，只写自己的输出，没有改实现、正式测试或作者树。

## 独立检查结果

| 检查                                                                  | 结果                                                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 独立下载、验SHA后经`node scripts/check-workflows.mjs`校验完整workflow | PASS，exit0，5.080秒；actionlint1.7.12                                                         |
| 临时副本仅恢复原四处非法job.env表达式，同一入口                       | 预期exit1，准确四条runner context不可用；tracked文件未变                                       |
| 两个原初始化正文、后续模拟step读取环境                                | 两正控通过：含空格RUNNER_TEMP、目录存在、env精确、core/development不重叠、sentinel和父环境不变 |
| 两job缺失/空RUNNER_TEMP或GITHUB_ENV                                   | 八负控均拒绝，无错误目录或环境写入                                                             |
| 忽略选项、损坏归档、缺失workflow                                      | 均拒绝；真实非零状态传播，专属解压目录清理                                                     |
| 还原允许变化后workflow/package对象等价                                | PASS；baseline整体、测试列表、数据库/资产隔离、来源绑定、原超时和锁/Action版本未变             |
| Node语法与受审/工作区diff检查                                         | PASS；10,022个tracked文件SHA结束逐项相同                                                       |

两平台官方asset ID、发布manifest、API digest与独立archive SHA一致；Darwin实际运行1.7.12，Linux下载/ELF/hash核对，实际Linux执行留给完整CI。固定下载/解压/校验期限，无自动重试、规则关闭、global install或业务依赖升级。actionlint本机可选ShellCheck/Pyflakes集成未执行，未用禁用参数，CI存在工具时照常执行。

四处非法job.env删除，在原早期step用运行时RUNNER_TEMP mkdir，经GITHUB_ENV传递TMPDIR/XDG_CACHE_HOME，缺失变量在mkdir前拒绝。两job同一checker位于Node安装之后、依赖和构建测试之前。CI自检无法挽救job创建前的非法workflow，因此本地语义检查是必要门禁；Main另在Push前实际运行`pnpm check:workflows`通过，831ms。

## 原遗漏、证据与发布边界

旧CI [39276281752](https://github.com/y805939188/rpg-maker-maker/actions/runs/39276281752) 保持failure/零job；四条平台诊断保留。R7/R8未发现GitHub context可用性错误，原有限PASS不覆盖该阻断。两原报告SHA仍分别为`1eae406b85201acfc0b2145b42dfc8a64ff63e9835f35cf67d3db4f8e7d04281`和`d7c3dd194278b67ca2d96df3b9c3edab2d1d4063bf00f10a3c5dd723c9f091f0`，原字节和结论未追改。旧45分钟cancelled与旧startup/R4细因UNVERIFIED同样保留。

原始独立报告：`/Users/dingshinn/.codex/worktrees/step-09-independent-review-r9-workflow-context/rpg-maker-maker/.local/step09-workflow-context-review-r9/report.md`，SHA256 **`4e0be31fb9eb27c199b52e05e56caaf1ed98fe9b72ebaaa69c22ff810329136d`**。同目录verdict.json SHA256 **`713d46ba74c65f78d0045e609f19725525b3d39dc1003ba9606b564ac2fde40d`**；保留实际命令、正反日志和自有临时资源清理记录。Reviewer私有准备脚本曾因预期文件排序写错退出，修正该私有自检后执行；未修改实现求绿。

workflow SHA256 `9070131793598f06f9e0a4c5d8817e251280bf3e548cd7e543f1e451a2633e1e`，checker `0dae0eec6805c0e43cc55538991c998bd63fec7208fd5a0b13ae68a4fffde430`。Main在最终候选前整理本文与canonical交接，核对后续差异仅文档、全仓格式与diff；完整候选和main CI及远端结果另写ignored回执，不追加自引用提交。

R2功能、R5/R6/R7/R8及T01/R01只按未变范围复用。本轮无产品全审、全量本地业务、性能、MZ或保留集运行。Reviewer未启动服务或接触4398/PG55529、DB/预算/旧资产/密钥；新增AI调用0。只有完整候选core/development/baseline均实际success后Main才按用户预授权放行正常合并Push，并等待完整main CI和三处SHA一致。正式质量数值待另行确认，**STEP_10 = NOT_STARTED**。
