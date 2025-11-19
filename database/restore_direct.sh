#!/bin/bash
# 直接恢复数据库脚本 - 使用已知逻辑名称

# RDS连接参数
SERVER="rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com,1433"
USERNAME="hotdog"
PASSWORD="Zhkj@62102218"

echo "============================================================"
echo "开始数据库恢复操作..."
echo "============================================================"

# 恢复 cyrg2025 数据库
echo ""
echo "1. 恢复 cyrg2025 数据库"
echo "----------------------------------------"

CYRG_SQL="
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrg2025];
END

RESTORE DATABASE [cyrg2025] 
FROM DISK = '/backup/cyrg20251117.bak'
WITH 
    MOVE 'cyrg' TO '/var/opt/mssql/data/cyrg2025.mdf',
    MOVE 'cyrg_log' TO '/var/opt/mssql/data/cyrg2025_log.ldf',
    REPLACE;
"

echo "执行 cyrg2025 数据库恢复..."
if docker exec yykhotdog_sqlcmd /opt/mssql-tools/bin/sqlcmd \
  -S "$SERVER" \
  -U "$USERNAME" \
  -P "$PASSWORD" \
  -C \
  -Q "$CYRG_SQL" 2>&1; then
    echo "✅ cyrg2025 数据库恢复成功！"
else
    echo "❌ cyrg2025 数据库恢复失败，尝试其他逻辑名称..."
    
    # 尝试其他可能的逻辑名称
    CYRG_SQL2="
    RESTORE DATABASE [cyrg2025] 
    FROM DISK = '/backup/cyrg20251117.bak'
    WITH REPLACE;
    "
    
    echo "尝试使用默认路径恢复..."
    docker exec yykhotdog_sqlcmd /opt/mssql-tools/bin/sqlcmd \
      -S "$SERVER" \
      -U "$USERNAME" \
      -P "$PASSWORD" \
      -C \
      -Q "$CYRG_SQL2" 2>&1
fi

# 恢复 cyrgweixin 数据库
echo ""
echo "2. 恢复 cyrgweixin 数据库"
echo "----------------------------------------"

CYRGWEIXIN_SQL="
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrgweixin')
BEGIN
    ALTER DATABASE [cyrgweixin] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrgweixin];
END

RESTORE DATABASE [cyrgweixin] 
FROM DISK = '/backup/zhkj20251117.bak'
WITH 
    MOVE 'zhkj' TO '/var/opt/mssql/data/cyrgweixin.mdf',
    MOVE 'zhkj_log' TO '/var/opt/mssql/data/cyrgweixin_log.ldf',
    REPLACE;
"

echo "执行 cyrgweixin 数据库恢复..."
if docker exec yykhotdog_sqlcmd /opt/mssql-tools/bin/sqlcmd \
  -S "$SERVER" \
  -U "$USERNAME" \
  -P "$PASSWORD" \
  -C \
  -Q "$CYRGWEIXIN_SQL" 2>&1; then
    echo "✅ cyrgweixin 数据库恢复成功！"
else
    echo "❌ cyrgweixin 数据库恢复失败，尝试其他逻辑名称..."
    
    # 尝试其他可能的逻辑名称
    CYRGWEIXIN_SQL2="
    RESTORE DATABASE [cyrgweixin] 
    FROM DISK = '/backup/zhkj20251117.bak'
    WITH REPLACE;
    "
    
    echo "尝试使用默认路径恢复..."
    docker exec yykhotdog_sqlcmd /opt/mssql-tools/bin/sqlcmd \
      -S "$SERVER" \
      -U "$USERNAME" \
      -P "$PASSWORD" \
      -C \
      -Q "$CYRGWEIXIN_SQL2" 2>&1
fi

# 验证恢复结果
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
docker exec yykhotdog_sqlcmd /opt/mssql-tools/bin/sqlcmd \
  -S "$SERVER" \
  -U "$USERNAME" \
  -P "$PASSWORD" \
  -C \
  -Q "$VERIFY_SQL" 2>&1

echo ""
echo "============================================================"
echo "恢复操作完成"
echo "============================================================"

