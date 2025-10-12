-- 数据导入脚本：将cyrg2025的历史数据导入hotdog2030
-- 创建时间：2025-09-25
-- 目的：丰富预测模型的数据基础

USE hotdog2030;
GO

-- 1. 首先备份现有数据（可选）
-- 创建备份表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[orders_backup]') AND type in (N'U'))
BEGIN
    SELECT * INTO orders_backup FROM orders;
    PRINT '已创建orders表备份';
END

-- 2. 导入门店数据（如果hotdog2030中缺少某些门店）
INSERT INTO stores (
    id, store_code, store_name, store_type, status, province, city, district, 
    address, longitude, latitude, area_size, rent_amount, investment_amount, 
    expected_revenue, director, director_phone, morning_time, night_time, 
    passenger_flow, establish_time, opening_time, is_self, is_close, 
    created_at, updated_at, delflag
)
SELECT 
    s.Id + 1000 as id,  -- 避免ID冲突，加1000
    'CYRG_' + CAST(s.Id as varchar(10)) as store_code,
    s.ShopName as store_name,
    CASE 
        WHEN s.state = 1 THEN '直营店'
        ELSE '加盟店'
    END as store_type,
    CASE 
        WHEN s.state = 1 THEN '营业中'
        ELSE '暂停营业'
    END as status,
    s.province,
    s.city,
    s.district,
    s.ShopAddress as address,
    CAST(0 as decimal(10,6)) as longitude,  -- 默认值
    CAST(0 as decimal(10,6)) as latitude,   -- 默认值
    CAST(0 as decimal(10,2)) as area_size,  -- 默认值
    CAST(ISNULL(s.rent, 0) as decimal(10,2)) as rent_amount,
    CAST(0 as decimal(10,2)) as investment_amount,  -- 默认值
    CAST(0 as decimal(10,2)) as expected_revenue,   -- 默认值
    s.Director as director,
    s.DirectorPhone as director_phone,
    s.morningTime as morning_time,
    s.nightTime as night_time,
    s.passengerFlow as passenger_flow,
    CASE 
        WHEN s.establishTime IS NOT NULL AND s.establishTime != '' 
        THEN TRY_CAST(s.establishTime as datetime2)
        ELSE GETDATE()
    END as establish_time,
    CASE 
        WHEN s.openingTime IS NOT NULL AND s.openingTime != '' 
        THEN TRY_CAST(s.openingTime as datetime2)
        ELSE GETDATE()
    END as opening_time,
    CASE WHEN s.IsSelf = 1 THEN 1 ELSE 0 END as is_self,
    CASE WHEN s.isClose = 1 THEN 1 ELSE 0 END as is_close,
    GETDATE() as created_at,
    GETDATE() as updated_at,
    0 as delflag
FROM cyrg2025.dbo.Shop s
WHERE s.Delflag = 0
AND NOT EXISTS (
    SELECT 1 FROM stores st 
    WHERE st.store_name COLLATE Chinese_PRC_CI_AS = s.ShopName COLLATE Chinese_PRC_CI_AS
);
GO

-- 3. 导入订单数据
INSERT INTO orders (
    order_no, customer_id, store_id, order_date, total_amount, 
    pay_state, order_state, payment_method, remark, created_at, updated_at, delflag
)
SELECT 
    o.orderNo as order_no,
    CASE 
        WHEN o.openId IS NOT NULL AND o.openId != '' THEN o.openId
        WHEN o.clientUserId IS NOT NULL THEN 'USER_' + CAST(o.clientUserId as varchar(20))
        ELSE 'ANONYMOUS_' + CAST(o.id as varchar(20))
    END as customer_id,
    -- 门店ID映射：cyrg2025的shopId对应hotdog2030的id
    CASE 
        WHEN o.shopId = 1 THEN 112   -- 沈阳一二六中学店
        WHEN o.shopId = 28 THEN 111  -- 五爱店 -> 测试门店
        WHEN o.shopId = 29 THEN 111  -- 测试门店
        WHEN o.shopId = 30 THEN 113  -- 沈阳一二O中学店
        WHEN o.shopId = 31 THEN 114  -- 沈阳第七中学店
        WHEN o.shopId = 32 THEN 115  -- 沈阳二十中学店
        WHEN o.shopId = 33 THEN 116  -- 沈阳虹桥中学店
        WHEN o.shopId = 34 THEN 117  -- 沈阳21世纪大厦店
        WHEN o.shopId = 35 THEN 118  -- 沈阳第一中学店
        WHEN o.shopId = 36 THEN 119  -- 沈阳博物馆店
        WHEN o.shopId = 37 THEN 120  -- 沈阳第四中学店
        WHEN o.shopId = 38 THEN 121  -- 沈阳二十二中学店
        WHEN o.shopId = 39 THEN 122  -- 沈阳三十一中学店
        WHEN o.shopId = 40 THEN 123  -- 沈阳故宫店
        WHEN o.shopId = 41 THEN 124  -- 沈阳七中五里河校区店
        WHEN o.shopId = 42 THEN 125  -- 辽阳宏伟实验学校店
        WHEN o.shopId = 43 THEN 126  -- 沈阳泉园二校店
        WHEN o.shopId = 44 THEN 127  -- 沈阳宁山路小学未来校区店
        WHEN o.shopId = 45 THEN 128  -- 沈阳铁路实验中学店
        WHEN o.shopId = 46 THEN 129  -- 沈阳三好街店
        WHEN o.shopId = 47 THEN 130  -- 仙桃第一中学店
        WHEN o.shopId = 48 THEN 131  -- 沈阳第十七中学店
        ELSE 111  -- 默认映射到测试门店
    END as store_id,
    CASE 
        WHEN o.recordTime IS NOT NULL AND o.recordTime != '' 
        THEN TRY_CAST(o.recordTime as datetime2)
        WHEN o.success_time IS NOT NULL AND o.success_time != '' 
        THEN TRY_CAST(o.success_time as datetime2)
        ELSE GETDATE()
    END as order_date,
    ISNULL(o.total, 0) as total_amount,
    CASE 
        WHEN o.payState = 1 THEN 1  -- 已支付
        ELSE 0  -- 未支付
    END as pay_state,
    CASE 
        WHEN o.delState = '已完成' OR o.delState = '已送达' THEN 3  -- 已完成
        WHEN o.delState = '配送中' THEN 2  -- 配送中
        ELSE 1  -- 待处理
    END as order_state,
    CASE 
        WHEN o.payMode = '微信支付' THEN 'wechat'
        WHEN o.payMode = '支付宝' THEN 'alipay'
        WHEN o.payMode = '现金' THEN 'cash'
        ELSE 'other'
    END as payment_method,
    o.orderRemarks as remark,
    CASE 
        WHEN o.recordTime IS NOT NULL AND o.recordTime != '' 
        THEN TRY_CAST(o.recordTime as datetime2)
        ELSE GETDATE()
    END as created_at,
    CASE 
        WHEN o.completeTime IS NOT NULL AND o.completeTime != '' 
        THEN TRY_CAST(o.completeTime as datetime2)
        ELSE GETDATE()
    END as updated_at,
    CASE WHEN o.delflag = 1 THEN 1 ELSE 0 END as delflag
