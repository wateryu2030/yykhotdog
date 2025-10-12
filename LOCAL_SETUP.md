# 本地开发环境设置指南

## 数据库配置

### 1. 安装本地SQL Server

#### 使用Docker (推荐)
```bash
# 启动SQL Server容器
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Passw0rd" \
   -p 1433:1433 --name sqlserver \
   -d mcr.microsoft.com/mssql/server:2022-latest
```

#### 或使用Docker Compose
```bash
# 在项目根目录运行
docker-compose up -d sqlserver
```

### 2. 环境变量配置

创建 `.env.local` 文件：

```env
# 本地开发环境配置
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# 数据库配置 (本地MSSQL)
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=YourStrong@Passw0rd
DB_NAME=hotdog2030

# 货物数据库配置 (本地MSSQL)
CARGO_DB_HOST=localhost
CARGO_DB_PORT=1433
CARGO_DB_USER=sa
CARGO_DB_PASSWORD=YourStrong@Passw0rd
CARGO_DB_NAME=cyrg2025

# JWT配置
JWT_SECRET=zhhotdog_jwt_secret_key_2024_local_development
JWT_EXPIRES_IN=7d

# 日志配置
LOG_LEVEL=debug

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

### 3. 数据库初始化

1. 连接到本地SQL Server
2. 创建数据库：
   ```sql
   CREATE DATABASE hotdog2030;
   CREATE DATABASE cyrg2025;
   ```

3. 运行数据库初始化脚本（如果有的话）

### 4. 启动服务

```bash
# 安装依赖
npm install

# 启动后端服务
cd backend
npm run dev

# 启动前端服务
cd frontend
npm start
```

### 5. 验证连接

运行测试脚本验证数据库连接：
```bash
node test/test-sqlserver.js
```

## 注意事项

1. 确保SQL Server服务正在运行
2. 检查防火墙设置，确保1433端口可访问
3. 如果使用Docker，确保容器正在运行
4. 密码需要符合SQL Server的密码策略要求
