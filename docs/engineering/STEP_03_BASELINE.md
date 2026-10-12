# 步骤 03 领域素材与确定性处理

本步只建立源图片到引擎无关 Tile IR 的处理链路。正式 MZ Compiler、Fragment、槽位分配、Pack、持久化资产/任务、Studio 上传和供应商调用仍未实现。步骤 01 原型、Profile、Pixel Contract、母版和旧产物保持历史基线；新的处理样例不是 MZ 图集。

## 模块与不可变所有权

| 模块                | 职责                                                                                                               | 允许依赖                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| asset-core          | Source Asset、Material/Surface/Transition/Style、revision、通用 Animation Clip、硬 IR 校验、历史构建与当前采用版本 | 仅 Node 标准 crypto；不依赖图像库、框架、ORM、DOM、Provider 或 MZ |
| material-processing | 整数裁切、复制、最近邻、线性 sRGB 合成、二值遮罩、固定岸线配方到 IR                                                | asset-core；没有 Sharp/Node I/O                                   |
| image-adapter       | 有界 PNG 字节流、容器/元数据检查、隔离解码/编码                                                                    | asset-core、Sharp、Node 子进程；不依赖领域处理器或应用            |

八个工作区全部登记在方向检查中；新增未登记成员使检查失败。根原型 `src` 仍禁止反向导入正式包；根开发依赖中的三个 workspace 链接供样例 CLI 通过正式包导出使用。Web 仍只依赖 HTTP contracts，API 的现有项目链路保持原样。构建按依赖顺序生成 JS 和声明；清理、生产 Node export 验证、工程产物收集覆盖三个新包。CI 原有 `pnpm check` 会自动执行新增包测试，再运行旧 DB/API/浏览器门禁；CI 文件存在不是远端执行证据。

`RawSource` 拷贝字节及 provenance，身份绑定 encoded SHA、角色、编码、逻辑密度、来源和父版本。`RgbaImage` 私有存储像素，所有取出方法返回副本；输入 Buffer 及共享视图均不能改变历史像素。JSON revision 深拷贝并冻结，稳定键序形成 SHA-256 身份，禁止隐式 Date/BigInt/undefined/类对象。追加式 revision catalog 不提供替换或删除方法。它是领域元数据模型，不是步骤 06 的资产持久化或文件恢复证明。

## 源与 IR 硬校验

状态依次为 `RAW_SOURCE`、`VALIDATED_SOURCE`、`COMPILABLE_RECIPE`、`BUILT_ARTIFACT`。创建 Raw 不宣称图片已合格；适配器实际解码后才能创建具备来源身份、像素哈希及 validationHash 的 validated source。通用 RGBA 入口核对 raw 字节和像素；PNG 的实际解码由明确的基础设施入口承担。ValidatedSource 的运行时所有权登记避免普通对象仅改状态字符串进入配方。

工作平面固定 RGBA8、sRGB、非预乘 Alpha；A=0 必须 RGB=0。尺寸/长度/像素数、整数半开裁切坐标、越界、逻辑密度分块一致性随源和输出校验。48px Tile 与密度 2 是不同概念，没有从 pHYs、图片尺寸或浏览器 DPI 自动推导密度。裁切和复制保持 Alpha；复制先建立完整来源快照，包含不同 Buffer 视图共享内存的情况。整数放大最近邻不产生新颜色；改变目标尺寸须明确 `nearest-explicit`，结果需作为新 Raw revision 再验证，不能静默改源。半透明 source-over 在线性 sRGB 计算非预乘值，最后一次取整/clamp，A=0 写零 RGB。

Tile IR 用显式 geometry/semantic regions 描述中心、边、内外角与像素平面；没有 MZ numeric Tile ID、quarter 连接表、Fragment 放置约束或槽位。区域必须整数、合法、不重叠且完全覆盖模板，源/帧尺寸和逻辑密度必须匹配。IR 保留 static mask；校验固定岸线像素跨帧一致、动态内部实际变化、所有语义引用属于精确依赖、帧数与通用 clip 对应、输出不透明、内容哈希自洽。普通 Animation Clip 支持有界任意源帧数、序列、逐状态时长、updates/milliseconds 和循环/不循环；后续 Native Compiler 才负责拒绝不兼容目标的帧语义。

固定 `opaque-water-owned-baked-grass-bank-v1` 配方显式绑定 grass、各 water source、白色静态 bank mask、独立 bank detail overlay、style、参数及 recipe 的确切 revision/hash。overlay 保留草色区域透明，并表达固定沙岸/暗水边；禁止其改动 mask 外的动态区域。草地/水面必须不透明，二值 mask 必须同时具有静态区和内部区；bank detail 先与绑定草地按明确合成规则组合，再以同一 mask 写入所有水帧。源和合成后颜色均须属于该 style palette。任何尺寸、角色、版本、Alpha、遮罩、调色板或帧问题以具体 AssetError 诊断拒绝，不能得到 Compilable。

领域 Built 是这份已校验处理 IR 的不可变快照，artifactHash 绑定 IR；`targetCompilation=NOT_EXECUTED`。它不证明正式 Compiler、目标 PNG、MZ 手绘、视觉或游戏测试已通过。

