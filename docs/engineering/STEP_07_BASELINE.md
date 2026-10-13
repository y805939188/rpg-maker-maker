# 步骤07 人工素材 Studio / 实际导出预览

本轮依据 [06–07授权](../orchestration/steps-06-07-authorization.md) 从已发布步骤06开始。当前是作者候选，最多 READY_FOR_REVIEW；Main 独立 Review、CI、批准及发布仍是剩余门禁。旧 plans、Profile、失败报告和阶段验收保留。步骤08–10未启动，AI显示尚未开放。

## 所有权与真实链路

Web只依赖contracts；contracts唯一维护HTTP DTO、Zod及OpenAPI。API拥有受控HTTP入口、中文工作流、Studio调度与QA汇总。新增pack-export包提取步骤05既有标准导出实现：依赖asset-core/material-processing/image-adapter/mz-compiler/pack-assembly，不依赖框架、ORM或供应商。原CLI签名仍由薄包装传入原Profile。方向、build、clean、工程收集和11个生产ESM exports先登记；生产Node只运行dist与包exports。

流程是项目→实际PNG导入→六个精确source revision/风格选择→固定岸线配方验证并采用→冻结本地StudioJob→处理/Compiler/Pack→真实八文件导出与重读→不可变固化→短事务登记Build、FinalExport及COMPLETED任务并CAS切换成功指针。任务完成与产物/指针同事务；真实PostgreSQL延期完成拒绝会整体回滚。提交后回执丢失先读真实COMPLETED记录，不把已成功发布误标失败。

继续使用Persistence、AssetStorage、WriteGate、resolveAssetRoot及公开restore。新upload仅保存真正拥有的ValidatedSource PNG，RawSource字节与RgbaImage各自独立；普通JSON不冒充source/IR/Fragment。通用domain Built仍仅IR；通用RGBA/其他动画的原公开归档/恢复继续由步骤06保留，不自动升级为MZ目标产物。

草地与水面一起更新，使用各自逻辑素材revision并保留已有logical ID/槽位。退役旧组保留依赖、绑定和像素，再使用NEVER_USED槽位建立第二组；容量不足明确失败。保存新source不改变历史，显式采用新recipe才标当前待重建。旧任务/快照仅历史，不能回退current。文件或DB失败保留上一成功；完整不可变orphan及Build中断stage保留定位，不自动GC。

## 内部四文件与标准八文件

步骤06 durable-pack/build-v1四文件原样保留，不能充当标准包。FinalExport独立记录标准八文件：A1.png、A2.png、pack.json、history.json、layout.json、sources.json、INSTALL.md、manifest.json。schema仍mz-pack-build-v1；TargetProfile完整内容封装在该Manifest中，受控profile资源返回同一内容，不新增第九文件。Profile身份为48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793。

正式预览、PNG/Manifest/Profile和ZIP均绑定同一个选定Build/FinalExport。每次交付重读核对源实际解码/重放、IR、Compiler、完整Pack历史、Layout、图集像素、所有文件SHA与清单/context一致性。原四文件旧构建可通过带Origin/custom-header的POST转换为标准包；GET只读，转换不改旧Manifest/current。ZIP严格八成员，逐文件SHA匹配所选Manifest。历史/RETIRED仍可读和下载。

## 双预览和逻辑时钟

创作区显示真正保存的原PNG、mask、bank组件、三个源水面及处理素材。源水面Pixi使用实际源PNG；交付Pixi使用真正Export的A1/A2、Manifest、完整Profile，绝不以IR、旧CPU截图或源PNG冒充最终图集。坐标/quarter唯一由Compiler提供HTTP render descriptor；槽位来自真实Export Layout，tile/时基来自具体Profile，Web不导入Compiler或复制连接表。

nearest、整数1×/2×、整数quarter坐标，交付渲染保留透明。场景有isolated、edges/内外角、holes、narrow channel、pond、large。Build/scene/group都匹配才显示画布和下载链接；切换选择取消旧descriptor请求，迟到响应不得回退页面状态。

RAF仅调度；固定60逻辑updates/秒，Profile每30次推进播放状态，序列0→1→2→1。源帧与播放状态分开呈现。pause保留位置，resume丢弃暂停时间；hidden冻结并重置调度锚点，恢复不追赶；单次可见卡顿最多计入250ms。纯clock测试覆盖30边界、多个周期及60/120/144Hz；实际浏览器验证播放、暂停、逐状态、原源Pixi像素和交付Canvas像素。

编号母版、独立手写scene形态/quarter及原创PNG作为参考；另运行pinned未修改MZ 1.10.0 native-core矩形对照。它们是技术/CPU/浏览器证据，不是新GUI、游戏或美术PASS。Compiler新增只读descriptor与邻接形态查询，原编译、Profile、布局、槽位、mask及时基规则未改；旧标准payload哈希回归另存。

## QA与验收身份

