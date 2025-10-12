# 万店规模架构设计文档

## 1. 整体架构概览

### 1.1 架构原则
- **水平扩展**: 支持按区域、按业务模块水平扩展
- **高可用**: 99.9%可用性，故障自动恢复
- **高性能**: 支持10万+并发用户，毫秒级响应
- **数据一致性**: 最终一致性，支持分布式事务
- **成本优化**: 按需扩容，资源利用率最大化

### 1.2 技术栈升级

#### 核心服务
```
前端层: React + TypeScript + Ant Design + PWA
网关层: Kong/APISIX + OAuth2 + Rate Limiting
服务层: Node.js + Express + TypeScript (微服务化)
缓存层: Redis Cluster + Redis Sentinel
消息队列: Apache Kafka + RabbitMQ
数据库层: 阿里云PolarDB + 读写分离 + 分库分表
监控层: Prometheus + Grafana + ELK Stack
```

## 2. 数据库架构设计

### 2.1 分库分表策略

#### 按区域分库
```
华北区: hotdog_north_001 ~ hotdog_north_100
华东区: hotdog_east_001 ~ hotdog_east_100  
华南区: hotdog_south_001 ~ hotdog_south_100
华中区: hotdog_central_001 ~ hotdog_central_100
西南区: hotdog_southwest_001 ~ hotdog_southwest_100
西北区: hotdog_northwest_001 ~ hotdog_northwest_100
东北区: hotdog_northeast_001 ~ hotdog_northeast_100
```

#### 按业务分表
```
stores_001 ~ stores_100 (门店基础信息)
sales_001 ~ sales_100 (销售数据)
inventory_001 ~ inventory_100 (库存数据)
orders_001 ~ orders_100 (订单数据)
```

### 2.2 读写分离
```
主库: 写操作 + 核心查询
从库1: 报表查询 + 数据分析
从库2: 只读查询 + 缓存预热
从库3: 备份 + 灾备
```

### 2.3 数据同步策略
- **实时同步**: 主从库实时同步
- **延迟同步**: 报表库延迟5分钟同步
- **批量同步**: 数据仓库每日批量同步

## 3. 缓存架构设计

### 3.1 多级缓存
```
L1: 本地缓存 (Node.js内存)
L2: Redis集群缓存
L3: CDN缓存 (静态资源)
```

### 3.2 缓存策略
```javascript
// 门店信息缓存
stores:{store_id} -> TTL: 1小时
stores:list:{region} -> TTL: 30分钟
stores:stats:{region} -> TTL: 5分钟

// 销售数据缓存
sales:daily:{store_id}:{date} -> TTL: 10分钟
sales:monthly:{store_id}:{year_month} -> TTL: 1小时
sales:realtime:{store_id} -> TTL: 1分钟

// 用户会话缓存
session:{user_id} -> TTL: 2小时
permissions:{user_id} -> TTL: 1小时
```

## 4. 微服务架构

### 4.1 服务拆分
```
用户服务 (User Service)
├── 用户管理
├── 权限控制
└── 认证授权

门店服务 (Store Service)
├── 门店管理
├── 选址分析
└── 项目管理

销售服务 (Sales Service)
├── 订单处理
├── 支付集成
└── 库存管理

运营服务 (Operations Service)
├── 日常运营
├── 营销活动
└── 数据分析

分配服务 (Allocation Service)
├── 利润分配
├── 投资模型
└── 绩效考核

通知服务 (Notification Service)
├── 短信通知
├── 邮件通知
└── 推送通知

文件服务 (File Service)
├── 文件上传
├── 图片处理
└── 文档管理
```

### 4.2 服务通信
- **同步调用**: gRPC + HTTP/2
- **异步调用**: Kafka + RabbitMQ
- **服务发现**: Consul + Etcd
- **负载均衡**: Nginx + HAProxy

## 5. 消息队列架构

### 5.1 Kafka集群
```
Topic: store-events (门店事件)
├── store.created
├── store.updated
├── store.closed
└── store.transferred

Topic: sales-events (销售事件)
├── order.created
├── payment.completed
├── inventory.updated
└── refund.processed

Topic: notification-events (通知事件)
├── sms.send
├── email.send
├── push.send
└── wechat.send
```

### 5.2 消息处理
- **实时处理**: 订单处理、库存更新
- **批量处理**: 报表生成、数据分析
- **延迟处理**: 定时任务、清理任务

## 6. 监控告警体系

### 6.1 监控指标
```
业务指标
├── 门店数量: 10000+
├── 日订单量: 100万+
├── 日交易额: 1000万+
└── 用户活跃度: 10万+

技术指标
├── 响应时间: < 200ms
├── 错误率: < 0.1%
├── 可用性: > 99.9%
└── 并发数: 10万+
```

