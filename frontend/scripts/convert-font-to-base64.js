#!/usr/bin/env node

/**
 * 字体文件转Base64编码脚本
 * 
 * 使用方法：
 * node scripts/convert-font-to-base64.js <字体文件路径> [输出文件路径]
 * 
 * 示例：
 * node scripts/convert-font-to-base64.js public/fonts/SourceHanSansCN-Regular.ttf src/utils/fonts/chineseFontBase64.ts
 */

const fs = require('fs');
const path = require('path');

// 获取命令行参数
const fontFilePath = process.argv[2];
const outputFilePath = process.argv[3] || 'src/utils/fonts/chineseFontBase64.ts';

if (!fontFilePath) {
  console.error('错误：请提供字体文件路径');
  console.log('\n使用方法：');
  console.log('  node scripts/convert-font-to-base64.js <字体文件路径> [输出文件路径]');
  console.log('\n示例：');
  console.log('  node scripts/convert-font-to-base64.js public/fonts/SourceHanSansCN-Regular.ttf');
  process.exit(1);
}

// 检查字体文件是否存在
if (!fs.existsSync(fontFilePath)) {
  console.error(`错误：字体文件不存在: ${fontFilePath}`);
  process.exit(1);
}

try {
  console.log(`正在读取字体文件: ${fontFilePath}`);
  
  // 读取字体文件
  const fontBuffer = fs.readFileSync(fontFilePath);
  
  // 转换为Base64
  const base64Data = fontBuffer.toString('base64');
  
  console.log(`字体文件大小: ${(fontBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Base64编码大小: ${(base64Data.length / 1024 / 1024).toFixed(2)} MB`);
  
  // 读取模板文件
  const templatePath = path.join(__dirname, '../src/utils/fonts/chineseFontBase64.ts');
  let templateContent = '';
  
  if (fs.existsSync(templatePath)) {
    templateContent = fs.readFileSync(templatePath, 'utf8');
  } else {
    // 如果模板不存在，创建默认模板
    templateContent = `/**
 * 中文字体Base64编码数据
 * 
 * 使用方法：
 * 1. 下载思源黑体字体文件：SourceHanSansCN-Regular.ttf
 * 2. 运行转换脚本：npm run convert-font
 * 3. 或者手动转换：base64 -i SourceHanSansCN-Regular.ttf > font-base64.txt
 * 4. 将Base64数据复制到下面的 FONT_BASE64 常量中
 */

// 字体Base64编码数据（自动生成）
export const FONT_BASE64 = '';

// 字体配置
export const FONT_CONFIG = {
  name: 'SourceHanSansCN-Regular',
  alias: 'SourceHanSans',
  style: 'normal' as const,
};

/**
 * 检查字体数据是否已配置
 */
export function isFontConfigured(): boolean {
  return FONT_BASE64.length > 0;
}
`;
  }
  
  // 替换FONT_BASE64的值
  const updatedContent = templateContent.replace(
    /export const FONT_BASE64 = '';/,
    `export const FONT_BASE64 = '${base64Data}';`
  );
  
  // 写入输出文件
  const outputPath = path.resolve(outputFilePath);
  fs.writeFileSync(outputPath, updatedContent, 'utf8');
  
  console.log(`\n✅ 转换完成！`);
  console.log(`输出文件: ${outputPath}`);
  console.log(`\n下一步：`);
  console.log(`1. 检查生成的文件是否正确`);
  console.log(`2. 重启开发服务器`);
  console.log(`3. 测试PDF导出功能`);
  
} catch (error) {
  console.error('转换失败:', error.message);
  process.exit(1);
}

