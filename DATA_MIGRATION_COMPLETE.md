# 数据迁移完整方案总结

## 🎯 项目概述

基于您提供的商品表和会员表结构说明，我已经完成了完整的数据迁移方案，确保所有数据能够正确导入并保持逻辑一致性。

## 📋 完成的工作

### 1. 商品数据导入 ✅

#### 表结构设计
基于 `cyrg2025.goods` 表结构，设计了完整的 `products` 表：

| 源字段 | 目标字段 | 说明 |
|--------|----------|------|
| `id` | `id` | 商品ID（主键，保持原始ID） |
| `categoryId` | `category_id` | 分类ID（用于商品分类分析） |
| `goodsName` | `product_name` | 商品名称 |
| `salePrice` | `sale_price` | 销售价 |
| `marktPrice` | `market_price` | 市场价 |
| `goodsStock` | `goods_stock` | 库存 |
| `costPrice` | `cost_price` | 成本价 |
| `isSale` | `is_sale` | 是否上架（0:不上架 1:上架） |
| `isHot` | `is_hot` | 是否热销（0:否 1:是） |
| `isRecom` | `is_recommended` | 是否推荐（0:否 1:是） |
| `shopId` | `shop_id` | 门店ID（映射到新的门店ID） |
| `shopName` | `shop_name` | 门店名称 |

#### 迁移逻辑
- ✅ 从 `cyrg2025.goods` 查询所有有效商品
- ✅ 通过 `store_map` 映射门店ID
- ✅ 处理所有字段的NULL值
- ✅ 保持原始商品ID不变

### 2. 会员数据导入 ✅

#### 表结构设计
基于 `cyrgweixin.VIP` 表结构，设计了完整的 `customer_profiles` 表：

| 源字段 | 目标字段 | 说明 |
|--------|----------|------|
| `id` | `id` | 会员ID（主键，保持原始ID） |
| `vipNum` | `vip_num` | 会员编号 |
| `vipName` | `vip_name` | 姓名 |
| `vipTel` | `vip_tel` | 手机号 |
| `vipCard` | `vip_card` | 卡号 |
| `vipPassword` | `vip_password` | 会员密码 |
| `chongzhi` | `recharge_amount` | 充值金额 |
| `zengsong` | `gift_amount` | 赠送金额 |
| `shopId` | `shop_id` | 门店ID（映射到新的门店ID） |
| `shopName` | `shop_name` | 门店名称 |
| `remarks` | `remarks` | 备注 |

#### 迁移逻辑
- ✅ 从 `cyrgweixin.VIP` 查询所有有效会员
- ✅ 通过 `store_map` 映射门店ID
- ✅ 计算总余额（充值金额 + 赠送金额）
- ✅ 处理所有字段的NULL值

### 3. ID映射关系一致性 ✅

#### 完整的ID映射体系

```
cyrg2025.Shop.id (原始门店ID)
    ↓
hotdog2030.stores.store_code (存储原始ID)
    ↓
hotdog2030.stores.id (新的自增ID)
    ↓
关联到：
- hotdog2030.orders.store_id
- hotdog2030.products.shop_id  
- hotdog2030.customer_profiles.shop_id
```

#### 关键ID字段处理

| ID类型 | 源表 | 目标表 | 映射方式 |
|--------|------|--------|----------|
| 门店ID | `cyrg2025.Shop.id` | `hotdog2030.stores.id` | 通过 `store_code` 映射 |
| 订单ID | `cyrg2025.Orders.id` | `hotdog2030.orders.id` | 直接保持原始ID |
| 商品ID | `cyrg2025.goods.id` | `hotdog2030.products.id` | 直接保持原始ID |
| 会员ID | `cyrgweixin.VIP.id` | `hotdog2030.customer_profiles.id` | 直接保持原始ID |
| 商品明细ID | `cyrg2025.OrderGoods.id` | `hotdog2030.order_items.id` | 自增生成 |

### 4. 字段名称和大小写处理 ✅

#### 常见差异处理
- `shopId` → `shop_id` (驼峰转下划线)
- `orderId` → `order_id` (驼峰转下划线)
- `goodsName` → `product_name` (语义化命名)
- `vipNum` → `vip_num` (驼峰转下划线)
- `chongzhi` → `recharge_amount` (语义化命名)

