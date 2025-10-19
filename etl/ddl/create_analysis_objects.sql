-- 分析层对象创建脚本
-- 在 hotdog2030 数据库中执行
-- 创建时间: 2025-10-19

USE hotdog2030;
GO

-- 统一：按"门店-日"的销售聚合视图
IF OBJECT_ID('dbo.vw_sales_store_daily','V') IS NOT NULL DROP VIEW dbo.vw_sales_store_daily;
GO
CREATE VIEW dbo.vw_sales_store_daily AS
SELECT
  CONVERT(int, FORMAT(o.created_at, 'yyyyMMdd')) AS date_key,
  o.store_id,
  COUNT(DISTINCT o.id)              AS orders_cnt,
  SUM(oi.quantity)                  AS items_qty,
  SUM(o.total_amount)               AS revenue
FROM dbo.orders o
JOIN dbo.order_items oi ON oi.order_id = o.id
GROUP BY CONVERT(int, FORMAT(o.created_at, 'yyyyMMdd')), o.store_id;
GO

-- 利润事实表（门店-日）；COGS 后续通过脚本写入/更新
IF OBJECT_ID('dbo.fact_profit_daily','U') IS NULL
CREATE TABLE dbo.fact_profit_daily (
  date_key      int NOT NULL,
  store_id      int NOT NULL,
  revenue       decimal(18,2) NOT NULL DEFAULT(0),
  cogs          decimal(18,2) NOT NULL DEFAULT(0),       -- 销售成本
  operating_exp decimal(18,2) NOT NULL DEFAULT(0),       -- 期间费用（房租/人工/水电等）
  net_profit    AS (revenue - cogs - operating_exp) PERSISTED
);
GO

-- 修正上面持久列拼写错误（若你复制时请改为 cogs）
IF OBJECT_ID('dbo.fact_profit_daily','U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.fact_profit_daily','net_profit') IS NOT NULL
    ALTER TABLE dbo.fact_profit_daily DROP COLUMN net_profit;
  ALTER TABLE dbo.fact_profit_daily ADD net_profit AS (revenue - cogs - operating_exp) PERSISTED;
END
GO
CREATE UNIQUE CLUSTERED INDEX IX_fact_profit_daily ON dbo.fact_profit_daily(date_key, store_id);
GO

-- 存放预测结果：门店-日
IF OBJECT_ID('dbo.fact_forecast_daily','U') IS NULL
CREATE TABLE dbo.fact_forecast_daily (
  date_key   int NOT NULL,
  store_id   int NOT NULL,
  yhat       decimal(18,2) NOT NULL,
  yhat_lower decimal(18,2) NULL,
  yhat_upper decimal(18,2) NULL,
  model_name nvarchar(100) NULL,
  created_at datetime2 DEFAULT (sysutcdatetime()),
  PRIMARY KEY (date_key, store_id)
);
GO

-- 客户分群标签表
IF OBJECT_ID('dbo.dim_customer_segment','U') IS NULL
CREATE TABLE dbo.dim_customer_segment (
  customer_id nvarchar(100) NOT NULL,
  r_score tinyint NOT NULL,
  f_score tinyint NOT NULL,
  m_score tinyint NOT NULL,
  segment_code int NOT NULL,
  updated_at datetime2 DEFAULT (sysutcdatetime()),
  PRIMARY KEY (customer_id)
);
GO

-- 选址评分输出表（候选点 or 巡店）
IF OBJECT_ID('dbo.fact_site_score','U') IS NULL
CREATE TABLE dbo.fact_site_score (
  candidate_id   int NOT NULL,
  city           nvarchar(100) NULL,
  biz_area       nvarchar(200) NULL,
  match_score    decimal(9,4) NOT NULL,
  cannibal_score decimal(9,4) NOT NULL,
  total_score    decimal(9,4) NOT NULL,
  rationale      nvarchar(1000) NULL,
  created_at     datetime2 DEFAULT (sysutcdatetime()),
  PRIMARY KEY (candidate_id)
);
GO

-- KPI 视图（城市、门店维度）
IF OBJECT_ID('dbo.vw_kpi_store_daily','V') IS NOT NULL DROP VIEW dbo.vw_kpi_store_daily;
GO
CREATE VIEW dbo.vw_kpi_store_daily AS
SELECT
  s.id AS store_id, s.store_name, s.city, d.date_key,
  sd.orders_cnt, sd.items_qty, sd.revenue,
  fp.cogs, fp.operating_exp,
  (sd.revenue - ISNULL(fp.cogs,0)) AS gross_profit,
  (sd.revenue - ISNULL(fp.cogs,0) - ISNULL(fp.operating_exp,0)) AS net_profit
FROM dbo.stores s
JOIN dbo.vw_sales_store_daily sd
  ON sd.store_id = s.id
LEFT JOIN dbo.fact_profit_daily fp
  ON fp.store_id = s.id AND fp.date_key = sd.date_key;
GO

IF OBJECT_ID('dbo.vw_kpi_city_daily','V') IS NOT NULL DROP VIEW dbo.vw_kpi_city_daily;
GO
CREATE VIEW dbo.vw_kpi_city_daily AS
SELECT
  s.city, d.date_key,
  SUM(sd.orders_cnt) AS orders_cnt,
  SUM(sd.items_qty)  AS items_qty,
  SUM(sd.revenue)    AS revenue,
  SUM(ISNULL(fp.cogs,0)) AS cogs,
  SUM(ISNULL(fp.operating_exp,0)) AS operating_exp,
  SUM(sd.revenue - ISNULL(fp.cogs,0)) AS gross_profit,
  SUM(sd.revenue - ISNULL(fp.cogs,0) - ISNULL(fp.operating_exp,0)) AS net_profit
FROM dbo.stores s
JOIN dbo.vw_sales_store_daily sd ON sd.store_id=s.id
LEFT JOIN dbo.fact_profit_daily fp ON fp.store_id=s.id AND fp.date_key=sd.date_key
JOIN (SELECT DISTINCT date_key FROM dbo.vw_sales_store_daily) d ON d.date_key=sd.date_key
GROUP BY s.city, d.date_key;
GO

PRINT '分析层对象创建完成！';
