-- 清理数据库扩展属性的SQL脚本
-- 请在SQL Server Management Studio中执行此脚本

USE [cyrg2025]
GO

-- 方法1: 删除所有MS_Description扩展属性
DECLARE @sql NVARCHAR(MAX) = '';

SELECT @sql = @sql + 
    'EXEC sp_dropextendedproperty @name = ''MS_Description'', @level0type = ''' + 
    level0type + ''', @level0name = ''' + level0name + ''';' + CHAR(13)
FROM sys.extended_properties
WHERE class = 1 AND name = 'MS_Description';

PRINT '删除MS_Description扩展属性:';
PRINT @sql;
EXEC sp_executesql @sql;
GO

-- 方法2: 删除所有其他扩展属性
DECLARE @sql2 NVARCHAR(MAX) = '';

SELECT @sql2 = @sql2 + 
    'EXEC sp_dropextendedproperty @name = ''' + name + ''', @level0type = ''' + 
    level0type + ''', @level0name = ''' + level0name + ''';' + CHAR(13)
FROM sys.extended_properties
WHERE class = 1 AND name != 'MS_Description';

PRINT '删除其他扩展属性:';
PRINT @sql2;
EXEC sp_executesql @sql2;
GO

-- 方法3: 强制删除所有扩展属性（更激进的方法）
DECLARE @sql3 NVARCHAR(MAX) = '';

SELECT @sql3 = @sql3 + 
    'BEGIN TRY ' + CHAR(13) +
    'EXEC sp_dropextendedproperty @name = ''' + name + ''', @level0type = ''' + 
    level0type + ''', @level0name = ''' + level0name + ''';' + CHAR(13) +
    'PRINT ''Deleted: ' + name + ' on ' + level0name + ''';' + CHAR(13) +
    'END TRY ' + CHAR(13) +
    'BEGIN CATCH ' + CHAR(13) +
    'PRINT ''Failed to delete: ' + name + ' on ' + level0name + ' - '' + ERROR_MESSAGE();' + CHAR(13) +
    'END CATCH' + CHAR(13)
FROM sys.extended_properties
WHERE class = 1;

PRINT '强制删除所有扩展属性:';
EXEC sp_executesql @sql3;
GO

-- 验证结果
SELECT COUNT(*) as remaining_properties
FROM sys.extended_properties
WHERE class = 1;
GO 