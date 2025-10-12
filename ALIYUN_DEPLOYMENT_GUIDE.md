# 🚀 阿里云部署指南 - 客户画像同步服务

## 📋 概述

本指南提供三种将客户画像同步服务部署到阿里云的方案，避免本机资源消耗和端口冲突问题。

## 🎯 方案对比

| 方案 | 优点 | 缺点 | 适用场景 | 成本 |
|------|------|------|----------|------|
| **ECS + PM2** | 稳定可靠，完全控制 | 需要管理服务器 | 生产环境 | 中等 |
| **函数计算** | 按需付费，自动扩缩容 | 冷启动延迟 | 低频同步 | 低 |
| **定时任务** | 简单易用，资源占用少 | 功能相对简单 | 定期同步 | 最低 |

## 🏗️ 方案一：ECS + PM2 部署（推荐）

### 1. 准备工作

```bash
# 1. 安装阿里云CLI
curl -o aliyun-cli-linux-latest-amd64.tgz https://aliyuncli.alicdn.com/aliyun-cli-linux-latest-amd64.tgz
tar xzvf aliyun-cli-linux-latest-amd64.tgz
sudo mv aliyun /usr/local/bin/

# 2. 配置阿里云凭证
aliyun configure
```

### 2. 创建ECS实例

```bash
# 创建ECS实例（建议配置：2核4G）
aliyun ecs CreateInstance \
  --RegionId cn-hangzhou \
  --ImageId ami-12345678 \
  --InstanceType ecs.t5-lc1m1.small \
  --SecurityGroupId sg-12345678 \
  --VSwitchId vsw-12345678 \
  --InstanceName customer-profile-sync
```

### 3. 部署服务

```bash
# 1. 给部署脚本执行权限
chmod +x backend/deploy-ecs.sh

# 2. 修改配置变量
vim backend/deploy-ecs.sh
# 修改以下变量：
# - ECS_INSTANCE_ID: 你的ECS实例ID
# - RDS_INSTANCE_ID: 你的RDS实例ID
# - DB_HOST: RDS连接地址
# - DB_USER: 数据库用户名
# - DB_PASSWORD: 数据库密码

# 3. 执行部署
./backend/deploy-ecs.sh
```

### 4. 监控服务

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs customer-profile-sync

# 重启服务
pm2 restart customer-profile-sync
```

## ⚡ 方案二：函数计算部署

### 1. 创建函数

```bash
# 1. 安装函数计算CLI
npm install -g @alicloud/fc-cli

# 2. 配置函数计算
fc config

# 3. 创建函数
fc fun deploy \
  --template-file template.yml \
  --region cn-hangzhou \
  --service-name customer-profile-sync
```

### 2. 配置定时触发器

```yaml
# template.yml
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  customer-profile-sync:
    Type: 'Aliyun::Serverless::Function'
    Properties:
      Handler: serverless-sync.handler
      Runtime: nodejs12
      CodeUri: ./backend/
      EnvironmentVariables:
        DB_HOST: your-rds-endpoint
        DB_PORT: 1433
        DB_NAME: hotdog2030
        DB_USER: your-username
        DB_PASSWORD: your-password
      Events:
        timer:
          Type: Timer
          Properties:
            Payload: '{"action": "sync"}'
            CronExpression: '0 */6 * * * *'  # 每6小时执行一次
```

### 3. 调用函数

```bash
# 手动触发同步
fc fun invoke customer-profile-sync \
  --payload '{"action": "sync"}' \
  --region cn-hangzhou

# 查询状态
fc fun invoke customer-profile-sync \
  --payload '{"action": "status"}' \
  --region cn-hangzhou
```

## ⏰ 方案三：定时任务部署（最简单）

### 1. 在ECS上部署

```bash
# 1. 上传脚本到ECS
scp backend/scheduled-sync.js root@your-ecs-ip:/opt/customer-profile-sync/

# 2. 安装依赖
ssh root@your-ecs-ip
cd /opt/customer-profile-sync
npm install mssql

# 3. 创建环境变量
cat > .env << EOF
DB_HOST=your-rds-endpoint
DB_PORT=1433
DB_NAME=hotdog2030
DB_USER=your-username
DB_PASSWORD=your-password
EOF

# 4. 测试运行
node scheduled-sync.js
```

### 2. 配置定时任务

```bash
# 编辑crontab
crontab -e

# 添加以下行（每6小时执行一次）
0 */6 * * * /usr/bin/node /opt/customer-profile-sync/scheduled-sync.js >> /opt/customer-profile-sync/logs/cron.log 2>&1

# 查看定时任务
crontab -l
```

### 3. 监控日志

```bash
# 查看同步日志
tail -f /opt/customer-profile-sync/logs/sync-$(date +%Y-%m-%d).log

# 查看cron日志
tail -f /opt/customer-profile-sync/logs/cron.log