QA复用03–06硬校验，非法PNG/源/IR/Compiler/Layout/Manifest/file/hash/CAS阻止有效交付。视觉risk分别定位source-frame/素材：外边亮度差>32/255；颜色数≤4的重复/单调提示；帧间平均亮度差>24/255的flicker；RGB均值色变>16/255；可见改变<1%的几乎不动。完全不动由既有动画硬校验拒绝。阈值是有限启发式，固定岸线几何会干扰接缝指标，不给质量总分或宣称美术优秀。

STRUCTURAL_PASS、risk、人工视觉记录、Profile已有阶段基线、这份产物ARTIFACT_MZ_TESTED分别呈现。人工确认追加AcceptanceRecord并引用Export Manifest SHA，不改Manifest。作者/Reviewer截图与像素技术检查不自动写USER_CONFIRMED；本轮浏览器不点击用户美术确认按钮。本产物MZ实测仍NOT_EXECUTED，Original Native Host和旧Map003延期保持。

## 新HTTP资源政策

步骤02/03/06“无HTTP上传”的历史说明不再作为07入口豁免。仅原single RGBA8 sRGB PNG政策：4MiB、≤768×576解码平面、容器/CRC/chunk/metadata/真实像素与density校验；固定Studio源另要求96×144，密度1或2，无隐式裁切、颜色转换、metadata剥离或缩放。RGB/索引/16bit/text/EXIF/ICC/APNG等保持既有拒绝/repair-required策略。原始PNG字节不改变，mask仍须满足既有目标几何。

| 表面        | 当前预算/机制                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| JSON        | 8KiB、inflate=false、strict字段；实际body读取5s                                                                                     |
| PNG binary  | 明确专用route/MIME，4MiB、4096接收chunk、5s读取；拒绝Content-Encoding/额外query/路径/外部URL                                        |
| 请求/响应   | 总16个admitted请求；下载最多2个响应；普通受控读取12槽，不无限排队；headersTimeout5s/requestTimeout10s/keepAlive5s为Node服务配置     |
| 重处理      | 一个Studio处理槽；上传/构建繁忙立即拒绝；仅预览/资源与受保护转换允许一个等待槽，取消移出；operation/job60s                          |
| Codec       | 原一个native槽/无队列，5s隔离child；abort/SIGKILL后等待close再释放；cache=false/concurrency=1                                       |
| 内存        | child JS heap128MiB不是OS/native RSS硬上限；依据byte/pixel/metadata/进程隔离与实际入口测量控制风险，不作硬RSS承诺                   |
| 项目源      | 最多768个PNG source revisions、保守累计32MiB；历史不清理，到限明确新建项目；recipe/Pack继承既有128归档/256历史等边界                |
| 临时/不可变 | 上传读入有界内存；不通过multipart/temp middleware落未验真文件；源写失败仅清本次拥有且dev/ino仍相同的stage；完整immutable orphan保留 |

Host精确环回127.0.0.1:API_PORT；Origin精确生产同源/开发Web端口；变更另需Origin+X-Tileset-Client:local-v1，不靠CORS单独防CSRF。asset/build ID映射DB白名单与AssetStorage，资源文件名白名单，无任意server path或外部下载。Vite公开根仍只有web/contracts dist/实际node_modules，无public目录或扩展.local/全repo授权。

真实入口测试覆盖失败格式/metadata/像素/density/超量、慢读、codec deadline、断连、繁忙/并发、源open/partial失败清理和随后slot复用。最大解码平面通过真实HTTP被处理后因不合Studio源尺寸拒绝，记录child实际RSS/耗时；stalled-worker只通过测试factory注入，生产无测试route/env开关。Native heap≠RSS限制说明保留。

## 本工作树运行与复现

独占新.env/.local/postgres，PG55476/API4376/Web5276；资产.local/assets，测试/日志/恢复根.local/step07。恢复只用本集群新空tileset_ DB和不存在root，归属列表在证据；没有reset、他人.env/DB/root复用或全局MZ/NW.js/RPGReactor修改。

```sh
export PATH=/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:$PATH
pnpm install --frozen-lockfile
# 新工作树先检查专属端口，已有.env/集群绝不覆盖
TILESET_PG_PORT=55476 pnpm db:local init
# 仅配置自己新生成的.env：API4376、Web5276、asset root .local/assets
pnpm db:generate
pnpm build
pnpm db:migrate
pnpm start
# 生产入口 http://127.0.0.1:4376
# 停自己的生产服务后：pnpm dev，开发入口 http://127.0.0.1:5276
```

部署后用户只需浏览器：创建/选择项目→上传六源或原创/诊断样例→选择精确版本与风格→验证并采用配方→构建→选择实际结果→播放/检查→ZIP。修复通过替换组件的新revision、采用并重建，无DB/JSON/最终排列/server paths操作；无需key/model/Prompt。

正式验证命令：pnpm check、pnpm test:step07、pnpm test:step06（独立空regression DB/root）、pnpm test:integration、pnpm test:dev-privacy、生产/开发pnpm test:e2e、pnpm build:step07、pnpm build:pack-sample及pinned-core旧产物对照。CI加入明确test:step07和原两模式browser；文件存在不等于远端CI通过。精确source/docs/Build/hash/失败与未执行项见 [Coding报告](../reviews/step-07-coding.md)。

## 正式R1后共享路径与项目身份整改

