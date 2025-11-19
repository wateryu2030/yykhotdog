# 中文字体Base64配置指南（方法2）

## 快速开始

### 步骤1：下载字体文件

1. 访问思源黑体GitHub发布页面：
   ```
   https://github.com/adobe-fonts/source-han-sans/releases
   ```

2. 下载简体中文常规体字体文件：
   - 文件名：`SourceHanSansCN-Regular.ttf`
   - 推荐下载子集版本（Subset），文件较小（约2-5MB）

3. 将字体文件放到项目目录（任意位置，稍后会使用）

### 步骤2：转换字体文件为Base64

#### 方法A：使用npm脚本（推荐）

```bash
# 在项目根目录执行
npm run convert-font public/fonts/SourceHanSansCN-Regular.ttf

# 或者指定完整路径
npm run convert-font /path/to/SourceHanSansCN-Regular.ttf
```

脚本会自动：
- 读取字体文件
- 转换为Base64编码
- 更新 `src/utils/fonts/chineseFontBase64.ts` 文件

#### 方法B：使用命令行工具

```bash
# macOS/Linux
base64 -i SourceHanSansCN-Regular.ttf > font-base64.txt

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("SourceHanSansCN-Regular.ttf")) | Out-File -Encoding ASCII font-base64.txt
```

然后手动将Base64数据复制到 `src/utils/fonts/chineseFontBase64.ts` 文件中的 `FONT_BASE64` 常量。

### 步骤3：验证配置

1. 检查生成的文件：
   ```bash
   # 查看文件大小（应该有几MB）
   ls -lh src/utils/fonts/chineseFontBase64.ts
   ```

2. 检查文件内容：
   ```typescript
   // src/utils/fonts/chineseFontBase64.ts
   export const FONT_BASE64 = '很长很长的Base64字符串...';
   ```

3. 重启开发服务器：
   ```bash
   npm start
   ```

4. 测试PDF导出功能

## 文件结构

转换完成后，文件结构如下：

```
frontend/
├── scripts/
│   └── convert-font-to-base64.js    # 字体转换脚本
├── src/
│   └── utils/
│       └── fonts/
│           ├── chineseFontBase64.ts  # Base64编码的字体数据（自动生成）
│           └── loadChineseFont.ts   # 字体加载工具
└── package.json                      # 包含 convert-font 脚本
```

## 注意事项

1. **文件大小**：
   - 字体文件：约2-5MB（子集版本）
   - Base64编码后：约2.7-6.7MB
   - TypeScript文件：会包含Base64字符串，文件较大

2. **性能影响**：
   - Base64字体内嵌在代码中，会增加bundle大小
   - 首次加载可能需要几秒钟
   - 建议使用代码分割或懒加载

3. **Git提交**：
   - `chineseFontBase64.ts` 文件较大，建议添加到 `.gitignore`
   - 或者使用Git LFS管理大文件

## 故障排查

### 问题1：转换脚本执行失败

```bash
# 检查Node.js版本（需要Node.js 10+）
node --version

# 检查文件路径是否正确
ls -lh public/fonts/SourceHanSansCN-Regular.ttf
```

### 问题2：字体加载失败

1. 检查Base64数据是否正确：
   ```typescript
   // 在浏览器控制台执行
   console.log(FONT_BASE64.length > 0); // 应该为 true
   ```

2. 检查字体文件是否损坏：
   ```bash
   # 尝试打开字体文件
   open SourceHanSansCN-Regular.ttf
   ```

### 问题3：PDF导出仍然乱码

1. 检查字体是否已加载：
   ```typescript
   // 在PDF导出函数中添加
   console.log('字体是否加载:', isChineseFontLoaded(doc));
   ```

2. 检查浏览器控制台是否有错误

3. 尝试使用Word导出（完美支持中文）

## 下一步

配置完成后：
1. ✅ 字体文件已转换为Base64
2. ✅ 字体数据已添加到代码中
3. ✅ PDF导出函数会自动加载字体
4. ✅ 测试PDF导出功能

## 备选方案

如果Base64方案有问题，可以考虑：
1. **方法1**：使用本地字体文件（参考 `FONT_SETUP_GUIDE.md`）
2. **Word导出**：完美支持中文，无需配置

