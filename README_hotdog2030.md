# 🧠 HotDog 2030 智能运营驾驶舱

## 原文档摘要
# 热狗连锁店数据分析系统

## 项目简介

这是一个为热狗连锁店设计的数据分析系统，包含仪表盘、运营分析、客户分析等功能模块。

## 核心功能

- 📊 **仪表盘** - 实时业务数据展示
- 🏪 **运营分析** - 门店、订单、商品分析
- 👥 **客户分析** - 客户画像和分群
- 📈 **销售预测** - 基于历史数据的预测分析

## 快速开始

### 1. 数据恢复和同步

执行一键式数据恢复和同步脚本：

```bash
python one-click-restore-sync.py
```

这个脚本会自动完成：
- 恢复基础数据库（cyrg2025、cyrgweixin）
- 复制地区级联数据
- 同步所有数据到hotdog2030数据库

### 2. 启动服务

```bash
# 启动Docker服务
docker-compose up -d

# 或者手动启动后端服务
cd backend && npm run dev
```

### 3. 访问系统

- 前端：http://localhost:3000
- 后端API：http://localhost:3001

## 项目结构

```
├── one-click-restore-sync.py    # 一键式数据恢复和同步脚本
├── complete-data-sync.py        # 数据同步脚本
├── copy-region-data-from-rds.py # 地区数据复制脚本
├── database/                    # 数据库相关文件
├── backend/                     # 后端服务
├── frontend/                    # 前端应用
├── nginx/                       # Nginx配置
└── docker-compose.yml          # Docker编排文件
```

## 技术栈

- **后端**: Node.js + Express + TypeScript
- **前端**: React + Ant Design
- **数据库**: SQL Server
- **容器化**: Docker + Docker Compose
- **代理**: Nginx

## 数据说明

系统支持多种订单类型：
- 小程序订单
- 收银机订单  
- 美团外卖订单
- 饿了么外卖订单
- 其他第三方平台订单

所有订单数据都会被正确识别和处理，确保数据分析的准确性。



## 🔧 新版系统功能说明

**核心特性：**
- 🚀 自动从 cyrg2025 与 cyrgweixin 抽取业务数据；
- 📊 构建 hotdog2030 数仓（Revenue、COGS、OPEX、Profit）；
- 🤖 智能分析：销售预测、选址、客户分群；
- ⚠️ 告警系统：营收/毛利/到手净额 监控；
- 🖥 前端驾驶舱：城市/门店 趋势 & 利润结构可视化。

**主要接口：**
- `/api/metrics/overview` — 指标聚合；
- `/api/alerts` — 异常告警；
- `/api/segments/top` — 客户分群；
- `/api/site-scores` — 选址评分。

## 🚀 快速启动

```bash
# 1. 启动数据库
docker-compose up -d

# 2. 执行ETL数据同步
python etl/run_etl.py

# 3. 启动后端服务
cd backend && npm run dev

# 4. 启动前端服务
cd frontend && npm run dev

# 5. 访问智能驾驶舱
http://localhost:3000/dashboard
```

## 📊 数据架构

### 数据源
- **cyrg2025**: 主业务数据库
- **cyrgweixin**: 微信小程序数据
- **hotdog2030**: 分析数据仓库

### 核心表结构
- `fact_profit_daily`: 每日利润分析
- `dim_customer_segment`: 客户分群
- `fact_site_score`: 选址评分
- `fact_alerts`: 异常告警

### 关键视图
- `vw_revenue_reconciliation`: 收入对账视图
- `vw_kpi_store_daily`: 门店日KPI
- `vw_kpi_city_daily`: 城市日KPI
