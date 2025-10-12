#!/bin/bash

echo "🚀 开始恢复和初始化所有数据库..."

# 检查Docker是否运行
if ! docker ps | grep -q sqlserver-local; then
    echo "❌ SQL Server容器未运行，请先启动容器"
    echo "运行: docker run -e \"ACCEPT_EULA=Y\" -e \"SA_PASSWORD=YourStrong@Passw0rd\" -p 1433:1433 --name sqlserver-local -d mcr.microsoft.com/mssql/server:2022-latest"
    exit 1
fi

echo "✅ SQL Server容器正在运行"

# 等待SQL Server完全启动
echo "⏳ 等待SQL Server完全启动..."
sleep 10

# 检查Python依赖
echo "📦 检查Python依赖..."
if ! python3 -c "import pyodbc" 2>/dev/null; then
    echo "安装pyodbc..."
    pip3 install pyodbc
fi

# 运行Python恢复脚本
echo "🔄 运行数据库恢复脚本..."
python3 restore-local-databases.py

if [ $? -eq 0 ]; then
    echo "✅ 数据库恢复完成"
else
    echo "❌ 数据库恢复失败"
    exit 1
fi

# 运行SQL初始化脚本
echo "🔄 初始化hotdog2030数据库..."
sqlcmd -S localhost,1433 -U sa -P "YourStrong@Passw0rd" -i init-hotdog2030.sql

if [ $? -eq 0 ]; then
    echo "✅ hotdog2030数据库初始化完成"
else
    echo "❌ hotdog2030数据库初始化失败"
    exit 1
fi

# 验证所有数据库
echo "🔍 验证所有数据库..."
sqlcmd -S localhost,1433 -U sa -P "YourStrong@Passw0rd" -Q "
SELECT 
    name as '数据库名称',
    database_id as '数据库ID',
    create_date as '创建日期'
FROM sys.databases 
WHERE name IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
ORDER BY name
"

echo "🎉 所有数据库恢复和初始化完成！"
echo ""
echo "数据库信息:"
echo "- cyrg2025: 从 cyrg_backup_2025_09_09_000004_9004235.bak 恢复"
echo "- cyrgweixin: 从 zhkj_backup_2025_09_09_000002_6761311.bak 恢复"
echo "- hotdog2030: 新创建，包含学校相关表结构"
echo ""
echo "下一步:"
echo "1. 运行 'node test-local-db.js' 测试连接"
echo "2. 启动应用程序进行开发"
