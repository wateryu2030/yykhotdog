#!/bin/bash

# 智能热狗管理平台部署脚本
# 作者: AI Assistant
# 日期: 2024-07-13

set -e

echo "🚀 开始部署智能热狗管理平台..."

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

# 检查Docker是否安装
check_docker() {
    log_info "检查Docker环境..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    log_success "Docker环境检查通过"
}

# 检查环境配置文件
check_env() {
    log_info "检查环境配置..."
    if [ ! -f "deploy.env" ]; then
        log_error "环境配置文件 deploy.env 不存在"
        exit 1
    fi
    
    # 检查必要的环境变量
    source deploy.env
    
    if [ -z "$DB_HOST" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
        log_error "数据库配置不完整，请检查 deploy.env 文件"
        exit 1
    fi
    
    log_success "环境配置检查通过"
}

# 构建镜像
build_images() {
    log_info "构建Docker镜像..."
    
    # 构建后端镜像
    log_info "构建后端镜像..."
    docker-compose build backend
    
    # 构建前端镜像
    log_info "构建前端镜像..."
    docker-compose build frontend
    
    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 使用环境配置文件启动服务
    docker-compose --env-file deploy.env up -d
    
    log_success "服务启动完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 等待服务启动
    sleep 10
    
    # 检查后端服务
    if curl -f http://localhost:3001/health &> /dev/null; then
        log_success "后端服务健康检查通过"
    else
        log_warning "后端服务健康检查失败，请检查日志"
    fi
    
    # 检查前端服务
    if curl -f http://localhost:3000 &> /dev/null; then
        log_success "前端服务健康检查通过"
    else
        log_warning "前端服务健康检查失败，请检查日志"
    fi
}

# 显示部署信息
show_deployment_info() {
    log_info "部署信息："
    echo "=========================================="
    echo "🌐 前端访问地址: http://localhost:3000"
    echo "🔧 后端API地址: http://localhost:3001"
    echo "📊 数据库地址: $DB_HOST:$DB_PORT"
    echo "📝 日志目录: ./backend/logs"
    echo "=========================================="
    
    log_info "常用命令："
    echo "查看服务状态: docker-compose ps"
    echo "查看日志: docker-compose logs -f"
    echo "停止服务: docker-compose down"
    echo "重启服务: docker-compose restart"
}

# 主函数
main() {
    log_info "开始部署智能热狗管理平台..."
    
    check_docker
    check_env
    build_images
    start_services
    health_check
    show_deployment_info
    
    log_success "部署完成！🎉"
}

# 执行主函数
main "$@" 