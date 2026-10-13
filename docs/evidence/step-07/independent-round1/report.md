# 步骤07正式独立审查 — 第1轮 / 5

2026-10-13，Asia/Shanghai。结论：**REQUIRES_REVISION**。P0：0；P1：0；阻断P2：1；非阻断P3：1。必要工程、HTTP/PG、两模式浏览器及06–07恢复连接验证已执行；资源读取的祖先 symlink 逃逸违反本轮硬边界，不能技术放行。正式轮次为1/5，未因探针纠正而重置。

本报告是独立技术 Review，不是用户美术确认、具体新产物 MZ 实测、Main 阶段批准或发布。没有修改生产源码/正式测试/Main/Coding目录或canonical调度状态，没有commit/merge/push、自行批准或启动08–10。

## 冻结身份与独立性

| 对象                         | 精确值                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------ |
| 功能候选                     | `4f6a40f3e8be990b4068dafee488249be737f7ad`                                     |
| 作者文档HEAD                 | `82a356879cf490283572afc9fb49f8734cf5eb90`                                     |
| 作者报告SHA256               | `638c9574ae553fd5a904260c14f4ab18df6b6fba7b30b11ebe781945d2beeb44`             |
| 作者ledger SHA256            | `57e0e1793aee111d884731b88e49534bae7dd50736118edb4430968f1e846063`             |
| 工程Build                    | `step07-4f6a40f3e8be-1c608f824716442d`                                         |
| 工程Manifest SHA256          | `72219bf929f1a1ed8315b90670cca1ab502ae9a9bb18617e56fccdcefb4b9ec0`             |
| Profile身份                  | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`             |
| 独立浏览器首个DB Build       | `e4c961978f29755c34c880ac0246b324010a0097a500db8301f61f903740108f`             |
| 同一标准Export BuildIdentity | `step05-pack-4f6a40f3e8be-be019c51c91c079a`                                    |
| 同一Export Manifest SHA256   | `dadfb6ded8cc1dfc74756364533319f67b1e03fcc96f0c30f45c8bd63d1b06b7`             |
| 同一标准ZIP SHA256           | `565ab31ec96983fd4776e2ff1f62acf3e74b1ad2c55d3e4b4f202cae555ae969`             |
| 审查根                       | `/Users/dingshinn/.codex/worktrees/step-07-independent-review/rpg-maker-maker` |

客户端收据核对 `step_reviewer / gpt-6.1-sol / ultra / default`，thread `01a13389-eae7-78e3-853b-21e5ca18df2f`、cwd、步骤07与round1一致。[收据](evidence/client-configuration.json)。不可见服务端最终model/effort/tier为 **UNVERIFIED_NOT_EXPOSED**。没有collaboration调度、Priority/Fast/Ultrafast、模型覆盖或全局配置改动。

开始与结束HEAD精确4f，Git clean。保护全部1,939个tracked文件，覆盖源码、正式tests、fixtures、运行资源、配置、锁、Profile、plans及历史证据；逐文件前后SHA全部相同。生产build/客户端生成只产生ignored输出。作者docs通过git show读取，未检出覆盖源码；145个差异仅README/docs。203个fresh生产payload与作者最新工程Manifest全部匹配，独立重算工程BuildIdentity及Manifest SHA成功，开发模式构建之后仍匹配。[版本绑定](evidence/version-binding.json)、[工程SHA](evidence/engineering-verification.json)、[前保护](evidence/source-before.json)、[后保护](evidence/source-after.json)。

旧82ba“no Studio”元数据问题已在4f的单文件9增1删修正，当前note准确描述人工Studio，身份含manual-studio、standardExport、PNG HTTP与clock契约。旧工程未借用为本轮Build，当前无该项OPEN问题；元数据修复没有Compiler/Profile或MZ语义影响。

完整阅读AGENTS、两份正式plans、MZ_RUNTIME_ENVIRONMENT、STEP03–07当前基线、最新需求映射、06–07授权、Coding报告/ledger/失败记录、步骤06最终R3 PASS与发布记录；Main canonical仅只读，checkout旧state作为历史快照。按07及跨模块实质差异审查，没有重开05全Review/MZ手工。

作者140项入库证据逐项git show/SHA匹配；18项私有原失败日志也在作者root只读验真，全部仍存在且原SHA匹配。未复制作者.env、DB或资产。作者238check、7HTTP、23PG、browser/native等仍只属于作者执行，不代替以下本轮执行。[作者ledger审计](evidence/author-ledger-audit.json)、[原失败保留审计](evidence/author-original-failures-audit.json)。原测试预算和母版未放宽或重置。

## OPEN问题

### STEP07-R1-001 — P2，BLOCKING：资源读取沿祖先symlink逃出声明资产根

- 冻结位置：`packages/persistence/src/storage.ts:72–76`；新HTTP消费处 `apps/api/src/studio-service.ts:799–819`。`AssetStorage.read()`只lstat完整叶路径，未检查root→objects的祖先；lstat会穿过中间symlink。initialize的早期检查不能约束之后的读取。
- 对应规格：产品§13.2 local-first路径边界；STEP07“DB白名单与AssetStorage、无任意server path”；本轮明确的“读取资产ID映射不得穿越/symlink逃逸”。按本轮硬契约判阻断，未把既有合作式文件协议扩大成防恶意本机管理员承诺。
- 触发：仅在本实例恢复资产根，把一份已保存、SHA完全相同的测试对象复制到本review下的根外目录；保留原objects目录，再让objects成为指向该目录的symlink。通过真实HTTP、合法项目/source或Build/file ID读取。所有注入及恢复只涉及本轮自己的.local数据；原目录/文件按原inode保留并恢复，注入链接和拷贝也保留。
- 实际：source PNG返回200且字节与原对象相同，realpath已位于declared asset root外；标准Export的A1 PNG入口也返回200。叶文件本身换成symlink时返回422，正常文件返回200，说明缺口位于祖先检查。
- 预期：祖先symlink或真实路径越出声明根时拒绝读取；普通合法源/Export继续可读。当前编码SHA仍防止返回不同字节，**本探针不证明任意私有文件泄露或HTTP自身能创建symlink**；证明的是明确禁止的根外读取被接受。
- 复现证据：[source公共入口](evidence/symlink-read.json)、[A1公共入口](evidence/symlink-export.json)、[独立探针](evidence/probes/symlink-read.mjs.txt)、[Export探针](evidence/probes/symlink-export.mjs.txt)。脚本输出成功表示反例被捕获，不能记作边界PASS。
- 最小整改：在共享AssetStorage读取/Build读取边界检查真实根身份、每个既存祖先及叶文件，拒绝symlink/escape并保持SHA/长度核对；对新HTTP源、Export PNG与合法普通文件加必要回归。只检查最后文件或只在首次initialize检查不足；避免修改Profile、PNG政策、历史产物或通过禁用合法读取绕过。

### STEP07-R1-002 — P3，NON_BLOCKING：项目切换短暂发出旧Build/recipe与新project组合请求

- 冻结位置：`apps/web/src/App.tsx:60–106`、`:441–446`。id切换的effect清理与依赖id/build的preview effect，以及processed img，能在一次切换中看到新id和旧build/recipe/data。
- 对应规格：产品§4.1项目选择、§4.4实际选定产物预览；07项目/Build资源身份应一致。责任为Web选择状态协调，非Compiler、Pack或后端资源映射。
- 触发：真实恢复实例中，选择旧06转换后的项目，再选择人工Studio项目，反向切换后再次选择。无需内部JSON/DB修改或故障注入。
- 实际：GET `/projects/<new>/builds/<old>/preview` 404、`/projects/<new>/recipes/<old>/processed` 422；旧06首次转换后UI data尚未刷新Export标记时还曾发出错配POST export，后端404拒绝。错误诊断给出不相干的素材修复建议。普通稳定读取随后恢复为合法选定Build与96px处理预览，没有错误持久化、current回滚或下载错包。
- 预期：新项目尚未取得自己的data/selection时不发出混合身份请求，显示加载状态；转换POST只使用同一项目的Build。
- 复现证据：[三次普通项目切换及响应正文](evidence/browser-followup/evidence.json)、[首次恢复转换后的错配POST](evidence/restored-browser/evidence.json)。同一followup验证稳定处理图片naturalWidth=96，并继续完成真实canvas时钟/像素验证。
- 最小整改：请求和渲染前要求`data.projectId === id`并核对选定Build/recipe属于该data，或原子切换project与其选择状态。后端白名单拒绝有效，所以该问题本轮不阻断；不扩大为UI风格整改循环。

## 本轮执行与环境

Main只准备owned新PG及frozen install，未计为本轮测试。本人重新执行frozen install/generate/check/build/migrate并核对ownership.root/PG端口/data_directory。Node PATH每条命令固定 `/Users/dingshinn/.nvm/versions/node/v22.21.1/bin`，Node22.21.1、pnpm10.20.0、PG14.20。PG55477/API4377/Web5277；原.env600，只属于本checkout。回归DB另新建并迁移，恢复另用明确新空DB和不存在的`.local/step07-review/restored-assets`。没有init/reset或共享可写其他实例。

正式DB/browser config/tests未修改，从review内formal-workspace运行相同测试，源码/dist/node_modules仅链接当前候选，自己的.local承载输出。初次check/privacy产生的本轮ignored固定目录完整移入private保存。pnpm build只产生构建目录；样例Pack出版在review内pack-workspace。凭据、dump、数据库、资产、故障stage/orphan与原始日志保留私有.local；脱敏日志/公开探针在evidence。[命令明细](evidence/commands.jsonl)、[执行差错/归属](evidence/execution-notes.json)、[PG归属](evidence/environment.json)。

| 命令/动作                                                                                                         | 本轮真实结果                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` / `pnpm db:generate`                                                             | exit0；独立重跑，未更新依赖                                                                                                                                          |
| `pnpm check`                                                                                                      | exit0；24文件238/238，方向/Strict/lint/format/clean build/11生产ESM exports                                                                                          |
| `pnpm db:migrate`                                                                                                 | exit0；owned空tileset_studio应用全部5项迁移，无reset                                                                                                                 |
| formal cwd：`node ../../../node_modules/vitest/vitest.mjs run --config ../../../vitest.step07.config.ts --root .` | exit0；7/7，157.66s，真实HTTP/PG、codec/读超时/cancel/cleanup、标准Export、延期COMMIT、完整restore                                                                   |
| 同cwd，同Vitest命令改step06 config                                                                                | exit0；4文件23/23，185.54s；新独立回归DB/root；原60000ms预算保持                                                                                                     |
| `INTEGRATION_API_PORT=4377 pnpm exec vitest run --config vitest.integration.config.ts`                            | exit0；真实API/DB 3/3                                                                                                                                                |
| `pnpm exec vitest run apps/web/tests/dev-privacy.test.ts`                                                         | exit0；真实Vite私有路径/Origin/包装/symlink保护5/5                                                                                                                   |
| formal cwd：`node ../../../node_modules/@playwright/test/cli.js test --config ../playwright.config.mjs`           | exit0；生产2/2；仅本review config改输出/端口/trace，正式test源码不改                                                                                                 |
| 同命令加`E2E_MODE=dev`                                                                                            | exit0；开发2/2；实际新执行，未借作者两模式记录                                                                                                                       |
| `node .../browser.mjs`、独立Python参考、`browser-followup.mjs`                                                    | 人工六PNG导入、交互、下载、24scene states＋4source states、2×nearest、12+12实际时钟canvas样本均独立通过；P3请求另列                                                  |
| `public-http.mjs`串行控制                                                                                         | 有效/失败上传、同字节不同component ID、未知字段/路径/URL、Host/Origin/client、真实延期COMMIT整体rollback、有界等待取消后紧接download、GET只读与cross-project拒绝通过 |
| `recovery.mjs` + `restored-browser.mjs`                                                                           | 真pg_dump/新空DB+文件restore；真实旧06模块写四文件Build、恢复后Studio合法POST转换/预览/ZIP、新Build界面重建、旧history ZIP不变                                       |
| `interruption.mjs` + `interruption-after.mjs`                                                                     | 实际已接受Studio任务后只SIGKILL自己的API；重启恢复FAILED/INTERRUPTED；上次成功canvas/ZIP不变                                                                         |
| `node .../legacy.mjs`                                                                                             | exit0；原公开JS 78/78，经生产包exports；原脚本保留与新执行分开                                                                                                       |
| review pack cwd：原`dist/scripts/build-pack-sample.js`                                                            | exit0；8套标准包/16PNG；56 payload SHA与批准05完全相同                                                                                                               |
| fresh工程检查                                                                                                     | 203/203 SHA，BuildIdentity及Manifest SHA独立重算匹配；未出版到根artifacts                                                                                            |
| symlink source/Export probes                                                                                      | 捕获ROOT_ESCAPE反例；属边界FAIL，见阻断P2                                                                                                                            |

