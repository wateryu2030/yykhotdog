#!/bin/bash
# 数据库恢复脚本 - macOS版本
# 用于从备份文件恢复 cyrg2025 和 cyrgweixin 数据库

# 数据库连接参数
SERVER="rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com,1433"
USERNAME="hotdog"
PASSWORD="Zhkj@62102218"

# 备份文件路径
CYRG_BACKUP="/Users/weijunyu/zhhotdog/database/cyrg_backup_2025_09_09_000004_9004235.bak"
ZHKJ_BACKUP="/Users/weijunyu/zhhotdog/database/zhkj_backup_2025_09_09_000002_6761311.bak"

echo "开始数据库恢复操作..."
echo "============================================================"

# 检查备份文件是否存在
if [ ! -f "$CYRG_BACKUP" ]; then
    echo "❌ 错误: cyrg备份文件不存在: $CYRG_BACKUP"
    exit 1
fi

if [ ! -f "$ZHKJ_BACKUP" ]; then
    echo "❌ 错误: zhkj备份文件不存在: $ZHKJ_BACKUP"
    exit 1
fi

echo "✅ 备份文件检查通过"

# 1. 恢复 cyrg2025 数据库
echo ""
echo "1. 恢复 cyrg2025 数据库"
echo "----------------------------------------"

CYRG_SQL="
-- 删除现有数据库
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrg2025];
END

-- 恢复数据库
RESTORE DATABASE [cyrg2025] 
FROM DISK = '$CYRG_BACKUP'
WITH 
    MOVE 'cyrg' TO '/var/opt/mssql/data/cyrg2025.mdf',
    MOVE 'cyrg_log' TO '/var/opt/mssql/data/cyrg2025_log.ldf',
    REPLACE;
"

echo "执行 cyrg2025 数据库恢复..."
if sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -Q "$CYRG_SQL"; then
    echo "✅ cyrg2025 数据库恢复成功！"
else
    echo "❌ cyrg2025 数据库恢复失败！"
    exit 1
fi

# 2. 恢复 cyrgweixin 数据库
echo ""
echo "2. 恢复 cyrgweixin 数据库"
echo "----------------------------------------"

ZHKJ_SQL="
-- 删除现有数据库
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrgweixin')
BEGIN
    ALTER DATABASE [cyrgweixin] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrgweixin];
END

-- 恢复数据库
RESTORE DATABASE [cyrgweixin] 
FROM DISK = '$ZHKJ_BACKUP'
WITH 
    MOVE 'zhkj' TO '/var/opt/mssql/data/cyrgweixin.mdf',
    MOVE 'zhkj_log' TO '/var/opt/mssql/data/cyrgweixin_log.ldf',
    REPLACE;
"

echo "执行 cyrgweixin 数据库恢复..."
if sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -Q "$ZHKJ_SQL"; then
    echo "✅ cyrgweixin 数据库恢复成功！"
else
    echo "❌ cyrgweixin 数据库恢复失败！"
    exit 1
fi

# 3. 验证数据库恢复结果
echo ""
echo "3. 验证数据库恢复结果"
echo "----------------------------------------"

VERIFY_SQL="
SELECT 
    name as '数据库名称',
    database_id as '数据库ID',
    create_date as '创建日期'
FROM sys.databases 
WHERE name IN ('cyrg2025', 'cyrgweixin')
ORDER BY name;
"

echo "验证数据库恢复结果..."
if sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -Q "$VERIFY_SQL"; then
    echo ""
    echo "✅ 数据库恢复验证成功！"
else
    echo "❌ 数据库恢复验证失败！"
    exit 1
fi

echo ""
echo "🎉 所有数据库恢复操作完成！"
echo "============================================================"
