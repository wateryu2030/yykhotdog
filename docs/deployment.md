# 部署文档

## 系统架构

全国智能化热狗管理平台采用以下技术栈：

- **前端**: React + TypeScript + Ant Design
- **后端**: Node.js + Express + TypeScript
- **数据库**: 阿里云RDS MySQL
- **大数据**: 阿里云MaxCompute
- **部署**: Docker + Docker Compose
- **反向代理**: Nginx

## 环境要求

### 系统要求
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (开发环境)
- 8GB+ RAM
- 20GB+ 磁盘空间

### 阿里云服务
- 阿里云RDS MySQL实例
- 阿里云MaxCompute项目
- 阿里云ECS服务器（生产环境）

## 快速部署

### 1. 克隆项目
```bash
git clone <repository-url>
cd zhhotdog
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp backend/env.example .env

# 编辑环境变量文件
vim .env
```

### 3. 配置数据库连接
在`.env`文件中配置以下信息：

```bash
# 数据库配置
DB_HOST=your-rds-endpoint.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_USERNAME=zhhotdog2
DB_PASSWORD=your_password
DB_NAME=zhhotdog

# 阿里云配置
ALIYUN_ACCESS_KEY_ID=YOUR_ALIYUN_ACCESS_KEY_ID
ALIYUN_ACCESS_KEY_SECRET=YOUR_ALIYUN_ACCESS_KEY_SECRET
ALIYUN_REGION=cn-hangzhou

# MaxCompute配置
MAXCOMPUTE_PROJECT=zhhotdog_project
MAXCOMPUTE_ENDPOINT=https://service.cn.maxcompute.aliyun.com/api

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
```

### 4. 启动系统
```bash
# 使用启动脚本
./start.sh

# 或手动启动
docker-compose up -d --build
```

### 5. 访问系统
- 前端界面: http://localhost:3000
- 后端API: http://localhost:3001
- API文档: http://localhost:3001/api-docs

## 生产环境部署

### 1. 服务器准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 配置SSL证书
```bash
# 创建SSL目录
mkdir -p nginx/ssl

# 上传SSL证书
# 将证书文件上传到 nginx/ssl/ 目录
```

### 3. 配置域名
修改`nginx/nginx.conf`文件，配置域名和SSL：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # 其他配置...
}
```

### 4. 启动生产环境
```bash
# 使用生产环境配置
docker-compose -f docker-compose.prod.yml up -d
```

## 数据库初始化

### 1. 创建数据库表
```sql
-- 连接到RDS数据库
mysql -h your-rds-endpoint -u zhhotdog2 -p

-- 创建数据库
CREATE DATABASE IF NOT EXISTS zhotdog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE zhotdog;

-- 执行建表脚本
-- 参考 database/README.md 中的表结构
```

### 2. 初始化数据
```bash
# 执行数据初始化脚本
python scripts/init_data.py
```

## MaxCompute配置

### 1. 创建项目
在阿里云MaxCompute控制台创建项目：
- 项目名称: `zhhotdog_project`
- 区域: `cn-hangzhou`

### 2. 配置数据表
```sql
-- 创建ODS层表
CREATE TABLE ods_sales_data (
    store_id BIGINT COMMENT '门店ID',
    sale_date DATE COMMENT '销售日期',
    sale_time TIMESTAMP COMMENT '销售时间',
    product_id BIGINT COMMENT '产品ID',
    product_name STRING COMMENT '产品名称',
    quantity INT COMMENT '数量',
    unit_price DECIMAL(10,2) COMMENT '单价',
    total_amount DECIMAL(10,2) COMMENT '总金额',
    payment_method STRING COMMENT '支付方式',
    customer_type STRING COMMENT '客户类型',
    ds STRING COMMENT '分区字段-日期'
) PARTITIONED BY (ds STRING);
```

### 3. 配置数据同步
```bash
# 配置DTS数据同步任务
# 从RDS同步到MaxCompute
```

## 监控和维护

### 1. 日志查看
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 2. 服务状态
```bash
# 查看服务状态
docker-compose ps

# 重启服务
docker-compose restart backend
```

### 3. 数据备份
```bash
# 备份数据库
docker-compose exec mysql mysqldump -u root -p zhotdog > backup.sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p zhotdog < backup.sql
```

### 4. 性能监控
```bash
# 查看资源使用情况
docker stats

# 查看磁盘使用情况
df -h
```

## 故障排除

### 1. 常见问题

#### 数据库连接失败
```bash
# 检查数据库配置
docker-compose logs backend

# 测试数据库连接
docker-compose exec backend npm run test:db
```

#### 前端无法访问
```bash
# 检查前端服务状态
docker-compose ps frontend

# 查看前端日志
docker-compose logs frontend
```

#### API接口错误
```bash
# 检查后端服务
docker-compose logs backend

# 测试API接口
curl http://localhost:3001/health
```

### 2. 性能优化

#### 数据库优化
```sql
-- 添加索引
CREATE INDEX idx_store_date ON sales_transactions(store_id, transaction_date);
CREATE INDEX idx_location ON site_selections(province, city, district);
```

#### 应用优化
```bash
# 增加Node.js内存限制
NODE_OPTIONS="--max-old-space-size=4096"

# 优化Docker资源限制
docker-compose.yml:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

## 安全配置

### 1. 防火墙配置
```bash
# 只开放必要端口
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

### 2. SSL证书更新
```bash
# 自动更新SSL证书
sudo certbot renew --nginx
```

### 3. 定期备份
```bash
# 创建备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec mysql mysqldump -u root -p zhotdog > backup_$DATE.sql
```

## 扩展部署

### 1. 负载均衡
```bash
# 使用阿里云SLB
# 配置多个后端实例
```

### 2. 高可用部署
```bash
# 使用阿里云RDS主从复制
# 配置应用集群
```

### 3. 容器编排
```bash
# 使用Kubernetes部署
kubectl apply -f k8s/
```

## 联系支持

如有问题，请联系技术支持：
- 邮箱: support@zhhotdog.com
- 电话: 400-xxx-xxxx
- 文档: https://docs.zhhotdog.com 