所有普通/CI测试未触发真实视觉模型。计数不相加为独立覆盖率。正式套件全部首次运行通过；自己的探针导入/locator/Response属性及隔离pack Git cwd错误只改自己探针，原失败保留。另一次与独立backup并行的公共控制初建返回FAILED，未计正常构建PASS；原日志和数据库保留，完整原因为UNVERIFIED，后续新项目串行同一控制通过。没有把该次失败覆盖或声称已经定位修复，失败也未登记有效新成功产物。

## 真实预览、标准下载与逻辑时间

独立browser通过项目创建→刷新读DB→失败PNG中文诊断→逐一人工上传六个合法PNG→精确revision/基线风格→采用固定配方→实际任务→真实Export→历史/组件新revision/重建/退休/容量失败完整流程。常规用户路径只用UI，没有编辑内部JSON/DB/路径/最终图集、点击人工美术确认或启用AI。单组件替换保持身份，受影响水草配套重建，旧成功/history/retired准确，失败不提供有效新产物。

预览实际网络响应A1/A2、Manifest和Profile保存，四份初始/更新/history/失败后下载用Python真实ZIP解压与CRC验真：精确8个安全相对文件名，无重复/额外成员；每项bytes/SHA、canonical BuildIdentity、Profile身份、Manifest引用与网络字节一致。完整Profile嵌入Manifest，profile资源返回相同内容，未虚构第九文件。独立首个768×576完整图集含透明保留区域由原PNG及字面量槽坐标重建，逐像素一致。[初始浏览器网络/操作/console/pageError/download](evidence/browser/evidence.json)、[独立像素/ZIP](evidence/browser-pixel-zip-verification.json)。

