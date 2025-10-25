#!/bin/bash
# 数据库覆盖脚本 - 用 cyrg202509 覆盖 cyrg2025
# macOS版本

# 数据库连接参数
SERVER="rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com,1433"
USERNAME="hotdog"
PASSWORD="Zhkj@62102218"

echo "============================================================"
echo "数据库覆盖脚本 - 用 cyrg202509 覆盖 cyrg2025"
echo "============================================================"

# 检查 sqlcmd 是否可用
if ! command -v sqlcmd &> /dev/null; then
    echo "❌ 错误: sqlcmd 命令不可用，请安装 SQL Server 命令行工具"
    echo "安装方法: brew install mssql-tools"
    exit 1
fi

echo "✅ sqlcmd 工具检查通过"

# 1. 检查源数据库 cyrg202509 是否存在
echo ""
echo "1. 检查源数据库 cyrg202509..."
echo "----------------------------------------"

CHECK_SOURCE_SQL="
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg202509')
    SELECT 'cyrg202509' as '数据库名称', '存在' as '状态'
ELSE
    SELECT 'cyrg202509' as '数据库名称', '不存在' as '状态'
"

echo "检查源数据库 cyrg202509..."
if sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -C -Q "$CHECK_SOURCE_SQL"; then
    echo "✅ 源数据库 cyrg202509 检查完成"
else
    echo "❌ 无法检查源数据库，请检查连接参数"
    exit 1
fi

# 2. 检查目标数据库 cyrg2025 是否存在
echo ""
echo "2. 检查目标数据库 cyrg2025..."
echo "----------------------------------------"

CHECK_TARGET_SQL="
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
    SELECT 'cyrg2025' as '数据库名称', '存在' as '状态'
ELSE
    SELECT 'cyrg2025' as '数据库名称', '不存在' as '状态'
"

echo "检查目标数据库 cyrg2025..."
if sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -C -Q "$CHECK_TARGET_SQL"; then
    echo "✅ 目标数据库 cyrg2025 检查完成"
else
    echo "❌ 无法检查目标数据库，请检查连接参数"
    exit 1
fi

# 3. 执行数据库覆盖操作
echo ""
echo "3. 执行数据库覆盖操作..."
echo "----------------------------------------"

# 询问用户确认
read -p "⚠️  此操作将删除现有的 cyrg2025 数据库并用 cyrg202509 覆盖，是否继续？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "操作已取消"
    exit 0
fi

# 执行覆盖操作
COVER_SQL="
-- 检查源数据库是否存在
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg202509')
BEGIN
    PRINT '错误: 源数据库 cyrg202509 不存在，无法执行覆盖操作'
    RETURN
END

PRINT '源数据库 cyrg202509 存在，开始覆盖操作...'

-- 检查目标数据库是否存在，如果存在则删除
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    PRINT '目标数据库 cyrg2025 已存在，正在删除...'
    
    -- 断开所有连接到 cyrg2025 数据库的会话
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    
    -- 删除现有数据库
    DROP DATABASE [cyrg2025];
    
    PRINT '目标数据库 cyrg2025 已删除'
END
ELSE
BEGIN
    PRINT '目标数据库 cyrg2025 不存在，可以直接重命名'
END

-- 重命名数据库 cyrg202509 为 cyrg2025
PRINT '正在将 cyrg202509 重命名为 cyrg2025...'

ALTER DATABASE [cyrg202509] MODIFY NAME = [cyrg2025];

PRINT '数据库重命名完成'

-- 验证重命名结果
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    PRINT '✅ 数据库覆盖操作成功完成！'
    PRINT 'cyrg202509 已成功重命名为 cyrg2025'
END
ELSE
BEGIN
    PRINT '❌ 数据库覆盖操作失败！'
    PRINT 'cyrg2025 数据库不存在'
END
"

echo "执行数据库覆盖操作..."
if sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -C -Q "$COVER_SQL"; then
    echo "✅ 数据库覆盖操作执行完成"
else
    echo "❌ 数据库覆盖操作执行失败"
    exit 1
fi

# 4. 验证覆盖结果
echo ""
echo "4. 验证覆盖结果..."
echo "----------------------------------------"

VERIFY_SQL="
-- 验证数据库是否存在
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    PRINT '✅ 数据库 cyrg2025 存在'
    
    -- 显示数据库基本信息
    USE [cyrg2025];
    
    SELECT 
        'cyrg2025' as '数据库名称',
        COUNT(*) as '表数量'
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE';
    
    SELECT 
        'cyrg2025' as '数据库名称',
        COUNT(*) as '列数量'
    FROM INFORMATION_SCHEMA.COLUMNS;
END
ELSE
BEGIN
    PRINT '❌ 数据库 cyrg2025 不存在'
END
"

echo "验证数据库覆盖结果..."
if sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -C -Q "$VERIFY_SQL"; then
    echo ""
    echo "✅ 数据库覆盖验证成功！"
else
    echo "❌ 数据库覆盖验证失败！"
    exit 1
fi

echo ""
echo "🎉 数据库覆盖操作完成！"
echo "cyrg202509 已成功覆盖 cyrg2025"
echo "============================================================"
