# AI Tileset Studio 步骤06–07交付报告

2026-10-15（Asia/Shanghai）。**步骤06=PUBLISHED；步骤07=PUBLISHED；08/09/10=NOT_STARTED；WORKFLOW=STOPPED_AFTER_STEP_07。** 最新功能已独立通过、候选与代码main完整CI均SUCCESS，正常合并/合并后回归/push/readback完成，本地可手工测试。唯一调度入口为 [canonical](steps-06-07-state.json)。旧阻断版本和所有失败在Git历史及独立证据中保留。

## 步骤06保持已发布

[正式发布记录](step-06-release.md)：功能 `c227f8c6ecfe85895937013e4687deb40247a6ee`，作者docs `89f15cbb3d560584043128235014e230f982c2c8`，第三轮独立PASS；Build `step06-c227f8c6ecfe-2408d70aa6a8d040`，Manifest `f69ca0afbb95a5bf78d7bdeeada7af798f9e3f6352b339532646bc152a2cde1c`。候选CI38326156800和正常main `10de5624b82d8ada843d4c377d3e155c55610bcb` 的CI38328263937均SUCCESS，本次不重新开发或重复发布06。

PostgreSQL保存项目采用版本、不可变素材revision/精确依赖、处理结果、Pack/槽位/历史、项目/构建快照、任务/attempt/externalID/归档与验收引用。文件先暂存校验、哈希固化，随后短事务登记并CAS更新当前成功指针；文件或DB失败保留上一成功，迟到只入历史。恢复通过公共领域/像素/Fragment/Pack构造与重放校验，不以JSON状态断言伪造拥有对象，退休依赖和旧快照不变。

Mock覆盖先存提交意图、同externalID重启查询、SUBMISSION_UNKNOWN不重购、远端成功仅重试归档、重复完成、取消语义与冻结输入。原完整备份/干净恢复后重建证据有效；当前07作者、独立17和候选CI又各实际运行PG完整23回归。内部四文件持久化载体与标准八文件交付分层。

## 步骤07实际功能与最新技术门禁

工作台可创建/选择并刷新恢复项目，导入六个合格PNG或原创样例，选择风格/精确revision，验证并采用固定草地—水面岸线配方，构建、查看任务/错误/恢复提示，替换组件重建、选择当前/历史并下载标准包。无需手工改DB、JSON、最终排列、内部路径或填写模型密钥。AI明确尚未开放。

创作预览读取实际源、遮罩、岸线与处理素材；交付预览使用所选真实Export的A1/A2、Manifest和完整Profile。播放/暂停/逐状态、孤立格/边角/孔洞/窄通道/池塘/大片铺设、nearest整数缩放均验证。逻辑60update/s、Profile每30次推进、源序列0→1→2→1；暂停/隐藏冻结、恢复不追赶。结构硬校验、有限视觉风险、用户美术确认和具体产物MZ记录分开。

新HTTP入口执行真实RGBA8/sRGB PNG、4MiB/4096chunks/5s、metadata/type/逐chunkCRC/解码像素/密度及96×144源要求；JSON8KiB、admission16/read12/download2/heavy1+wait1/native1/5s/close后释放、Host/Origin/写请求client保护、opaque ID/路径/Vite私有根边界保持。不提供任意本地路径或远程URL下载。JS heap128MiB仍非OS/native RSS硬cap。

| 最新冻结交付 | 绑定 |
| --- | --- |
| 功能Source | `0c3dc30b0ebb4f64373fc4b3d32501a6048fe7de` |
| 作者纯资料HEAD | `fa7f562efe58ddd2ee4912b64a3ad6e5cb84de67` |
| 作者报告 / ledger | [Coding](../reviews/step-07-chunk-type-coding.md)，SHA `3d39d1350116e9197782abb0c51310be08129c2f173a0ea150d7df077404b57d`；ledger `06815c6ef2daf6325fd60f7bd98ef66e886359fb933e354ffb7044106d319661`，222 payload |
| 工程Build / Manifest | `step07-0c3dc30b0ebb-63b9289040076990` / `7f42de70aef9d6e4be0cb3644a18c4fec561c98330af9619f4dd30d1325069e1` |
| 工程文件 | 实际208，203同父版本；PNG政策JS/map、Source绑定元数据变化；新增测试fixture JS/dts两项，未删文件凑旧206 |
| Profile | 完整SHA `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793` |
| 最终完整独立Review | [第17轮PASS](../reviews/step-07-independent-round-17.md)，P0/P1/硬阻P2及开放非阻断均0 |
| 原正式报告 / ledger | [report](../evidence/step-07/independent-round17/report.md) SHA `98c93672028cfb3565a0dc27eac0625604f266f886921db17a4e0fab39a09b23`；[ledger](../evidence/step-07/independent-round17/evidence/ledger.json) SHA `1285e8e6e3fe3f1c19b5d8c406c601647b31a76a028889f2c26a6d186dfc6189`，203原payload已由Main验真保存 |

