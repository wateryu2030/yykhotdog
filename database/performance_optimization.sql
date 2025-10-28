-- 数据库性能优化SQL脚本
-- 为销售对比分析模块添加必要的索引

-- 1. orders表索引优化
-- 为store_id和created_at添加复合索引，优化门店销售查询
CREATE NONCLUSTERED INDEX IX_orders_store_created 
ON orders (store_id, created_at) 
INCLUDE (total_amount, delflag);

-- 为created_at添加索引，优化时间范围查询
CREATE NONCLUSTERED INDEX IX_orders_created_at 
ON orders (created_at) 
INCLUDE (store_id, total_amount, delflag);

-- 为delflag添加索引，优化软删除查询
CREATE NONCLUSTERED INDEX IX_orders_delflag 
ON orders (delflag) 
INCLUDE (store_id, created_at, total_amount);

-- 2. order_items表索引优化
-- 为order_id添加索引，优化订单明细查询
CREATE NONCLUSTERED INDEX IX_order_items_order_id 
ON order_items (order_id) 
INCLUDE (product_name, total_price, quantity);

-- 为product_name添加索引，优化商品分析查询
CREATE NONCLUSTERED INDEX IX_order_items_product_name 
ON order_items (product_name) 
INCLUDE (order_id, total_price, quantity);

-- 3. stores表索引优化
-- 为city添加索引，优化城市分析查询
CREATE NONCLUSTERED INDEX IX_stores_city 
ON stores (city) 
INCLUDE (id, store_name, district, area_size, delflag);

-- 为delflag添加索引，优化软删除查询
CREATE NONCLUSTERED INDEX IX_stores_delflag 
ON stores (delflag) 
INCLUDE (id, store_name, city, district, area_size);

-- 4. products表索引优化
-- 为product_name添加索引，优化商品查询
CREATE NONCLUSTERED INDEX IX_products_name 
ON products (product_name) 
INCLUDE (id, category, price);

-- 5. customers表索引优化
-- 为store_id添加索引，优化客户分析查询
CREATE NONCLUSTERED INDEX IX_customers_store_id 
ON customers (store_id) 
INCLUDE (id, customer_name, phone, created_at);

-- 6. 复合索引优化
-- 为orders表添加复合索引，优化门店时间范围查询
CREATE NONCLUSTERED INDEX IX_orders_store_created_delflag 
ON orders (store_id, created_at, delflag) 
INCLUDE (total_amount);

-- 为order_items表添加复合索引，优化商品销售分析
CREATE NONCLUSTERED INDEX IX_order_items_product_order 
ON order_items (product_name, order_id) 
INCLUDE (total_price, quantity);

-- 7. 统计信息更新
-- 更新表统计信息，优化查询计划
UPDATE STATISTICS orders;
UPDATE STATISTICS order_items;
UPDATE STATISTICS stores;
UPDATE STATISTICS products;
UPDATE STATISTICS customers;

-- 8. 查询优化建议
-- 建议在查询中使用以下模式：
-- - 使用参数化查询避免SQL注入
-- - 在WHERE子句中先使用索引列
-- - 避免在WHERE子句中使用函数
-- - 使用适当的JOIN类型
-- - 限制返回的列数量

-- 9. 性能监控查询
-- 监控索引使用情况
SELECT 
    i.name AS IndexName,
    s.user_seeks,
    s.user_scans,
    s.user_lookups,
    s.user_updates
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats s ON i.object_id = s.object_id AND i.index_id = s.index_id
WHERE i.object_id IN (
    OBJECT_ID('orders'),
    OBJECT_ID('order_items'),
    OBJECT_ID('stores'),
    OBJECT_ID('products'),
    OBJECT_ID('customers')
)
ORDER BY s.user_seeks + s.user_scans + s.user_lookups DESC;

-- 监控慢查询
SELECT 
    query_hash,
    COUNT(*) as execution_count,
    AVG(total_elapsed_time) as avg_elapsed_time,
    MAX(total_elapsed_time) as max_elapsed_time,
    MIN(total_elapsed_time) as min_elapsed_time
FROM sys.dm_exec_query_stats
WHERE total_elapsed_time > 1000000 -- 超过1秒的查询
GROUP BY query_hash
ORDER BY avg_elapsed_time DESC;
