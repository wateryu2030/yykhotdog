
-- 恢复cyrg2025数据库
USE master;

-- 删除现有数据库（如果存在）
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrg2025];
END

-- 恢复数据库
RESTORE DATABASE [cyrg2025] 
FROM DISK = '/Users/apple/Ahope/yykhotdog/database/cyrg2025-10-24.bak'
WITH REPLACE;
