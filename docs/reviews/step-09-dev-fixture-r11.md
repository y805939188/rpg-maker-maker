# 步骤09 开发fixture限定独立确认 R11

2026-10-20，Asia/Shanghai。独立结论 **PASS_LIMITED_DEV_FIXTURE**，P0=0、P1=0、当前硬契约P2=0。Main只转录独立结果，不以自查代替Review，不把限定PASS等同于完整候选或main CI。

基线main `802ac69d6219d849d23b67fda7e422595e497952`；执行source **`88a7a067e82aaecd93ce323e04d91fbc8cfcca86`**；冻结doc HEAD `252943e5472d8fee329baf59498b7a4ac828b80e`。仅ownership E2E准备生命周期/有限诊断及workflow失败产物step执行变化，source后只有[Coding报告](step-09-dev-fixture-coding.md)。原生step_reviewer / gpt-6.1-sol / ultra / 显式default(Standard)可见配置已核对，隐藏服务端字段UNVERIFIED，无Fast/Priority/Ultrafast、递归派生或全局配置更改。

## 根因与独立对照

独立安装的固定Playwright1.64.0实际代码证明：每个beforeAll有自己的project.timeout slot，matcher取父deadline减250ms与自身poll deadline的较早者。原一个默认30秒hook串行承担PNG和两个完整项目；第二terminal虽写30秒，仍被父剩余时间剪短。正文中的120秒尚未生效，原503标签下正文0ms。旧CI第二job的精确年龄、阶段和当时耗时成因仍UNKNOWN，旧trace未上传/未取回，不从本轮模拟补写。

R11用独立PG/资产/浏览器、两份私有副本，在同一“首个setup起点24秒释放destination”边界作真实构建对照。正式源码、业务方法及原数值期限未改，调度等待只用于诊断，不进入修复代码：

| 独立对照         | 旧共享hook                        | 修复后独立hook                                           |
| ---------------- | --------------------------------- | -------------------------------------------------------- |
| destination释放  | 24001.843ms                       | 24002.433ms                                              |
| hook耗时         | 共享29731.987ms后失败             | PNG1.179 / 来源8866.252 / 目标23707.531ms，各守原30000ms |
| 整体setup        | 29732.008ms失败                   | 32592.023ms完成，超过旧共享30秒但各hook均未超限          |
| 第二任务终态观察 | RUNNING，提交响应后3150ms即被截断 | COMPLETED，提交响应后5845ms                              |
| 结果             | 预期1项FAIL，正文0ms，37.019s     | 1项PASS，55.387s                                         |

时钟是从HTTP提交响应起观察，不是DB createdAt年龄，也不是旧CI第二Job实际耗时。每项控制各一次、无重试。旧控制失败DB、文件、JSON、trace/error-context保留，teardown后状态另记，不冒充取消前业务故障或旧CI trace。已证明预算归属缺陷；没有机器慢/PG卡死、永久稳定或提速结论。

## 必要独立验证

原始正式文件一次 **6/6 PASS**，185.125秒，flaky/skip/unexpected均0。503/429/network恢复、迟到上传/配方采用、综合错误/构建/修复记录/创建项目均执行原真实PG、Build/Export、历史与浏览器PNG像素断言。六项正文逐字节相同，完整收集仍18项/5文件；其它12项留给完整CI，不记作本地full18通过。

PNG、来源项目、目标项目分开准备，每项目独占原默认30秒；terminal30秒仍受本项目hook剩余期限剪裁，不承诺所有poll都获完整30秒。各case原120/180秒、Build60秒、服务30秒、prepare120秒、job40/20/2分钟、workers1/retries0、production timeout:null均保持。产品/Schema/Compiler/Profile/Pixel Contract/素材/锁和依赖未变。

固定actionlint1.7.12真实完整workflow检查PASS（6.940秒），相关tsc/Lint、全仓Prettier、冻结及工作树diff检查PASS。除新增上传step外workflow对象相同，严格needs/always双success汇总及所有原测试步骤不变。官方upload-artifact v4.6.2 tag、固定commit及action.yml输入均已独立核对；只允许明确合成JSON、trace/error-context路径，hidden仅配合这些路径，不含whole.local/env/DB/用户素材，缺文件error、保留7天、无continue-on-error。**成功时可选failure证据step应SKIPPED，必需测试不能跳过。实际GitHub上传尚未触发，不能宣称运行接收已验证。**

诊断最多64条，独立正式run实际20条，白名单仅role/phase/单调时间/合成UUID/job/state；无env、key、argv、HTTP body、DB URL或敏感路径，原异常照常抛出。三份自有新库的七迁移、所有登记FileObject/Export的SHA与字节、只读属性及244准备输出/源码工具链绑定均通过；失败和未完成记录不reset/drop。正式库3项目/6Build/6Export，118份文件保留，LogicalTask/AiConversion均0。

## 冻结证据与后续门禁

原始报告：`/Users/dingshinn/.codex/worktrees/step-09-independent-review-r11-dev-fixture/rpg-maker-maker/.local/step09-dev-fixture-review-r11/report.md`，SHA256 **`e5f6cc05ad9da99e20a0fe3d1310e87c123ba25ed2202673416f50b09920ddfa`**；同目录verdict.json **`d239fa6ceec8093802e49d507791895b1f04a18c7b2a00152671a657e4db0076`**。本轮独立负控trace SHA **`0e39c4d6b1979388135ba8e9aff6df6c1f2cd9c187bb4753a80b3e85a7f13bac`**；不是旧CI trace。完整命令、控制diff/时钟、框架源码、文件引用和清理证据均留原目录。

workflow SHA256 `d8a56e44463386dd6854ed548fdc834319d0b44136043d399bf84c18aeabae7b`；ownership源 `4a0e254cfd9e4d63a720f22826d0ee6cfdada1f6120156584481af8c6a0d4544`。冻结树10,026个tracked文件SHA逐项未变；只停止本轮PG55669/API49369/Web4549及私有Chrome，端口/锁/记录PID均释放，DB/资产/cache/失败trace保留。未操作4398/PG55529、Provider/env.local/预算/验收Manifest/旧素材/MZ/H02，新增素材AI调用0。

R2功能/T01/R01及R5–R10仅按未变范围复用，不全审01–09或重做MZ/美术。Review封存时新候选CI未执行，Main还须冻结后取得完整core/development/baseline和开发18项SUCCESS，才可按用户预授权记录APPROVED_BY_PREAUTHORIZED_ORCHESTRATOR、正常合并本轮新分支/Push并等完整main CI与三处SHA一致。真实最终SHA/CI只写ignored回执和会话，不追加自引用文档提交。正式数值质量口径待单独确认；**STEP_10 = NOT_STARTED**。
