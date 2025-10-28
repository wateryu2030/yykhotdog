# 🚀 智能化热狗管理平台 - 部署指南

## 📋 部署概述

本指南将帮助您在生产环境中部署智能化热狗管理平台。

## 🔧 环境要求

### 服务器要求
- **操作系统**: Linux (Ubuntu 20.04+) 或 Windows Server 2019+
- **CPU**: 4核心以上
- **内存**: 8GB以上
- **存储**: 50GB以上可用空间
- **网络**: 稳定的互联网连接

### 软件要求
- **Node.js**: 18.0.0+
- **npm**: 8.0.0+
- **Microsoft SQL Server**: 2019+
- **Git**: 2.0+

## 📦 部署步骤

### 1. 环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 2. 项目部署

```bash
# 克隆项目
git clone <repository-url>
cd yykhotdog

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 3. 数据库配置

#### 3.1 创建数据库
```sql
-- 在SQL Server中执行
CREATE DATABASE hotdog2030;
CREATE DATABASE cyrg2025;
CREATE DATABASE cyrgweixin;
```

#### 3.2 配置数据库连接
```bash
# 创建环境变量文件
cd backend
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 数据库配置
DB_HOST=your-sql-server-host
DB_PORT=1433
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_NAME=hotdog2030

# 货物数据库配置
CARGO_DB_HOST=your-sql-server-host
CARGO_DB_PORT=1433
CARGO_DB_USER=your-username
CARGO_DB_PASSWORD=your-password
CARGO_DB_NAME=cyrg2025

# OpenAI配置
OPENAI_API_KEY=your-openai-api-key

# 服务器配置
PORT=3001
NODE_ENV=production
```

### 4. 数据初始化

```bash
# 运行数据同步脚本
cd backend
npm run sync-data

# 或者手动运行ETL
cd ../etl
python run_etl.py
```

### 5. 构建和启动

#### 5.1 构建项目
```bash
# 构建后端
cd backend
npm run build

# 构建前端
cd ../frontend
npm run build
```

#### 5.2 启动服务

**开发环境启动:**
```bash
# 启动后端
cd backend
npm start

# 启动前端 (新终端)
cd frontend
npm start
```

**生产环境启动:**
```bash
# 使用PM2管理进程
npm install -g pm2

# 启动后端
cd backend
pm2 start dist/index.js --name "hotdog-backend"

# 启动前端 (使用nginx)
# 配置nginx指向frontend/build目录
```

### 6. Nginx配置 (生产环境)

创建nginx配置文件 `/etc/nginx/sites-available/hotdog-platform`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/yykhotdog/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API文档
    location /api-docs {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/hotdog-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 安全配置

### 1. 防火墙设置
```bash
# 开放必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. SSL证书配置
```bash
# 使用Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. 数据库安全
- 使用强密码
- 限制数据库访问IP
- 启用SSL连接
- 定期备份数据

## 📊 监控配置

### 1. 系统监控
```bash
# 安装监控工具
sudo apt install htop iotop nethogs

# 配置日志轮转
sudo nano /etc/logrotate.d/hotdog-platform
```

### 2. 应用监控
```bash
# 使用PM2监控
pm2 monit

# 查看日志
pm2 logs hotdog-backend
```

### 3. 数据库监控
- 配置SQL Server性能监控
- 设置数据库备份计划
- 监控磁盘空间使用

## 🔄 备份策略

### 1. 数据库备份
```bash
# 创建备份脚本
cat > backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/database"

mkdir -p $BACKUP_DIR

# 备份hotdog2030
sqlcmd -S $DB_HOST -U $DB_USERNAME -P $DB_PASSWORD -Q "BACKUP DATABASE hotdog2030 TO DISK = '$BACKUP_DIR/hotdog2030_$DATE.bak'"

# 备份cyrg2025
sqlcmd -S $DB_HOST -U $DB_USERNAME -P $DB_PASSWORD -Q "BACKUP DATABASE cyrg2025 TO DISK = '$BACKUP_DIR/cyrg2025_$DATE.bak'"

# 清理7天前的备份
find $BACKUP_DIR -name "*.bak" -mtime +7 -delete
EOF

chmod +x backup-db.sh

# 设置定时任务
crontab -e
# 添加: 0 2 * * * /path/to/backup-db.sh
```

### 2. 代码备份
```bash
# 创建代码备份脚本
cat > backup-code.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/code"

mkdir -p $BACKUP_DIR

# 备份项目代码
tar -czf $BACKUP_DIR/yykhotdog_$DATE.tar.gz /path/to/yykhotdog

# 清理30天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x backup-code.sh
```

## 🚀 性能优化

### 1. 数据库优化
```sql
-- 创建索引
CREATE INDEX IX_orders_created_at ON orders(created_at);
CREATE INDEX IX_orders_customer_id ON orders(customer_id);
CREATE INDEX IX_orders_store_id ON orders(store_id);
CREATE INDEX IX_order_items_product_id ON order_items(product_id);

-- 更新统计信息
UPDATE STATISTICS orders;
UPDATE STATISTICS order_items;
UPDATE STATISTICS stores;
UPDATE STATISTICS products;
```

### 2. 应用优化
```bash
# 启用gzip压缩
# 在nginx配置中添加:
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# 启用缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 系统优化
```bash
# 优化系统参数
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'net.core.somaxconn=65535' >> /etc/sysctl.conf
sysctl -p
```

## 🔧 故障排除

### 1. 常见问题

**问题**: 数据库连接失败
```bash
# 检查数据库服务状态
systemctl status mssql-server

# 检查网络连接
telnet $DB_HOST 1433

# 检查防火墙
sudo ufw status
```

**问题**: 前端无法访问API
```bash
# 检查后端服务状态
pm2 status
pm2 logs hotdog-backend

# 检查nginx配置
sudo nginx -t
sudo systemctl status nginx
```

**问题**: 内存不足
```bash
# 检查内存使用
free -h
ps aux --sort=-%mem | head

# 优化Node.js内存
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 2. 日志分析
```bash
# 查看应用日志
pm2 logs hotdog-backend --lines 100

# 查看系统日志
sudo journalctl -u nginx -f

# 查看数据库日志
sudo tail -f /var/opt/mssql/log/errorlog
```

## 📞 技术支持

### 联系方式
- **技术支持**: support@hotdog-platform.com
- **文档**: https://docs.hotdog-platform.com
- **GitHub**: https://github.com/your-org/hotdog-platform

### 支持时间
- **工作时间**: 周一至周五 9:00-18:00
- **紧急支持**: 7x24小时

---

**部署完成时间**: 2025年10月26日  
**版本**: v1.0.0  
**状态**: ✅ 生产就绪
