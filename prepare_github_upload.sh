#!/bin/bash

# GitHub上传准备脚本
# 用于清理和准备项目文件上传到GitHub

echo "🚀 准备GitHub上传..."
echo "============================================================"

# 检查Git状态
if [ -d ".git" ]; then
    echo "✅ Git仓库已初始化"
    git status
else
    echo "📦 初始化Git仓库..."
    git init
fi

echo ""
echo "🧹 清理临时文件..."

# 删除临时文件
find . -name "*.log" -type f -delete
find . -name "*.tmp" -type f -delete
find . -name "*.temp" -type f -delete
find . -name ".DS_Store" -type f -delete

# 删除node_modules（如果存在）
if [ -d "node_modules" ]; then
    echo "🗑️ 删除根目录node_modules..."
    rm -rf node_modules
fi

if [ -d "frontend/node_modules" ]; then
    echo "🗑️ 删除frontend/node_modules..."
    rm -rf frontend/node_modules
fi

if [ -d "backend/node_modules" ]; then
    echo "🗑️ 删除backend/node_modules..."
    rm -rf backend/node_modules
fi

# 删除构建文件
if [ -d "frontend/build" ]; then
    echo "🗑️ 删除frontend/build..."
    rm -rf frontend/build
fi

if [ -d "backend/dist" ]; then
    echo "🗑️ 删除backend/dist..."
    rm -rf backend/dist
fi

echo ""
echo "📋 检查重要文件..."

# 检查重要文件是否存在
files=(
    "README.md"
    "PROJECT_OVERVIEW.md"
    "USER_MANUAL.md"
    ".gitignore"
    "docker-compose.yml"
    "frontend/package.json"
    "backend/package.json"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺失)"
    fi
done

echo ""
echo "🔍 检查项目结构..."

# 检查主要目录
directories=(
    "frontend"
    "backend"
    "database"
    "etl"
    "archive"
    "nginx"
    "docs"
    "test"
)

for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir/"
    else
        echo "❌ $dir/ (缺失)"
    fi
done

echo ""
echo "📊 项目统计..."

# 统计文件数量
echo "📁 总文件数: $(find . -type f | wc -l)"
echo "📁 总目录数: $(find . -type d | wc -l)"
echo "📁 代码文件数: $(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" | wc -l)"
echo "📁 SQL文件数: $(find . -name "*.sql" | wc -l)"
echo "📁 Markdown文件数: $(find . -name "*.md" | wc -l)"

echo ""
echo "🔧 准备Git提交..."

# 添加所有文件
git add .

# 检查暂存区状态
echo "📋 暂存区状态:"
git status --porcelain

echo ""
echo "💾 创建提交..."

# 创建提交
git commit -m "feat: 初始项目上传

- ✨ 热狗连锁店数据分析系统
- 📊 完整的仪表盘功能
- 🏪 运营分析模块
- 👥 客户分析功能
- 🔄 数据同步机制
- 🐳 Docker容器化部署
- 📚 完整的项目文档

技术栈:
- 前端: React 18 + TypeScript + Ant Design
- 后端: Node.js + Express + TypeScript
- 数据库: SQL Server (阿里云RDS)
- 容器化: Docker + Docker Compose"

echo ""
echo "✅ GitHub上传准备完成！"
echo ""
echo "📝 下一步操作:"
echo "1. 在GitHub上创建新仓库"
echo "2. 添加远程仓库: git remote add origin <repository-url>"
echo "3. 推送代码: git push -u origin main"
echo ""
echo "🔗 推荐仓库名: yykhotdog 或 hotdog-analytics"
echo "📖 记得更新README.md中的GitHub链接"

echo ""
echo "============================================================"
echo "🎉 项目已准备好上传到GitHub！"
