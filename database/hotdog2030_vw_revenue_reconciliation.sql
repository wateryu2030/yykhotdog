IF OBJECT_ID('dbo.vw_revenue_reconciliation','V') IS NOT NULL DROP VIEW dbo.vw_revenue_reconciliation;
GO
CREATE VIEW dbo.vw_revenue_reconciliation AS
SELECT
  fp.date_key,
  fp.store_id,
  s.store_name,
  fp.revenue AS revenue_gl,
  fp.cogs,
  fp.operating_exp,
  (fp.revenue - ISNULL(fp.cogs,0)) AS gross_profit,
  (fp.revenue - ISNULL(fp.cogs,0) - ISNULL(fp.operating_exp,0)) AS net_profit,
  ISNULL(fp.revenue,0) AS revenue_amount,
  ISNULL(fp.operating_exp,0) AS operating_expense,
  ISNULL(fp.revenue - fp.cogs - fp.operating_exp,0) AS profit,
  ISNULL(nr.net_receipt_total,0) AS net_receipt_total,
  fp.revenue - ISNULL(nr.net_receipt_total,0) AS diff_to_net,
  fp.date_key AS display_date -- 前端展示使用
FROM dbo.fact_profit_daily fp
JOIN dbo.stores s ON s.id = fp.store_id
LEFT JOIN (
  SELECT
    CONVERT(INT,FORMAT(created_at,'yyyyMMdd')) AS date_key,
    store_id,
    SUM(ISNULL(cash,0)+ISNULL(vipAmount,0)+ISNULL(cardAmount,0)) AS net_receipt_total
  FROM dbo.orders
  WHERE pay_state=1
  GROUP BY CONVERT(INT,FORMAT(created_at,'yyyyMMdd')),store_id
) nr ON nr.date_key=fp.date_key AND nr.store_id=fp.store_id;
GO
