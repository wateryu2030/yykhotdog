# 智能热狗管理平台部署指南

## 📋 部署概述

本指南将帮助您部署智能热狗管理平台，包括前端、后端、数据库和Nginx反向代理。

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx (80)    │    │  Frontend (3000)│    │   Backend (3001)│
│   (反向代理)     │◄──►│   (React App)   │◄──►│  (Node.js API)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  阿里云RDS      │    │   MaxCompute    │
                       │  (SQL Server)   │    │  (大数据平台)   │
                       └─────────────────┘    └─────────────────┘
```

## 📦 前置要求

### 系统要求
- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB 内存
- 至少 10GB 磁盘空间

### 网络要求
- 端口 80, 3000, 3001 可访问
- 阿里云RDS SQL Server连接权限
- MaxCompute访问权限

## 🚀 快速部署

### 1. 环境配置

1. 复制环境配置文件：
```bash
cp deploy.env .env
```

2. 编辑配置文件，填入正确的数据库连接信息：
```bash
# 数据库配置 (阿里云RDS SQL Server)
DB_HOST=your_rds_host.sqlserver.rds.aliyuncs.com
DB_PORT=1433
DB_USERNAME=hotdog
DB_PASSWORD=your_password_here
DB_NAME=cyrg2025

# 阿里云配置
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_REGION=cn-hangzhou

# JWT密钥
JWT_SECRET=your_secure_jwt_secret_key
```

### 2. 一键部署

运行自动化部署脚本：
```bash
./deploy.sh
```

脚本将自动执行以下步骤：
- ✅ 检查Docker环境
- ✅ 验证环境配置
- ✅ 构建Docker镜像
- ✅ 启动所有服务
- ✅ 执行健康检查
- ✅ 显示部署信息

### 3. 验证部署

检查服务状态：
```bash
docker-compose ps
```

监控系统状态：
```bash
./monitor.sh
```

## 🔧 手动部署步骤

### 1. 构建镜像

```bash
# 构建后端镜像
docker-compose build backend

# 构建前端镜像
docker-compose build frontend
```

### 2. 启动服务

```bash
# 启动所有服务
docker-compose --env-file deploy.env up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 3. 健康检查

```bash
# 检查后端API
curl http://localhost:3001/health

# 检查前端页面
curl http://localhost:3000

# 检查Nginx代理
curl http://localhost
```

## 📊 访问地址

部署成功后，您可以通过以下地址访问系统：

- **前端界面**: http://localhost:3000
- **后端API**: http://localhost:3001
- **Nginx代理**: http://localhost
- **API文档**: http://localhost:3001/api-docs

## 🔍 监控和维护

### 系统监控

```bash
# 运行监控脚本
./monitor.sh

# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f [service_name]
```

### 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 进入容器
docker-compose exec backend bash
docker-compose exec frontend bash
```

### 数据备份

```bash
# 备份数据库（如果使用本地MySQL）
docker-compose exec mysql mysqldump -u root -p database_name > backup.sql

# 备份上传文件
tar -czf uploads_backup.tar.gz ./backend/uploads/
```

## 🛠️ 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -an | grep :3000
   netstat -an | grep :3001
   
   # 修改docker-compose.yml中的端口映射
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库配置
   cat deploy.env | grep DB_
   
   # 测试数据库连接
   docker-compose exec backend node -e "
   const { Sequelize } = require('sequelize');
   const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
     host: process.env.DB_HOST,
     port: process.env.DB_PORT,
     dialect: 'mssql'
   });
   sequelize.authenticate().then(() => console.log('连接成功')).catch(console.error);
   "
   ```

3. **内存不足**
   ```bash
   # 检查内存使用
   free -h
   
   # 增加Docker内存限制
   # 在Docker Desktop设置中调整内存限制
   ```

4. **日志查看**
   ```bash
   # 查看所有服务日志
   docker-compose logs
   
   # 查看特定服务日志
   docker-compose logs backend
   docker-compose logs frontend
   docker-compose logs nginx
   ```

## 🔒 安全配置

### 生产环境安全建议

1. **修改默认密码**
   - 更改数据库密码
   - 更改JWT密钥
   - 更改阿里云访问密钥

2. **启用HTTPS**
   ```bash
   # 在nginx/nginx.conf中启用HTTPS配置
   # 添加SSL证书到nginx/ssl/目录
   ```

3. **防火墙配置**
   ```bash
   # 只开放必要端口
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

4. **定期更新**
   ```bash
   # 更新Docker镜像
   docker-compose pull
   docker-compose up -d
   ```

## 📈 性能优化

### 系统优化

1. **Nginx优化**
   - 启用Gzip压缩
   - 配置静态文件缓存
   - 调整worker进程数

2. **数据库优化**
   - 配置连接池
   - 优化查询语句
   - 定期维护索引

3. **应用优化**
   - 启用PM2集群模式
   - 配置Redis缓存
   - 优化前端打包

## 📞 技术支持

如果遇到部署问题，请：

1. 查看日志文件：`./backend/logs/`
2. 运行监控脚本：`./monitor.sh`
3. 检查Docker容器状态：`docker-compose ps`
4. 查看详细错误信息：`docker-compose logs [service_name]`

## 📝 更新日志

- **v1.0.0** (2024-07-13)
  - 初始版本发布
  - 支持Docker容器化部署
  - 集成Nginx反向代理
  - 添加自动化部署脚本
  - 提供系统监控功能 