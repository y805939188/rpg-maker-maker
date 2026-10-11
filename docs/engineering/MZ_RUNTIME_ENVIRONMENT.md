# RPG Maker MZ 本地运行环境与兼容性约束

**适用项目：** AI Tileset Studio / rpg-maker-maker

**文档类型：** 长期开发环境说明与 Agent 执行约束

**适用角色：** Coding Agent、Independent Review Agent、测试及验收 Agent

**参考项目：** https://github.com/y805939188/rpg-maker-mz-initialize

---

## 一、开发者的 RPG Maker MZ 使用方式

本项目开发者使用的是经过现代化改造的 RPG Maker MZ 开发环境。

开发者的长期目标并不是依赖 RPG Maker MZ 原生 Runtime 实现所有游戏逻辑和渲染，而是：

- 使用 RPG Maker MZ 作为地图编辑器。
- 使用 RPG Maker MZ 管理地图、事件、数据库等游戏开发数据。
- 使用 TypeScript 开发现代化游戏逻辑及插件。
- 使用 Vite 进行工程化构建。
- 优先使用 RPGReactor 提供的现代运行时及 PixiJS 能力。
- 根据需要引入 Three.js、Shader、动态环境等高级渲染能力。

因此，开发者个人使用的游戏运行环境可能与未经修改的 RPG Maker MZ 不完全相同。

但这种差异**不能改变 AI Tileset Studio V1.0 的原生兼容目标**。

---

## 二、本地环境初始化项目

开发者维护独立的 RPG Maker MZ 工程初始化仓库：

https://github.com/y805939188/rpg-maker-mz-initialize

该项目用于初始化现代化 RPG Maker MZ 游戏开发环境。

它不是 AI Tileset Studio 的源代码仓库，也不是必须用于创建所有 MZ 验收工程的模板。

该初始化项目主要提供以下能力：

### 1. NW.js 升级

初始化脚本可以将 MZ 应用所使用的 NW.js 替换为较新的版本。

在已检查的仓库配置中，目标版本为 NW.js 0.117.0 SDK / ARM64。

此操作涉及 MZ 应用安装目录，可能影响使用该 MZ 安装进行 Playtest 的其他工程。

初始化脚本具有备份机制，但不能因此假定执行安装没有风险。

### 2. RPGReactor Runtime

初始化过程会为目标游戏工程安装 RPGReactor Runtime，并使用它代替原有的 MZ 核心运行时。

在已检查的模板配置中，默认远程源码快照对应 RPGReactor v0.98.7。

实际运行时版本也可能由 `REACTOR_SOURCE` 指向的本地源码决定。

### 3. TypeScript + Vite

模板提供：

- TypeScript 插件源码目录。
- Vite 构建配置。
- RPGReactor 类型声明。
- 插件打包和监听构建。
- MZ 插件管理器接入。
- 游戏工程文件 `game.rmmzproject`。

通过该模板，开发者可以在 MZ 中继续编辑地图和事件，同时使用现代 TypeScript 工程开发插件与游戏逻辑。

### 4. 版本信息

仓库中的 `scripts/versions.env` 定义了默认工具链版本。

**该文件中的版本代表模板配置，不保证与开发者本机已经安装的实际环境完全一致。**

进行测试前必须检查真实环境，不得仅凭 README 或默认配置作出版本判断。

---

## 三、AI Tileset Studio 的正式兼容目标

**AI Tileset Studio V1.0 的正式目标仍然是原生 RPG Maker MZ。**

首期需要生成符合 MZ 官方规范的：

- A2 静态草地 Autotile。
- A1 原生动态水面 Autotile。
- 经过验证的草地—水面岸线关系。
- 标准图集及对应使用说明。

正式交付的 PNG 应能够被普通 MZ 用户使用，不应依赖 RPGReactor、自定义 Tilemap 实现或平台专用运行时插件。

即使开发者日常游戏工程使用 RPGReactor，也不能让它成为 V1.0 素材包的强制依赖。

---

## 四、必须区分的测试环境

