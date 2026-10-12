# 步骤 04 正式 MZ 单素材 Compiler / Fragment Contract

本轮用户于 2026-10-12 明确授权当前会话自行 Coding、测试、构建、验收准备与本地提交。基线 `fc407198eefad9336ba97fb9482bdd832ca78f83`。旧步骤停止文字保留历史效力；本轮不继承 Review、Merge、Push 权限，不启动步骤 05。

## 输入与目标兼容

`compileFragment(unknown, category)` 接收步骤 03 `TileIR`，先复用 `immutableTileIR/validateTileIR` 的硬校验和所有权快照。普通 JSON 不能以状态字符串冒充拥有像素的 IR。源身份、标量、密度、Alpha、依赖闭包、哈希、静态岸线及动态变化沿用 asset-core；不更改 Built 的 `targetCompilation=NOT_EXECUTED`。

通用合法性与目标兼容分别报告。当前目标继承 `src/profile.ts` 的 `mz-native-ground-water / 1.0.0-candidate.1`：MZ 1.10.0，Area，48 Tile / 24 quarter，96×144 源，A2 普通草地及 A1 Block D 普通水面；1px 方向诊断或 2px 美术密度，无隐式缩放。水面仅三源帧、updates、loop=true、序列 [0,1,2,1]、各状态 30 updates。A2 编译只要求草地目标兼容，不将水面时基限制施加于静态片段。

IR 现有区域名称足以承载方向，无新增通用字段。Native 输入要求 24 个具名 24×24 区域，全部覆盖源；每个区域名称/角色由下列目标表确定。源区域可以移动和重排，Compiler 依名称复制到相对 MZ 布局，不能根据大小猜语义。名字或角色不足的通用合法 IR 报目标不兼容。

| 目标 quarter 行 | 从左至右的区域名称                                       | 角色                                       |
| --------------- | -------------------------------------------------------- | ------------------------------------------ |
| 0               | representative-nw, representative-ne, inner-nw, inner-ne | center, center, inner-corner, inner-corner |
| 1               | representative-sw, representative-se, inner-sw, inner-se | center, center, inner-corner, inner-corner |
| 2               | outer-nw, north-w, north-e, outer-ne                     | outer-corner, edge, edge, outer-corner     |
| 3               | west-n, center-nw, center-ne, east-n                     | edge, center, center, edge                 |
| 4               | west-s, center-sw, center-se, east-s                     | edge, center, center, edge                 |
| 5               | outer-sw, south-w, south-e, outer-se                     | outer-corner, edge, edge, outer-corner     |

水面继承 `opaque-water-owned-baked-grass-bank-v1` 的已创作固定 mask。按区域重排后的 mask 像素 SHA-256 必须为 `2ab33dc7a3e6a56f7cb786192613351376f086faf117839e627ee0b7a2f9b422`（原 `art-static-bank-mask.png` 解码像素）。本步不接受新的岸线几何；颜色由具体源与配方确定。该约束在目标层，通用配方继续允许其他合法 mask。

## Compiled Fragment v1

`mz-compiled-fragment-v1` 包含目标 Profile ID/version、Compiler version、类别 `a2-ground` / `a1-water`、source（IR hash、material ID、精确 components/recipe/parameters/dependencies、density）、拥有的 `RgbaImage`、布局、放置约束和 contentHash。

内部布局：草地 96×144 一帧，水面 288×144，三个 96×144 源帧水平排列，相对偏移 0/96/192；播放映射独立为 [0,1,2,1]。placement 只表达槽位类别、占用尺寸和 96×144 对齐，允许 kind 约束为 A2 [16,17] / A1 [4,6]，不含整张图集绝对坐标、选定 kind、Tile ID 或剩余空槽选择。内容 SHA 绑定全部元数据和像素 SHA。构造时复制元数据与像素，所有 byte/pixel getter 返回副本，调用方不能改变已交付身份。

`validateFragment(unknown)` 重新检查所有实际类型、布局/放置/身份，并只接受本模块拥有的片段；普通对象/JSON 不得伪造完成状态。`renderShape(fragment, shape, updateCount)` 从实际片段取 quarter 输出 48×48，连接索引 0–46 与代表图 47 分开；updates 必须非负 safe integer。不依赖墙钟刷新率。

错误为 `CompilationError`：`boundary=ir|target|fragment` 和稳定 `code`。通用 AssetError 保留原 code，以 ir boundary 标明；非法对象为 IR_INPUT；目标类别、尺寸、密度、语义区域、岸线及动画分别为 MZ_CATEGORY/MZ_GEOMETRY/MZ_DENSITY/MZ_REGIONS/MZ_SHORELINE/MZ_ANIMATION。不静默删帧、重排 clip、换时间或修改输入。

## 工程与验收边界

`mz-compiler → asset-core`，无文件 I/O、codec、框架、供应商或数据库。根诊断 CLI 可依赖三个步骤 03 包和 Compiler；固定布局读取旧 Profile 的四个实验坐标，仅将已验证 Fragment 放进去。未来 Pack 唯一拥有生产分配。新成员须登记方向、构建/clean/exports/工程收集；JS 与声明由真实 package exports 导出。

规则源为旧 Profile、原生核心 `4ad828ae...ff67f` 与独立 fixture。实现包含语义 quarter 重排、片段冻结/哈希与目标 shape 渲染；一致性测试检查旧 Profile 和 mask 不漂移。独立预期由手写 quarter 编号、方向标记和原美术 PNG 给出，不用 Compiler 生成 expected。

当前执行结果与完整 SHA/Build ID 另存 [Coding 报告](../reviews/step-04-coding.md)。状态为 READY_FOR_REVIEW（Coding 完成后），整体步骤尚未 APPROVED。独立 Review 为 NOT_EXECUTED_BY_DESIGN；新产物 MZ GUI/游戏/视觉门禁待实际执行。原装 Host NOT_EXECUTED、Map003(4,10) PENDING_USER_EVIDENCE 均保留。native codec 仍无 OS/native RSS 硬上限，本步未新增图片入口。
