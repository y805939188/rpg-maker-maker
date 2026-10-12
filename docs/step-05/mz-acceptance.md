# 步骤 05 首次安装与旧地图更新验收

本轮 Coding 只准备材料；步骤05编辑器/游戏/视觉验收均 NOT_EXECUTED，独立Review NOT_EXECUTED_BY_DESIGN。受测commit、Build ID、逐文件SHA、suite/ZIP/准备工程路径以 Coding 报告及 evidence 的 builds/delivery 为准。不要原地修改Manifest添加验收PASS。

先阅读 [运行环境](../engineering/MZ_RUNTIME_ENVIRONMENT.md)。记录编辑器、原生核心SHA、Pixi、Host/NW.js/Chromium/Node/架构与插件。原生核心1.10.0 SHA `4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f`；Native Core＋Modified NW.js、Original Native Host、RPGReactor结果分别记录。原装Host仍按既有授权延期至步骤10，不免除本次Pack的实际安装与更新验证。不得执行全局初始化/Runtime替换。

## A：首次安装

使用新suite的 incremental-v2；它包含两套明显不同配色的草地/水面。首次把A1.png/A2.png以固定新名字复制到一个新MZ测试工程的img/tilesets，数据库注册新Tileset，Area Type（mode1）/48px，A1/A2分别选择对应图。其余页空，B左上空项☆；ground kind16/17 所有形态○（flags0），water kind4/6所有形态×（低4bit15），无Star/Counter/Bush。未占用槽位不能当有效素材绘制。岸上的草色像素仍属水格碰撞。

核对Manifest和layout：a-ground→A2 kind16 (0,0)，b-ground→kind17 (96,0)，a-water→A1 kind4 (384,0)，b-water→kind6 (384,144)。A页每行8格，水1/2在第一行第5/7格，草1/2在第三行第1/2格。每组水仅配套相应草地，不任意跨组混搭。

每组分别铺草、画单格水、矩形池塘、孔洞、直边、内外角、一格宽L通道、对角触点和大面。正常画笔、不按Shift，扩展/涂回/撤销再画，保存实际Map JSON与SHA、数据库及地图截图。游戏不按Ctrl穿透，检查草可走/水不能进入；至少两个周期观察0→1→2→1，岸线固定。CPU全47连接形态+代表47对照不是正常手绘或实机PASS。

incremental-v1只有A；v2增加B，A槽位及像素不变；v3更新A revision2，A位置不变且配套依赖重建；v4退役B，B位置和最后有效像素保留。可在新测试工程依序替换这些图集，保留图块组数据库ID和地图，不重新生成地图。它是新增链路演示，不能替代下列既有手绘地图回归。

## B：实际旧手绘地图更新

源为已补齐的步骤04工程 `step04-mz-44a5239a979c-ed3814944c9713b8`。Map002（art）SHA `250a17a5fb092898a94a2a44c5572fafebc30441a01be979ed4b7c54be0ac52e`；Map003（diagnostic）SHA `d4c15be39f93f629bb90b56f7b21e6e67086dece0eb4745c7a90814ac1b9b8ee`。本轮只读取原文件，原工程及收到的地图备份均保护。

art-old-map-v1 / diagnostic-old-map-v1 显式建立完整四槽位基线：a/b两个逻辑组分别占旧16/17、4/6，像素逐字节恢复原工程图集。v2：同时更新a-ground/a-water至revision2，配色有意变化；b-ground/b-water显式RETIRED，像素不变，不可被第三组顶替。由于旧图已使用所有支持槽位，新增C应得到PACK_CAPACITY，退役也不释放容量。这不是自动地图迁移。

本轮准备的新副本路径见报告。副本只替换四张原名字的图集；Map001/002/003、System.json、Tilesets.json均逐字节不变，step05-build-reference.json记录原地图SHA和前后Build/Manifest/PNG SHA。原step04-reference保留作来源记录，当前替换身份以新step05-reference为准。正版Runtime/RTP留本地，不进Git/验收ZIP。

可重复准备（目标必须不存在）：

```sh
pnpm prepare:step05 <原步骤04手绘工程> <art-old-map-v1> <art-old-map-v2> <diagnostic-old-map-v1> <diagnostic-old-map-v2> <全新副本目录>
```

工具先重放全部Pack、核对原图集恰等于基线、原生核心/空插件/数据库/逻辑绑定，再复制，替换仅发生在新stage，校验原始地图与新副本SHA后发布。不要把副本保存回源工程。

在新副本打开game.rmmzproject，确认相同Tileset ID及Map002/003形状：a组显示新配色而仍为草/水，b组保持旧配色（退役保留）；两组旧画笔自动形态没有变成另一种素材。检查(1,11)/(2,11)仍为water kind6，L通道(4,10)仍为kind4，孔洞/对角边角不被重排。先运行现存地图、录像/截图、通行检查，再如需新增绘图测试只编辑副本并另存新版地图SHA。验收前的原字节基线必须保留。

## 分开记录

复制 acceptance-record.template.json 填真实结果：场景A首次安装、场景B旧地图更新、编辑器邻居重算、游戏三源帧/四状态、岸线固定、通行、美术、实际环境、Build和文件SHA、地图来源/修改前后SHA、截图/视频。未执行保持NOT_EXECUTED，用户报告使用USER_REPORTED，不把本轮CPU自测称独立Review。旧步骤01 Map003(4,10)待补事项继续保留；本步骤不同副本不自动关闭历史项。