#### 数据类型统一
- 所有金额字段统一为 `DECIMAL(18, 2)`
- 所有日期字段统一为 `DATETIME2`
- 所有布尔字段统一为 `BIT`
- 所有文本字段使用 `NVARCHAR`

### 5. 数据一致性验证 ✅

#### 验证脚本功能
新增 `verify-data-consistency.py` 脚本，自动检查：

1. **门店-订单一致性**
   - 检查订单表中的 `store_id` 是否都能在门店表中找到
   - 统计有效和无效的门店ID数量

2. **订单-商品明细一致性**
   - 检查商品明细表中的 `order_id` 是否都能在订单表中找到
   - 检查商品明细表中的 `product_id` 是否都能在商品表中找到

3. **商品-门店一致性**
   - 检查商品表中的 `shop_id` 是否都能在门店表中找到

4. **会员-门店一致性**
   - 检查会员表中的 `shop_id` 是否都能在门店表中找到

5. **数据完整性检查**
   - 统计各表的记录数量
   - 检查关键表是否有数据

## 🚀 使用方法

### 一键初始化

```bash
# 给脚本执行权限
chmod +x restore-and-init-complete.sh

# 执行完整初始化（包含商品和会员数据）
./restore-and-init-complete.sh
```

### 手动验证

```bash
# 运行数据一致性验证
python3 verify-data-consistency.py

# 查看详细日志
ls -lt init_hotdog2030_*.log | head -1
```

## 📊 预期数据量

| 表名 | 预期记录数 | 说明 |
|------|------------|------|
| `stores` | 22 | 门店信息 |
| `orders` | 150,000+ | 订单信息 |
| `order_items` | 630,000+ | 订单商品明细 |
| `products` | 2,000+ | 商品信息 |
| `customer_profiles` | 10,000+ | 会员档案 |
| `city` | 4+ | 城市信息 |

## 🔍 验证方法

### 1. 日志验证
查看初始化日志中的统计信息：
```
✅ 成功迁移 2,000+/2,000+ 条商品记录
✅ 成功迁移 10,000+/10,000+ 条会员记录
📊 最终商品数据量: 2,000+ 条
📊 最终会员数据量: 10,000+ 条
```

### 2. 数据库查询验证
```sql
USE hotdog2030;

-- 检查商品数据
SELECT COUNT(*) FROM products WHERE delflag = 0;
SELECT TOP 5 * FROM products WHERE is_hot = 1;

-- 检查会员数据
SELECT COUNT(*) FROM customer_profiles WHERE delflag = 0;
SELECT TOP 5 * FROM customer_profiles WHERE recharge_amount > 0;

-- 检查ID映射关系
SELECT 
    s.store_code,
    s.store_name,
    COUNT(p.id) as product_count,
    COUNT(c.id) as customer_count
FROM stores s
LEFT JOIN products p ON s.id = p.shop_id AND p.delflag = 0
LEFT JOIN customer_profiles c ON s.id = c.shop_id AND c.delflag = 0
WHERE s.delflag = 0
GROUP BY s.store_code, s.store_name
ORDER BY product_count DESC;
```

### 3. 一致性验证报告
```bash
python3 verify-data-consistency.py
```

期望输出：
```
✅ 门店-订单ID映射完全一致
✅ 订单-商品明细ID映射完全一致
✅ 商品明细-商品ID映射完全一致
✅ 商品-门店ID映射完全一致
✅ 会员-门店ID映射完全一致
✅ 数据完整性检查通过
🎉 所有数据一致性检查通过！
```

## 🎯 核心优势

1. **完整性**: 覆盖了所有主要数据表（门店、订单、商品、会员）
2. **一致性**: 确保所有ID映射关系正确
3. **自动化**: 一键完成所有迁移和验证工作
4. **可重复**: 每次执行都能得到一致的结果
5. **可验证**: 提供详细的数据一致性验证报告

## 📝 注意事项

1. **备份文件**: 确保 `database/` 目录下有最新的 `.bak` 备份文件
2. **Docker运行**: 确保SQL Server容器正在运行
3. **Python依赖**: 确保已安装 `pyodbc` 库
4. **日志查看**: 每次执行后查看日志文件了解详细情况

---

**版本**: v2.2  
**完成时间**: 2025-10-12  
**状态**: ✅ 完成

现在您可以运行 `./restore-and-init-complete.sh` 来获得包含商品和会员数据的完整分析数据库！
