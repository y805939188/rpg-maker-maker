# 步骤 02 第三轮整改 Coding 报告

状态 `READY_FOR_REVIEW`，第四轮独立 Review 已由 Orchestrator 启动，尚未收到结论。Coding 未批准、合并、推送或实施步骤 03/04。

- 冻结实现：`5356d66e693613f9ce52c4b0ceaddfe2821fffb5`，分支 `codex/step-02-coding`。
- 原实现/证据 `c3914ec / e7f40ef` 和全部更早候选、构建、失败记录保留。
- 整改对象 `STEP02-R3-001`：公开 decoder / supplied-build preflight 可达到旧 native EXIF 解码器，阻断 P2，不是 RCE 声明。第三轮独立报告 SHA `881a720ac82aaebb98722b3fcfae069cd25be029ed3e2ca9faecbcc5ba762381`；两项历史 Vite P1 已由该轮独立确认 FIXED。
- 当前回合实际客户端记录 `logs_2.sqlite / 2915159` 确认 `gpt-6.1-sol / xhigh / default`，服务器最终层级 `UNVERIFIED_NOT_EXPOSED`。没有改变设置/权限或调用付费模型。

## 最小修复及契约影响

仅将 Sharp 固定为 `0.35.5` 并更新其相关原生依赖锁定；其他直接依赖/框架版本未变。实际加载 Sharp `0.35.5`、libvips `8.18.7`、libexif `0.6.26`、libpng `1.6.58`、zlib-ng `2.3.3`，超过 EXIF 修复下限 8.18.2。[上游修复范围](https://github.com/libvips/libvips/security/advisories/GHSA-jmwm-wc68-mhwm)，[官方预编译组件表](https://github.com/lovell/sharp-libvips/releases/tag/v1.3.4)。旧库由第三轮无害 Orientation=1 证据确认可达，不能再以“继承/本地/PNG”降为非阻断。

没有改变输入接受规则或像素/格式/旋转/布局算法；符合原检查的普通 EXIF 仍可由补丁库解码。32 个历史源码、测试/fixtures、两份 plans 与 Profile/Pixel 文档逐文件完全相同，详见 inherited-source-comparison.json；原 52 个断言保留。批准的 `rgba8-srgb-integer-v1` 和候选 Profile 原文不改，其 Sharp 0.34.5 段落对应旧历史环境；当前运行库的明确修订记录在 [Codec companion](../engineering/STEP_02_CODEC_RUNTIME.md)，新 Manifest 记录实际 codec 和锁 SHA，不改旧清单或黄金值。

`tests/codec-runtime.test.ts` 增加 4 个真实用例：加载的 Sharp/libvips 修复版本、源码普通 EXIF/pixel、生产 Node 的 package export、含自洽普通 EXIF PNG 的 supplied-build preflight。使用有效 26-byte TIFF Orientation=1，无错误偏移、crash 或 exploit payload。测试命令先构建原型，保证全新环境验证实际 JS export；不删除或放宽任何既有用例。旧条件由第三轮独立 reachability 记录保存；新用例中的实际版本门禁在旧 0.34.5/8.17.3 不满足。

## 字节、像素与格式的实际比较

冻结后通过公开 package export 重新读回四 PNG，与批准 `step01-56368269c8328e0f84b9` 比较：**全部 PNG 字节/哈希、逐 RGBA 像素、768×576 尺寸相同**。容器仍为 RGBA8（IHDR depth=8/type=6），chunks=IHDR,pHYs,IDAT,IEND，没有新增可变元数据。实际编译验证没有发现编码差异，因此没有规格/产品行为变更需要批准；这不是凭版本升级推断等价。

codec-runtime-and-impact.json 同时保存全部加载版本、四输出比较、普通 EXIF 的输入 SHA/metadata/pixels，以及新建 supplied-benign-build 的 preflight 结果。该目录是自洽、无害的验证输入，不是正式交付或 MZ 工程；只证明内容一致性与修复库使用，不宣称 Producer 信任。

| 构建          | ID                                     | Manifest SHA-256                                                   |
| ------------- | -------------------------------------- | ------------------------------------------------------------------ |
| 工程，70 文件 | `step02-5356d66e6936-d15cfdc0a1130a7e` | `6a9fd114e256047ea4112bca7595a32f5c6ff6268dc38d9d5100133bd2f44d1d` |
| 原型，4 PNG   | `step01-0c4bab5226bff144467a`          | `6730f1299a71cae5908c7a94407e7f3d98e46c4b6bcfdd7f0ea30d87a92af5fb` |

构建位于 Coding 工作树 artifacts；所有文件重新读回匹配清单 SHA。两次重复出版均预期 exit 1，前后文件和清单不变。四 PNG 的 SHA 仍为 de08f8…b337f / b493ec…330cd / d896c5…5d9d2 / 7d60ac…b2b2b，完整值在 prototype-regression.json。外部原生核心 oracle 通过 960 选图、2,211,840 像素、241 update；原始核心只读。

## 冻结后门禁

[commands.json](../evidence/step-02/5356d66e693613f9ce52c4b0ceaddfe2821fffb5/commands.json) 保存 16 条准确 argv、源码 commit、环境覆盖、exit、耗时与日志 SHA；所有原始输出归档。codec 比较与普通 metadata 另存具体结果和输入字节。

| 门禁                                                | 实际结果                                                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| frozen install / Prisma generate / migration        | PASS；Node 22.21.1 / pnpm 10.20.0 / Prisma 6.19.3                                                         |
| pnpm check                                          | PASS：方向/固定版本、Strict、lint、format、72/72、clean build、3 个真实 ESM exports                       |
| actual Vite privacy CLI                             | 5/5 PASS，530 记录=522 拒绝+8 正常/虚拟成功，假哨兵 0                                                     |
| real DB integration                                 | 3/3 PASS，真实 HTTP→Prisma 写/读与拒绝请求无写入                                                          |
| production / development / cold development browser | 各 PASS：创建201、刷新持久化、Pixi、no pageerror；冷缓存只移动自有生成 cache 至忽略备份                   |
| compiled backend failures                           | PASS：占用端口、非法 bind、相同端口、DB offline startup 均 exit 1，安全错误，无连接 URL/密码/本地路径泄露 |
| own DB recovery                                     | PASS：health200→停止自有55432→503→重启→health200/project读200；数据保留                                   |
| immutable builds / refusal / PNG / native oracle    | PASS，上述身份及实际比较完整归档                                                                          |
| dependency audit                                    | 预期 exit1：high0/critical0/moderate0，仅原 esbuild 条件性 low1；不称全审计干净                           |

重用的 55432 集群在启动前校验 owner/root/port/PG_VERSION14 和凭据0600，没有 reinit、删除或修改 review55433/integration55434。故障测试只停启该自有集群；完成后已恢复 DB 并关闭自己的 API/Web。所有 source/fixtures/Profile/旧构建和用户 MZ 工程未覆盖，全局运行环境未修改。

## 独立门禁与仍未执行项

P2 的最终关闭由第四轮指定独立 Reviewer 判定，Coding 到此停止源码改动。当前源冻结后的补充提交仅是报告/证据/要求映射，必须与 5356 源码一致。远端 CI 仍 `NOT_EXECUTED`，由 Orchestrator 在独立 PASS 后处理。原装 Native MZ Host、新的编辑器/游戏/人工美术确认仍 `NOT_EXECUTED`；Map003 `(4,10)` 仍 `PENDING_USER_EVIDENCE`。旧截图没有被复用为新产物验收。

未来步骤 03 扩大源格式之前仍需新的格式/元数据/decode-budget 与依赖可达性审查；不能继承旧的“所有 PNG 元数据都安全”推论，也不因本次补丁已加载而宣称任意输入安全。剩余 esbuild 低危的 Windows standalone serve 条件未使用，保留原范围记录，不为清空审计而引入无关工具升级。