FROM cyrg2025.dbo.Orders o
WHERE o.delflag = 0
AND o.total > 0  -- 只导入有效订单
AND NOT EXISTS (
    SELECT 1 FROM orders ord 
    WHERE ord.order_no COLLATE Chinese_PRC_CI_AS = o.orderNo COLLATE Chinese_PRC_CI_AS
);
GO

-- 4. 导入产品数据（如果hotdog2030中缺少某些产品）
INSERT INTO products (
    id, product_name, category_id, price, cost, 
    description, is_active, created_at, updated_at, delflag
)
SELECT 
    g.Id + 10000 as id,  -- 避免ID冲突，加10000
    g.goodsName as product_name,
    CASE 
        WHEN g.categoryId IS NOT NULL THEN g.categoryId + 1000
        ELSE 1  -- 默认分类
    END as category_id,
    ISNULL(g.salePrice, 0) as price,
    ISNULL(g.costPrice, 0) as cost,
    g.goodsText as description,
    CASE 
        WHEN g.isSale = 1 THEN 1
        ELSE 0
    END as is_active,
    GETDATE() as created_at,
    GETDATE() as updated_at,
    0 as delflag
FROM cyrg2025.dbo.Goods g
WHERE g.delflag = 0
AND NOT EXISTS (
    SELECT 1 FROM products p 
    WHERE p.product_name COLLATE Chinese_PRC_CI_AS = g.goodsName COLLATE Chinese_PRC_CI_AS
);
GO

-- 5. 导入订单商品数据
INSERT INTO order_items (
    order_id, product_id, quantity, price, total_price, 
    created_at, updated_at, delflag
)
SELECT 
    o.id as order_id,
    CASE 
        WHEN og.goodsId IS NOT NULL THEN og.goodsId + 10000
        ELSE 1  -- 默认产品
    END as product_id,
    ISNULL(og.goodsNumber, 1) as quantity,
    ISNULL(og.goodsPrice, 0) as price,
    ISNULL(og.goodsTotal, 0) as total_price,
    GETDATE() as created_at,
    GETDATE() as updated_at,
    0 as delflag
FROM cyrg2025.dbo.OrderGoods og
INNER JOIN orders o ON o.order_no COLLATE Chinese_PRC_CI_AS = (
    SELECT orderNo FROM cyrg2025.dbo.Orders ord 
    WHERE ord.id = og.orderId
) COLLATE Chinese_PRC_CI_AS
WHERE og.delflag = 0
AND NOT EXISTS (
    SELECT 1 FROM order_items oi 
    WHERE oi.order_id = o.id AND oi.product_id = og.goodsId + 10000
);
GO

-- 6. 更新统计信息
DECLARE @store_count INT, @order_count INT, @product_count INT, @order_item_count INT;

SELECT @store_count = COUNT(*) FROM stores WHERE id > 1000;
SELECT @order_count = COUNT(*) FROM orders WHERE order_no COLLATE Chinese_PRC_CI_AS IN (
    SELECT orderNo FROM cyrg2025.dbo.Orders WHERE delflag = 0
);
SELECT @product_count = COUNT(*) FROM products WHERE id > 10000;
SELECT @order_item_count = COUNT(*) FROM order_items WHERE product_id > 10000;

PRINT '数据导入完成！';
PRINT '导入统计：';
PRINT '门店数量: ' + CAST(@store_count as varchar(10));
PRINT '订单数量: ' + CAST(@order_count as varchar(10));
PRINT '产品数量: ' + CAST(@product_count as varchar(10));
PRINT '订单商品数量: ' + CAST(@order_item_count as varchar(10));
GO
