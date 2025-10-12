#!/bin/bash

# 全国智能化热狗管理平台启动脚本

echo "=========================================="
echo "全国智能化热狗管理平台"
echo "基于阿里云RDS+MaxCompute的智能化管理平台"
echo "=========================================="

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker未安装，请先安装Docker"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "创建环境变量文件..."
    cp backend/env.example .env
    echo "请编辑.env文件，配置数据库和阿里云信息"
    echo "然后重新运行此脚本"
    exit 1
fi

# 创建必要的目录
echo "创建必要的目录..."
mkdir -p backend/logs
mkdir -p backend/uploads
mkdir -p frontend/build

# 安装依赖
echo "安装后端依赖..."
cd backend && npm install && cd ..

echo "安装前端依赖..."
cd frontend && npm install && cd ..

# 构建并启动服务
echo "构建并启动服务..."
docker-compose up -d --build

# 等待服务启动
echo "等待服务启动..."
sleep 30

# 检查服务状态
echo "检查服务状态..."
docker-compose ps

echo "=========================================="
echo "系统启动完成！"
echo "前端地址: http://localhost:3000"
echo "后端API: http://localhost:3001"
echo "API文档: http://localhost:3001/api-docs"
echo "=========================================="

echo "常用命令:"
echo "查看日志: docker-compose logs -f"
echo "停止服务: docker-compose down"
echo "重启服务: docker-compose restart"
echo "==========================================" 