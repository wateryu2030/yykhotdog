# 纯佑热狗数据库完整初始化指南

## 📋 概述

本指南说明如何使用自动化脚本完成数据库的完整初始化，包括数据恢复、迁移和所有数据修复。

**核心脚本**: `restore-and-init-complete.sh`
**配套脚本**: `init-hotdog2030-complete-v2.py`

## 🎯 功能特性

### 自动完成的工作

1. **数据库恢复**
   - 从 `.bak` 备份文件自动恢复 `cyrg2025` 数据库
   - 从 `.bak` 备份文件自动恢复 `cyrgweixin` 数据库

2. **数据库结构创建**
   - 创建 `hotdog2030` 分析数据库
   - 创建所有必需的表结构（包括新增的功能表）

3. **数据迁移**
   - ✅ 门店数据迁移（22家门店）
   - ✅ 城市数据填充（沈阳、滨州、辽阳、仙桃等）
   - ✅ 订单数据迁移（15万+订单）
   - ✅ **订单商品明细迁移**（63万+商品记录，新增！）
   - ✅ 地区层级数据创建

4. **数据修复和优化**
   - ✅ 门店营业状态自动更新
   - ✅ 门店类型识别（`is_self` 字段区分直营/加盟）
   - ✅ 订单收入计算修复（基于 `payMode` 的精确计算）
   - ✅ 订单日期字段修复（`created_at` 从 `order_date` 复制）
   - ✅ 所有支付方式字段迁移（cash, vip_amount, card_amount 等）

5. **数据验证**
   - 自动验证各城市数据分布
   - 验证订单日期分布
   - 验证数据完整性

## 🚀 使用方法

### 前置条件

1. **Docker 运行**
   ```bash
   docker ps | grep sqlserver
   ```
   如果未运行，先启动：
   ```bash
   docker-compose up -d sqlserver
   ```

2. **备份文件准备**
   将最新的备份文件放入 `database` 目录：
   - `database/cyrg_backup_YYYY_MM_DD_HHMMSS_*.bak`
   - `database/zhkj_backup_YYYY_MM_DD_HHMMSS_*.bak`
   
   脚本会自动识别最新的备份文件。

3. **Python 环境**
   确保已安装 Python 3 和 `pyodbc` 库：
   ```bash
   pip3 install pyodbc
   ```

### 执行初始化

```bash
# 给脚本添加执行权限（首次运行）
chmod +x restore-and-init-complete.sh

# 执行完整初始化
./restore-and-init-complete.sh
```

### 执行流程

脚本将自动执行以下步骤：

1. **【步骤1】** 检查 Docker 容器状态
2. **【步骤2】** 查找数据库备份文件
3. **【步骤3】** 准备容器环境
4. **【步骤4】** 恢复 cyrg2025 数据库
5. **【步骤5】** 恢复 cyrgweixin 数据库
6. **【步骤6】** 等待数据库准备就绪
7. **【步骤7】** 初始化 hotdog2030 数据库
   - 7.1 验证源数据库
   - 7.2 初始化数据库结构
   - 7.3 迁移门店数据
   - 7.4 填充城市表
   - 7.5 迁移订单数据
   - 7.5.5 **迁移订单商品明细（新增！）**
   - 7.6 更新门店状态
   - 7.7 创建地区层级
   - 7.8 验证数据完整性
8. **【步骤8】** 最终验证

## 📊 数据结构

### hotdog2030 核心表

| 表名 | 说明 | 记录数（示例） |
|------|------|----------------|
| `city` | 城市信息 | 4+ |
| `region_hierarchy` | 地区层级 | 20+ |
| `stores` | 门店信息 | 22 |
| `orders` | 订单信息 | 150,000+ |
| **`order_items`** | **订单商品明细** | **630,000+** |
| **`products`** | **商品信息（新增！）** | **2,000+** |
| **`product_categories`** | **商品分类（新增！）** | **待填充** |
| **`customer_profiles`** | **会员档案（新增！）** | **10,000+** |
| **`rg_seek_shop`** | **意向店铺（新增！）** | **100+** |
| `site_selection_data` | 选址数据 | 待填充 |

