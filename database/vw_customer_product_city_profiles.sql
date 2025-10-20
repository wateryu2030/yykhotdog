IF OBJECT_ID('dbo.vw_customer_profile','V') IS NOT NULL DROP VIEW dbo.vw_customer_profile;
GO
CREATE VIEW dbo.vw_customer_profile AS
SELECT
  c.customer_id,
  s.store_name,
  MAX(dcs.segment_code) AS segment_code,
  COUNT(DISTINCT o.id) AS orders_cnt,
  SUM(o.total_amount) AS total_spent,
  MIN(CONVERT(int, FORMAT(o.created_at,'yyyyMMdd'))) AS first_date_key,
  MAX(CONVERT(int, FORMAT(o.created_at,'yyyyMMdd'))) AS last_date_key
FROM dbo.customers c
LEFT JOIN dbo.orders o ON o.customer_id=c.customer_id
LEFT JOIN dbo.stores s ON s.id=o.store_id
LEFT JOIN dbo.dim_customer_segment dcs ON dcs.customer_id=c.customer_id
GROUP BY c.customer_id, s.store_name;
GO

IF OBJECT_ID('dbo.vw_product_profile','V') IS NOT NULL DROP VIEW dbo.vw_product_profile;
GO
CREATE VIEW dbo.vw_product_profile AS
SELECT
  p.id AS product_id,
  p.product_name,
  SUM(oi.quantity) AS qty_sold,
  SUM(oi.total_price) AS sales_amount,
  SUM(oi.quantity * ISNULL(p.cost_price,0)) AS cogs,
  CASE WHEN SUM(oi.total_price)>0
       THEN (SUM(oi.total_price)-SUM(oi.quantity*ISNULL(p.cost_price,0))) / SUM(oi.total_price)
       ELSE 0 END AS gross_margin,
  COUNT(DISTINCT o.customer_id) AS buyers_cnt
FROM dbo.order_items oi
JOIN dbo.orders o ON o.id=oi.order_id
JOIN dbo.products p ON p.id=oi.product_id
GROUP BY p.id, p.product_name;
GO

IF OBJECT_ID('dbo.vw_city_profile','V') IS NOT NULL DROP VIEW dbo.vw_city_profile;
GO
CREATE VIEW dbo.vw_city_profile AS
SELECT
  s.city,
  COUNT(DISTINCT s.id) AS stores_cnt,
  SUM(k.revenue) AS revenue,
  SUM(k.net_profit) AS net_profit,
  CASE WHEN SUM(k.revenue)>0 THEN SUM(k.gross_profit)/SUM(k.revenue) ELSE 0 END AS gross_margin,
  AVG(k.orders_cnt) AS avg_orders_per_store
FROM dbo.vw_kpi_store_daily k
JOIN dbo.stores s ON s.id=k.store_id
GROUP BY s.city;
GO
