#!/bin/bash

# 热狗连锁店开发环境启动脚本
# 作者: AI Assistant
# 版本: 1.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查开发依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    # 检查Git
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装，请先安装 Git"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 加载环境变量
load_env() {
    log_info "加载开发环境配置..."
    
    if [ -f "dev.env" ]; then
        export $(cat dev.env | grep -v '^#' | xargs)
        log_success "环境变量加载完成"
    else
        log_warning "dev.env 文件不存在，使用默认配置"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 后端依赖
    if [ -d "backend" ]; then
        log_info "安装后端依赖..."
        cd backend
        npm install
        cd ..
    fi
    
    # 前端依赖
    if [ -d "frontend" ]; then
        log_info "安装前端依赖..."
        cd frontend
        npm install
        cd ..
    fi
    
    log_success "依赖安装完成"
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务..."
    
    cd backend
    
    # 编译TypeScript
    log_info "编译TypeScript..."
    npm run build
    
    # 启动服务
    log_info "启动后端服务 (端口: ${BACKEND_PORT:-3001})..."
    npm start &
    BACKEND_PID=$!
    
    cd ..
    
    # 等待服务启动
    sleep 3
    
    # 检查服务状态
    if curl -s http://localhost:${BACKEND_PORT:-3001}/health > /dev/null 2>&1; then
        log_success "后端服务启动成功"
    else
        log_warning "后端服务可能未完全启动，请检查日志"
    fi
}

# 启动前端服务
start_frontend() {
    log_info "启动前端服务..."
    
    cd frontend
    
    # 启动开发服务器
    log_info "启动前端开发服务器 (端口: ${FRONTEND_PORT:-3000})..."
    npm start &
    FRONTEND_PID=$!
    
    cd ..
    
    # 等待服务启动
    sleep 5
    
    log_success "前端服务启动成功"
}

# 显示服务信息
show_services() {
    log_info "服务启动完成！"
    echo ""
    echo "🌐 前端服务: http://localhost:${FRONTEND_PORT:-3000}"
    echo "🔧 后端API: http://localhost:${BACKEND_PORT:-3001}"
    echo "📚 API文档: http://localhost:${BACKEND_PORT:-3001}/api-docs"
    echo ""
    echo "📝 开发命令:"
    echo "  - 查看日志: tail -f backend/logs/app.log"
    echo "  - 重启后端: kill $BACKEND_PID && npm run dev:backend"
    echo "  - 重启前端: kill $FRONTEND_PID && npm run dev:frontend"
    echo ""
    echo "🛑 停止服务: Ctrl+C"
}

# 清理函数
cleanup() {
    log_info "正在停止服务..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    log_success "服务已停止"
    exit 0
}

# 主函数
main() {
    echo "🚀 热狗连锁店开发环境启动器"
    echo "================================"
    
    # 设置信号处理
    trap cleanup SIGINT SIGTERM
    
    # 执行启动流程
    check_dependencies
    load_env
    install_dependencies
    start_backend
    start_frontend
    show_services
    
    # 保持运行
    wait
}

# 运行主函数
main "$@"
