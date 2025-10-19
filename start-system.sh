#!/bin/bash

# 热狗管理系统启动脚本
echo "🚀 启动热狗管理系统..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

# 启动数据库容器
echo "📊 启动SQL Server数据库..."
docker-compose up -d

# 等待数据库启动
echo "⏳ 等待数据库启动..."
sleep 10

# 启动后端服务
echo "🔧 启动后端服务..."
cd backend
npm install
npm run dev &
BACKEND_PID=$!

# 等待后端启动
sleep 5

# 启动前端服务
echo "🎨 启动前端服务..."
cd ../frontend
npm install
npm start &
FRONTEND_PID=$!

echo "✅ 系统启动完成!"
echo "📱 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:3001"
echo "📊 数据库地址: localhost:1433"
echo ""
echo "🎯 ETL数据同步功能已集成到前端系统："
echo "   1. 访问 http://localhost:3000"
echo "   2. 在侧边栏找到 'ETL数据同步' 菜单"
echo "   3. 可以可视化执行ETL步骤"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
wait
