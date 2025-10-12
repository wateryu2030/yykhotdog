#!/bin/bash

# 清理旧的临时脚本和文件
# 这些功能已经整合到 restore-and-init-complete.sh 中

echo "========================================================================"
echo "🧹 清理旧的临时脚本和文件"
echo "========================================================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 可以安全删除的旧文件列表
OLD_FILES=(
    "restore-local-cyrg2025.sh"
    "restore-local-cyrgweixin.sh"
    "fix-store-id-mapping.py"
    "update-business-logic.py"
    "update-revenue-fields-complete.py"
    "fix-revenue-calculation-logic.py"
    "fix-revenue-calculation-final.py"
    "fix-date-field-issue.py"
    "migrate-order-items.py"
    "test-multi-city-data.sh"
    "revenue-analysis-report.md"
    "REVENUE_CALCULATION_FINAL_REPORT.md"
)

echo "以下文件的功能已整合到 restore-and-init-complete.sh 和 init-hotdog2030-complete-v2.py 中："
echo ""

for file in "${OLD_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  📄 $file"
    fi
done

echo ""
echo -e "${YELLOW}⚠️  注意：这些文件将被移动到 archive/ 目录（不会删除）${NC}"
echo ""
read -p "是否继续？[y/N] " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 创建归档目录
    mkdir -p archive
    
    moved_count=0
    for file in "${OLD_FILES[@]}"; do
        if [ -f "$file" ]; then
            mv "$file" archive/
            echo -e "${GREEN}✅ 已移动: $file → archive/${NC}"
            moved_count=$((moved_count + 1))
        fi
    done
    
    echo ""
    echo "========================================================================"
    echo -e "${GREEN}🎉 清理完成！已移动 $moved_count 个文件到 archive/ 目录${NC}"
    echo "========================================================================"
    echo ""
    echo "保留的核心文件："
    echo "  ✅ restore-and-init-complete.sh       - 主初始化脚本"
    echo "  ✅ init-hotdog2030-complete-v2.py     - Python 初始化脚本"
    echo "  ✅ DATABASE_INIT_GUIDE.md              - 详细使用指南"
    echo "  ✅ QUICK_START.md                      - 快速开始指南"
    echo "  ✅ CHANGELOG.md                        - 更新日志"
    echo ""
    echo "如需恢复文件，请从 archive/ 目录中复制。"
    echo ""
else
    echo -e "${YELLOW}❌ 已取消清理操作${NC}"
fi

echo "========================================================================"