所有涉及 MZ 的开发和 Review，必须区分以下环境。

### Native MZ — 正式兼容性基线

使用未经修改的 MZ 核心脚本及原生运行时，并确认 Playtest Host 环境符合测试基线。

用于正式验证：

- 原生 A1/A2 图块格式。
- Autotile 自动拼接。
- 编辑器绘图行为。
- Animated Autotile 播放。
- 图层及通行配置。
- 已有地图的素材更新兼容性。

这是 AI Tileset Studio V1.0 的必要验收环境。

### Native Core + Modified NW.js — 环境兼容测试

项目使用原生 MZ 核心脚本，但 Playtest 使用被升级的 NW.js。

此环境可以用于补充兼容性测试。

不能在未核实 Host 差异的情况下，把测试结果直接标为完全未经修改的原生 MZ 验收。

### RPGReactor Runtime — 增强环境测试

项目使用 RPGReactor Runtime，以及相应 PixiJS、TypeScript 插件和其他增强功能。

该环境用于验证开发者个人实际游戏工程的兼容性。

它适合未来的高级动画、Shader、动态对象和智能地图能力研究。

但是：

**RPGReactor 环境的测试成功，不等于 Native MZ 测试通过。**

RPGReactor 中的问题，也不能未经分析就归因于标准 MZ 素材格式错误。

---

## 五、运行环境检查规则

每当任务涉及 MZ 实机验收、动画行为或运行时兼容性时，应先记录：

1. RPG Maker MZ 编辑器版本及安装位置。
2. 当前使用的 NW.js 版本和架构。
3. 测试工程实际加载的是原生 MZ 核心脚本还是 RPGReactor。
4. RPGReactor 的实际版本和源码来源（如适用）。
5. PixiJS 等运行时库的实际版本。
6. 已启用的插件及可能影响 Tilemap 的修改。
7. 所使用的 Tileset、Profile 和对应测试工程。
8. 实际测试命令、操作结果和相关证据。

不能只通过工程文件存在、窗口能打开或游戏能启动，就推断该环境符合指定兼容基线。

对于从 `rpg-maker-mz-initialize` 创建的项目，可以在对应项目目录检查：

```bash
./scripts/doctor.sh
./scripts/setup-reactor.sh --check
./scripts/setup-nwjs-mac.sh --check
```

这些命令适用于具有相应脚本的初始化模板项目，不能直接假定 AI Tileset Studio 本身也具有这些脚本。

如果当前工程不是该模板创建的，应按其实际结构检查。

---

## 六、禁止未经授权修改本地 MZ 环境

Coding Agent 和 Review Agent 不得擅自执行会改变全局 MZ 环境的初始化或升级操作。

尤其不得未经用户明确同意：

- 替换、降级或重装 MZ 应用内的 NW.js。
- 覆盖原有 NW.js 备份。
- 修改开发者当前正在使用的 RPGReactor Runtime。
- 用原生 Runtime 覆盖开发者现有的增强工程。
- 用 RPGReactor 覆盖正式 Native MZ 验收工程。
- 对开发者其他游戏工程执行初始化或资源覆盖。

需要特别注意：

**`bootstrap-mac.sh --skip-nwjs` 仅跳过 NW.js 升级，不代表跳过 RPGReactor 的工程初始化。**

不能使用这个参数把已经安装 RPGReactor 的工程当作原生 MZ 工程。

执行任何安装或替换脚本前，必须确认其影响范围，优先使用只读检查方式。

---

## 七、Native MZ 验收环境隔离

建议长期维护独立的原生 MZ 测试工程，与 RPGReactor 游戏工程分离。

理想结构：

```text
AI Tileset Studio
       │
       ├── Native MZ Test Project
       │       └── 正式兼容性验收
       │
       └── RPGReactor Test Project
               └── 增强运行时兼容测试
```

如果本机 MZ 应用已经替换过 NW.js，应额外确认 Playtest Host 是否仍满足正式 Native 基线。

必要时可使用独立、合法取得的原生运行环境进行测试。

不得为了创建干净测试环境，直接破坏现有安装。

