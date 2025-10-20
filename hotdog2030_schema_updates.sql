-- 期间费用导入表
IF OBJECT_ID('dbo.operating_expense_import','U') IS NULL
CREATE TABLE dbo.operating_expense_import (
  id int IDENTITY(1,1) PRIMARY KEY,
  date_key int NOT NULL,
  store_id int NOT NULL,
  category nvarchar(50) NOT NULL,
  amount decimal(18,2) NOT NULL,
  description nvarchar(200) NULL,
  created_at datetime2 DEFAULT sysutcdatetime()
);

-- 房租种子化存储过程
IF OBJECT_ID('dbo.sp_seed_rent_daily','P') IS NOT NULL DROP PROCEDURE dbo.sp_seed_rent_daily;
GO
CREATE PROCEDURE dbo.sp_seed_rent_daily
  @year int,
  @month int
AS
BEGIN
  DECLARE @date_key int = @year * 10000 + @month * 100 + 1;
  DECLARE @end_date int = @year * 10000 + @month * 100 + 31;

  WHILE @date_key <= @end_date
  BEGIN
    INSERT INTO dbo.operating_expense_import (date_key, store_id, category, amount, description)
    SELECT @date_key, id, 'rent', rent_amount, '日房租费用'
    FROM dbo.stores 
    WHERE delflag = 0 AND rent_amount > 0;

    SET @date_key = @date_key + 1;
  END
END;
GO

-- 异常告警表
IF OBJECT_ID('dbo.fact_alerts','U') IS NULL
CREATE TABLE dbo.fact_alerts (
  id int IDENTITY(1,1) PRIMARY KEY,
  date_key int NOT NULL,
  store_id int NOT NULL,
  alert_type nvarchar(50) NOT NULL,
  metric nvarchar(50) NOT NULL,
  current_val decimal(18,2) NOT NULL,
  baseline_val decimal(18,2) NOT NULL,
  delta_pct decimal(9,4) NOT NULL,
  message nvarchar(500) NOT NULL,
  created_at datetime2 DEFAULT sysutcdatetime()
);

-- 选址评分表
IF OBJECT_ID('dbo.fact_site_score','U') IS NULL
CREATE TABLE dbo.fact_site_score (
  candidate_id int NOT NULL PRIMARY KEY,
  city nvarchar(100) NULL,
  biz_area nvarchar(200) NULL,
  match_score decimal(9,4) NOT NULL,
  cannibal_score decimal(9,4) NOT NULL,
  total_score decimal(9,4) NOT NULL,
  rationale nvarchar(1000) NULL,
  created_at datetime2 DEFAULT sysutcdatetime()
);

-- 差评统计导入表
IF OBJECT_ID('dbo.review_stats_import','U') IS NULL
CREATE TABLE dbo.review_stats_import (
  id int IDENTITY(1,1) PRIMARY KEY,
  date_key int NOT NULL,
  store_id int NOT NULL,
  total_reviews int NOT NULL DEFAULT(0),
  negative_reviews int NOT NULL DEFAULT(0),
  negative_rate decimal(5,2) NOT NULL DEFAULT(0),
  created_at datetime2 DEFAULT sysutcdatetime()
);