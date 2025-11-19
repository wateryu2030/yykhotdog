#!/bin/bash

# 字体文件下载脚本
# 使用方法：bash scripts/download-font.sh

echo "正在下载思源黑体字体文件..."

FONT_DIR="public/fonts"
FONT_FILE="SourceHanSansCN-Regular.ttf"

# 创建字体目录
mkdir -p "$FONT_DIR"

# 尝试多个下载源
echo "尝试从GitHub下载..."

# 方法1：使用GitHub releases（需要手动下载）
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  请手动下载字体文件："
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "1. 访问：https://github.com/adobe-fonts/source-han-sans/releases"
echo "2. 下载：SourceHanSansCN-Regular.ttf（简体中文常规体）"
echo "3. 将文件放到：$FONT_DIR/$FONT_FILE"
echo ""
echo "或者使用以下命令手动下载："
echo ""
echo "  cd $FONT_DIR"
echo "  curl -L -o $FONT_FILE \\"
echo "    'https://github.com/adobe-fonts/source-han-sans/releases/download/2.004R/SourceHanSansCN.zip'"
echo "  unzip SourceHanSansCN.zip"
echo "  mv SourceHanSansCN/OTF/SimplifiedChinese/SourceHanSansCN-Regular.otf $FONT_FILE"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

# 检查文件是否存在
if [ -f "$FONT_DIR/$FONT_FILE" ]; then
    echo "✅ 字体文件已存在: $FONT_DIR/$FONT_FILE"
    ls -lh "$FONT_DIR/$FONT_FILE"
    echo ""
    echo "下一步：运行 npm run convert-font $FONT_DIR/$FONT_FILE"
else
    echo "❌ 字体文件不存在，请按照上述说明下载"
    exit 1
fi