# 查看同步状态
cat /opt/customer-profile-sync/sync-status.json
```

## 🔧 环境配置

### 数据库配置

```bash
# 确保RDS安全组允许ECS访问
# 在阿里云控制台 -> RDS -> 安全组 -> 添加规则
# 协议：TCP
# 端口：1433
# 源：ECS安全组ID
```

### 网络配置

```bash
# 检查网络连通性
telnet your-rds-endpoint 1433

# 测试数据库连接
node -e "
const mssql = require('mssql');
const config = {
  server: 'your-rds-endpoint',
  port: 1433,
  database: 'hotdog2030',
  user: 'your-username',
  password: 'your-password',
  options: { encrypt: true, trustServerCertificate: true }
};
mssql.connect(config).then(() => {
  console.log('数据库连接成功');
  process.exit(0);
}).catch(err => {
  console.error('数据库连接失败:', err);
  process.exit(1);
});
"
```

## 📊 监控和告警

### 1. 创建监控脚本

```bash
# 创建监控脚本
cat > monitor-sync.sh << 'EOF'
#!/bin/bash

LOG_FILE="/opt/customer-profile-sync/logs/sync-$(date +%Y-%m-%d).log"
STATUS_FILE="/opt/customer-profile-sync/sync-status.json"

# 检查同步状态
if [ -f "$STATUS_FILE" ]; then
    LAST_SYNC=$(jq -r '.lastSyncTime' "$STATUS_FILE")
    if [ "$LAST_SYNC" != "null" ]; then
        LAST_SYNC_TIME=$(date -d "$LAST_SYNC" +%s)
        CURRENT_TIME=$(date +%s)
        HOURS_DIFF=$(( (CURRENT_TIME - LAST_SYNC_TIME) / 3600 ))
        
        if [ $HOURS_DIFF -gt 12 ]; then
            echo "警告：同步服务已超过12小时未执行"
            # 可以添加告警通知逻辑
        fi
    fi
fi

# 检查错误日志
ERROR_COUNT=$(grep -c "ERROR" "$LOG_FILE" 2>/dev/null || echo "0")
if [ $ERROR_COUNT -gt 0 ]; then
    echo "警告：发现 $ERROR_COUNT 个错误"
fi
EOF

chmod +x monitor-sync.sh
```

### 2. 配置告警

```bash
# 添加到crontab（每小时检查一次）
0 * * * * /opt/customer-profile-sync/monitor-sync.sh
```

## 🔄 数据同步策略

### 增量同步

```sql
-- 只同步新增的订单数据
INSERT INTO customer_orders (customer_id, order_id, order_date, order_amount, payment_method, shop_name)
SELECT 
  phone as customer_id,
  orderId as order_id,
  recordTime as order_date,
  CAST(amount AS DECIMAL(10,2)) as order_amount,
  paymentMethod as payment_method,
  shopName as shop_name
FROM cyrg2025.dbo.Orders 
WHERE phone IS NOT NULL 
  AND phone != '' 
  AND phone != 'test'
  AND orderId IS NOT NULL
  AND orderId != ''
  AND recordTime > (SELECT ISNULL(MAX(order_date), '1900-01-01') FROM customer_orders)
```

### 全量同步

```sql
-- 清空后重新同步（适用于数据量不大的情况）
DELETE FROM customer_profiles;
DELETE FROM customer_orders;
DELETE FROM customer_analysis;
-- 然后执行完整的同步逻辑
```

## 💰 成本估算

### ECS方案
- ECS实例（2核4G）：约 100-200元/月
- 带宽：约 50元/月
- 总计：约 150-250元/月

### 函数计算方案
- 按调用次数计费：约 10-50元/月
- 存储费用：约 5-10元/月
- 总计：约 15-60元/月

### 定时任务方案
- 利用现有ECS：0元
- 或购买最便宜ECS：约 50-100元/月

## 🎯 推荐方案

**生产环境**：推荐使用 **ECS + PM2** 方案
- 稳定可靠
- 完全控制
- 易于监控和调试

**开发/测试环境**：推荐使用 **定时任务** 方案
- 成本最低
- 部署简单
- 满足基本需求

**小规模应用**：推荐使用 **函数计算** 方案
- 按需付费
- 自动扩缩容
- 无需管理服务器

## 🚨 注意事项

1. **安全配置**：确保数据库密码安全，使用环境变量
2. **网络配置**：正确配置安全组和VPC
3. **监控告警**：设置适当的监控和告警机制
4. **备份策略**：定期备份同步状态和日志
5. **错误处理**：完善错误处理和重试机制
6. **性能优化**：根据数据量调整批处理大小和并发数

## 📞 技术支持

如遇到问题，可以：
1. 查看日志文件
2. 检查网络连通性
3. 验证数据库配置
4. 联系阿里云技术支持 