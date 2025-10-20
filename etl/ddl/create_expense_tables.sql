/* 期间费用导入与合并 - DDL脚本 */
/* 目标：把房租（已在 hotdog2030.dbo.stores.rent_amount）与人工/水电/推广等期间费用导入，合并进 fact_profit_daily 的 operating_exp 字段 */

/* 期间费用导入明细（按门店-日-类别） */
IF OBJECT_ID('dbo.operating_expense_import','U') IS NULL
CREATE TABLE dbo.operating_expense_import (
  date_key      INT NOT NULL,            -- 形如 20251019
  store_id      INT NOT NULL,            -- 对应 dbo.stores.id
  category      NVARCHAR(50) NOT NULL,   -- 'rent'|'labor'|'utilities'|'marketing'|'other'
  amount        DECIMAL(18,2) NOT NULL,
  note          NVARCHAR(200) NULL,
  created_at    DATETIME2 DEFAULT sysutcdatetime(),
  PRIMARY KEY (date_key, store_id, category)
);
GO

/* 将月房租均摊到每日：从 stores.rent_amount 写入（如已写过可跳过本步骤） */
IF OBJECT_ID('dbo.sp_seed_rent_daily','P') IS NOT NULL DROP PROCEDURE dbo.sp_seed_rent_daily;
GO
CREATE PROCEDURE dbo.sp_seed_rent_daily
  @year INT, @month INT
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @days INT = DAY(EOMONTH(DATEFROMPARTS(@year,@month,1)));
  INSERT INTO dbo.operating_expense_import (date_key, store_id, category, amount, note)
  SELECT
    CONVERT(INT, FORMAT(DATEFROMPARTS(@year,@month,d),'yyyyMMdd')) AS date_key,
    s.id AS store_id,
    'rent' AS category,
    ISNULL(s.rent_amount,0)/@days AS amount,  -- 房租日均
    N'auto seeded monthly rent'
  FROM dbo.stores s
  CROSS APPLY (SELECT TOP (@days) ROW_NUMBER() OVER(ORDER BY (SELECT 1)) AS d FROM sys.objects) d
  WHERE s.delflag=0;
END
GO

/* 告警输出表 */
IF OBJECT_ID('dbo.fact_alerts','U') IS NULL
CREATE TABLE dbo.fact_alerts (
  alert_id     BIGINT IDENTITY(1,1) PRIMARY KEY,
  date_key     INT NOT NULL,
  store_id     INT NULL,           -- 门店级告警
  city         NVARCHAR(100) NULL, -- 城市级告警
  alert_type   NVARCHAR(50) NOT NULL,   -- 'WOW_DROP'|'YOY_DROP'|'GROSS_ANOM'|'NEG_REVIEW_SPIKE'
  severity     TINYINT NOT NULL,    -- 1/2/3
  metric       NVARCHAR(50) NOT NULL, -- 'revenue'|'net_profit'|'gross_margin'|'neg_review'
  current_val  DECIMAL(18,2) NULL,
  baseline_val DECIMAL(18,2) NULL,
  delta_pct    DECIMAL(9,4) NULL,
  message      NVARCHAR(500) NULL,
  created_at   DATETIME2 DEFAULT sysutcdatetime()
);
GO

/* （可选）差评导入表：若你有第三方平台或小程序里的评价数据，可导入此表 */
IF OBJECT_ID('dbo.review_stats_import','U') IS NULL
CREATE TABLE dbo.review_stats_import (
  date_key INT NOT NULL,
  store_id INT NOT NULL,
  neg_count INT NOT NULL,
  total_count INT NULL,
  PRIMARY KEY (date_key, store_id)
);
GO
