# 步骤 01 研究与决策记录

已完整阅读批准文档的全部 822/137 行。V1.0 依赖链为：原生可行性→工程契约→
领域像素→Compiler→Pack→持久化/Mock恢复→人工Studio→Prompt/WaveSpeed→
整套AI生产→RC。步骤 06 必须先完成 Mock 恢复，步骤 08 才连接付费供应商。
当前仅实现固定实验布局，无前后端、数据库、生产分配器和付费模型。

两份文档在步骤 01 范围无实际冲突：产品 §15.1 V0.0 的工作流 B 与
「Prisma 在 V0.0 固定」归于十步计划步骤 02；不是本步的提前实现授权。

## 官方依据与本机证据

- [素材标准](https://rpgmakerofficial.com/product/MZ_help-en/01_11_01.html)：核对 A1/D、A2、布局及模式分类。
- [Tilemap 官方代码](https://rpgmakerofficial.com/product/mz/rmmz_api/Tilemap.js.html)：核对 quarter 选图与动画规则。
- [地图编辑](https://rpgmakerofficial.com/product/MZ_help-en/01_07_01.html)：原生自动分层及画笔操作入口。
- [Tilesets 数据库](https://rpgmakerofficial.com/product/MZ_help-en/01_08_10.html)：Area Type 和通行属性入口。

公开资料是检索入口。本次版本与哈希以本机正版安装的 Info.plist/newdata 核心为准，
未修改代码的 Node oracle 与真实 UI 测试分别报告。公开规则不能充当本产物实机 PASS。

## 实验决策

1. 锁 MZ1.10.0/48px/Area Type；选两对最小槽位，为后续 Pack 多素材实验保留容量。
2. 水格内预合成配套草岸作为唯一候选。避免任意透明层组合的不确定性；仍须实机。
3. 原型直接接受完整 96×144 基本样板。不是在步骤 01 抢做步骤 03 IR/像素配方。
4. 编译器只固定复制；独立母版包含每个 quarter 的编号、方向、角落和源帧。
5. 未修改原生 Tilemap 在外部执行，检查实际图集的48索引及4播放状态；独立于
   固定复制算法。但 stub layer 只证明选图/像素，不能替代 GPU、编辑器、游戏。
6. 原创像素美术母版明确来源，无第三方 RTP 图块，无 paid AI；人类美术确认待记录。
7. 实验构建源码提交后发布，后续证据外置。原型发布仅为可审查实验身份，
   正式文件/数据库/CAS/任务发布协议属于步骤 06。

## 实际结果

具体受测 commit、构建哈希、自动检查和实机记录见 docs/reviews/step-01.md。
没有实际执行的项目保持 NOT_EXECUTED；必要门禁不全时 BLOCKED。
