# 步骤07 PNG原始chunk type收敛整改

**SELF_TESTED_READY_FOR_INDEPENDENT17 / STOP_WAIT_MAIN_REVIEW17**。仅修复STEP07-R16-001已证实的PNG原始type字节校验缺陷和必要回归，不扩展异常输入研究/广泛fuzz或优化。Coding不自行独立关闭finding，不approve/merge/push/publish/触发CI/写Main canonical。06 PUBLISHED，08–10 NOT_STARTED。

| 精确绑定           | 本轮值                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| worktree / branch  | `/Users/dingshinn/.codex/worktrees/step-07-main-ci-recovery/rpg-maker-maker` / `codex/step-07-main-ci-recovery`                    |
| 父Source / docs    | `abd035ac20e6c4de5d19609d932935b99851b2b0` / `e1c247aa36a8aad6120a27c0b115731bb4e8c73c`                                            |
| 最新冻结Source     | `0c3dc30b0ebb4f64373fc4b3d32501a6048fe7de`                                                                                         |
| 本轮docsHEAD       | 后续纯资料提交；完整SHA在提交后final/private progress读回绑定，避免自引用循环                                                      |
| 工程Build          | `step07-0c3dc30b0ebb-63b9289040076990`                                                                                             |
| Manifest SHA256    | `7f42de70aef9d6e4be0cb3644a18c4fec561c98330af9619f4dd30d1325069e1`                                                                 |
| 工程文件           | 208，每项live/immutable bytes/SHA重算；与父相同203项，实际变化见engineering-verification                                           |
| Profile完整SHA     | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                                                                 |
| 实际不可变Manifest | `artifacts/.step07-chunk-type-final-65bdecf9e47a4b4b9ca22f4529b1b539/artifacts/step07-0c3dc30b0ebb-63b9289040076990/manifest.json` |

按Main `step-07-focused-closeout-2026-10-15.md` 收敛本次缺陷及必要门禁；用户取消机械五轮上限但真实编号不清零。**R16=INTERRUPTED/PARTIAL，非PASS，未产生正式report/ledger**；原平台提示、原Reviewer消息和全部成果保持。未恢复旧Reviewer上下文或改变任务性质/模型规避平台检查。下一全新正式R17，不是步骤17产品实现。

实际可见客户端请求文件核对step_coder/gpt-6.1-sol/xhigh/default(Standard)、当前cwd及原CID01a132c0-f44b-75f0-bea5-7f4e5e77a6ea；最终server model/effort/tier隐藏 **UNVERIFIED_NOT_EXPOSED**。无Fast/Priority/Ultrafast/collaboration/global配置。本Coding本轮没有收到平台拒绝；若出现则应保留并停止，不绕检查。

## 反例与最小修复

只读取用户指定R16合成PNG/JSON/log证据、Main收尾授权/平台中断收据；不读他树env/DB/私有source或用户素材。原IEND高位样本821byte、CRC全合法、Chrome/Sharp解码96×144/RGBA相同，旧精确rendered在loading-finished和完整ContentLength+ERR_ABORTED两实际通道都返回成功。初期metadata样本的P3没有替代后续P2实证，R15逐CRC修复本身成立并保留。原证据逐SHA/bytes复制/索引，不补造R16正式结论。

责任确为 `png-policy.ts` 先`toString('ascii')`丢弃高位，再regex检查错误的字符串。唯一生产修复先检查原始4字节逐个属于ASCII A–Z/a–z，随后保留reserved-bit/长度边界，再解释type字符串；原CRC、order、allowed metadata、预算与编码器都不改。不重新实现PNG parser、不改合法素材规范/Profile/Compiler/槽位/时基/schema/lock/HTTP政策。

新增测试在独立旧abd clone实际运行：七个已允许chunk（IHDR/IDAT/IEND/sRGB/gAMA/cHRM/pHYs）×四位置，用独立Node native crc32对真正原始字节重算有效CRC，28个应拒断言在旧inspect失败；四IEND位置的公共decode应拒断言亦失败，合计 **32失败/4合法及reserved正控通过**。这是旧缺陷捕获，不是坏PNG或旧候选PASS。修复后该36项全部通过，合法混合大小写名与reserved-bit拒绝规则保持。

两个真实wire回归继续在精确capture bytes上验证当前完整PNG消费者：合法CRC但高位IEND仍被浏览器/Sharp解码，SHA/当前request/frame/loader/document/完整URL/200/长度/实际RGBA吻合；新消费者明确 **PNG_STRUCTURE**，而合法正控通过。旧CRC、partial/unknownlength/编码/错owner/frame/hash/iframe/newdoc/late等原回归未删，观察器整文件不改。真实HTTP上传另外四个IEND位置全部422/PNG_STRUCTURE、measurement未更新且AssetRevision数量不变；沿原代码检查在native前完成。不是伪造Response、DOM反造网络bytes或另GET补证据。

精确AST函数旧/新对照和实际wire记录另存。原before探针复用的oldSource39ec显示字面量及bad行通用VALID标签为辅助元数据错误，实际checkout/AST/package均abd；原件未改，summary明确将两坏件接受归为COUNTEREXAMPLE_NOT_PASS。after首次探针把旧函数（仍链接同一个公开包）当作旧policy，在重新构建newpolicy后按预期PNG_STRUCTURE抛错；只修ignored探针分组，正式72断言不改。所有原辅助日志/误假设保留，不当产品新问题或隐藏失败。

## 最新冻结Source全部必要实际检查