正式Review实际共17轮，未清零。R4完整三项为：重复existing发布缺FinalExport仍完成Job导致409；无关action使唯一列表响应失效导致空侧栏；多次DB读跨COMMIT混合指针/Build/Export/Job。R5通过Export与需交付Job同短事务、列表独立generation、有界只读RepeatableRead元数据快照修复，后续最新回归保持关闭。

R15发现必需PNG消费者漏CRC；R16又确认raw type先ASCII解码丢高位，IEND可被完整消费者接受。当前source复用严格PNG消费检查，并在解释字符串前校验原始4字节，保留reserved-bit/CRC/order/metadata/预算。旧32拒绝断言失败与合法控制、新inspect/decode/真实HTTP422/native前/双网络通道拒绝、合法正控都有证据，独立17正式关闭R15-001和R16-001。**R16保留INTERRUPTED/PARTIAL，没有伪造其report/ledger/PASS。** 原平台提示保留，本轮新修复候选正常独立17无平台拒绝。

| 验证范围 | 作者 / 独立17 / 候选CI8 | 合并后本地 |
| --- | --- | --- |
| check（类型/方向/lint/format/cleanbuild/11exports） | 418 / 418 / 418 | 418 |
| 真实PG持久化/Mock/故障/备份恢复 | 23 / 23 / 23 | 复用相同执行代码的三次完整证据，未假报再次跑23；mainCI仍全套 |
| HTTP07完整发布/恢复/跨COMMIT | 16 / 16 / 16 | 选2项：真实上传容器/预算＋双模式first/update/history发布；14项未选，不称完整16 |
| API / 隐私 | 3+5 / 3+5 / 3+5 | 3+5 |
| 生产 / 开发浏览器 | 18+18 / 18+18 / 18+18，均零skip/retry | 选1项完整生产人工工作流；其余17未选，不称完整18 |
| 独立交付连接 | 6ZIP、12PNG、16RawCanvas、4条DB文件任务引用链 | 合并后工作流再次核对实际预览/历史/ZIP |

所有必要断言和预算保留，未禁用CI或删除测试。合并后首次浏览器选择命令因锚点匹配完整标题而No tests found、0测试执行；原exit1/log保留，只修选择并证明确选1项后补跑PASS，源码/预算不变且已通过检查未重跑。[合并后真实范围收据](../evidence/orchestration-06-07/step07-final-postmerge-verification.json)。

Coding为sol/xhigh/default，独立17为sol/ultra/default，实际native model/effort/cwd核对；未暴露的server final字段UNVERIFIED_NOT_EXPOSED。未使用Fast/Priority/Ultrafast接口承担正式工作。原批准与失败不追改，结构/有限风险/技术截图不变为USER_ART或新artifactMZ PASS。

## 正常Git发布与当前运行

