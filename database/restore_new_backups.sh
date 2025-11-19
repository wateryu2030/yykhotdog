#!/bin/bash
# 数据库恢复脚本 - 新备份文件版本
# 用于将新的备份文件恢复到RDS数据库
# - cyrg20251117.bak → cyrg2025
# - zhkj20251117.bak → cyrgweixin

# RDS数据库连接参数
SERVER="rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com,1433"
USERNAME="hotdog"
PASSWORD="Zhkj@62102218"

# 备份文件路径
CYRG_BACKUP="/Users/apple/Ahope/yykhotdog/database/cyrg20251117.bak"
ZHKJ_BACKUP="/Users/apple/Ahope/yykhotdog/database/zhkj20251117.bak"

echo "============================================================"
echo "开始数据库恢复操作到RDS..."
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
echo "cyrg备份文件: $CYRG_BACKUP"
echo "zhkj备份文件: $ZHKJ_BACKUP"

# 检查备份文件信息，获取逻辑名称
echo ""
echo "============================================================"
echo "1. 检查备份文件信息"
echo "============================================================"

echo "检查 cyrg 备份文件信息..."
CYRG_INFO=$(sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -Q "RESTORE FILELISTONLY FROM DISK = '$CYRG_BACKUP'" -h -1 -W 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ 无法读取cyrg备份文件信息"
    exit 1
fi

# 提取逻辑名称（第一列，数据文件）
CYRG_LOGICAL=$(echo "$CYRG_INFO" | grep -E "^[A-Za-z]" | head -1 | awk '{print $1}')
echo "cyrg逻辑名称: $CYRG_LOGICAL"

echo ""
echo "检查 zhkj 备份文件信息..."
ZHKJ_INFO=$(sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -Q "RESTORE FILELISTONLY FROM DISK = '$ZHKJ_BACKUP'" -h -1 -W 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ 无法读取zhkj备份文件信息"
    exit 1
fi

# 提取逻辑名称（第一列，数据文件）
ZHKJ_LOGICAL=$(echo "$ZHKJ_INFO" | grep -E "^[A-Za-z]" | head -1 | awk '{print $1}')
echo "zhkj逻辑名称: $ZHKJ_LOGICAL"

# 1. 恢复 cyrg2025 数据库
echo ""
echo "============================================================"
echo "2. 恢复 cyrg2025 数据库"
echo "============================================================"

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
    MOVE '$CYRG_LOGICAL' TO '/var/opt/mssql/data/cyrg2025.mdf',
    MOVE '${CYRG_LOGICAL}_log' TO '/var/opt/mssql/data/cyrg2025_log.ldf',
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
echo "============================================================"
echo "3. 恢复 cyrgweixin 数据库"
echo "============================================================"

CYRGWEIXIN_SQL="
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
    MOVE '$ZHKJ_LOGICAL' TO '/var/opt/mssql/data/cyrgweixin.mdf',
    MOVE '${ZHKJ_LOGICAL}_log' TO '/var/opt/mssql/data/cyrgweixin_log.ldf',
    REPLACE;
"

echo "执行 cyrgweixin 数据库恢复..."
if sqlcmd -S "$SERVER" -U "$USERNAME" -P "$PASSWORD" -Q "$CYRGWEIXIN_SQL"; then
    echo "✅ cyrgweixin 数据库恢复成功！"
else
    echo "❌ cyrgweixin 数据库恢复失败！"
    exit 1
fi

# 3. 验证数据库恢复结果
echo ""
echo "============================================================"
echo "4. 验证数据库恢复结果"
echo "============================================================"

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
echo "============================================================"
echo "🎉 所有数据库恢复操作完成！"
echo "============================================================"
echo ""
echo "下一步: 需要将数据同步到hotdog2030数据库"

