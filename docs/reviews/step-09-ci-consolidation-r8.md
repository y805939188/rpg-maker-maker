# 步骤09 CI整体预算：限定独立R8记录

2026-10-19。原序列唯一集中整改后的独立R8结论 **PASS_LIMITED_CI_GATES**；P0=0、P1=0、当前硬契约P2=0。Main只转录原Reviewer报告及绑定，不以作者/Main自查替代独立确认。本结论不批准新候选CI、Merge/Push或发布。

基线 `6dac43c391a8b924f8ed7b65335dca1802b7ce6d` → 冻结source `7254dfe93ba72976dd0e593f00582c30de01ed5c`，唯一执行差异 `.github/workflows/ci.yml`。作者文档HEAD `ff5d44b4841123094275e858f8649642e7845148` 仅另增[Coding报告](step-09-ci-consolidation-r8-coding.md)。独立新工作树开始/结束tracked clean，10,018个tracked文件SHA未改；Reviewer未改正式实现/测试、作者树或全局配置，未派生Agent。

配置step_reviewer/gpt-6.1-sol/ultra/实际CLI显式default(Standard)，未见Fast/Priority/Ultrafast；服务端隐藏字段 **UNVERIFIED**。Node22.21.1/pnpm10.20.0/frozen锁、Playwright1.64.0/Chromium1248（156.0.8078.4）匹配。

| 独立验证                                    | 实际结果                                                       |
| ------------------------------------------- | -------------------------------------------------------------- |
| YAML与28段原始run的bash语法/覆盖映射        | PASS，无重复key；原core命令与顺序保留                          |
| 执行原baseline shell的36组合                | 仅双success exit0；失败/取消/跳过/空值/缺失均拒绝              |
| 执行原空输出检查                            | 1正控、6负控通过，拒绝旧root/API/Web/package dist及两种receipt |
| 新自有真实PG数据库                          | 初始public表0；7迁移及每条SQL checksum匹配；浏览器前Project0   |
| 原冷dev:prepare                             | 23.230s外层，内部21.925s，244输出，无core/旧worktree产物       |
| 原dev:start+observer+两项原Studio浏览器场景 | 2/2，95.408s/39.329s，0重试/skip；其余16项未选择，不冒称18     |
| 全仓Prettier、diff、最终输入/输出/源码审计  | PASS；244输出仍匹配冻结SHA，源码逐字节未变                     |

两浏览器场景实际验证上传/revision、8组独立像素比较、逻辑时钟、实际PNG/Manifest/ZIP、替换/历史下载、退役/失败保护，以及延迟项目切换/旧四文件导出转换。历史ZIP逐字节相同，新库留下3项目/5 Build/5 FinalExport/5 Job。服务取得本轮API/Vite监听证明后经原HTTP门禁就绪，实际4459ms，保持30000ms；prepare120000ms与其它原期限未改。

Reviewer确认：core40分钟与development20分钟在独立runner/真实PG/DB/资产/TMP/cache上执行；无core到dev的dist/receipt/数据库传输或缓存。产品构建仍core完整prepare一组+dev冷prepare一组。最终baseline2分钟严格needs两者并always执行，原required-context名称只出现一次，只有双success放行。配置关键路径约42分钟不含runner排队，不是实测提速或可靠性保证；两runner工具安装开销如实保留。development直接Prisma CLI与公共wrapper内部命令/schema相同，目标为固定合法环回新库；真正启动仍经过原配置、资源、数据库和监听归属验证。

原[CI39263767830](https://github.com/y805939188/rpg-maker-maker/actions/runs/39263767830)所有测试step成功（453、API3、06=23、07=17、08=3、双18、prepared7、startup26），但官方注释确认45分钟超限，整体 **cancelled** 保留，不能按成功放行。新source完整Linux三job、完整开发18、实际并行时长/排队未执行，由Main后续实际确认；R7/R5/R6/T-R按未变范围复用，旧startup/R4细因仍UNVERIFIED，不重审01–09、不执行MZ/保留集。

设置偏差保留：缓存安装曾增加本树一个共享Chromium登记，已仅删除该自有新登记，工具二进制SHA及其他登记未变；另一次私有注记漏import已只修该注记，正式测试未失败或重跑。自有PG55639/API49339/Vite4519已关闭，DB/资产/输出/证据保留，4398/55529原PID/地址未变；预算/素材/Manifest/H02-A/MZ未改，新增真实素材AI调用0。

原始报告与verdict在独立R8工作树 `.local/step09-ci-consolidation-review-r8/`，绝对入口由Main ignored回执保存。报告SHA256 `d7c3dd194278b67ca2d96df3b9c3edab2d1d4063bf00f10a3c5dd723c9f091f0`；verdict SHA256 `9cb694f5a49f56e77ff9efe50d17b4dc3d2068db8af7dc64b8af63d5c5442db1`；workflow SHA256 `591af43d3d0c95e99bfe3dfce52a573bd406262079750b313d4c08c332a6889f`。输出清单SHA256 `93700fdb76ade9465d237e4be73f37090ad1a74b5344cb6f95d74dfa9f0dda5e`。本轮固定复核已结束，不自动开R9或扩大整改；发布门禁见[canonical交接](../orchestration/step-09-release.md)。**STEP_10 = NOT_STARTED**。
