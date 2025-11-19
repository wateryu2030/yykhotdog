#!/bin/bash

# 字体设置自动化脚本
# 使用方法：bash scripts/setup-font.sh

set -e

FONT_DIR="public/fonts"
FONT_FILE="SourceHanSansCN-Regular.ttf"
FONT_PATH="$FONT_DIR/$FONT_FILE"

echo "═══════════════════════════════════════════════════════════"
echo "  中文字体设置脚本"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 检查字体文件是否存在
if [ -f "$FONT_PATH" ]; then
    echo "✅ 找到字体文件: $FONT_PATH"
    ls -lh "$FONT_PATH"
    echo ""
    
    # 运行转换脚本
    echo "正在转换字体文件为Base64..."
    npm run convert-font "$FONT_PATH"
    
    echo ""
    echo "✅ 字体设置完成！"
    echo ""
    echo "下一步："
    echo "1. 重启开发服务器: npm start"
    echo "2. 测试PDF导出功能"
    
else
    echo "❌ 字体文件不存在: $FONT_PATH"
    echo ""
    echo "请按照以下步骤下载字体文件："
    echo ""
    echo "方法1：手动下载（推荐）"
    echo "  1. 访问：https://github.com/adobe-fonts/source-han-sans/releases"
    echo "  2. 下载：SourceHanSansCN-Regular.ttf"
    echo "  3. 将文件放到：$FONT_PATH"
    echo ""
    echo "方法2：使用命令行下载"
    echo "  cd $FONT_DIR"
    echo "  curl -L -o SourceHanSansCN.zip \\"
    echo "    'https://github.com/adobe-fonts/source-han-sans/releases/download/2.004R/SourceHanSansCN.zip'"
    echo "  unzip SourceHanSansCN.zip"
    echo "  mv SourceHanSansCN/OTF/SimplifiedChinese/SourceHanSansCN-Regular.otf $FONT_FILE"
    echo ""
    echo "下载完成后，再次运行此脚本："
    echo "  bash scripts/setup-font.sh"
    echo ""
    exit 1
fi