测试工程应当相互隔离，避免不同运行时的脚本、插件和资源发生混用。

测试素材、引擎安装文件及第三方运行时，也不应未经必要性和授权评估直接提交进 AI Tileset Studio 仓库。

---

## 八、与 AI Tileset Studio 产品架构的关系

必须明确区分两个项目的职责。

### AI Tileset Studio

负责：

- AI 地图素材生成。
- Autotile 与 Animated Autotile 编译。
- 素材包组装。
- 质量检查。
- 浏览器动画预览。
- 原生 MZ 图集输出。

V1.0 不依赖 RPGReactor。

### rpg-maker-mz-initialize

负责：

- 初始化 MZ 游戏开发工程。
- 接入现代化 Runtime。
- 配置 TypeScript 与 Vite。
- 管理游戏插件开发环境。
- 提供现代化游戏运行基础。

两者可以在未来协作，但不能因为开发者日常使用初始化模板，就直接把 AI Tileset Studio 的产品范围改成 RPGReactor 专用素材工具。

未来如果需要支持 RPGReactor 特有的图层、Shader、多帧动画或动态环境，应采用明确的增强能力契约，并独立验证。

---

## 九、对 Coding Agent 的要求

涉及 MZ 的 Coding Agent 必须：

- 先确认当前测试环境及实际运行时。
- 以批准的 Target Profile 为正式编译依据。
- 优先保证原生 MZ 素材交付能力。
- 不主动依赖 RPGReactor 特有 API 实现首期核心功能。
- 原生兼容问题优先在原生环境中复现和定位。
- 可以研究增强环境差异，但不得擅自扩大当前步骤。
- 不擅自修改全局 MZ / NW.js 安装。
- 无法实测时准备验收包与操作说明，等待用户验证。

如果某个功能在 RPGReactor 中工作，但在 Native MZ 中失败，不能将该功能标记为首期原生兼容通过。

---

## 十、对 Independent Review Agent 的要求

Review Agent 除代码正确性外，应额外审查测试环境与结论是否匹配。

尤其关注：

- 是否错误地使用 RPGReactor 结果证明 Native MZ 正确。
- 是否因为升级版 NW.js 而忽略了测试环境差异。
- 是否存在未经记录的运行时脚本或插件替换。
- 是否把编辑器绘图正确和游戏运行时渲染正确混为一谈。
- 是否因为某个增强环境的特殊行为，改变了目标图集标准。
- 是否把未经执行的原生验收标记为通过。

应区分：

**Native MZ 验收结论。**

**Modified NW.js 兼容性结论。**

**RPGReactor 兼容性结论。**

每项结论必须关联具体版本、工程路径、测试对象及证据。

未经验证的项目继续标记为 `NOT_EXECUTED` 或 `BLOCKED`。

---

## 十一、与十步开发计划的关系

本文件是长期环境说明，不改变既有 V1.0 十步开发计划及 Review 门禁。

尤其在步骤 01：

- 优先完成原生 MZ 兼容性验证。
- 不能通过 RPGReactor 替代原生 MZ 验收。
- 若本地只有增强环境，准备独立验收材料。
- 原生 MZ 手绘地图、动画及通行验收仍是必要门禁。
- 不因为等待实机验证而自动进入步骤 02。

后续每个步骤都应依据实际测试对象，选择正确的测试环境。

对于与 MZ 运行时无关的纯 TypeScript 编译器测试，不要求每次都运行 RPGReactor 或启动 MZ 编辑器。

---

## 十二、最终执行原则

**AI Tileset Studio 面向所有原生 MZ 用户生产标准素材；开发者个人游戏项目可以积极采用 RPGReactor 增强环境。**

两者并不冲突。

正式原生兼容必须由原生环境证明。

增强运行时测试属于独立的补充验证。

任何测试环境差异都需要透明记录，而不是被自动忽略。

**本文件仅补充本地环境信息与执行约束，不授权修改现有 MZ 安装，不扩大 V1.0 功能，也不改变每一步必须经过用户 Review 的要求。**