### 核心表结构

#### 订单商品明细表（order_items）

```sql
CREATE TABLE order_items (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,              -- 关联订单ID
    product_id BIGINT,                     -- 商品ID
    product_name NVARCHAR(200) NOT NULL,   -- 商品名称
    quantity INT NOT NULL DEFAULT 1,       -- 数量
    price DECIMAL(18, 2) NOT NULL,         -- 单价
    total_price DECIMAL(18, 2) NOT NULL,   -- 小计
    created_at DATETIME2,
    updated_at DATETIME2,
    delflag BIT DEFAULT 0
);
```

#### 商品表（products）

```sql
CREATE TABLE products (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    category_id BIGINT,                    -- 分类ID
    product_name NVARCHAR(200) NOT NULL,   -- 商品名称
    market_price DECIMAL(18, 2),           -- 市场价
    sale_price DECIMAL(18, 2),             -- 销售价
    cost_price DECIMAL(18, 2),             -- 成本价
    goods_stock INT DEFAULT 0,             -- 库存
    is_sale BIT DEFAULT 1,                 -- 是否上架
    is_hot BIT DEFAULT 0,                  -- 是否热销
    is_recommended BIT DEFAULT 0,          -- 是否推荐
    shop_id BIGINT,                        -- 门店ID
    created_at DATETIME2,
    updated_at DATETIME2,
    delflag BIT DEFAULT 0
);
```

#### 会员档案表（customer_profiles）

```sql
CREATE TABLE customer_profiles (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    vip_num NVARCHAR(100),                 -- 会员编号
    vip_name NVARCHAR(200),                -- 姓名
    vip_tel NVARCHAR(50),                  -- 手机号
    vip_card NVARCHAR(100),                -- 卡号
    recharge_amount DECIMAL(18, 2) DEFAULT 0,  -- 充值金额
    gift_amount DECIMAL(18, 2) DEFAULT 0,      -- 赠送金额
    total_balance DECIMAL(18, 2) DEFAULT 0,    -- 总余额
    shop_id BIGINT,                        -- 门店ID
    created_at DATETIME2,
    updated_at DATETIME2,
    delflag BIT DEFAULT 0
);
```

#### 意向店铺表（rg_seek_shop）

```sql
CREATE TABLE rg_seek_shop (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    shop_name NVARCHAR(200),               -- 门店名称
    shop_address NVARCHAR(500),            -- 门店地址
    location NVARCHAR(100),                -- 坐标
    blurb NVARCHAR(1000),                  -- 简介
    record_id BIGINT,                      -- 记录ID
    approval_id BIGINT,                    -- 审核人
    approval_time DATETIME2,               -- 审核时间
    approval_state TINYINT,                -- 审核状态1同意 2 不同意
    approval_remarks NVARCHAR(500),        -- 审核备注
    amount DECIMAL(18, 2) DEFAULT 0,       -- 奖励金额
    created_at DATETIME2,
    updated_at DATETIME2,
    delflag BIT DEFAULT 0
);
```

## 🔍 验证和测试

### 1. 检查日志文件

脚本会生成详细的日志文件：
```
init_hotdog2030_YYYYMMDD_HHMMSS.log
```

### 2. 数据一致性验证

```bash
# 运行数据一致性验证脚本
python3 verify-data-consistency.py
```

该脚本会检查：
- ✅ 门店-订单ID映射一致性
- ✅ 订单-商品明细ID映射一致性
- ✅ 商品-门店ID映射一致性
- ✅ 会员-门店ID映射一致性
- ✅ 数据完整性检查

### 3. 直接查询验证

