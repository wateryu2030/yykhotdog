# 数据库恢复和初始化指南

## 前提条件

1. **启动Docker Desktop**
   - 打开Docker Desktop应用程序
   - 等待Docker完全启动

2. **安装必要工具**
   ```bash
   # 安装Python依赖
   pip3 install pyodbc
   
   # 安装SQL Server命令行工具 (macOS)
   brew install mssql-tools
   ```

## 方法一：使用自动化脚本（推荐）

### 1. 启动SQL Server容器
```bash
# 启动SQL Server容器
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Passw0rd" \
   -p 1433:1433 --name sqlserver-local \
   -d mcr.microsoft.com/mssql/server:2022-latest

# 检查容器状态
docker ps | grep sqlserver-local
```

### 2. 运行自动化脚本
```bash
# 运行完整的恢复和初始化脚本
./restore-and-init-all.sh
```

## 方法二：手动操作

### 1. 启动SQL Server容器
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Passw0rd" \
   -p 1433:1433 --name sqlserver-local \
   -d mcr.microsoft.com/mssql/server:2022-latest
```

### 2. 等待SQL Server启动
```bash
# 等待30秒让SQL Server完全启动
sleep 30

# 测试连接
docker exec -it sqlserver-local /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -Q "SELECT @@VERSION"
```

### 3. 恢复数据库

#### 使用Python脚本
```bash
python3 restore-local-databases.py
```

#### 或使用SQL脚本
```bash
# 将SQL脚本复制到容器中
docker cp restore-local-databases.sql sqlserver-local:/tmp/

# 在容器中执行SQL脚本
docker exec -it sqlserver-local /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -i /tmp/restore-local-databases.sql
```

### 4. 初始化hotdog2030数据库
```bash
# 将初始化脚本复制到容器中
docker cp init-hotdog2030.sql sqlserver-local:/tmp/

# 在容器中执行初始化脚本
docker exec -it sqlserver-local /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -i /tmp/init-hotdog2030.sql
```

### 5. 验证数据库
```bash
# 验证所有数据库
docker exec -it sqlserver-local /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -Q "
SELECT 
    name as '数据库名称',
    database_id as '数据库ID',
    create_date as '创建日期'
FROM sys.databases 
WHERE name IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
ORDER BY name
"
```

## 方法三：使用SQL Server Management Studio (SSMS)

如果您有SSMS，可以：

1. 连接到 `localhost,1433`
2. 用户名：`sa`，密码：`YourStrong@Passw0rd`
3. 执行 `restore-local-databases.sql` 脚本
4. 执行 `init-hotdog2030.sql` 脚本

## 验证恢复结果

### 1. 检查数据库列表
```sql
SELECT name FROM sys.databases 
WHERE name IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
ORDER BY name
```

### 2. 检查cyrg2025表结构
```sql
USE cyrg2025
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME
```

### 3. 检查cyrgweixin表结构
```sql
USE cyrgweixin
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME
```

### 4. 检查hotdog2030表结构
```sql
USE hotdog2030
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME
```

## 故障排除

### 1. Docker相关问题
- 确保Docker Desktop正在运行
- 检查端口1433是否被占用：`lsof -i :1433`
- 如果端口被占用，停止其他服务或使用不同端口

### 2. 连接问题
- 检查SQL Server是否完全启动：`docker logs sqlserver-local`
- 验证密码是否正确
- 检查防火墙设置

### 3. 恢复问题
- 检查备份文件是否存在
- 验证备份文件路径是否正确
- 检查磁盘空间是否充足

### 4. 权限问题
- 确保使用sa用户
- 检查数据库权限设置

## 下一步

恢复完成后：

1. **测试连接**
   ```bash
   node test-local-db.js
   ```

2. **启动应用程序**
   ```bash
   # 后端
   cd backend
   npm run dev
   
   # 前端
   cd frontend
   npm start
   ```

3. **验证功能**
   - 检查数据库连接
   - 测试API接口
   - 验证数据同步功能
