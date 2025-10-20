/*
示例：按城市权重 + 门店营收权重对集团期间费用进行二次分配。
你也可以在 operating_expense_import 中预先指定类别与比例。
*/
IF OBJECT_ID('dbo.vw_allocation_result','V') IS NOT NULL DROP VIEW dbo.vw_allocation_result;
GO
WITH city_weight AS (
  SELECT s.city, SUM(k.revenue) AS city_revenue
  FROM dbo.vw_kpi_store_daily k
  JOIN dbo.stores s ON s.id=k.store_id
  GROUP BY s.city
),
store_weight AS (
  SELECT s.city, k.store_id, SUM(k.revenue) AS store_revenue
  FROM dbo.vw_kpi_store_daily k
  JOIN dbo.stores s ON s.id=k.store_id
  GROUP BY s.city, k.store_id
),
op_exp AS (
  SELECT date_key, store_id, SUM(operating_exp) AS op
  FROM dbo.fact_profit_daily
  GROUP BY date_key, store_id
)
SELECT
  sw.city,
  sw.store_id,
  CONVERT(int, FORMAT(GETDATE(),'yyyyMMdd')) AS date_key,
  ISNULL(op.op,0) AS base_operating_exp,            -- 已录入的期间费用
  ISNULL(sw.store_revenue,0) AS store_revenue,
  ISNULL(cw.city_revenue,0) AS city_revenue,
  CASE WHEN cw.city_revenue>0 THEN sw.store_revenue/cw.city_revenue ELSE 0 END AS weight_in_city,
  ISNULL(op.op,0) * CASE WHEN cw.city_revenue>0 THEN sw.store_revenue/cw.city_revenue ELSE 0 END AS allocated_expense
FROM store_weight sw
LEFT JOIN city_weight cw ON cw.city=sw.city
LEFT JOIN (
  SELECT store_id, SUM(operating_exp) AS op FROM dbo.fact_profit_daily GROUP BY store_id
) op ON op.store_id=sw.store_id;
GO
