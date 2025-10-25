-- 数据库覆盖脚本
-- 用 cyrg202509 数据库覆盖 cyrg2025 数据库
-- 执行前请确保 cyrg202509 数据库存在

-- 1. 检查源数据库是否存在
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg202509')
BEGIN
    PRINT '错误: 源数据库 cyrg202509 不存在，无法执行覆盖操作'
    RETURN
END

PRINT '源数据库 cyrg202509 存在，开始覆盖操作...'

-- 2. 检查目标数据库是否存在，如果存在则删除
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    PRINT '目标数据库 cyrg2025 已存在，正在删除...'
    
    -- 断开所有连接到 cyrg2025 数据库的会话
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    
    -- 删除现有数据库
    DROP DATABASE [cyrg2025];
    
    PRINT '目标数据库 cyrg2025 已删除'
END
ELSE
BEGIN
    PRINT '目标数据库 cyrg2025 不存在，可以直接重命名'
END

-- 3. 重命名数据库 cyrg202509 为 cyrg2025
PRINT '正在将 cyrg202509 重命名为 cyrg2025...'

ALTER DATABASE [cyrg202509] MODIFY NAME = [cyrg2025];

PRINT '数据库重命名完成'

-- 4. 验证重命名结果
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    PRINT '✅ 数据库覆盖操作成功完成！'
    PRINT 'cyrg202509 已成功重命名为 cyrg2025'
    
    -- 显示数据库信息
    USE [cyrg2025];
    
    SELECT 
        'cyrg2025' as '数据库名称',
        COUNT(*) as '表数量'
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE';
    
    SELECT 
        'cyrg2025' as '数据库名称',
        COUNT(*) as '列数量'
    FROM INFORMATION_SCHEMA.COLUMNS;
END
ELSE
BEGIN
    PRINT '❌ 数据库覆盖操作失败！'
    PRINT 'cyrg2025 数据库不存在'
END

PRINT '脚本执行完成'
