-- ============================================================
-- 数据库恢复SQL脚本
-- 备份文件: cyrg20251117.bak, zhkj20251117.bak
-- 目标: cyrg2025, cyrgweixin
-- ============================================================

-- ============================================================
-- 1. 检查备份文件信息
-- ============================================================

-- 检查 cyrg 备份文件
RESTORE FILELISTONLY FROM DISK = '/Users/apple/Ahope/yykhotdog/database/cyrg20251117.bak';

-- 检查 zhkj 备份文件
RESTORE FILELISTONLY FROM DISK = '/Users/apple/Ahope/yykhotdog/database/zhkj20251117.bak';

-- ============================================================
-- 2. 恢复 cyrg2025 数据库
-- ============================================================

-- 删除现有数据库
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrg2025];
END
GO

-- 恢复数据库
-- 注意：逻辑名称可能需要根据上面的FILELISTONLY结果调整
RESTORE DATABASE [cyrg2025] 
FROM DISK = '/Users/apple/Ahope/yykhotdog/database/cyrg20251117.bak'
WITH 
    MOVE 'cyrg' TO '/var/opt/mssql/data/cyrg2025.mdf',
    MOVE 'cyrg_log' TO '/var/opt/mssql/data/cyrg2025_log.ldf',
    REPLACE;
GO

-- ============================================================
-- 3. 恢复 cyrgweixin 数据库
-- ============================================================

-- 删除现有数据库
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrgweixin')
BEGIN
    ALTER DATABASE [cyrgweixin] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrgweixin];
END
GO

-- 恢复数据库
-- 注意：逻辑名称可能需要根据上面的FILELISTONLY结果调整
RESTORE DATABASE [cyrgweixin] 
FROM DISK = '/Users/apple/Ahope/yykhotdog/database/zhkj20251117.bak'
WITH 
    MOVE 'zhkj' TO '/var/opt/mssql/data/cyrgweixin.mdf',
    MOVE 'zhkj_log' TO '/var/opt/mssql/data/cyrgweixin_log.ldf',
    REPLACE;
GO

-- ============================================================
-- 4. 验证恢复结果
-- ============================================================

SELECT 
    name as '数据库名称',
    database_id as '数据库ID',
    create_date as '创建日期'
FROM sys.databases 
WHERE name IN ('cyrg2025', 'cyrgweixin')
ORDER BY name;
GO

