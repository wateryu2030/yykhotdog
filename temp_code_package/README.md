# 🍖 热狗连锁店数据分析系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

> 全国智能化热狗连锁店数据分析管理平台

## 🎯 项目简介

这是一个为热狗连锁店设计的**全国智能化数据分析管理平台**，提供实时业务监控、运营分析、客户画像、销售预测等功能。系统支持多数据源整合，为连锁店提供全面的数据分析和决策支持。

## ✨ 核心功能

- 📊 **实时仪表盘** - 业务指标监控、销售趋势分析
- 🏪 **运营分析** - 门店管理、商品分析、订单统计
- 👥 **客户分析** - 客户画像、分群管理、生命周期分析
- 📈 **销售预测** - 基于历史数据的智能预测
- 🔄 **数据同步** - 多数据源自动同步和ETL处理
- 🛠️ **系统管理** - 配置管理、监控告警

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Python 3.8+
- Docker & Docker Compose
- SQL Server (阿里云RDS)

### 1. 克隆项目

```bash
git clone https://github.com/your-username/yykhotdog.git
cd yykhotdog
```

### 2. 数据恢复和同步

```bash
# 使用阿里云CLI恢复数据库
python restore_databases_automated.py

# 或手动恢复（需要阿里云控制台操作）
# 参考: RESTORE_SUMMARY.md
```

### 3. 启动服务

```bash
# 使用Docker Compose启动所有服务
docker-compose up -d

# 或分别启动
cd backend && npm install && npm run dev
cd frontend && npm install && npm start
```

### 4. 访问系统

- 🌐 **前端应用**: http://localhost:3000
- 🔧 **后端API**: http://localhost:3001
- 📚 **API文档**: http://localhost:3001/api-docs

## 🏗️ 技术架构

### 前端技术栈
- **框架**: React 18 + TypeScript
- **UI库**: Ant Design + Ant Design Pro
- **图表**: Recharts + Chart.js
- **状态管理**: React Hooks
- **HTTP客户端**: Axios

### 后端技术栈
- **运行时**: Node.js + Express
- **语言**: TypeScript
- **ORM**: Sequelize
- **数据库**: SQL Server (阿里云RDS)
- **认证**: JWT
- **日志**: Winston
- **API文档**: Swagger

### 基础设施
- **容器化**: Docker + Docker Compose
- **代理**: Nginx
- **云服务**: 阿里云RDS + OSS
- **监控**: 系统性能监控

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
├── 📄 docker-compose.yml          # Docker编排
├── 📄 PROJECT_OVERVIEW.md         # 项目详细概览
└── 📄 README.md                   # 项目说明
```

## 🗄️ 数据库设计

### 核心数据库
- **hotdog2030**: 主分析数据库
- **cyrg2025**: 源数据数据库1  
- **cyrgweixin**: 源数据数据库2

### 主要数据表
```sql
-- 门店信息
stores (id, store_name, city, province, status, coordinates, ...)

-- 商品信息  
products (id, product_name, category_id, price, status, ...)

-- 订单信息
orders (id, order_id, store_id, customer_id, total_amount, pay_state, created_at, ...)

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
- `restore_databases_automated.py`: 自动化数据库恢复
- `complete-data-sync.py`: 完整数据同步
- `one-click-restore-sync.py`: 一键恢复同步

## 📊 功能模块

### 1. 仪表盘模块
- 📈 实时业务指标监控
- 📊 销售趋势图表分析
- 🏪 门店运营状态展示
- ⚡ 系统性能监控

### 2. 运营分析模块
- 🗺️ 门店地区分布分析
- 📦 商品热销排行分析
- 💰 订单趋势和支付方式分析
- 📅 销售时段和季节性分析

### 3. 客户分析模块
- 👤 客户画像分析 (年龄、性别、消费习惯)
- 🎯 客户分群管理 (核心客户、活跃客户、沉睡客户)
- 📈 客户生命周期分析
- 💎 客户价值评估

### 4. 销售预测模块
- 🔮 基于历史数据的销售预测
- 📅 季节性趋势分析
- 📦 商品需求预测
- 🏪 门店业绩预测

## 🛠️ 开发指南

### 后端开发
```bash
cd backend
npm install
npm run dev          # 开发模式
npm run build        # 构建
npm run start        # 生产模式
npm run test         # 测试
npm run lint         # 代码检查
```

### 前端开发
```bash
cd frontend
npm install
npm start            # 开发模式
npm run build        # 构建
npm test             # 测试
```

### 数据库管理
```bash
# 数据同步
python archive/scripts/complete-data-sync.py --full

# 数据库恢复
python restore_databases_automated.py

# 验证恢复结果
./verify_restore.sh
```

## 🔧 配置说明

### 环境变量
```bash
# 数据库配置
DB_HOST=rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com
DB_PORT=1433
DB_USERNAME=hotdog
DB_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# 阿里云配置
ALIYUN_ACCESS_KEY_ID=your_access_key
ALIYUN_ACCESS_KEY_SECRET=your_secret_key
```

### Docker配置
```yaml
# docker-compose.yml
services:
  sqlserver:    # SQL Server数据库
  backend:      # Node.js后端服务
  frontend:     # React前端应用
```

## 📈 性能优化

### 数据库优化
- ✅ 索引优化和查询优化
- ✅ 连接池配置
- ✅ 批量操作优化
- ✅ 分页查询优化

### 前端优化
- ✅ 组件懒加载
- ✅ 图表按需加载
- ✅ 缓存策略
- ✅ 代码分割

### 后端优化
- ✅ API响应缓存
- ✅ 数据库连接池
- ✅ 异步处理
- ✅ 错误处理机制

## 🛡️ 安全措施

- 🔐 JWT身份认证
- 🚪 API访问控制
- 🔒 数据加密传输
- ✅ 输入验证和SQL注入防护
- 📝 操作日志记录

## 📚 文档资源

- 📖 [项目详细概览](PROJECT_OVERVIEW.md)
- 📋 [用户手册](USER_MANUAL.md)
- 🚀 [部署指南](docs/deployment.md)
- 🔧 [API文档](http://localhost:3001/api-docs)
- 🗄️ [数据库设计](*.sql文件)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 更新日志

### v1.0.0 (2025-10-28)
- ✨ 初始版本发布
- 📊 完整的仪表盘功能
- 🏪 运营分析模块
- 👥 客户分析功能
- 🔄 数据同步机制
- 🐳 Docker容器化部署

## 🎯 未来规划

### 短期目标
- [ ] 完善数据同步机制
- [ ] 优化查询性能
- [ ] 增强错误处理
- [ ] 完善测试覆盖

### 长期目标
- [ ] 机器学习预测模型
- [ ] 移动端应用开发
- [ ] 多租户支持
- [ ] 国际化支持

## 📞 联系方式

- 👥 **项目团队**: ZH Hotdog Team
- 🐛 **问题反馈**: [GitHub Issues](https://github.com/your-username/yykhotdog/issues)
- 📧 **技术支持**: 通过GitHub Issues
- 📚 **文档更新**: 定期维护

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给它一个星标！**

Made with ❤️ by ZH Hotdog Team

</div>
