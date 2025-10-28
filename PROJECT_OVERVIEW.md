# 热狗连锁店数据分析系统 - 项目概览

## 🎯 项目简介

这是一个为热狗连锁店设计的**全国智能化数据分析管理平台**，提供实时业务监控、运营分析、客户画像、销售预测等功能。

## 🏗️ 系统架构

### 技术栈
- **前端**: React 18 + TypeScript + Ant Design + Recharts
- **后端**: Node.js + Express + TypeScript + Sequelize
- **数据库**: SQL Server (阿里云RDS)
- **容器化**: Docker + Docker Compose
- **代理**: Nginx
- **云服务**: 阿里云RDS + OSS

### 核心模块
```
├── 📊 仪表盘模块 - 实时业务数据展示
├── 🏪 运营分析模块 - 门店、订单、商品分析  
├── 👥 客户分析模块 - 客户画像和分群
├── 📈 销售预测模块 - 基于历史数据的预测分析
├── 🔄 数据同步模块 - 多数据源同步
└── 🛠️ 系统管理模块 - 配置和监控
```

## 📁 项目结构

```
yykhotdog/
├── 📂 frontend/                    # React前端应用
│   ├── src/
│   │   ├── components/             # 通用组件
│   │   ├── pages/                 # 页面组件
│   │   │   ├── Dashboard/         # 仪表盘
│   │   │   ├── Operations/        # 运营分析
│   │   │   ├── CustomerProfile/   # 客户分析
│   │   │   └── SalesComparison/   # 销售对比
│   │   ├── services/              # API服务
│   │   └── utils/                 # 工具函数
│   └── package.json
│
├── 📂 backend/                     # Node.js后端服务
│   ├── src/
│   │   ├── controllers/           # 控制器
│   │   ├── services/              # 业务逻辑
│   │   ├── models/                # 数据模型
│   │   ├── routes/                # 路由定义
│   │   ├── middleware/             # 中间件
│   │   └── config/                # 配置文件
│   └── package.json
│
├── 📂 database/                    # 数据库相关
│   ├── *.sql                      # SQL脚本
│   └── *.py                       # 数据库工具脚本
│
├── 📂 etl/                        # ETL数据处理
│   ├── steps/                     # ETL步骤
│   ├── validation/                # 数据验证
│   └── lib/                       # ETL库
│
├── 📂 archive/                     # 归档文件
│   ├── scripts/                   # 历史脚本
│   ├── reports/                   # 项目报告
│   └── backups/                   # 备份文件
│
├── 📂 nginx/                       # Nginx配置
├── 📂 docs/                        # 项目文档
├── 📂 test/                        # 测试文件
└── 📄 docker-compose.yml          # Docker编排
```

## 🗄️ 数据库设计

### 核心数据库
- **hotdog2030**: 主分析数据库
- **cyrg2025**: 源数据数据库1
- **cyrgweixin**: 源数据数据库2

### 主要数据表
```sql
-- 门店信息
stores (id, store_name, city, province, status, ...)

-- 商品信息  
products (id, product_name, category_id, price, ...)

-- 订单信息
orders (id, order_id, store_id, customer_id, total_amount, created_at, ...)

-- 订单商品
order_items (id, order_id, product_id, quantity, price, ...)

-- 客户信息
customers (id, customer_id, customer_name, phone, open_id, ...)

-- 地区层级
region_hierarchy (id, name, level, parent_id, is_active, ...)
```

## 🔄 数据流程

### 数据同步流程
```
源数据库 (cyrg2025, cyrgweixin) 
    ↓ [数据同步脚本]
目标数据库 (hotdog2030)
    ↓ [ETL处理]
分析数据表
    ↓ [API服务]
前端展示
```

### 关键脚本
- `complete-data-sync.py`: 完整数据同步
- `one-click-restore-sync.py`: 一键恢复同步
- `restore_databases_automated.py`: 自动化恢复

## 🚀 部署方案

### 开发环境
```bash
# 1. 数据恢复和同步
python restore_databases_automated.py

# 2. 启动服务
docker-compose up -d

# 3. 访问系统
# 前端: http://localhost:3000
# 后端: http://localhost:3001
```

### 生产环境
- 阿里云RDS (SQL Server)
- 阿里云OSS (备份存储)
- Docker容器化部署
- Nginx反向代理

## 📊 功能模块详解

### 1. 仪表盘模块
- 实时业务指标
- 销售趋势图表
- 门店运营状态
- 系统监控信息

### 2. 运营分析模块
- 门店分析 (地区分布、业绩对比)
- 商品分析 (热销商品、库存状态)
- 订单分析 (订单趋势、支付方式)
- 销售分析 (销售对比、时段分析)

### 3. 客户分析模块
- 客户画像 (年龄、性别、消费习惯)
- 客户分群 (核心客户、活跃客户、沉睡客户)
- 客户生命周期分析
- 客户价值评估

### 4. 销售预测模块
- 基于历史数据的销售预测
- 季节性趋势分析
- 商品需求预测
- 门店业绩预测

## 🔧 开发工具

### 后端开发
- TypeScript + Node.js
- Express框架
- Sequelize ORM
- Winston日志
- Swagger API文档

### 前端开发
- React 18 + TypeScript
- Ant Design组件库
- Recharts图表库
- Axios HTTP客户端

### 数据库工具
- SQL Server Management Studio
- Azure Data Studio
- 阿里云CLI

## 📈 性能优化

### 数据库优化
- 索引优化
- 查询优化
- 连接池配置
- 批量操作

### 前端优化
- 组件懒加载
- 图表按需加载
- 缓存策略
- 代码分割

### 后端优化
- API缓存
- 数据库连接池
- 异步处理
- 错误处理

## 🛡️ 安全措施

- JWT身份认证
- API访问控制
- 数据加密传输
- 输入验证
- SQL注入防护

## 📝 开发规范

### 代码规范
- ESLint + Prettier
- TypeScript严格模式
- 组件命名规范
- API设计规范

### Git规范
- 分支管理策略
- 提交信息规范
- 代码审查流程

## 🔍 监控和日志

### 系统监控
- 性能监控
- 错误监控
- 资源使用监控
- 业务指标监控

### 日志管理
- 结构化日志
- 日志分级
- 日志轮转
- 日志分析

## 📚 文档资源

- API文档: http://localhost:3001/api-docs
- 用户手册: USER_MANUAL.md
- 部署指南: docs/deployment.md
- 数据库设计: *.sql文件

## 🎯 未来规划

### 短期目标
- [ ] 完善数据同步机制
- [ ] 优化查询性能
- [ ] 增强错误处理
- [ ] 完善测试覆盖

### 长期目标
- [ ] 机器学习预测模型
- [ ] 移动端应用
- [ ] 多租户支持
- [ ] 国际化支持

---

## 📞 联系方式

- 项目团队: ZH Hotdog Team
- 技术支持: 通过GitHub Issues
- 文档更新: 定期维护

---

*最后更新: 2025-10-28*
