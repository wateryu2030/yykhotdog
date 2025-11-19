#!/bin/bash
# 使用Docker容器运行sqlcmd进行数据库恢复
# 恢复新的备份文件到RDS

echo "============================================================"
echo "🐳 使用Docker容器运行sqlcmd进行数据库恢复..."
echo "============================================================"

# 备份文件路径
CYRG_BACKUP="/Users/apple/Ahope/yykhotdog/database/cyrg20251117.bak"
ZHKJ_BACKUP="/Users/apple/Ahope/yykhotdog/database/zhkj20251117.bak"

# RDS连接参数
SERVER="rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com,1433"
USERNAME="hotdog"
PASSWORD="Zhkj@62102218"

# 检查备份文件
if [ ! -f "$CYRG_BACKUP" ]; then
    echo "❌ cyrg备份文件不存在: $CYRG_BACKUP"
    exit 1
fi

if [ ! -f "$ZHKJ_BACKUP" ]; then
    echo "❌ zhkj备份文件不存在: $ZHKJ_BACKUP"
    exit 1
fi

echo "✅ 备份文件检查通过"

# 启动SQL Server工具容器
echo ""
echo "1. 启动SQL Server工具容器..."
docker-compose -f /Users/apple/Ahope/yykhotdog/docker-sqlcmd.yml up -d

# 等待容器启动
echo "2. 等待容器启动..."
sleep 10

# 检查容器状态
echo "3. 检查容器状态..."
if ! docker ps | grep -q yykhotdog_sqlcmd; then
    echo "❌ 容器启动失败"
    exit 1
fi

echo "✅ 容器运行正常"

# 检查备份文件信息，获取逻辑名称
echo ""
echo "============================================================"
echo "4. 检查备份文件信息"
echo "============================================================"

echo "检查 cyrg 备份文件信息..."
CYRG_INFO=$(docker exec yykhotdog_sqlcmd sqlcmd \
  -S "$SERVER" \
  -U "$USERNAME" \
  -P "$PASSWORD" \
  -Q "RESTORE FILELISTONLY FROM DISK = '/backup/cyrg20251117.bak'" \
  -h -1 -W 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ 无法读取cyrg备份文件信息"
    exit 1
fi

# 提取逻辑名称（第一列，数据文件，类型为D）
CYRG_LOGICAL=$(echo "$CYRG_INFO" | grep -E "^[A-Za-z]" | grep -E "D[[:space:]]" | head -1 | awk '{print $1}')
echo "cyrg逻辑名称: $CYRG_LOGICAL"

echo ""
echo "检查 zhkj 备份文件信息..."
ZHKJ_INFO=$(docker exec yykhotdog_sqlcmd sqlcmd \
  -S "$SERVER" \
  -U "$USERNAME" \
  -P "$PASSWORD" \
  -Q "RESTORE FILELISTONLY FROM DISK = '/backup/zhkj20251117.bak'" \
  -h -1 -W 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ 无法读取zhkj备份文件信息"
    exit 1
fi

# 提取逻辑名称（第一列，数据文件，类型为D）
ZHKJ_LOGICAL=$(echo "$ZHKJ_INFO" | grep -E "^[A-Za-z]" | grep -E "D[[:space:]]" | head -1 | awk '{print $1}')
echo "zhkj逻辑名称: $ZHKJ_LOGICAL"

# 恢复 cyrg2025 数据库
echo ""
echo "============================================================"
echo "5. 恢复 cyrg2025 数据库"
echo "============================================================"

CYRG_SQL="
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrg2025];
END

RESTORE DATABASE [cyrg2025] 
FROM DISK = '/backup/cyrg20251117.bak'
WITH 
    MOVE '$CYRG_LOGICAL' TO '/var/opt/mssql/data/cyrg2025.mdf',
    MOVE '${CYRG_LOGICAL}_log' TO '/var/opt/mssql/data/cyrg2025_log.ldf',
    REPLACE;
"

echo "执行 cyrg2025 数据库恢复..."
if docker exec yykhotdog_sqlcmd sqlcmd \
  -S "$SERVER" \
  -U "$USERNAME" \
  -P "$PASSWORD" \
  -Q "$CYRG_SQL"; then
    echo "✅ cyrg2025 数据库恢复成功！"
else
    echo "❌ cyrg2025 数据库恢复失败！"
    docker-compose -f /Users/apple/Ahope/yykhotdog/docker-sqlcmd.yml down
    exit 1
fi

# 恢复 cyrgweixin 数据库
echo ""
echo "============================================================"
echo "6. 恢复 cyrgweixin 数据库"
echo "============================================================"

CYRGWEIXIN_SQL="
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrgweixin')
BEGIN
    ALTER DATABASE [cyrgweixin] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrgweixin];
END

RESTORE DATABASE [cyrgweixin] 
FROM DISK = '/backup/zhkj20251117.bak'
WITH 
    MOVE '$ZHKJ_LOGICAL' TO '/var/opt/mssql/data/cyrgweixin.mdf',
    MOVE '${ZHKJ_LOGICAL}_log' TO '/var/opt/mssql/data/cyrgweixin_log.ldf',
    REPLACE;
"

echo "执行 cyrgweixin 数据库恢复..."
if docker exec yykhotdog_sqlcmd sqlcmd \
  -S "$SERVER" \
  -U "$USERNAME" \
  -P "$PASSWORD" \
  -Q "$CYRGWEIXIN_SQL"; then
    echo "✅ cyrgweixin 数据库恢复成功！"
else
    echo "❌ cyrgweixin 数据库恢复失败！"
    docker-compose -f /Users/apple/Ahope/yykhotdog/docker-sqlcmd.yml down
    exit 1
fi

# 验证恢复结果
echo ""
echo "============================================================"
echo "7. 验证数据库恢复结果"
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
if docker exec yykhotdog_sqlcmd sqlcmd \
  -S "$SERVER" \
  -U "$USERNAME" \
  -P "$PASSWORD" \
  -Q "$VERIFY_SQL"; then
    echo ""
    echo "✅ 数据库恢复验证成功！"
else
    echo "❌ 数据库恢复验证失败！"
    docker-compose -f /Users/apple/Ahope/yykhotdog/docker-sqlcmd.yml down
    exit 1
fi

# 清理容器
echo ""
echo "8. 清理容器..."
docker-compose -f /Users/apple/Ahope/yykhotdog/docker-sqlcmd.yml down

echo ""
echo "============================================================"
echo "🎉 所有数据库恢复操作完成！"
echo "============================================================"
echo ""
echo "下一步: 需要将数据同步到hotdog2030数据库"

