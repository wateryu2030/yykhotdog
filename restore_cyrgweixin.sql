
-- 恢复cyrgweixin数据库
USE master;

-- 删除现有数据库（如果存在）
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrgweixin')
BEGIN
    ALTER DATABASE [cyrgweixin] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrgweixin];
END

-- 恢复数据库
RESTORE DATABASE [cyrgweixin] 
FROM DISK = '/Users/apple/Ahope/yykhotdog/database/zhkj2025-10-24.bak'
WITH REPLACE;
