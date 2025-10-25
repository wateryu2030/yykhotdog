#!/bin/bash
# 使用Docker容器运行sqlcmd进行数据库恢复

echo "🐳 使用Docker容器运行sqlcmd..."

# 启动SQL Server工具容器
echo "1. 启动SQL Server工具容器..."
docker-compose -f docker-sqlcmd.yml up -d

# 等待容器启动
echo "2. 等待容器启动..."
sleep 10

# 检查容器状态
echo "3. 检查容器状态..."
docker ps | grep yykhotdog_sqlcmd

# 进入容器执行恢复命令
echo "4. 执行数据库恢复..."

# 恢复cyrg2025数据库
echo "恢复cyrg2025数据库..."
docker exec -it yykhotdog_sqlcmd sqlcmd \
  -S rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com,1433 \
  -U hotdog \
  -P 'Zhkj@62102218' \
  -Q "
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrg2025];
END

RESTORE DATABASE [cyrg2025] 
FROM DISK = '/backup/cyrg2025-10-24.bak'
WITH REPLACE;
"

# 恢复hotdog2030数据库
echo "恢复hotdog2030数据库..."
docker exec -it yykhotdog_sqlcmd sqlcmd \
  -S rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com,1433 \
  -U hotdog \
  -P 'Zhkj@62102218' \
  -Q "
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'hotdog2030')
BEGIN
    ALTER DATABASE [hotdog2030] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [hotdog2030];
END

RESTORE DATABASE [hotdog2030] 
FROM DISK = '/backup/zhkj2025-10-24.bak'
WITH REPLACE;
"

# 验证恢复结果
echo "5. 验证恢复结果..."
docker exec -it yykhotdog_sqlcmd sqlcmd \
  -S rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com,1433 \
  -U hotdog \
  -P 'Zhkj@62102218' \
  -Q "
SELECT 
    name as '数据库名称',
    database_id as '数据库ID',
    create_date as '创建日期'
FROM sys.databases 
WHERE name IN ('cyrg2025', 'hotdog2030')
ORDER BY name;
"

echo "✅ 数据库恢复完成！"

# 清理容器
echo "6. 清理容器..."
docker-compose -f docker-sqlcmd.yml down