```sql
-- 验证订单商品明细数量
USE hotdog2030;
SELECT COUNT(*) FROM order_items WHERE delflag = 0;

-- 验证商品数据
SELECT COUNT(*) FROM products WHERE delflag = 0;
SELECT COUNT(*) FROM customer_profiles WHERE delflag = 0;

-- 查看某个订单的商品明细
SELECT 
    oi.product_name,
    oi.quantity,
    oi.price,
    oi.total_price
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
WHERE o.order_no = 'ORD_156045' AND oi.delflag = 0;

-- 验证商品分类分布
SELECT 
    category_id,
    COUNT(*) as product_count,
    SUM(CASE WHEN is_sale = 1 THEN 1 ELSE 0 END) as sale_count
FROM products
WHERE delflag = 0
GROUP BY category_id
ORDER BY product_count DESC;

-- 验证会员分布
SELECT 
    s.city,
    COUNT(c.id) as customer_count,
    SUM(c.recharge_amount) as total_recharge
FROM customer_profiles c
INNER JOIN stores s ON c.shop_id = s.id
WHERE c.delflag = 0 AND s.delflag = 0
GROUP BY s.city
ORDER BY customer_count DESC;

-- 验证意向店铺数据
SELECT COUNT(*) FROM rg_seek_shop WHERE delflag = 0;
SELECT 
    approval_state,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM rg_seek_shop 
WHERE delflag = 0
GROUP BY approval_state
ORDER BY approval_state;
```

### 3. API 测试

启动后端后，测试新的 API：

```bash
# 测试订单商品明细 API
curl "http://localhost:3001/api/operations/orders/156045/items"
```

## 📱 前端功能

完整的数据下钻链路：

1. **门店列表** → 点击门店
2. **门店详情** → 点击"查看订单明细"
3. **订单列表** → 点击"查看详情"
4. **订单详情** → 显示商品明细列表

### 订单详情展示内容

- **基本信息**：订单号、下单时间、支付状态等
- **金额信息**：总金额、现金、会员充值、卡充值等
- **客户信息**：客户ID
- **商品明细**：
  - 商品名称
  - 数量
  - 单价
  - 小计

## 🛠️ 故障排查

### 问题1：容器未运行

**错误信息**：`❌ SQL Server容器未运行`

**解决方案**：
```bash
docker-compose up -d sqlserver
```

### 问题2：备份文件未找到

**错误信息**：`❌ 未找到cyrg2025备份文件`

**解决方案**：
1. 确认备份文件在 `database` 目录下
2. 文件名格式应为：`cyrg_backup_*.bak` 或 `zhkj_backup_*.bak`

### 问题3：Python 依赖缺失

**错误信息**：`ModuleNotFoundError: No module named 'pyodbc'`

**解决方案**：
```bash
pip3 install pyodbc
```

### 问题4：数据库连接失败

**错误信息**：`Login failed for user 'sa'`

**解决方案**：
1. 检查 `.env` 文件中的密码配置
2. 确认 `init-hotdog2030-complete-v2.py` 中的密码与 `.env` 一致

## 📝 日常使用建议

### 定期更新流程

1. **获取最新备份**：从生产环境下载最新的 `.bak` 文件
2. **放入 database 目录**：替换旧的备份文件
3. **执行初始化脚本**：`./restore-and-init-complete.sh`
4. **验证数据**：检查日志和数据分布
5. **重启服务**：重启前后端服务

### 数据更新周期建议

- **日常开发**：根据需要更新
- **功能测试**：每周更新一次
- **重大变更**：立即更新

## 🎓 技术说明

### 数据迁移策略

1. **ID 映射**：
   - 门店：使用 `store_code` 映射原始 `Shop.Id`
   - 订单：直接使用原始 `Orders.id`
   - 商品明细：通过 `order_id` 关联

2. **收入计算**：
   - 基于 `payMode` 字段识别支付方式
   - 不同支付方式使用不同的金额字段
   - 优先级：`orderValue` > `cash` + `vipAmount` + `cardAmount`

3. **数据清洗**：
   - 过滤 `delflag = 1` 的记录
   - 处理 NULL 值
   - 统一日期格式

### 性能优化

- 使用批量插入减少数据库往返
- 创建必要的索引
- 使用 `autocommit=True` 提高性能

## 📞 支持

如遇到问题，请检查：
1. 日志文件中的详细错误信息
2. Docker 容器状态和日志
3. 数据库连接配置

---

**最后更新**: 2025-10-12
**版本**: v2.1 - 新增订单商品明细迁移功能

