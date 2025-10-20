IF OBJECT_ID('dbo.vw_sales_comparison','V') IS NOT NULL DROP VIEW dbo.vw_sales_comparison;
GO
CREATE VIEW dbo.vw_sales_comparison AS
SELECT
  s.city,
  s.id AS store_id,
  s.store_name,
  k.date_key,
  k.orders_cnt,
  k.items_qty,
  k.revenue,
  k.gross_profit,
  k.net_profit,
  CASE WHEN k.revenue > 0 THEN k.gross_profit/k.revenue ELSE 0 END AS gross_margin
FROM dbo.vw_kpi_store_daily k
JOIN dbo.stores s ON s.id = k.store_id;
GO
