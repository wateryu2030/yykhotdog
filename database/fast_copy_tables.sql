-- 高效数据库复制脚本
-- 使用 SELECT INTO 从 cyrg202509 复制到 cyrg2025

-- 1. 先删除目标数据库中的所有表（如果存在）
USE [cyrg2025];

-- 获取所有表名并生成删除脚本
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql + 'DROP TABLE IF EXISTS [' + TABLE_SCHEMA + '].[' + TABLE_NAME + '];' + CHAR(13)
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE';

-- 执行删除脚本
EXEC sp_executesql @sql;

-- 2. 复制所有表结构和数据
USE [cyrg202509];

-- 获取所有表并生成复制脚本
DECLARE @copy_sql NVARCHAR(MAX) = '';

SELECT @copy_sql = @copy_sql + 
    'SELECT * INTO [cyrg2025].[dbo].[' + TABLE_NAME + '] FROM [' + TABLE_SCHEMA + '].[' + TABLE_NAME + '];' + CHAR(13)
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- 执行复制脚本
EXEC sp_executesql @copy_sql;

-- 3. 验证复制结果
USE [cyrg2025];

SELECT 
    'cyrg2025' as '数据库名称',
    COUNT(*) as '表数量'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE';

-- 显示每个表的记录数
SELECT 
    TABLE_NAME as '表名',
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) as '列数'
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
