#!/bin/bash
# 本地Docker SQL Server数据库恢复脚本
# 恢复 cyrg2025 数据库

set -e

echo "==========================================="
echo "本地Docker SQL Server 数据库恢复脚本"
echo "==========================================="

# 配置
CONTAINER_NAME="yylkhotdog-sqlserver-1"
SA_PASSWORD="YourStrong@Passw0rd"
BACKUP_FILE="/Users/weijunyu/yylkhotdog/database/cyrg_backup_2025_10_11_170100.bak"
DATABASE_NAME="cyrg2025"

# 检查Docker容器是否运行
echo ""
echo "1. 检查Docker容器状态..."
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ 错误: Docker容器 $CONTAINER_NAME 未运行"
    echo "请先启动Docker容器"
    exit 1
fi
echo "✅ Docker容器运行正常"

# 检查备份文件是否存在
echo ""
echo "2. 检查备份文件..."
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 错误: 备份文件不存在: $BACKUP_FILE"
    exit 1
fi
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ 备份文件存在"
echo "   文件: $BACKUP_FILE"
echo "   大小: $FILE_SIZE"

# 将备份文件复制到Docker容器
echo ""
echo "3. 复制备份文件到Docker容器..."
docker cp "$BACKUP_FILE" "$CONTAINER_NAME:/var/opt/mssql/backup/cyrg2025.bak"
echo "✅ 备份文件复制成功"

# 获取备份文件中的逻辑文件名
echo ""
echo "4. 检查备份文件信息..."
docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "$SA_PASSWORD" -C \
    -Q "RESTORE FILELISTONLY FROM DISK = '/var/opt/mssql/backup/cyrg2025.bak'" \
    | head -5

# 删除现有数据库（如果存在）
echo ""
echo "5. 准备恢复数据库..."
docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "$SA_PASSWORD" -C \
    -Q "IF EXISTS (SELECT name FROM sys.databases WHERE name = '$DATABASE_NAME') 
        BEGIN 
            ALTER DATABASE [$DATABASE_NAME] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; 
            DROP DATABASE [$DATABASE_NAME]; 
            PRINT '已删除现有数据库';
        END 
        ELSE 
            PRINT '数据库不存在，将创建新数据库';" 2>&1 | grep -v "Changed database context"

# 恢复数据库
echo ""
echo "6. 恢复数据库..."
echo "   这可能需要几分钟时间，请耐心等待..."

docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "$SA_PASSWORD" -C \
    -Q "RESTORE DATABASE [$DATABASE_NAME] 
        FROM DISK = '/var/opt/mssql/backup/cyrg2025.bak'
        WITH 
            MOVE 'cyrg' TO '/var/opt/mssql/data/${DATABASE_NAME}.mdf',
            MOVE 'cyrg_log' TO '/var/opt/mssql/data/${DATABASE_NAME}_log.ldf',
            REPLACE,
            STATS = 10;" 2>&1

# 验证数据库恢复
echo ""
echo "7. 验证数据库恢复..."
docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "$SA_PASSWORD" -C \
    -d "$DATABASE_NAME" \
    -Q "SELECT 
            DB_NAME() as database_name,
            COUNT(*) as table_count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE';" \
    -W

# 列出部分表名
echo ""
echo "8. 数据库表列表（前10个）:"
docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "$SA_PASSWORD" -C \
    -d "$DATABASE_NAME" \
    -Q "SELECT TOP 10 TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME" \
    -h -1

# 清理临时文件
echo ""
echo "9. 清理临时文件..."
docker exec "$CONTAINER_NAME" rm -f /var/opt/mssql/backup/cyrg2025.bak
echo "✅ 临时文件清理完成"

echo ""
echo "==========================================="
echo "🎉 数据库恢复完成！"
echo "==========================================="
echo "数据库名称: $DATABASE_NAME"
echo "可以通过以下方式访问:"
echo "  - 主机: localhost"
echo "  - 端口: 1433"
echo "  - 用户: sa"
echo "  - 数据库: $DATABASE_NAME"
echo "==========================================="
