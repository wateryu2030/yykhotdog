#!/bin/bash

# Cursor守护进程启动脚本
echo "🚀 启动Cursor协同守护进程..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    exit 1
fi

# 检查pm2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装pm2..."
    npm install -g pm2
fi

# 设置环境变量
export REPO_DIR=$(pwd)
export CURSOR_CMD="run-auto-commit"
export POLL_MS=30000

echo "📁 仓库目录: $REPO_DIR"
echo "🔧 Cursor命令: $CURSOR_CMD"
echo "⏰ 轮询间隔: ${POLL_MS}ms"

# 启动守护进程
pm2 start scripts/cursor_daemon.mjs --name cursor-daemon -- \
  --time

echo "✅ Cursor守护进程已启动"
echo "📊 查看状态: pm2 status"
echo "📋 查看日志: pm2 logs cursor-daemon"
echo "🛑 停止服务: pm2 stop cursor-daemon"
