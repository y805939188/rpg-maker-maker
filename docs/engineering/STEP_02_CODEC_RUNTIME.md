# 步骤 02 图像运行库安全修订

当前实现固定 Sharp `0.35.5`，官方预编译依赖包 `1.3.4`；本机实际加载 libvips `8.18.7`、libexif `0.6.26`、libpng `1.6.58`、zlib-ng `2.3.3`。Node 仍为 `22.21.1`，没有系统 libvips/MZ/NW.js 或全局设置变更。

这修复了公开 `decodePng` / supplied-build preflight 中目前可达的 EXIF 元数据解码路径。libvips 的 [CVE-2026-35590 官方说明](https://github.com/libvips/libvips/security/advisories/GHSA-jmwm-wc68-mhwm) 将 `<=8.18.1` 列为受影响、`>=8.18.2` 列为补丁版本；Sharp 的 [官方覆盖说明](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) 与 [0.35.5 原生包版本表](https://github.com/lovell/sharp-libvips/releases/tag/v1.3.4) 支持本次固定版本选择。旧的“PNG/本地使用所以所有 Sharp 风险不可达”结论已被第三轮 Review 的普通 Orientation=1 证据纠正，不再适用于当前入口。这里没有进行 crash 或 RCE 验证。

保留 `docs/step-01/pixel-processing-contract-v1.md` 与 `src/profile.ts` 的历史内容和 ID，不改批准的像素/引擎/槽位/帧/输入规则，也不重置母版或黄金值。旧契约中 Sharp 0.34.5 的锁定描述对应已批准历史实现；此 companion 文档明确记录当前步骤 02 的安全运行库修订。每个新 Manifest 继续记录实际 encoder/libvips 全版本、锁文件 SHA 与源码 commit，旧 Manifest 不改写。

目前无输入接受范围变更：符合原检查的无害 EXIF 仍可被修复后的库解码，CRC/ICC/色彩/动画/Alpha/尺寸拒绝规则保留；不增加一般图片规范化、旋转、元数据转换或 Step03 功能。`tests/codec-runtime.test.ts` 检查实际已加载的补丁 runtime，并通过源码入口、构建后的正式 package export 和自洽 supplied-build preflight 验证普通 EXIF/像素。测试命令先构建原型 JS，使全新环境的 package-export 用例也验证实际生产模块。原 52 个测试断言、fixtures、provenance 均保留。

初步真实编译对照表明四 PNG 全字节 SHA 和解码 RGBA 均与批准的 `step01-56368269c8328e0f84b9` 相同；这不是仅凭依赖版本推断。最终冻结候选仍需完整门禁、四文件/容器与解码对照、外部原生 oracle、独立 Review。实际库与差异证据应保存在新候选报告中；若以后更换 codec 产生任何差异，必须明确分析，不能覆盖旧产物、调低阈值或复用旧 MZ 截图宣称新产物验收。
