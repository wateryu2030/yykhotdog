-- 本地SQL Server数据库恢复脚本
-- 从.bak文件恢复数据库到本地SQL Server

-- 1. 恢复cyrg2025数据库
PRINT '正在恢复cyrg2025数据库...'

-- 删除现有数据库（如果存在）
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE
    DROP DATABASE [cyrg2025]
    PRINT '已删除现有cyrg2025数据库'
END

-- 从备份文件恢复
RESTORE DATABASE [cyrg2025] 
FROM DISK = '/Users/weijunyu/yylkhotdog/database/cyrg_backup_2025_09_09_000004_9004235.bak'
WITH REPLACE,
MOVE 'cyrg2025' TO '/var/opt/mssql/data/cyrg2025.mdf',
MOVE 'cyrg2025_log' TO '/var/opt/mssql/data/cyrg2025_log.ldf'

PRINT 'cyrg2025数据库恢复完成'

-- 2. 恢复cyrgweixin数据库
PRINT '正在恢复cyrgweixin数据库...'

-- 删除现有数据库（如果存在）
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrgweixin')
BEGIN
    ALTER DATABASE [cyrgweixin] SET SINGLE_USER WITH ROLLBACK IMMEDIATE
    DROP DATABASE [cyrgweixin]
    PRINT '已删除现有cyrgweixin数据库'
END

-- 从备份文件恢复
RESTORE DATABASE [cyrgweixin] 
FROM DISK = '/Users/weijunyu/yylkhotdog/database/zhkj_backup_2025_09_09_000002_6761311.bak'
WITH REPLACE,
MOVE 'zhkj' TO '/var/opt/mssql/data/cyrgweixin.mdf',
MOVE 'zhkj_log' TO '/var/opt/mssql/data/cyrgweixin_log.ldf'

PRINT 'cyrgweixin数据库恢复完成'

-- 3. 创建hotdog2030数据库
PRINT '正在创建hotdog2030数据库...'

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'hotdog2030')
BEGIN
    CREATE DATABASE [hotdog2030]
    PRINT 'hotdog2030数据库创建完成'
END
ELSE
BEGIN
    PRINT 'hotdog2030数据库已存在'
END

-- 4. 验证数据库
PRINT '验证数据库...'
SELECT 
    name as '数据库名称',
    database_id as '数据库ID',
    create_date as '创建日期'
FROM sys.databases 
WHERE name IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
ORDER BY name

PRINT '数据库恢复完成！'
