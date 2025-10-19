-- 验证分析层对象和数据的SQL脚本
-- 在 hotdog2030 数据库中执行
-- 创建时间: 2025-10-19

USE hotdog2030;
GO

PRINT '开始验证分析层对象...';

-- 1. 验证分析层表是否存在
PRINT '1. 检查分析层表结构...';

SELECT 
    'fact_profit_daily' as table_name,
    COUNT(*) as record_count,
    MIN(date_key) as min_date,
    MAX(date_key) as max_date,
    SUM(revenue) as total_revenue,
    SUM(cogs) as total_cogs
FROM fact_profit_daily
UNION ALL
SELECT 
    'fact_forecast_daily' as table_name,
    COUNT(*) as record_count,
    MIN(date_key) as min_date,
    MAX(date_key) as max_date,
    SUM(yhat) as total_forecast,
    0 as total_cogs
FROM fact_forecast_daily
UNION ALL
SELECT 
    'dim_customer_segment' as table_name,
    COUNT(*) as record_count,
    0 as min_date,
    0 as max_date,
    AVG(CAST(segment_code as float)) as avg_segment,
    0 as total_cogs
FROM dim_customer_segment
UNION ALL
SELECT 
    'fact_site_score' as table_name,
    COUNT(*) as record_count,
    0 as min_date,
    0 as max_date,
    AVG(total_score) as avg_score,
    0 as total_cogs
FROM fact_site_score;

-- 2. 验证视图是否正常工作
PRINT '2. 检查分析层视图...';

-- 检查门店每日KPI视图
SELECT TOP 10 
    store_name,
    city,
    date_key,
    orders_cnt,
    revenue,
    gross_profit,
    net_profit
FROM vw_kpi_store_daily
ORDER BY date_key DESC, revenue DESC;

-- 检查城市每日KPI视图
SELECT TOP 10 
    city,
    date_key,
    orders_cnt,
    revenue,
    gross_profit,
    net_profit
FROM vw_kpi_city_daily
ORDER BY date_key DESC, revenue DESC;

-- 3. 验证数据质量
PRINT '3. 检查数据质量...';

-- 检查利润数据质量
SELECT 
    '利润数据质量检查' as check_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN revenue < 0 THEN 1 END) as negative_revenue,
    COUNT(CASE WHEN cogs < 0 THEN 1 END) as negative_cogs,
    COUNT(CASE WHEN revenue = 0 THEN 1 END) as zero_revenue,
    AVG(revenue) as avg_revenue,
    AVG(cogs) as avg_cogs
FROM fact_profit_daily;

-- 检查预测数据质量
SELECT 
    '预测数据质量检查' as check_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN yhat < 0 THEN 1 END) as negative_forecast,
    COUNT(CASE WHEN yhat = 0 THEN 1 END) as zero_forecast,
    AVG(yhat) as avg_forecast,
    MIN(yhat) as min_forecast,
    MAX(yhat) as max_forecast
FROM fact_forecast_daily;

-- 检查客户分群数据质量
SELECT 
    '客户分群数据质量检查' as check_type,
    COUNT(*) as total_customers,
    COUNT(CASE WHEN r_score < 1 OR r_score > 5 THEN 1 END) as invalid_r_score,
    COUNT(CASE WHEN f_score < 1 OR f_score > 5 THEN 1 END) as invalid_f_score,
    COUNT(CASE WHEN m_score < 1 OR m_score > 5 THEN 1 END) as invalid_m_score,
    AVG(CAST(r_score as float)) as avg_r_score,
    AVG(CAST(f_score as float)) as avg_f_score,
    AVG(CAST(m_score as float)) as avg_m_score
FROM dim_customer_segment;

-- 4. 业务指标验证
PRINT '4. 检查业务指标...';

-- 集团今日/昨日/本月核心 KPI（示例取最近 30 天）
SELECT TOP 30 
    date_key,
    SUM(orders_cnt) AS orders_cnt,
    SUM(items_qty) AS items_qty,
    SUM(revenue) AS revenue,
    SUM(gross_profit) AS gross_profit,
    SUM(net_profit) AS net_profit
FROM vw_kpi_store_daily
GROUP BY date_key
ORDER BY date_key DESC;

-- 城市榜单（本月）
SELECT TOP 10 
    city,
    SUM(revenue) AS revenue,
    SUM(net_profit) AS net_profit
FROM vw_kpi_city_daily
WHERE date_key >= CONVERT(int, FORMAT(DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1),'yyyyMMdd'))
GROUP BY city
ORDER BY revenue DESC;

-- 门店排行榜（近7日）
SELECT TOP 20 
    store_name,
    SUM(revenue) AS revenue,
    SUM(net_profit) AS net_profit
FROM vw_kpi_store_daily
WHERE date_key >= CONVERT(int, FORMAT(DATEADD(day,-7,GETDATE()),'yyyyMMdd'))
GROUP BY store_name
ORDER BY revenue DESC;

-- 客群分布（RFM）
SELECT 
    segment_code, 
    COUNT(*) AS users
FROM dim_customer_segment
GROUP BY segment_code
ORDER BY users DESC;

-- 未来7日门店营收预测
SELECT 
    s.store_name, 
    f.date_key, 
    f.yhat
FROM fact_forecast_daily f
JOIN stores s ON s.id=f.store_id
ORDER BY f.date_key, s.store_name;

-- 选址候选点评分
SELECT TOP 10
    candidate_id,
    city,
    match_score,
    cannibal_score,
    total_score,
    rationale
FROM fact_site_score 
ORDER BY total_score DESC;

-- 5. 性能检查
PRINT '5. 检查查询性能...';

-- 检查索引使用情况
SELECT 
    t.name as table_name,
    i.name as index_name,
    i.type_desc as index_type,
    s.user_seeks,
    s.user_scans,
    s.user_lookups
FROM sys.tables t
JOIN sys.indexes i ON t.object_id = i.object_id
LEFT JOIN sys.dm_db_index_usage_stats s ON i.object_id = s.object_id AND i.index_id = s.index_id
WHERE t.name IN ('fact_profit_daily', 'fact_forecast_daily', 'dim_customer_segment', 'fact_site_score')
ORDER BY t.name, i.name;

PRINT '分析层对象验证完成！';
