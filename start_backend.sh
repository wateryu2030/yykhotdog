#!/bin/bash
cd /Users/apple/Ahope/yykhotdog/backend
export PATH="/Users/apple/.local/bin:/Users/apple/.homebrew/bin:$PATH"

echo "🔍 检查环境变量..."
source ../../.env
echo "DB_HOST: $DB_HOST"
echo "DB_PORT: $DB_PORT"
echo "DB_USERNAME: $DB_USERNAME"

echo "🚀 启动后端服务..."
npm run dev