Python参考使用独立手写邻接quarter坐标、场景occupancy、原始PNG与二值mask/overlay合成，先与保留原创水面母版核对；不调用生产Compiler/scene renderer/descriptor生成expected，也不使用旧CPU截图。孤立格、边角、孔洞、窄通道、池塘、大片共24状态实际canvas逐字节一致；创作源四状态符合真正源PNG的2×nearest。换实际Build后A1网络身份与真实canvas像素改变，旧ZIP仍原字节；迟到旧descriptor没有回滚新选择。2×完整canvas等于独立nearest扩大，不引入新颜色/平滑。

RAF只作可控制的浏览器调度：实际canvas样本覆盖29/30、59/60、89/90、119/120、239/240、359/360共三周期，源与交付像素各12组均与独立参考一致。60逻辑updates/s、30次/状态、0→1→2→1；播放、暂停、恢复、step与隐藏visibilitychange冻结/恢复锚点控制有效。隐藏政策通过浏览器受控document.hidden/visibilitychange执行，未冒充OS后台窗口实测。纯clock正式测试还覆盖不同刷新率及250ms卡顿上限。[时钟canvas对照](evidence/clock-canvas-verification.json)、[实际采样](evidence/browser-followup/evidence.json)。

实际用view_image查看关键截图/画布：六组件创作、处理素材、源动画、交付边角、孔洞、窄通道、失败保留成功、旧06转换、恢复中断原因、update60 canvas。查看文件与SHA在[查看收据](evidence/screenshots-viewed.json)。技术像素/截图通过没有写成USER_CONFIRMED，也没有改Manifest验收状态。