自己的正确物理artifact clone、独立依赖/本树cache、Node22.21.1/pnpm10.20.0/PG14、PG55509新空DB/root，NO.env显式配置及child-only NO_PROXY/no_proxy loopback；不改全局代理。旧用户Studio4376/PG55476不写/构建测试/停止。

| 原命令                                                                                                                                                           | scope标签                        | exit | 秒      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---- | ------- |
| `pnpm check`                                                                                                                                                     | check                            | 0    | 79.352  |
| `pnpm exec vitest run apps/api/tests/studio/received-resources.test.ts apps/api/tests/studio/received-png.test.ts packages/image-adapter/tests/png-type.test.ts` | latest-response-browser-controls | 0    | 6.43    |
| `pnpm test:integration`                                                                                                                                          | api3                             | 0    | 13.724  |
| `pnpm test:dev-privacy`                                                                                                                                          | privacy5                         | 0    | 10.716  |
| `pnpm test:step06`                                                                                                                                               | PG06-full23                      | 0    | 210.862 |
| `pnpm test:step07`                                                                                                                                               | http16                           | 0    | 479.994 |
| `pnpm test:e2e`                                                                                                                                                  | production18-noenv               | 0    | 450.844 |
| `pnpm test:e2e`                                                                                                                                                  | development18-noenv              | 0    | 458.71  |
| `pnpm build:step07`                                                                                                                                              | engineering                      | 0    | 21.164  |

check **418/418**=父380+36 raw-type+2wire，0skip；72专项=36+16wire+20PNG CRC，已包含于418，重复不相加。方向/type/lint/format/clean build/11exports，原CRC/realFS env31/strictZIP47/session、全部原断言和预算保留。

公共PNG政策改动因此本轮真正重跑 **PG06完整23/23**（原60s预算）：版本/并发/CAS/lease/late、文件/DB失败/Mock未知不重提/backup+clean restore+实际重建。没有把旧23重标当前。**HTTP16/16**包含四坏type真实上传422、普通PNG正常201、原预算/Root路径/native timeout/cancel/child close、旧c227 writer/四八文件finalize同TX、rollback/回执丢失、跨COMMIT/current/history/retired/失败last-success和restore联通。原一个180s双模式first/update/history case、5s/15s/60s/job60/terminal30均保留，无split/skip/增时限。

**production18/development18各0skip/0retry**，不同新库/root、NO.env，原真实操作/保存刷新/组件revision/采用/构建/当前历史退役/失败恢复/旧包转换、慢poll/有界错误停止/只读恢复/迟到action/list、实际PNG/Canvas像素/nearest/clock与ZIP均执行。6个实际标准ZIP独立双目录/CRC/安全8成员/Manifest七payloadSHA/fullProfile/Source，全部PNG chunk CRC、原始type ASCII及Pillow12张768×576 RGBA重读，history bytes同first；合法产物与父实际payload/PNG像素对照见证据。工程所有208项重算，实际变化为 `apps/api/dist/resources/studio.json, dist/tests/png-type-samples.d.ts, dist/tests/png-type-samples.js, packages/image-adapter/dist/png-policy.js, packages/image-adapter/dist/png-policy.js.map`；不强说205项不变或改旧Manifest加PASS。

## 范围、资源和停止

Source仅五路径（一个最小生产检查＋必要fixture/core/wire/HTTP回归）。现有root tsconfig包含tests/**/*.ts，因此新合成fixture额外输出JS/dts两项；工程实际208，未删除生成物凑206。无新库/依赖、没有生产编码器/Atlas布局/包槽位/动画/通行或支持目标变化；通用Built仅IR、源bytes/pixels独立拥有/public restore、Root/ancestor/File hash、短TX/CAS/历史retired、四/八文件与Source/Compiler/Profile绑定保持。JSheap不是OS/native RSS硬cap。

结束自启API4409/Web5309/browser/native辅助均关闭，ownPG55509由Main正常启动PID4200，原18库及本轮所有新库、资产、backup、cache、旧失败/合成坏件保留；不reset/drop已有数据、不copy别人env、不读API/model密钥，own.env0600仅必要DB配置/扫描在RAM。Main/Reviewer/release/用户运行工作树与canonical未写。目录/服务归属数量见resources-final。

本轮未重做03–05整步或MZ手工、专门24scene/4creative/12+12clock/旧56payload16PNG/JS78/nativeCPU8全测量；明确NOT_RERUN_THIS_ROUND，不拿旧PASS替当前。实际技术view_image不等于用户艺术或具体artifact MZ实测，原Host/Map003延期保留。无真实视觉模型/SDK/API/key/PromptRegistry/Composer/router/AI/费用/Redis/SaaS/globalMZ/NW/Reactor；08–10 NOT_STARTED。

**STEP07-R16-001仅SELF_TESTED_PENDING_INDEPENDENT17**；最新独立wholePASS、full候选CI、正常Main合并/postmerge/push/readback/mainCI成功与正式PUBLISHED仍由Main处理，Coding未执行/未批准。原16中断和Main旧CI失败/未知当次取消原因不回填PASS。当前已证实PNG缺陷和必要预算验证结束后停止扩展。

Source后纯资料commit仅此报告和脱敏合成PNG/ZIP/JSON/log/静态probe文本，无运行/CI执行影响。ledger逐root-relativeSHA/bytes、原件指针/用途，排除自指；own DSN/password只RAM扫描，env/ownership全值/dump/license runtime/敏感trace不公开。准确docsHEAD/report/ledger SHA提交后final/progress绑定。**STOP_WAIT_MAIN_REVIEW17**。
