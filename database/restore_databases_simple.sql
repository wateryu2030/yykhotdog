-- 数据库恢复脚本 - 简化版本
-- 请根据实际路径修改备份文件路径

-- 1. 恢复 cyrg2025 数据库
PRINT '开始恢复 cyrg2025 数据库...'

-- 删除现有数据库（如果存在）
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    PRINT '删除现有 cyrg2025 数据库...'
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrg2025];
END

-- 恢复 cyrg2025 数据库
PRINT '从备份文件恢复 cyrg2025 数据库...'
RESTORE DATABASE [cyrg2025] 
FROM DISK = 'C:\Users\weijunyu\zhhotdog\database\cyrg_backup_2025_09_09_000004_9004235.bak'
WITH 
    MOVE 'cyrg' TO 'C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\cyrg2025.mdf',
    MOVE 'cyrg_log' TO 'C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\cyrg2025_log.ldf',
    REPLACE;

PRINT 'cyrg2025 数据库恢复完成！'

-- 2. 恢复 cyrgweixin 数据库
PRINT '开始恢复 cyrgweixin 数据库...'

-- 删除现有数据库（如果存在）
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrgweixin')
BEGIN
    PRINT '删除现有 cyrgweixin 数据库...'
    ALTER DATABASE [cyrgweixin] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrgweixin];
END

-- 恢复 cyrgweixin 数据库
PRINT '从备份文件恢复 cyrgweixin 数据库...'
RESTORE DATABASE [cyrgweixin] 
FROM DISK = 'C:\Users\weijunyu\zhhotdog\database\zhkj_backup_2025_09_09_000002_6761311.bak'
WITH 
    MOVE 'zhkj' TO 'C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\cyrgweixin.mdf',
    MOVE 'zhkj_log' TO 'C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\cyrgweixin_log.ldf',
    REPLACE;

PRINT 'cyrgweixin 数据库恢复完成！'

-- 3. 验证数据库恢复结果
PRINT '验证数据库恢复结果...'
SELECT 
    name as '数据库名称',
    database_id as '数据库ID',
    create_date as '创建日期'
FROM sys.databases 
WHERE name IN ('cyrg2025', 'cyrgweixin')
ORDER BY name;

PRINT '数据库恢复操作完成！'
