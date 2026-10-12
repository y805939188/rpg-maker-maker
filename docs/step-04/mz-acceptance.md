# 步骤 04 新 Compiler 产物 MZ 手工验收

本轮 Coding 只准备材料；本步尚未取得独立 Review、用户验收或步骤批准。完整候选 SHA、Build ID、Manifest/PNG 哈希和准备工程路径见 [Coding 报告](../reviews/step-04-coding.md) 及本轮构建证据。Fragment 契约见 [STEP_04_BASELINE](../engineering/STEP_04_BASELINE.md)。固定布局图集不是生产 Pack。

## 确认载入对象

打开报告指定的全新 `.local/mz/step04-mz-.../game.rmmzproject`；已经准备好的目录无需重跑 prepare。自行准备：完成 `pnpm build` 后执行 `pnpm prepare:step04 "<正版 MZ newdata>" "<本轮 step04-mz 构建目录>"`。命令先验 Manifest/逐文件哈希，实际重放存档的 PNG→步骤 03 配方→IR→Compiler→Fragment/图集，再核对原生核心和空插件；目标目录存在则拒绝覆盖。

在工程根读取 `step04-build-reference.json`，核对 commit/build/Manifest/atlas 哈希；与报告和不可变构建一致。窗口标题、游戏标题和 Tilesets.json 使用 Step04 名称。检查 img/tilesets 下四 PNG 的 SHA 与 Manifest 对应 `art/A1.png`、`art/A2.png`、`diagnostic/A1.png`、`diagnostic/A2.png`。新诊断水面静态岸区采用 ground 编号/标记，动态区保留 F0/1/2；这能帮助发现加载了旧图。美术图预期与旧原型同像素/同 PNG 字节，不能单凭画面相似确认候选。

旧 Map002/Map003 及所有手绘工程保留原样。本工程 Map001 为新脚本指定形态矩阵，不算手绘证据；Map002/003 为本轮新增空白地图，不从旧手绘图复制。后续保存/反馈的是这份新工程的地图，勿混入旧 Map003(4,10) 的待补记录。

## 环境和数据库

先读 [MZ_RUNTIME_ENVIRONMENT](../engineering/MZ_RUNTIME_ENVIRONMENT.md)。记录实际编辑器版本/路径、核心 SHA、Pixi 版本、插件、NW.js/Chromium/Node/架构和 Host 来源。目标核心为 MZ1.10.0，SHA `4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f`。原生核心＋修改 NW.js 是补充兼容测试；RPGReactor 结果不能代替原生验收。不执行任何初始化或全局升级脚本。

数据库→图块组确认 Step04 art/diagnostic，Area Type，A1/A2 对应本轮 PNG；其他页空。A2 草地 kind16/17（PNG 起点 0,0 / 96,0），A1 Block D 水 kind4/6（384,0 / 384,144）。A页按8格一行：水面在第1行第5/7格，草地在第3行第1/2格。草地○ flags=0、水面×低4bit=15，无 Star/Counter/Bush；空 B 左上项☆ flags[0]=16。未支持槽位阻挡，不拿其他物理槽位作容量。

## 逐项检查

1. Map001：上6行左右各水 kind4/6，下6行左右草 kind16/17，每块逐行 shape0–47。检查 quarter 的金色上/左边、黑色下/右边、右下红点和方向编号；0–46 是连接形态，47 仅代表图渲染，不能声称正常画笔一定产生47。
2. Map002 art、Map003 diagnostic：自动层、原生普通画笔、不按 Shift。草 kind16 铺底；单格水(3,2)；矩形池塘 x6..12,y2..7，再把(9,4)/(9,5)画回草形成孔洞；通道 x2..4,y7，从(4,7)下画至(4,10)；对角触点(13,9)/(14,10)；草 kind17 画 x0..3,y11..12，再水 kind6 画(1,11)/(2,11)。检查单格、直边、内外角、孔洞、一格宽拐角、对角不共边和大面。连续扩展、涂回、撤销重画，确认编辑器重新计算相邻形态。保存本轮 Map002/003 原 JSON、SHA 和截图。
3. 在 Map002 起点(1,1)开始新游戏，不按 Ctrl 穿透：草可走，水四方向不能进入，岸上草色仍是水格碰撞。至少观察两个周期：三源帧按 0→1→2→1→0，内部波纹变化、岸线固定。诊断运行可临时把起点移到 Map003，记录并注明是否还原。
4. 动画以 update 计数为准，0/29→0、30/59→1、60/89→2、90/119→1、120→0。名义60update/s约0.5秒/状态仅是参考；录像/多状态证据证明动画，单截图不能证明时基。oracle 的601次 update 是 Node VM 自动检查，不代替游戏执行。
5. 美术图与原批准母版预期相同，检查固定岸线色带、草地重复和水波；新诊断银行像素静态，F标记可能在岸区被固定ground替换，这是来源明确的测试变化。任何异常保留地图/视频，记录坐标、kind/shape、预期/实际。

反馈至少包含本轮 Build 身份、环境、数据库截图、Map002/003 JSON 与 SHA、形态截图和动画录像（或多状态截图＋实际观察）。复制 [验收记录模板](acceptance-record.template.json)，只填写真实执行项。指定形态渲染、正常手绘、游戏动画、通行、美术确认与独立 Review 各自记录。

Original Native MZ Host Compatibility 仍 NOT_EXECUTED（最迟步骤10），旧 Map003(4,10) 仍 PENDING_USER_EVIDENCE；延期不免除本次新产物的实机门禁。当前交付只可称 Coding ready for Review。
