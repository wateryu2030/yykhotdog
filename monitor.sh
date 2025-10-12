#!/bin/bash

# 智能热狗管理平台监控脚本
# 作者: AI Assistant
# 日期: 2024-07-13

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查服务状态
check_service_status() {
    log_info "检查服务状态..."
    
    # 检查Docker容器状态
    if docker-compose ps | grep -q "Up"; then
        log_success "所有服务运行正常"
    else
        log_error "部分服务未正常运行"
        docker-compose ps
    fi
}

# 检查端口监听
check_ports() {
    log_info "检查端口监听..."
    
    # 检查前端端口
    if netstat -an | grep -q ":3000.*LISTEN"; then
        log_success "前端端口 3000 正常监听"
    else
        log_warning "前端端口 3000 未监听"
    fi
    
    # 检查后端端口
    if netstat -an | grep -q ":3001.*LISTEN"; then
        log_success "后端端口 3001 正常监听"
    else
        log_warning "后端端口 3001 未监听"
    fi
    
    # 检查Nginx端口
    if netstat -an | grep -q ":80.*LISTEN"; then
        log_success "Nginx端口 80 正常监听"
    else
        log_warning "Nginx端口 80 未监听"
    fi
}

# 检查API健康状态
check_api_health() {
    log_info "检查API健康状态..."
    
    # 检查后端健康接口
    if curl -f http://localhost:3001/health &> /dev/null; then
        log_success "后端API健康检查通过"
    else
        log_error "后端API健康检查失败"
    fi
    
    # 检查前端页面
    if curl -f http://localhost:3000 &> /dev/null; then
        log_success "前端页面访问正常"
    else
        log_error "前端页面访问失败"
    fi
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."
    
    # 这里可以添加数据库连接检查逻辑
    # 由于使用阿里云RDS，这里只是示例
    log_info "数据库连接检查需要根据具体配置实现"
}

# 检查磁盘空间
check_disk_space() {
    log_info "检查磁盘空间..."
    
    # 获取当前目录磁盘使用情况
    disk_usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 80 ]; then
        log_success "磁盘空间充足 (使用率: ${disk_usage}%)"
    else
        log_warning "磁盘空间不足 (使用率: ${disk_usage}%)"
    fi
}

# 检查内存使用
check_memory() {
    log_info "检查内存使用..."
    
    # 获取内存使用情况
    memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    
    if (( $(echo "$memory_usage < 80" | bc -l) )); then
        log_success "内存使用正常 (使用率: ${memory_usage}%)"
    else
        log_warning "内存使用较高 (使用率: ${memory_usage}%)"
    fi
}

# 显示系统信息
show_system_info() {
    log_info "系统信息："
    echo "=========================================="
    echo "🖥️  操作系统: $(uname -s) $(uname -r)"
    echo "💾 内存总量: $(free -h | grep Mem | awk '{print $2}')"
    echo "💿 磁盘空间: $(df -h . | tail -1 | awk '{print $4}') 可用"
    echo "🐳 Docker版本: $(docker --version)"
    echo "=========================================="
}

# 显示服务日志摘要
show_logs_summary() {
    log_info "最近服务日志摘要："
    echo "=========================================="
    
    # 显示后端日志最后几行
    echo "📝 后端日志:"
    docker-compose logs --tail=5 backend
    
    echo ""
    echo "📝 前端日志:"
    docker-compose logs --tail=5 frontend
    
    echo ""
    echo "📝 Nginx日志:"
    docker-compose logs --tail=5 nginx
    
    echo "=========================================="
}

# 主函数
main() {
    echo "🔍 开始系统监控检查..."
    echo ""
    
    show_system_info
    echo ""
    
    check_service_status
    echo ""
    
    check_ports
    echo ""
    
    check_api_health
    echo ""
    
    check_database
    echo ""
    
    check_disk_space
    echo ""
    
    check_memory
    echo ""
    
    show_logs_summary
    
    log_success "监控检查完成！"
}

# 执行主函数
main "$@" 