### 6.2 告警规则
```yaml
# 响应时间告警
- alert: HighResponseTime
  expr: http_request_duration_seconds > 0.5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "响应时间过高"

# 错误率告警
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "错误率过高"

# 数据库连接告警
- alert: DatabaseConnectionHigh
  expr: database_connections > 80
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: "数据库连接数过高"
```

## 7. 安全架构

### 7.1 网络安全
- **WAF**: 阿里云WAF + 自定义规则
- **DDoS防护**: 阿里云DDoS防护
- **VPN**: 专线接入 + VPN隧道
- **防火墙**: 网络ACL + 安全组

### 7.2 数据安全
- **加密**: AES-256 + RSA-2048
- **脱敏**: 敏感数据自动脱敏
- **审计**: 操作日志 + 数据变更审计
- **备份**: 异地备份 + 定期恢复测试

## 8. 部署架构

### 8.1 容器编排
```yaml
# docker-compose.yml
version: '3.8'
services:
  # 网关服务
  gateway:
    image: kong:latest
    replicas: 3
    ports:
      - "8000:8000"
      - "8443:8443"
    
  # 用户服务
  user-service:
    image: zhhotdog/user-service:latest
    replicas: 5
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis-cluster:6379
    
  # 门店服务
  store-service:
    image: zhhotdog/store-service:latest
    replicas: 10
    environment:
      - NODE_ENV=production
      - DB_HOST=polardb-cluster
    
  # 销售服务
  sales-service:
    image: zhhotdog/sales-service:latest
    replicas: 15
    environment:
      - NODE_ENV=production
      - KAFKA_BROKERS=kafka-cluster:9092
```

### 8.2 自动扩缩容
```yaml
# HPA配置
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: store-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: store-service
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 9. 性能优化

### 9.1 数据库优化
```sql
-- 分区表设计
CREATE TABLE sales_data (
    id BIGINT,
    store_id BIGINT,
    sale_date DATE,
    amount DECIMAL(10,2),
    created_at TIMESTAMP
) PARTITION BY RANGE (YEAR(sale_date)) (
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026)
);

-- 索引优化
CREATE INDEX idx_store_date ON sales_data(store_id, sale_date);
CREATE INDEX idx_amount ON sales_data(amount);
CREATE INDEX idx_created ON sales_data(created_at);
```

### 9.2 应用优化
```javascript
// 连接池优化
const pool = mysql.createPool({
  host: 'polardb-cluster',
  user: 'hotdog',
  password: 'password',
  database: 'hotdog2030',
  connectionLimit: 100,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// 缓存优化
const redis = new Redis.Cluster([
  { host: 'redis-node-1', port: 6379 },
  { host: 'redis-node-2', port: 6379 },
  { host: 'redis-node-3', port: 6379 }
]);

// 批量处理
async function batchProcessOrders(orders) {
  const chunks = chunk(orders, 1000);
  for (const chunk of chunks) {
    await Promise.all(chunk.map(order => processOrder(order)));
  }
}
```

## 10. 灾备方案

### 10.1 多活部署
```
主数据中心: 北京
├── 核心业务
├── 实时数据
└── 用户访问

备数据中心: 上海
├── 数据备份
├── 灾备切换
└── 负载分担

边缘节点: 全国CDN
├── 静态资源
├── 就近访问
└── 流量分发
```

### 10.2 数据备份
- **实时备份**: RDS自动备份 + 跨地域复制
- **定期备份**: 每日全量备份 + 每小时增量备份
- **长期备份**: 每月归档备份 + 异地存储

## 11. 成本优化

### 11.1 资源优化
- **弹性伸缩**: 根据负载自动扩缩容
- **资源预留**: 核心服务预留资源
- **成本监控**: 实时监控资源使用成本

### 11.2 存储优化
- **冷热分离**: 热数据SSD，冷数据OSS
- **压缩存储**: 历史数据压缩存储
- **生命周期**: 自动归档和删除过期数据

## 12. 实施计划

### 第一阶段 (1-2个月)
1. 数据库分库分表
2. Redis集群部署
3. 基础监控搭建

### 第二阶段 (3-4个月)
1. 微服务拆分
2. 消息队列部署
3. 服务治理

### 第三阶段 (5-6个月)
1. 多活部署
2. 安全加固
3. 性能优化

### 第四阶段 (7-8个月)
1. 自动化运维
2. 灾备完善
3. 成本优化

## 13. 风险评估

### 技术风险
- **数据一致性**: 分布式事务复杂性
- **性能瓶颈**: 大规模并发处理
- **系统复杂度**: 微服务架构维护

### 业务风险
- **数据迁移**: 历史数据迁移风险
- **服务中断**: 升级过程中的服务中断
- **成本控制**: 大规模部署成本控制

### 缓解措施
- **渐进式迁移**: 分阶段逐步迁移
- **灰度发布**: 新功能灰度发布
- **监控告警**: 完善的监控告警体系
- **回滚方案**: 快速回滚机制

---

**文档版本**: v1.0
**更新时间**: 2024年1月
**维护团队**: ZH热狗技术团队 