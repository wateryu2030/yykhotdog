# hotdog2030 数据库初始化指南

本指南说明如何初始化 hotdog2030 数据库，包括表结构创建和数据同步。

## 📋 功能概述

数据库初始化脚本会自动完成以下工作：

1. **创建数据库和表结构** - 创建所有必要的业务表、索引和外键
2. **同步订单利润数据** - 从 `cyrg2025` 和 `cyrgweixin` 数据库的 `OrderGoods` 表聚合利润数据，更新到 `hotdog2030.orders.total_profit` 字段
3. **同步门店成立时间** - 从 `cyrg2025.dbo.Shop` 表获取门店成立时间，更新到 `hotdog2030.stores.open_date` 字段

## 🚀 快速开始

### 方法一：完整初始化（推荐）

运行完整的数据库初始化脚本，会自动执行所有步骤：

```bash
cd backend
node create-hotdog2030-db-fixed.js
```

### 方法二：仅执行数据同步

如果数据库已经创建，只需要同步利润和门店成立时间数据：

```bash
cd backend
node post-init-data-sync.js
```

## 📁 文件说明

### `create-hotdog2030-db-fixed.js`
主数据库创建脚本，包含：
- 数据库创建
- 表结构创建（enterprises, stores, orders, order_items, products, users 等）
- 索引创建
- 外键关系创建
- 示例数据插入
- **自动调用数据同步脚本**

### `post-init-data-sync.js`
初始化后数据同步脚本，包含：
- **订单利润同步** (`syncOrderProfits`)
  - 从 `cyrg2025.dbo.OrderGoods` 和 `cyrg2025.dbo.OrderGoodsSpec` 聚合利润
  - 从 `cyrgweixin.dbo.OrderGoods` 和 `cyrgweixin.dbo.OrderGoodsSpec`（如果存在）聚合利润
  - 更新 `hotdog2030.orders.total_profit` 字段
- **门店成立时间同步** (`syncStoreOpenDates`)
  - 从 `cyrg2025.dbo.Shop` 表获取门店成立时间
  - 更新 `hotdog2030.stores.open_date` 字段

## ⚙️ 环境变量配置

脚本会使用以下环境变量（按优先级）：

```env
# 数据库连接配置
DB_HOST=rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com
DB_PORT=1433
DB_USERNAME=hotdog
DB_PASSWORD=Zhkj@62102218

# 或者使用 cyrg2025 前缀的变量
cyrg2025_DB_HOST=rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com
cyrg2025_DB_PORT=1433
cyrg2025_DB_USER=hotdog
cyrg2025_DB_PASSWORD=Zhkj@62102218
```

## 🔍 数据同步逻辑详解

### 订单利润同步

1. **创建临时表** `order_profit_staging` 用于存储聚合的利润数据
2. **检查数据源表** 动态检测 `cyrgweixin.dbo.OrderGoodsSpec` 是否存在
3. **聚合利润数据** 从多个数据源 UNION ALL 聚合：
   - `cyrg2025.dbo.OrderGoods` (排除套餐)
   - `cyrg2025.dbo.OrderGoodsSpec`
   - `cyrgweixin.dbo.OrderGoods` (排除套餐)
   - `cyrgweixin.dbo.OrderGoodsSpec` (如果存在)
4. **更新订单表** 将聚合结果更新到 `orders.total_profit` 字段
5. **处理 NULL 值** 将 NULL 利润值设为 0

### 门店成立时间同步

1. **检查表结构** 确保 `stores` 表有 `open_date` 字段
2. **获取门店数据** 从 `cyrg2025.dbo.Shop` 查询：
   - `openingTime` - 开业时间
   - `establishTime` - 成立时间
   - `RecordTime` - 记录时间
3. **选择最早时间** 对于每个门店，选择三个时间字段中最早的一个
4. **批量更新** 更新 `hotdog2030.stores.open_date` 字段

## 📊 执行结果示例

```
🚀 开始数据库初始化后数据同步...

=== 同步订单利润数据 ===
准备利润数据临时表...
✅ 临时表准备完成
检查数据源表...
ℹ️  未检测到 cyrgweixin.dbo.OrderGoodsSpec 表，将跳过
聚合利润数据（这可能需要几分钟）...
✅ 利润数据聚合完成
更新订单利润字段...
✅ 订单利润更新完成
   总订单数: 183374
   有利润数据的订单数: 180787

=== 同步门店成立时间 ===
检查 stores 表结构...
✅ stores 表结构检查完成
从 cyrg2025 获取门店成立时间...
✅ 从 cyrg2025 获取到 156 个门店的成立时间
更新门店成立时间...
✅ 成功更新 156 个门店的成立时间

✅ 数据库初始化后数据同步完成！
```

## ⚠️ 注意事项

1. **执行时间**：利润数据同步可能需要几分钟时间，取决于数据量大小
2. **超时设置**：脚本设置了 10 分钟的超时保护，避免长时间卡死
3. **错误处理**：如果数据同步失败，不会影响数据库创建，可以稍后手动执行 `post-init-data-sync.js`
4. **数据源要求**：确保 `cyrg2025` 和 `cyrgweixin` 数据库可访问
5. **权限要求**：需要跨数据库查询权限

## 🔄 定期同步

如果需要定期更新利润和门店成立时间数据，可以：

1. **手动执行**：
   ```bash
   node backend/post-init-data-sync.js
   ```

2. **定时任务**：可以设置 cron 任务或使用 Node.js 定时器定期执行

3. **API 调用**：如果需要在应用内触发，可以创建 API 端点调用这些函数

## 🐛 故障排除

### 问题：利润数据同步失败

**可能原因**：
- 数据源表不存在或无法访问
- 数据库连接超时
- 权限不足

**解决方法**：
1. 检查 `cyrg2025` 和 `cyrgweixin` 数据库连接
2. 确认有跨数据库查询权限
3. 检查网络连接和超时设置

### 问题：门店成立时间未更新

**可能原因**：
- `cyrg2025.dbo.Shop` 表中没有数据
- 门店ID不匹配

**解决方法**：
1. 检查源数据是否存在
2. 确认 `hotdog2030.stores` 表中有对应的门店记录

## 📝 相关脚本

- `scripts/update_orders_profit.py` - Python 版本的利润更新脚本（独立使用）
- `scripts/update_store_open_dates.py` - Python 版本的门店成立时间更新脚本（独立使用）

## ✅ 验证清单

初始化完成后，请验证：

- [ ] 数据库 `hotdog2030` 已创建
- [ ] 所有表结构已创建
- [ ] 订单利润数据已同步（检查 `orders.total_profit` 字段）
- [ ] 门店成立时间已同步（检查 `stores.open_date` 字段）
- [ ] 索引已创建
- [ ] 外键关系已建立

---

**最后更新**: 2025-11-18  
**维护者**: 数据团队

