-- 数据库恢复脚本
-- 用于从备份文件恢复 cyrg2025 和 cyrgweixin 数据库

-- 1. 恢复 cyrg2025 数据库
-- 首先删除现有数据库（如果存在）
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrg2025];
END
GO

-- 从备份文件恢复 cyrg2025 数据库
RESTORE DATABASE [cyrg2025] 
FROM DISK = '/Users/weijunyu/zhhotdog/database/cyrg_backup_2025_09_09_000004_9004235.bak'
WITH 
    MOVE 'cyrg' TO '/var/opt/mssql/data/cyrg2025.mdf',
    MOVE 'cyrg_log' TO '/var/opt/mssql/data/cyrg2025_log.ldf',
    REPLACE;
GO

-- 2. 恢复 cyrgweixin 数据库
-- 首先删除现有数据库（如果存在）
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrgweixin')
BEGIN
    ALTER DATABASE [cyrgweixin] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrgweixin];
END
GO

-- 从备份文件恢复 cyrgweixin 数据库
RESTORE DATABASE [cyrgweixin] 
FROM DISK = '/Users/weijunyu/zhhotdog/database/zhkj_backup_2025_09_09_000002_6761311.bak'
WITH 
    MOVE 'zhkj' TO '/var/opt/mssql/data/cyrgweixin.mdf',
    MOVE 'zhkj_log' TO '/var/opt/mssql/data/cyrgweixin_log.ldf',
    REPLACE;
GO

-- 3. 验证数据库恢复
SELECT name, database_id, create_date 
FROM sys.databases 
WHERE name IN ('cyrg2025', 'cyrgweixin')
ORDER BY name;
GO
