# Pixel Processing Contract

ID `rgba8-srgb-integer-v1`。步骤 01 最小实现：`src/pixels.ts`。
批准后步骤 03 按此规范扩展源处理；本步没有实现通用图像导入/IR。

- **表示**：逐行、左上原点 RGBA8，非预乘 Alpha。输出 PNG single image、非调色板、8bit。
- **色彩**：sRGB 字节值；输入必须 RGBA8 sRGB，无 ICC。无色彩标签的PNG明确按sRGB
  字节解释；有标签只允许sRGB intent=0..3、gAMA=45455、标准sRGB cHRM坐标。
  非标准gamma/chromaticity明确拒绝。先检查原始IHDR和动画/色彩chunk，不能只依靠
  Sharp解码后的metadata。PNG第三版cICP/mDCV/cLLI色彩/HDR块当前全部拒绝，
  不隐式把PQ/HDR当作sRGB；依据[W3C PNG颜色信息规范](https://www.w3.org/TR/png/#cICP-chunk)。
  ICC、灰度、RGB、索引色、
  16bit、动画及非 PNG 拒绝，转换将来作为显式新 revision，不能暗中归一化。
- **透明度**：Alpha=0 时 RGB 必须全 0；非法隐藏 RGB 拒绝。像素复制、裁切、
  最近邻与 PNG 编解码保持部分 Alpha 原值。当前唯一烘焙岸线的占用样板必须
  Alpha=255，故编译器拒绝所有透明/半透明源。未用图集区域为 (0,0,0,0)。
- **合成**：本步固定方案不做运行时透明叠加、也不调用图像库默认合成。
  未来半透明 source-over 应先在线性 sRGB 空间按非预乘值计算，并在写回时仅做一次
  round-to-nearest/clamp；A=0 写 RGB=0。该扩展算法须步骤 03 测试，当前不声称已实现。
- **坐标**：整数、半开区间 [x,x+w)×[y,y+h)，无隐式取整/越界填充。尺寸必须正整数，
  负/小数/NaN/越界立即拒绝。重叠复制先快照来源，确保确定性。
- **缩放**：原型编译禁止隐式缩放。最小最近邻只支持正整数倍，目标像素取
  floor(x/factor),floor(y/factor)，不产生新颜色。其他重采样留显式决策及复测。
- **像素密度**：美术母版按 2×2 最终像素为一个逻辑像素、Tile 逻辑尺寸24；
  方向诊断以1px绘制，专用于检测坐标。48px目标尺寸与美术密度不混淆。
- **配色/几何**：一套草地、草岸、沙岸和水面共享原始调色板；三水帧使用同一
  static-bank-mask，静态区域逐像素不变。内部水面必须有实际变化，纯色/相同帧
  不算视觉质量成功。没有用 AI Prompt 保证格式。
- **边界**：本步 PNG 输入≤4MiB，解码像素≤768×576；缓冲长度必须width×height×4。
  明确拒绝不合格输入，当前不是接受任意 AI 输出的生产导入器。
- **可复现**：锁定 Sharp 0.34.5、pnpm锁文件、Node版本；PNG使用compressionLevel=9、
  adaptiveFiltering=false、palette=false，无可变元数据。Manifest记录encoder/libvips
  版本。跨平台/不同libvips版本只有像素一致保证，字节一致须同构建环境核验。

自动测试覆盖透明/半透明往返、ICC/16bit拒绝、最近邻色值、整数裁切、越界与重叠、
图集空区域、帧数/尺寸/Alpha拒绝、静态岸线逐像素保持和实际内部动画变化。
