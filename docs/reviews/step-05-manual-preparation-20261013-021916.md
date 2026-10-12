# 步骤05人工验收工程准备记录

2026-10-13，Asia/Shanghai。用户明确授权对新建 `/Users/dingshinn/Desktop/ding-test/Step-5-test` 准备图集/配置/文件与必要工程化辅助，减少人工操作。此授权针对测试工程与独立副本；没有据此修复正式源码、改正式测试/Golden、提交或启动步骤06。

已完成：

- 在用户新工程保留原Map001与原六个图块组，新增图块组7（Area/48px、A1/A2稳定图片名、192个支持形态的flags）和Map002/003测试空场。A背景预填草，B背景在新增B工具中预填；**没有生成任何水面或声称这些是手绘地图**。普通MZ事件提供A/B导航和运行观察。
- 安装已审查incremental-v1；五个可双击本地工具按顺序新增B、更新A、退役B、替换旧图与收集数据，均直接复制原PNG，不调用有P2的生产发布工具。完整八文件Pack在工具目录归档并核对原Manifest/逐文件SHA，仍绑定c09027f。
- 用户工程原1312文件完整备份于 `Step-5-kit/backup-before-setup/Step-5-test`。修改的原文件仅MapInfos/Tilesets/System三个JSON；新增两张地图、两张PNG和本地测试reference。Runtime、Pixi、plugins、入口及原Map001保持原字节。
- `Step-5-kit/old-map-test` 是实际步骤04手绘工程的独立v1副本；替换工具只换四张PNG并验证Map001/002/003、System、Tilesets五文件原字节不变。
- `Step-5-kit/old-map-diagnostic` 已装旧图v2，仅在这个额外副本把System.startMapId从2改为3用于直接进入诊断游戏；该导航调整与图片替换的五文件保护证据分开记录。原Map003/其他地图/图块组仍原字节，历史工程未写入。
- 自动运行观察是普通地图事件，只读取实际MZ/Pixi/NW/Node/插件、核心与PNG身份，以及100个原生Tilemap计数样本。未替换Tilemap、改变动画时钟、开启插件或模拟游戏；观察文件保留AWAITING_USER_REPORT，不填写视觉/通行PASS。启动后约10秒才有完整计数，用户仍需真实运行与肉眼观察。

工程核验：八套Pack身份全部匹配，192项flags正确，地图/事件结构和观察脚本语法检查通过。辅助工具在仓库外的**合成隔离副本**执行全部五项动作，确认缺少保存的A水时拒绝、重复/乱序拒绝、新增保留A、更新/退役保留两图、旧图替换五JSON原字节不变。合成水格只存在于临时验证副本，未写入交付地图，不算人工证据。观察器另在合成VM检查，实际MZ GUI/游戏/视觉仍NOT_EXECUTED。

源码仓库1399个本轮保护对象（Pack、历史MZ副本、原独立报告/证据）SHA未变，refs/HEAD不变。没有改变正式源码/测试/Profile/母版、全局MZ/NW/RPGReactor或数据库；未执行发布工具、真实模型或付费调用。

交付位置：

- 新工程：`/Users/dingshinn/Desktop/ding-test/Step-5-test/game.rmmzproject`。
- 工具、旧图副本、完整备份、简化指南和证据：`/Users/dingshinn/Desktop/ding-test/Step-5-kit/`。含本地正版素材/Runtime，不入Git或对外发布。
- 临时验证：`/private/tmp/tileset-step05-manual-prep-20261013-021916/`；before、setup/verify日志、合成验证与哈希记录留在此处。
- 仅新增本准备记录到仓库，既有 `step-05-manual-mz-readiness-23d8386.md` 未修改；不提交。

精简只去除重复文件复制/注册/计算hash和重复全形态人工检查，保留正常画笔代表形状/邻居重算、两组真实动画/岸线/通行、新增/更新/退役以及两张实际旧手绘地图使用检查。全形态/容量/冲突/文件一致性继续引用原独立自动证据，不降低阈值、不删失败用例。

**当前人工验收尚未执行；STEP05-IR-001仍未关闭，代码结论REQUIRES_REVISION。用户完成肉眼测试不自动授权步骤06，仍须Coding整改、最新候选独立PASS及用户明确批准。步骤06未启动。**
