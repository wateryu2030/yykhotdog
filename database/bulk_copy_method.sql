-- 批量复制方法
-- 适用于大数据量的表

-- 1. 创建临时存储过程来复制单个表
USE [cyrg2025];

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'CopyTableData')
    DROP PROCEDURE CopyTableData;
GO

CREATE PROCEDURE CopyTableData
    @SourceTable NVARCHAR(128),
    @TargetTable NVARCHAR(128)
AS
BEGIN
    DECLARE @sql NVARCHAR(MAX);
    
    -- 检查源表是否存在
    IF EXISTS (SELECT * FROM cyrg202509.INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @SourceTable)
    BEGIN
        -- 删除目标表（如果存在）
        SET @sql = 'IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ''' + @TargetTable + ''') DROP TABLE [' + @TargetTable + ']';
        EXEC sp_executesql @sql;
        
        -- 复制表结构和数据
        SET @sql = 'SELECT * INTO [' + @TargetTable + '] FROM [cyrg202509].[dbo].[' + @SourceTable + ']';
        EXEC sp_executesql @sql;
        
        PRINT '成功复制表: ' + @SourceTable;
    END
    ELSE
    BEGIN
        PRINT '源表不存在: ' + @SourceTable;
    END
END
GO

-- 2. 复制所有表
DECLARE @table_name NVARCHAR(128);
DECLARE table_cursor CURSOR FOR
    SELECT TABLE_NAME 
    FROM cyrg202509.INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME;

OPEN table_cursor;
FETCH NEXT FROM table_cursor INTO @table_name;

WHILE @@FETCH_STATUS = 0
BEGIN
    EXEC CopyTableData @table_name, @table_name;
    FETCH NEXT FROM table_cursor INTO @table_name;
END

CLOSE table_cursor;
DEALLOCATE table_cursor;

-- 3. 清理临时存储过程
DROP PROCEDURE CopyTableData;

-- 4. 验证结果
SELECT 
    'cyrg2025' as '数据库名称',
    COUNT(*) as '表数量'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE';
