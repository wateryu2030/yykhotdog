#!/bin/bash

echo "🚀 设置本地开发环境..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

echo "📦 启动SQL Server容器..."
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Passw0rd" \
   -p 1433:1433 --name sqlserver-local \
   -d mcr.microsoft.com/mssql/server:2022-latest

# 等待SQL Server启动
echo "⏳ 等待SQL Server启动..."
sleep 30

# 检查容器是否运行
if docker ps | grep -q sqlserver-local; then
    echo "✅ SQL Server容器启动成功"
else
    echo "❌ SQL Server容器启动失败"
    exit 1
fi

# 创建环境配置文件
echo "📝 创建环境配置文件..."
cat > .env.local << EOF
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
EOF

echo "✅ 环境配置文件已创建: .env.local"

# 安装依赖
echo "📦 安装项目依赖..."
npm install

echo "🎉 本地环境设置完成！"
echo ""
echo "下一步："
echo "1. 运行 'node test-local-db.js' 测试数据库连接"
echo "2. 运行 'npm run dev' 启动后端服务"
echo "3. 运行 'cd frontend && npm start' 启动前端服务"
echo ""
echo "数据库信息："
echo "- 主机: localhost"
echo "- 端口: 1433"
echo "- 用户名: sa"
echo "- 密码: YourStrong@Passw0rd"
