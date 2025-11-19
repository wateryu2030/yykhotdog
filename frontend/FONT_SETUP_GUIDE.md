# 中文字体配置指南

## 快速开始

为了在PDF导出中正确显示中文，需要配置中文字体文件。

### 方法1：使用本地字体文件（推荐）

1. **下载字体文件**
   ```bash
   # 创建字体目录
   mkdir -p public/fonts
   
   # 下载思源黑体（简体中文常规体）
   # 访问：https://github.com/adobe-fonts/source-han-sans/releases
   # 下载：SourceHanSansCN-Regular.ttf
   # 将文件放到 public/fonts/ 目录
   ```

2. **字体文件会自动加载**
   - 工具会自动从 `public/fonts/SourceHanSansCN-Regular.ttf` 加载字体
   - 无需额外配置

### 方法2：使用Base64编码（最佳性能）

1. **转换字体文件为Base64**
   ```bash
   # 使用base64命令（macOS/Linux）
   base64 -i public/fonts/SourceHanSansCN-Regular.ttf -o font-base64.txt
   
   # 或使用在线工具
   # https://www.jspdf.top/fontconverter/fontconverter.html
   ```

2. **在代码中使用**
   ```typescript
   import { loadFontFromBase64 } from './utils/fonts/loadChineseFont';
   
   const doc = new jsPDF();
   const base64Data = '...'; // 从font-base64.txt复制
   loadFontFromBase64(doc, 'SourceHanSansCN-Regular', 'SourceHanSans', base64Data);
   ```

## 字体文件下载链接

- **思源黑体（Source Han Sans）**
  - GitHub: https://github.com/adobe-fonts/source-han-sans/releases
  - 推荐下载：`SourceHanSansCN-Regular.ttf`（简体中文常规体，约2-5MB）

- **其他可选字体**
  - 思源宋体：https://github.com/adobe-fonts/source-han-serif
  - 微软雅黑：需要从Windows系统获取

## 字体文件大小说明

- **完整字体文件**：约15-20MB（包含所有字符）
- **子集字体文件**：约2-5MB（仅包含常用汉字，推荐使用）
- **Base64编码后**：大小会增加约33%

## 当前状态

- ✅ 字体加载工具已创建：`src/utils/fonts/loadChineseFont.ts`
- ✅ PDF导出函数已集成字体加载
- ⚠️ 需要用户提供字体文件到 `public/fonts/` 目录

## 故障排查

如果PDF导出时中文仍显示为乱码：

1. **检查字体文件是否存在**
   ```bash
   ls -lh public/fonts/SourceHanSansCN-Regular.ttf
   ```

2. **检查浏览器控制台**
   - 查看是否有字体加载错误
   - 确认字体文件路径是否正确

3. **验证字体文件**
   - 确保字体文件未损坏
   - 确保文件格式为 `.ttf` 或 `.otf`

4. **使用Word导出作为备选**
   - Word导出完美支持中文，无需配置

## 下一步

1. 下载字体文件到 `public/fonts/` 目录
2. 重启开发服务器
3. 测试PDF导出功能

## 注意事项

- 字体文件较大，首次加载可能需要几秒钟
- 建议使用子集字体（Subset）以减少文件大小
- 生产环境建议将字体文件转换为Base64并内嵌到代码中