## 版本语义

`newerAvailable` 只报告 catalog 中的新 revision；`currentMismatches/needsRebuild` 只比较显式项目采用记录与该派生构建的依赖；`historicalValidity` 核对历史精确依赖及不可变 IR。创建 grass@4 不修改引用 grass@3 的源、recipe 或 Build K。只有 `adoptRevision` 显式切换当前采用记录后，受影响的当前派生结果才待重建；其他项目与旧采用快照保持不变。按旧 recipe 重跑仍产生原 IR/hash。该领域机制不代替步骤 06 的数据库 CAS、并发发布和真实文件恢复。

## PNG 入口与实际资源边界

仅 `ingestPng` 的 AsyncIterable 字节入口和 owned RawSource 被接受；没有 HTTP 上传、远端下载或任意服务器路径参数。当前新入口仍只接收单图 RGBA8 PNG，不实现任意媒体转换。非 PNG、CRC 错误、ICC/HDR/非 sRGB gamma/chromaticity、APNG、容器损坏、越界及隐藏 RGB 明确拒绝。RGB/灰度/索引/16bit，以及 EXIF/文本/其他不支持 ancillary metadata 返回 `repair-required`，要求显式新源 revision；本步不执行隐式转换、自动方向旋转或 metadata 删除。旧步骤 01 入口仍可解码无害 EXIF；该历史行为及其四个测试未更改。

新入口在 native codec 前检查 signature、完整 chunk 边界/CRC/顺序/重复、IHDR 原编码与解码像素预算。只允许 IHDR/IDAT/IEND、冻结 sRGB/gAMA/cHRM 以及 9-byte pHYs。pHYs 仅为物理显示 metadata，不影响显式 logical density；压缩 text、ICC 和 EXIF 不进入 native metadata parser，故不依赖其扩展后的体积检查来限制文本膨胀。

| 资源     | 实际策略与限制                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| 编码数据 | ≤4 MiB；流在存储每个 chunk 前核对总量；超额 chunk 不复制或继续拉取                                                 |
| 流       | 单个读槽，无队列；最多 4096 非空 chunk、5s 总 read deadline；超时请求 iterator.return，不等待不响应取消的 producer |
| PNG      | 最多 4096 chunk、64 KiB 非 IDAT 数据、≤768×576 总像素；全部 native 前检查                                          |
| 工作像素 | RGBA 长度严格 width×height×4，单平面≤1,769,472 bytes；配方输入像素总量≤16 MiB                                      |
| Codec    | 独立短生命周期 Node child；进程级一个 native 槽，无保留队列；Sharp cache=false、concurrency=1                      |
| 时间/CPU | 每个 child 5s deadline，SIGKILL 后等待 close 再释放槽；CRC 扫描受编码总量和 chunk 数约束                           |
| 内存     | child JS heap 128 MiB；native 内存无 OS 硬 RSS 上限，依据输入/像素/metadata 限制、独立进程和实测记录管理风险       |

字节调用方/producer 可能在交付前已经分配内存；本包只能限制自己保留和复制的数据，不能宣称控制外部 producer。短生命周期 child、缓存关闭、有界像素和 deadline 是本步的隔离政策；128 MiB heap 不是 libvips 的 native RSS 上限。实测记录 actual RSS、最大合法普通输入和耗时，不能仅凭 Sharp 0.35.5/libvips 8.18.7 或四张黄金 PNG 推导任意媒体安全。未来 HTTP/remote ingress 必须另行承担连接、请求读取、并发和归档预算。

## 命令、样例与证据

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm check
pnpm test:step03
pnpm test:dev-privacy
pnpm db:migrate
pnpm test:integration
pnpm test:e2e
E2E_MODE=dev pnpm test:e2e
```

使用 root 明确分配的 owned PostgreSQL 55432 和 API4314/Web5176；私有凭据只载入进程，不写入仓库、命令日志或产物。没有初始化或修改全局集群，也未改其他工作树数据。

先提交干净候选，然后 `pnpm build:step03` 出版 `step03-*` 工程构建，`pnpm build:material-sample` 出版 `step03-material-*`，`pnpm prototype` 出版新的步骤 01 回归构建。每份唯一 manifest 绑定 clean commit、锁文件、Profile/契约、实际 codec、逐文件 SHA，重复发布拒绝。小型 material sample 从独立手写 JSON 源构造 PNG，走真实 decoder→source→recipe→IR，保存原始源 PNG、处理 PNG、IR JSON、revision/provenance；不是正式 MZ 交付。测试期望由手工字节、独立 PNG wire encoder 和独立 JSON 选择数组给出，未使用生产函数生成 expected。

正式 candidate、完整命令/hash、最大平面测量、开发/生产/cold 浏览器结果及原型四 PNG/外部 oracle 见 [步骤 03 Coding 报告](../reviews/step-03-coding.md)。Independent Review 未完成不得写 PASS；MZ 原装 Host 与新增 GUI/游戏/视觉验收仍为 NOT_EXECUTED，Map003(4,10) 保持 PENDING_USER_EVIDENCE。当前 scoped esbuild Windows standalone serve+servedir 未引入，修复版本升级仍在该表面开放前由 engineering 承担。