## 06–07整合与跨模块影响

pack-export提取保留CLI薄包装签名、正式八文件及源→处理→Compiler→Pack重放；Web仅contracts，新增成员方向/clean/build/export登记与生产JS通过。Compiler新增只读shape/rectangle descriptor，原规则、布局、Profile、动画和通行语义未改。image-adapter新增abort经child close才释放native槽；HTTP提供1处理+1等待有界预算，取消旧preview/queued请求后真实download通过，未产生ADAPTER_BUSY有效新产物。stdio重读/存储/QA硬校验保持；source与IR/Compiler-owned对象仍分层。

HTTP保持RGBA8/sRGB、4MiB、768×576解码平面上限、Studio96×144、密度1/2、metadata/container/pixel/CRC限制及原5s隔离deadline；失败/repair-required不默默转换。正式入口最大平面及actual RSS记录在[本轮HTTP测量](evidence/formal-http/largest-http-decoded-plane.json)。JS heap128MiB不是native/OS RSS硬上限，现说明诚实；未提高旧native资源预算。慢读、断连、codec deadline、清理自有stage、普通有效控制已执行；ROOT_ESCAPE尚未满足硬边界。

新StudioJob/Build/FinalExport/current同短事务的真实延期COMMIT拒绝在正式套件及独立HTTP控制均整体rollback；恢复后有效构建成功，最近成功未丢失。06真实故障、反向完成、租约父链/事务fence、Mock重启和backup/restore 23项回归通过。独立恢复还持有真实known/unknown Mock远端两个记录，新Executor recover不增submit；known查询同ID完成，unknown保持SUBMISSION_UNKNOWN；迟到归档不采用current。