R1/5为REQUIRES_REVISION：STEP07-R1-001阻断P2为初始化后objects祖先链接可返回同SHA根外资源；STEP07-R1-002非阻断P3为新project与旧Build/recipe瞬时混合。原报告及失败保留。最新作者source `d343171ca866a8d1d1c4e272823ef475229d8032`，最多READY_FOR_REVIEW，下一次正式2/5，未自行关闭独立问题或发布。

AssetStorage与backup/restore共享内部PathBoundary：每次I/O检查声明root、全部既存祖先与叶，拒绝链接/真实路径逃逸；实例固定已观察root及其上级目录dev/ino，拒绝同内容root移换及已绑定root消失。FileHandle的O_NOFOLLOW、fd与叶身份、前后路径身份复核配合原长度/SHA检查；Source、内部Build、标准PNG/JSON/ZIP/replay、inventory和写入共用边界。备份读/hash/copy用受检查描述符，restore输入/输出及PG工具前后检查；失败清理只处理路径仍安全且dev/ino一致的本次自有stage，否则保留定位。

合作式文件协议要求应用不在操作中重定向目录。Node没有openat目录链，前后检查及描述符针对可观察的移换，不扩大为防恶意本机管理员ABA或全部系统调用竞态承诺；SHA相同仍不能使根外读取合格。本次真实同SHA source/A1等祖先反例422、普通文件200；新增15文件边界case、坏restore父目录不写入/不登记与正常恢复再建均实际执行。

Web先要求data.projectId与当前id一致，选定Build/recipe也须在该data内；新项目数据未到时只显示加载，不请求/渲染旧素材。真实两模式browser延迟响应、旧06转换和三次反向切换验证资源成员身份，无错配请求。

原PNG/HTTP预算、父gate、独立字节/像素所有权、四/八文件区别、Profile/Compiler/Pack/时钟与视觉验收分层保持。新case进入既有check、test:step07和test:e2e/CI。冻结check253、HTTP8、PG06 23、API3、privacy5、browser3+3、生产exports11、旧56payload/16PNG、独立像素/ZIP及恢复browser通过；具体最新绑定/局限见 [R1整改报告](../reviews/step-07-fix-round-1-coding.md)。

## 正式R2后串行轮询与处理预览恢复

正式已用2/5；R2原报告REQUIRES_REVISION，STEP07-R2-001/002均为P2 BLOCKING，原报告、386证据、d343反例及b8失败完整保留。当前作者source `5d926ad7ad6a68bfaff7ea2a51d4d3859c95d7c0`，最多READY_FOR_REVIEW / SELF_TESTED_PENDING_ROUND3，下轮3/5由Main独立复审。R1路径/P3身份在R2中由Reviewer独立关闭，保持回归。

Web同项目refresh共享一个inflight请求，下一次poll在本次settle后800ms安排；project AbortController/generation及revision守卫保留，项目切换取消旧读，合法1300ms响应不会被下一次poll作废。单次项目读取60s deadline；慢成功、慢失败、快控制、迟到旧项目均通过真实browser，最大poll并发1。

ProcessedPreview按project/recipe/sourceFrame绑定fetch/AbortController，离开或切帧取消旧读、撤销Blob URL；仅成功decode的96×144 PNG发布为当前图，错误显示原因并保留同owner上次成功源帧，提供显式重读。当前交付descriptor先settle再读processed，旧06受保护转换沿原幂等入口。只对429/BUSY恢复：最多5次，总60s，250/500/1000/2000ms退避；其他格式/HTTP错误不自动重试。PNG流仍≤4MiB，检查MIME/签名、decode尺寸和字节SHA。开发StrictMode通过发送前一个microtask检查disposed setup，避免无效请求先占native槽；不改变原5秒case或服务端预算。

服务端保持总16请求、下载2、读12、处理1加等待1、codec1无队列/5s/close后释放；JSON8KiB与binary4MiB/5s读/4096chunk、metadata/density/pixel及Host/Origin/client/root边界不变。真实HTTP新增取消等待后紧接下载；两模式普通三次项目切换/三源帧、实际压力BUSY恢复/取消、坏PNG/408明确错误后重读均验证最终decoded图片、recipe身份、字节SHA及实际RGBA，正常场景无持续缺图。JS heap128MiB仍非OS/native RSS硬上限，当前最大真实HTTP平面测量为RSS106,938,368 bytes/74.171584ms，见新证据。

冻结后check263、HTTP/PG9、06 PG23、API3、privacy5、browser7+7、11生产exports、206工程payload、JS78、旧56payload/16PNG、8 pinned-core CPU、恢复实例processed实际PNG/像素/history ZIP及生产入口通过；新cases进入原check/test:step07/test:e2e明确CI命令。Profile/Compiler/Pack/slot/动画/通行、源独立所有权/public restore、内部四文件与正式八文件均不变。运行端口/启动顺序沿上文；PG55476和全部历史DB/root/backup/失败保留，不复用Reviewer或Main环境。具体source/docsSHA、Build、原失败、局限与未执行见 [R2整改Coding报告](../reviews/step-07-fix-round-2-coding.md)。
