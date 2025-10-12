# 纯佑热狗数据分析系统

## 📖 项目简介

纯佑热狗数据分析系统是一个完整的门店运营管理和数据分析平台，包含：
- 门店运营分析
- 客户画像分析
- 销售预测
- 智能选址
- 数据可视化

## 🏗️ 项目结构

```
yylkhotdog/
├── backend/                          # 后端服务（Node.js + Express）
│   ├── src/
│   │   ├── index.ts                 # 服务入口
│   │   ├── routes/                  # API 路由
│   │   │   ├── operations.ts       # 运营模块 API
│   │   │   ├── customerProfile.ts  # 客户画像 API
│   │   │   └── ...
│   │   └── config/                  # 配置文件
│   └── package.json
│
├── frontend/                         # 前端应用（React + Ant Design）
│   ├── src/
│   │   ├── pages/                   # 页面组件
│   │   │   ├── StoreOpening.tsx    # 门店开业（含订单商品明细）
│   │   │   ├── Operations.tsx      # 运营模块
│   │   │   ├── CustomerProfile.tsx # 客户画像
│   │   │   └── ...
│   │   └── components/              # 公共组件
│   └── package.json
│
├── database/                         # 数据库备份文件目录
│   ├── cyrg_backup_*.bak            # cyrg2025 备份
│   ├── zhkj_backup_*.bak            # cyrgweixin 备份
│   ├── 纯佑热狗主要数据表(1)(1).xlsx # 数据表说明文档
│   └── 热狗巡店表(1).xlsx            # 巡店表说明文档
│
├── 📜 核心脚本
├── restore-and-init-complete.sh     # ⭐ 一键初始化脚本（主脚本）
├── init-hotdog2030-complete-v2.py   # 数据库初始化 Python 脚本
├── cleanup-old-scripts.sh           # 清理旧脚本工具
│
├── 📚 文档
├── DATABASE_INIT_GUIDE.md           # 详细初始化指南
├── QUICK_START.md                   # 快速开始指南
├── CHANGELOG.md                     # 更新日志
├── COMPLETE_SOLUTION_SUMMARY.md     # 完整方案总结
├── README.md                        # 本文件
│
├── docker-compose.yml               # Docker 配置
├── .env                             # 环境变量配置
└── package.json                     # 项目根配置
```

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm run install:all

# 启动 Docker（SQL Server）
docker-compose up -d sqlserver

# 准备数据库备份文件
# 将 .bak 文件放入 database/ 目录
```

### 2. 初始化数据库

```bash
# 一键初始化（推荐）
./restore-and-init-complete.sh
```

这将自动完成：
- ✅ 恢复 cyrg2025 和 cyrgweixin 数据库
- ✅ 创建 hotdog2030 分析数据库
- ✅ 迁移所有数据（门店、订单、商品明细等）
- ✅ 应用所有数据修复
- ✅ 验证数据完整性

### 3. 启动服务

```bash
# 方式1：分别启动（推荐用于开发）
cd backend && npm run dev      # 后端：http://localhost:3001
cd frontend && npm start       # 前端：http://localhost:3000

# 方式2：同时启动
npm run dev
```

### 4. 访问系统

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:3001
- **API 文档**: http://localhost:3001/api-docs

## 🎯 核心功能

### 1. 门店运营分析
- 📊 门店列表和详情
- 📈 订单统计和收入分析
- 🔍 **四级数据下钻**：
  - 门店 → 订单列表 → 订单详情 → **商品明细**

### 2. 客户画像分析
- 👥 客户分布地图
- 📊 RFM 分析
- 🎯 客户细分

### 3. 销售预测
- 📈 趋势预测
- 📊 图表视图
- 📋 数据列表

### 4. 智能选址
- 🗺️ 地图选点
- 📊 评分系统
- 🎯 推荐等级

## 💾 数据库架构

### 源数据库
- **cyrg2025**: 纯佑热狗业务数据（门店、订单、商品等）
- **cyrgweixin**: 微信相关数据（会员、支付等）

### 分析数据库（hotdog2030）

| 表名 | 说明 | 记录数 |
|------|------|--------|
| `stores` | 门店信息 | 22 |
| `orders` | 订单信息 | 150,000+ |
| **`order_items`** | **订单商品明细** | **630,000+** |
| `city` | 城市信息 | 4+ |
| `region_hierarchy` | 地区层级 | 20+ |
| `products` | 商品信息 | 待填充 |
| `customer_profiles` | 客户档案 | 待填充 |
| `site_selection_data` | 选址数据 | 待填充 |

## 🔧 开发指南

### 后端开发

```bash
cd backend

# 开发模式（自动重启）
npm run dev

# 构建
npm run build

# 查看 API 文档
open http://localhost:3001/api-docs
```

### 前端开发

```bash
cd frontend

# 开发模式
npm start

# 构建生产版本
npm run build
```

### 数据库操作

```bash
# 进入 SQL Server 容器
docker exec -it yylkhotdog-sqlserver-1 bash

# 使用 sqlcmd
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -C

# 查询示例
USE hotdog2030;
SELECT COUNT(*) FROM order_items WHERE delflag = 0;
```

## 📊 关键 API

### 运营模块

```bash
# 运营概览
GET /api/operations/overview?startDate=2025-10-11&endDate=2025-10-11

# 门店列表
GET /api/operations/stores?page=1&limit=20

# 门店详情
GET /api/operations/stores/:id

# 门店订单列表
GET /api/operations/stores/:id/orders?page=1&pageSize=20

# 订单详情
GET /api/operations/orders/:id

# 订单商品明细 ⭐
GET /api/operations/orders/:id/items
```

### 客户画像

```bash
# 客户分布
GET /api/customer-profile/distribution

# 城市列表
GET /api/customer-profile/cities
```

## 🔄 数据更新流程

### 定期更新（推荐）

1. 从生产环境获取最新的 `.bak` 备份文件
2. 放入 `database/` 目录
3. 运行初始化脚本：
   ```bash
   ./restore-and-init-complete.sh
   ```
4. 重启前后端服务

### 手动更新

参考 `DATABASE_INIT_GUIDE.md` 中的详细步骤。

## 📝 最佳实践

### 开发环境
- 使用最新的备份文件（每周更新）
- 定期查看日志文件
- 保持 Docker 容器运行

### 生产环境
- 定期备份数据库
- 监控服务状态
- 定期更新依赖

### 数据安全
- 不要提交 `.env` 文件
- 不要提交 `.bak` 备份文件
- 定期更新密码

## 🐛 故障排查

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| Docker 容器未运行 | `docker-compose up -d sqlserver` |
| 端口被占用 | 修改 `.env` 中的端口配置 |
| 数据库连接失败 | 检查 `.env` 中的密码配置 |
| 前端编译错误 | 删除 `node_modules` 重新安装 |

详细故障排查请参考 `DATABASE_INIT_GUIDE.md`。

## 📚 文档索引

- **[快速开始指南](QUICK_START.md)** - 最简单的入门方式
- **[数据库初始化指南](DATABASE_INIT_GUIDE.md)** - 详细的初始化说明
- **[更新日志](CHANGELOG.md)** - 版本更新记录
- **[完整方案总结](COMPLETE_SOLUTION_SUMMARY.md)** - 技术方案详解

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目仅供内部使用。

## 📞 支持

如遇到问题，请查看：
1. 日志文件（`init_hotdog2030_*.log`）
2. Docker 日志（`docker logs yylkhotdog-sqlserver-1`）
3. 相关文档

---

**版本**: v2.1  
**最后更新**: 2025-10-12  
**主要特性**: 订单商品明细下钻、自动化数据初始化
