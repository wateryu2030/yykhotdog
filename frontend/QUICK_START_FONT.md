# 快速开始：中文字体配置

## 一键设置（推荐）

如果字体文件已下载，运行：

```bash
bash scripts/setup-font.sh
```

脚本会自动：
1. 检查字体文件是否存在
2. 转换为Base64编码
3. 更新代码文件

## 完整步骤

### 步骤1：下载字体文件

**方法A：手动下载（最简单）**

1. 访问：https://github.com/adobe-fonts/source-han-sans/releases
2. 找到最新版本（如 2.004R）
3. 下载：`SourceHanSansCN.zip`（简体中文包）
4. 解压后找到：`SourceHanSansCN/OTF/SimplifiedChinese/SourceHanSansCN-Regular.otf`
5. 将文件重命名为 `SourceHanSansCN-Regular.ttf` 并放到 `public/fonts/` 目录

**方法B：命令行下载**

```bash
cd frontend/public/fonts
curl -L -o SourceHanSansCN.zip \
  'https://github.com/adobe-fonts/source-han-sans/releases/download/2.004R/SourceHanSansCN.zip'
unzip SourceHanSansCN.zip
mv SourceHanSansCN/OTF/SimplifiedChinese/SourceHanSansCN-Regular.otf SourceHanSansCN-Regular.ttf
rm -rf SourceHanSansCN SourceHanSansCN.zip
```

### 步骤2：转换字体为Base64

```bash
cd frontend
npm run convert-font public/fonts/SourceHanSansCN-Regular.ttf
```

或者使用自动化脚本：

```bash
bash scripts/setup-font.sh
```

### 步骤3：重启开发服务器

```bash
npm start
```

### 步骤4：测试PDF导出

1. 打开应用
2. 进入"客户画像"页面
3. 点击"AI深度客户洞察"
4. 点击"导出PDF"
5. 检查PDF中的中文是否正常显示

## 验证配置

检查生成的文件：

```bash
# 检查字体文件
ls -lh public/fonts/SourceHanSansCN-Regular.ttf

# 检查Base64文件（应该有几MB）
ls -lh src/utils/fonts/chineseFontBase64.ts

# 检查Base64数据是否已填充
grep -c "export const FONT_BASE64 = ''" src/utils/fonts/chineseFontBase64.ts
# 如果输出为0，说明Base64数据已填充
```

## 故障排查

### 问题：字体文件下载失败

- 检查网络连接
- 尝试使用浏览器直接下载
- 或使用其他下载工具（如wget）

### 问题：转换脚本执行失败

```bash
# 检查Node.js版本
node --version  # 需要 Node.js 10+

# 检查文件路径
ls -lh public/fonts/SourceHanSansCN-Regular.ttf

# 手动运行转换脚本
node scripts/convert-font-to-base64.js public/fonts/SourceHanSansCN-Regular.ttf
```

### 问题：PDF导出仍然乱码

1. 检查浏览器控制台是否有错误
2. 检查字体是否已加载：
   ```javascript
   // 在浏览器控制台执行
   console.log('字体配置:', isFontConfigured());
   ```
3. 检查 `chineseFontBase64.ts` 文件中的 `FONT_BASE64` 是否有内容

## 备选方案

如果Base64方案有问题，可以使用：
- **Word导出**：完美支持中文，无需配置
- **方法1**：使用本地字体文件（参考 `FONT_SETUP_GUIDE.md`）