旧06 fixture由git show已发布c227的六个真实Persistence模块在自身.local转译并执行，使用未改变的领域/Compiler/Pack依赖，产生真实四文件Build；不是改JSON字符串伪造旧产物。新一致备份→新空DB/root恢复后Studio选择该旧Build，合法POST追加标准Export。之前GET preview/download409且DB不写；坏Origin/缺client POST403；转换后老内部Manifest、Build/current、Pack/Slot历史完全不变。实际恢复browser读源/recipe/current/history并重建，再真SIGKILL/restart验证中断恢复。[整合](evidence/integrated-recovery.json)、[转换/恢复浏览器](evidence/restored-browser/evidence.json)、[四个恢复ZIP](evidence/restored-zip-verification.json)、[中断](evidence/interruption-after.json)。内部四文件从未称作标准八文件。

QA结构、视觉risk、人工视觉、Profile已有阶段基线与具体产物MZ分开。低动画、接缝/重复/亮度色变/闪烁分别有定位与阈值局限，不以总分声称美术质量；全部本次产物MZ仍NOT_EXECUTED。旧56 payload/16PNG和完整pixel回归支持外围变更范围，未发现需改变已批准Compiler/Profile语义的实现夹带。

## 未执行与结束门禁

本轮新的MZ GUI/手绘/游戏/Original Native Host、旧Map003补证、用户亲自美术、RPGReactor、8套pinned-core CPU oracle、远端CI、真实视觉模型/SDK/Key/Prompt生产体系为 **NOT_EXECUTED**。既有05阶段观察/06 R3发布事实只在原范围引用，不升级为每份新Build实机通过；外围07不机械重做05全手工。08/09/10未启动。

最终API4377/Web5277均无listener，仅关闭本轮自启服务；Main准备的本树owned PG55477及所有自己的DB/私有备份、stage/orphan、原日志、样例和恢复现场保留，没有shutdown未知服务或删除其他会话成果。canonical state没有写入。

报告只对自身文件使用项目Prettier `--ignore-path /dev/null --write`后hash。最终报告SHA与evidence逐文件SHA见[evidence/ledger.json](evidence/ledger.json)，明确相对根`.local/step07-review`；progress在`progress.json`。阻断STEP07-R1-001整改、重新冻结并按影响独立复核前，不能PASS。技术PASS的含义仅为Main既有委托的技术浏览器验收门禁，仍不表示用户逐图艺术/MZ亲自确认。本轮审查结束并停止。
