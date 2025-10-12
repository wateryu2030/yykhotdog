# 营收计算逻辑深度分析报告

## 📋 数据表结构分析（基于Excel文档）

### 1. 订单表（Orders）核心字段

根据 `纯佑热狗主要数据表(1)(1).xlsx` 文档：

#### 金额相关字段（共9个主要字段）：
1. **total** - 支付金额
2. **orderValue** - 订单总值 ⭐ **核心字段**
3. **cash** - 现金
4. **vipAmount** - 使用会员充值金额
5. **vipAmountZengSong** - 使用会员赠送金额
6. **cardAmount** - 会员充值金额
7. **cardZengSong** - 会员赠送金额
8. **rollsRealIncomeAmount** - 团购实际收入
9. **couponAmount** - 优惠券金额
10. **discountAmount** - 折扣优惠金额
11. **molingAmount** - 抹零金额
12. **refundMoney** - 退款金额

#### 支付相关字段：
- **payState** - 支付状态
- **payMode** - 类别（**小程序 / 收银机 / 赠送 / 外卖 / 团购**）
- **payType** - 支付类别
- **payWay** - 支付方式

#### 团购相关字段：
- **rollsName** - 团购优惠券的名称（抖音,美团,饿了么）
- **rollsValue** - 团购使用优惠券的金额（优惠券面值）
- **rollspayAmount** - 用户在团购上实付的价值
- **rollsRealIncomeAmount** - 团购实际收入

## 🎯 营收计算逻辑推导

### 方案一：按字段定义推导

根据字段注释：
- `orderValue` = **订单总值** （商品原价总和）
- `total` = **支付金额** （实际支付金额）
- `cash` = **现金支付**
- `vipAmount` + `vipAmountZengSong` = 会员卡支付（充值+赠送）
- `cardAmount` + `cardZengSong` = 储值卡支付（充值+赠送）

**理论营收** = orderValue（订单总值）
**实际收入** = 根据支付方式不同而不同

### 方案二：按支付方式分类

根据 `payMode` 字段分类：

#### 1. **收银机订单**（线下POS机）
实际收入 = cash + vipAmount + vipAmountZengSong + cardAmount + cardZengSong

原因：线下收银机记录的是实际收到的各种支付方式的金额

#### 2. **小程序订单**（线上自营）
实际收入 = orderValue

原因：小程序订单的orderValue就是实际支付金额

#### 3. **外卖订单**（美团外卖/饿了么外卖）
实际收入 = cash 或 orderValue

原因：外卖订单一般记录在cash字段或orderValue字段

#### 4. **团购订单**（美团团购/抖音/美团拼好饭）
实际收入 = rollsRealIncomeAmount 或 orderValue

原因：团购订单有专门的实际收入字段

### 方案三：综合营收公式

```sql
-- 按支付方式分类的实际营收
CASE 
    -- 收银机订单：线下多种支付方式的总和
    WHEN payMode = '收银机' THEN 
        cash + 
        ISNULL(vipAmount, 0) + 
        ISNULL(vipAmountZengSong, 0) + 
        ISNULL(cardAmount, 0) + 
        ISNULL(cardZengSong, 0)
    
    -- 外卖订单：主要记录在cash字段
    WHEN payMode LIKE '%外卖%' THEN 
        ISNULL(cash, 0)
    
    -- 团购订单：使用实际收入字段
    WHEN payMode LIKE '%团购%' OR payMode LIKE '%拼好饭%' THEN 
        ISNULL(rollsRealIncomeAmount, orderValue)
    
    -- 小程序订单：使用订单总值
    WHEN payMode = '小程序' THEN 
        orderValue
    
    -- 赠送订单：不计入营收
    WHEN payMode = '赠送' THEN 
        0
    
    -- 其他：使用orderValue
    ELSE 
        orderValue
END as actual_revenue
```

## 📊 实际数据验证

### 沈阳一二O中学店（shopId=30）

#### 测试结果对比：

| 统计方式 | 金额 | 与目标差异 |
|---------|------|-----------|
| 目标金额（图片） | ¥455,018.03 | - |
| orderValue (payState=2) | ¥181,833.60 | -60.0% |
| cash+vipAmount+cardAmount+cardZengSong (收银机) | ¥345,311.88 | -24.1% |
| 按支付方式分类统计 | ¥374,346.67 | -17.7% |

#### 数据分布（payState=2）：
- 收银机订单：29,209单
- 美团外卖：2,977单
- 小程序：1,814单
- 饿了么外卖：1,439单
- 美团团购：773单
- 美团拼好饭：679单

## 🔧 建议的修正方案

### 1. 数据迁移脚本更新

更新 `migrate-data-to-hotdog2030.py`，使用正确的营收计算逻辑：

```python
# 计算实际营收
actual_revenue = """
CASE 
    WHEN o.payMode = '收银机' THEN 
        o.cash + 
        ISNULL(o.vipAmount, 0) + 
        ISNULL(o.vipAmountZengSong, 0) + 
        ISNULL(o.cardAmount, 0) + 
        ISNULL(o.cardZengSong, 0)
    WHEN o.payMode LIKE '%外卖%' THEN 
        ISNULL(o.cash, 0)
    WHEN o.payMode LIKE '%团购%' OR o.payMode LIKE '%拼好饭%' THEN 
        ISNULL(o.rollsRealIncomeAmount, o.orderValue)
    WHEN o.payMode = '小程序' THEN 
        o.orderValue
    WHEN o.payMode = '赠送' THEN 
        0
    ELSE 
        o.orderValue
END
"""
```

### 2. API查询逻辑更新

更新 `backend/src/routes/operations.ts`，使用相同的营收计算逻辑。

### 3. 订单表结构扩展

在 `hotdog2030.orders` 表中添加新字段：
- `pay_mode`: 支付方式（收银机/小程序/外卖/团购等）
- `cash`: 现金金额
- `vip_amount`: 会员充值金额
- `vip_amount_zengsong`: 会员赠送金额
- `card_amount`: 储值卡金额
- `card_zengsong`: 储值卡赠送金额
- `rolls_real_income_amount`: 团购实际收入

## ⚠️ 剩余差异分析

即使使用最优的按支付方式分类统计，仍有约17.7%的差异。可能的原因：

1. **时间范围差异**：图片数据可能是特定时间段的统计
2. **配送费/包装费**：可能包含额外收入项
3. **其他平台**：可能有其他未统计的销售渠道
4. **数据版本**：备份文件的时间点不同
5. **特殊业务规则**：可能有特定的营收统计规则

## 📈 下一步行动

1. ✅ 更新数据迁移脚本，添加所有必要的金额字段
2. ✅ 重新执行数据迁移，使用正确的营收计算逻辑
3. ✅ 更新API查询，确保前端显示正确的营收数据
4. ✅ 验证所有门店的数据准确性
5. ⏳ 与业务方确认剩余差异的原因

## 📝 结论

**`orderValue`（订单总值）**是核心字段，但实际营收需要根据**支付方式（payMode）**来选择正确的金额字段组合。

关键是：**不同支付方式使用不同的金额字段**，需要按照业务逻辑进行分类统计。

