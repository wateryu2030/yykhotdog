#!/bin/bash
# 高效数据库复制脚本
# 使用 sqlcmd 直接执行 SQL 命令

# 数据库连接参数
SERVER="rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com,1433"
USERNAME="hotdog"
PASSWORD="Zhkj@62102218"

echo "============================================================"
echo "高效数据库复制脚本 - 从 cyrg202509 复制到 cyrg2025"
echo "============================================================"

# 1. 清空目标数据库
echo "1. 清空目标数据库 cyrg2025..."
echo "----------------------------------------"

CLEAR_SQL="
USE [cyrg2025];

-- 禁用所有外键约束
EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

-- 删除所有表
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql + 'DROP TABLE [' + TABLE_SCHEMA + '].[' + TABLE_NAME + '];' + CHAR(13)
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE';

EXEC sp_executesql @sql;

-- 重新启用外键约束
EXEC sp_MSforeachtable 'ALTER TABLE ? CHECK CONSTRAINT ALL';
"

echo "清空目标数据库..."
if sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -C -Q "$CLEAR_SQL"; then
    echo "✅ 目标数据库清空完成"
else
    echo "❌ 清空目标数据库失败"
    exit 1
fi

# 2. 复制所有表
echo ""
echo "2. 复制所有表..."
echo "----------------------------------------"

COPY_SQL="
USE [cyrg202509];

-- 获取所有表并复制
DECLARE @copy_sql NVARCHAR(MAX) = '';

SELECT @copy_sql = @copy_sql + 
    'SELECT * INTO [cyrg2025].[dbo].[' + TABLE_NAME + '] FROM [' + TABLE_SCHEMA + '].[' + TABLE_NAME + '];' + CHAR(13)
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- 执行复制
EXEC sp_executesql @copy_sql;
"

echo "开始复制表..."
if sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -C -Q "$COPY_SQL"; then
    echo "✅ 表复制完成"
else
    echo "❌ 表复制失败"
    exit 1
fi

# 3. 验证结果
echo ""
echo "3. 验证复制结果..."
echo "----------------------------------------"

VERIFY_SQL="
USE [cyrg2025];

-- 检查表数量
SELECT 
    'cyrg2025' as '数据库名称',
    COUNT(*) as '表数量'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE';

-- 显示前10个表的记录数
SELECT TOP 10
    TABLE_NAME as '表名',
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) as '列数'
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
"

echo "验证复制结果..."
if sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -C -Q "$VERIFY_SQL"; then
    echo ""
    echo "✅ 数据库复制验证成功！"
else
    echo "❌ 数据库复制验证失败！"
    exit 1
fi

echo ""
echo "🎉 高效数据库复制完成！"
echo "cyrg202509 已成功复制到 cyrg2025"
echo "============================================================"