候选 `4cb718aceabcd772b234d86e9d2c0d9f74eda2be` 在[CI38683352144](https://github.com/y805939188/rpg-maker-maker/actions/runs/38683352144)全SUCCESS后，按用户预授权记录 **APPROVED_BY_PREAUTHORIZED_ORCHESTRATOR**，不是用户逐轮亲自重审。fetch/liveMain guard后normal no-ff合并 `e6d785e1d34afeceac05522f6176592d522762e0`，0冲突/执行差异，实际合并后回归通过；随后3条纯资料差异，normal push `04e979612cfc82c7c2b5687fbb83509c995213b7`，local/origin/live当次读回一致，未force/rewind。[正常merge](../evidence/orchestration-06-07/step07-forward-main-merge.json)、[push/readback](../evidence/orchestration-06-07/step07-forward-main-push-and-readback.json)。

**完整main CI38686901060已真实SUCCESS。** [对应main CI](https://github.com/y805939188/rpg-maker-maker/actions/runs/38686901060)。旧main CI38586177993 FAILURE是旧Source BD的真实历史，未改成PASS。[正式发布收据](../evidence/orchestration-06-07/step07-publication.json)绑定实际主分支CI、原日志SHA/bytes和全部门禁。最后一条纯证据文档提交的SHA、远端读回及其CI在最终会话实测核对，避免把文件自己的SHA反复写回自己；本文件不预写未来push/CI成功。

本地手工入口：**http://127.0.0.1:4376**，[操作清单](../engineering/STEP_07_MANUAL_TESTING.md)。运行树 `/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker`，软件/构建Source为受审候选祖先 `4cb718aceabcd772b234d86e9d2c0d9f74eda2be`，已经包含于main04e且执行代码相同，编译Source值如实保留。API PID46324、专属PG55476（数据`.local/postgres/data`），资产`.local/assets`、私有`.env`0600均保留。服务当前运行；不承诺Desktop关闭后自动后台持续。

部署时先确认无运行Job，正常停自己的API，取得PG custom dump与2479个资产文件一致视图并逐SHA验证、pg_restore --list验证；再更新/构建/启动，未执行schema迁移/reset。部署前后115 Project/947 AssetRevision/179 Build/177 FinalExport/184 StudioJob、Project完整行摘要及env字节一致。之后用户手工创建/更新属于正常数据变化，不把该部署快照当永远不变计数。[部署收据](../evidence/orchestration-06-07/step07-local-reviewed-candidate-deployment.json)。

完整私有备份另存主仓库 `.local/runtime-backups/runtime-backup-20261015T050237Z-9e1333b9`，避免仅依赖临时工作树；dump/资产/manifest私有，不上传，不复制env/凭据。运行树已Git worktree lock防Git误清理（不声称防任意OS删除）。[备份保全](../evidence/orchestration-06-07/step07-runtime-backup-retention.json)。此运行备份仅声称一致保存/字节及可读性验证；干净恢复实际重建的技术证据为上面的PG23，不伪称已恢复过这份用户备份。

服务停止后，在运行树使用已有Node22.21.1 PATH；先核归属，已停止的专属PG可 `pnpm db:local start`，然后 `pnpm start`。已运行不重复启动；既有.env/数据库不可init/reset，不复制别树私有配置，正常工作流不需要第三方视觉模型密钥。

## 资源保留与边界

本轮Code PG55509/31库、Review17 PG55515/13库、fresh Release PG55517/2库均已正常停止，API/Web/browser辅助关闭，env/DB/资产/备份/cache/失败保留，用户Studio4376/PG55476继续运行。未删除含独有数据的工作树；冻结分支codex/step-07-validation与codex/step-07-main-ci-recovery完整tip已包含远端main，暂留作手工反馈和CI/Review定位，未提前记删除；工作区保留独有ignored数据，未强制archive。[保留核对](../evidence/orchestration-06-07/step07-closeout-resource-retention.json)。

旧发布验证路径`step-07-release/rpg-maker-maker`在准备整合前实际已不存在，Git分支保留、app登记为旧条目；原因UNKNOWN，本轮没有删除该路径，也不假称旧私有DB已恢复。采用新的`step-07-release-final/rpg-maker-maker`隔离环境，未重建/覆盖旧目录。原历史收据保留。[观察记录](../evidence/orchestration-06-07/step07-old-release-directory-observation.json)。

原装Native Host、Map003补证、新具体产物MZ/用户艺术等原延期或NOT_EXECUTED保留；03–05兼容规格/Compiler/Profile/布局/槽位/动画/通行未改变，本轮不机械重做MZ手工。普通构建、CI、测试没有真实视觉调用；08–10 NOT_STARTED，正式Provider/主Prompt体系/预算与密钥留以后单独授权。本轮仅完成人工素材工作台与持久化基础，不宣称AI创作或完整V1.0完成。
