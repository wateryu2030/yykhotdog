# 中文字体加载说明

## 概述

本工具用于为jsPDF添加中文字体支持，解决PDF导出时中文乱码问题。

## 使用方法

### 方法1：使用CDN字体（推荐，无需配置）

工具会自动尝试从CDN加载思源黑体字体，无需额外配置。

### 方法2：使用本地字体文件

1. **下载字体文件**
   - 访问 [思源黑体 GitHub](https://github.com/adobe-fonts/source-han-sans/releases)
   - 下载 `SourceHanSansCN-Regular.ttf`（简体中文常规体）
   - 将字体文件放到 `public/fonts/` 目录下

2. **字体文件会自动加载**
   - 工具会优先尝试从 `public/fonts/` 目录加载字体文件
   - 如果本地文件不存在，会回退到CDN加载

### 方法3：使用Base64编码的字体（最佳性能）

1. **转换字体文件为Base64**
   - 使用在线工具：https://www.jspdf.top/fontconverter/fontconverter.html
   - 或使用命令行工具：
     ```bash
     base64 -i SourceHanSansCN-Regular.ttf -o font-base64.txt
     ```

2. **在代码中使用**
   ```typescript
   import { loadFontFromBase64 } from './utils/fonts/loadChineseFont';
   
   const doc = new jsPDF();
   const base64Data = '...'; // 你的Base64编码字体数据
   loadFontFromBase64(doc, 'SourceHanSansCN-Regular', 'SourceHanSans', base64Data);
   ```

## 字体文件大小

- 思源黑体完整字体文件：约15-20MB
- 建议使用子集字体（Subset），仅包含常用汉字，约2-5MB

## 注意事项

1. **字体文件大小**：完整字体文件较大，可能影响页面加载速度
2. **网络依赖**：使用CDN方案需要网络连接
3. **浏览器兼容性**：确保浏览器支持 `fetch` API和 `ArrayBuffer`
4. **回退机制**：如果字体加载失败，PDF导出仍会继续，但中文可能显示为乱码

## 推荐方案

对于生产环境，建议：
1. 将字体文件转换为Base64并内嵌到代码中（最佳性能）
2. 或使用CDN方案（最简单，但需要网络）
3. 或使用Word导出（已实现，完美支持中文）

## 故障排查

如果字体加载失败，检查：
1. 网络连接是否正常（CDN方案）
2. 字体文件路径是否正确（本地文件方案）
3. Base64编码是否正确（Base64方案）
4. 浏览器控制台是否有错误信息

