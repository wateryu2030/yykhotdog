# 🚨 完整数据恢复方案

## ❌ 当前问题

### 1. RDS连接超时
```
Unable to connect: Adaptive Server is unavailable or does not exist
Net-Lib error during Operation timed out (60)
```

### 2. 数据恢复需求
- **cyrg2025数据库**: 需要从本地备份恢复 (317MB)
- **cyrgweixin数据库**: 需要从本地备份恢复 (171MB)
- **hotdog2030数据库**: 分析数据库，需要ETL同步

## ✅ 已完成的准备工作

### 1. 备份文件上传到OSS ✅
- **cyrg2025**: `oss://yykhotdog-backup-temp/backups/cyrg2025-10-24.bak`
- **cyrgweixin**: `oss://yykhotdog-backup-temp/backups/zhkj2025-10-24.bak`

### 2. RDS实例状态 ✅
- **实例ID**: `rm-uf660d00xovkm3067`
- **状态**: `Running`
- **区域**: `cn-shanghai`
- **连接字符串**: `rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com`

### 3. 数据库存在 ✅
- **cyrg2025**: 存在但为空
- **cyrgweixin**: 存在但为空
- **hotdog2030**: 存在但为空

## 🚀 数据恢复方案

### 方案A: 阿里云控制台恢复 (推荐)

#### 1. 登录阿里云控制台
- 访问: https://ecs.console.aliyun.com/
- 使用您的阿里云账号登录

#### 2. 进入RDS管理控制台
- 导航到: 云数据库RDS > 实例列表
- 选择实例: `rm-uf660d00xovkm3067`

#### 3. 执行数据恢复
1. 点击 "数据恢复" 或 "备份恢复"
2. 选择 "从OSS恢复"
3. 选择备份文件:
   - **cyrg2025**: `oss://yykhotdog-backup-temp/backups/cyrg2025-10-24.bak`
   - **cyrgweixin**: `oss://yykhotdog-backup-temp/backups/zhkj2025-10-24.bak`
4. 选择目标数据库: `cyrg2025` 和 `cyrgweixin`
5. 执行恢复操作

### 方案B: 使用阿里云CLI恢复

#### 1. 检查RDS恢复API
```bash
# 检查可用的恢复API
~/.homebrew/bin/aliyun rds help | grep -i restore
```

#### 2. 执行恢复命令
```bash
# 恢复cyrg2025数据库
~/.homebrew/bin/aliyun rds RestoreDBInstance \
  --DBInstanceId rm-uf660d00xovkm3067 \
  --BackupId oss://yykhotdog-backup-temp/backups/cyrg2025-10-24.bak \
  --DBName cyrg2025 \
  --region cn-shanghai

# 恢复cyrgweixin数据库
~/.homebrew/bin/aliyun rds RestoreDBInstance \
  --DBInstanceId rm-uf660d00xovkm3067 \
  --BackupId oss://yykhotdog-backup-temp/backups/zhkj2025-10-24.bak \
  --DBName cyrgweixin \
  --region cn-shanghai
```

### 方案C: 使用Docker容器恢复

#### 1. 启动Docker容器
```bash
cd /Users/apple/Ahope/yykhotdog
docker-compose -f docker-compose-rds.yml up -d
```

#### 2. 在容器中执行恢复
```bash
# 进入容器
docker exec -it yykhotdog_backend bash

# 执行恢复脚本
python3 execute_restore.py
```

## 🔧 网络连接问题解决

### 1. 检查网络连接
```bash
# 测试RDS连接
ping rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com

# 测试端口连接
telnet rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com 1433
```

### 2. 配置VPN或代理
- 如果RDS在VPC中，需要配置VPN连接
- 或者使用阿里云的专线连接

### 3. 使用阿里云控制台
- 这是最可靠的方法，不依赖本地网络连接

## 📋 恢复后验证

### 1. 检查数据库内容
```bash
# 使用阿里云CLI检查
~/.homebrew/bin/aliyun rds DescribeDatabases \
  --DBInstanceId rm-uf660d00xovkm3067 \
  --region cn-shanghai
```

### 2. 测试应用程序连接
```bash
# 启动后端服务
cd /Users/apple/Ahope/yykhotdog/backend
npm start

# 启动前端服务
cd /Users/apple/Ahope/yykhotdog/frontend
npm start
```

## 🎯 推荐执行顺序

1. **立即执行**: 使用阿里云控制台恢复数据
2. **验证恢复**: 检查数据库内容
3. **测试连接**: 启动应用程序
4. **数据同步**: 执行ETL同步到hotdog2030

---

**状态**: 🟡 等待数据恢复完成，然后可以启动应用程序
