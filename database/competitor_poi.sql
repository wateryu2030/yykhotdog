IF OBJECT_ID('dbo.competitor_poi','U') IS NULL
CREATE TABLE dbo.competitor_poi (
  id INT IDENTITY(1,1) PRIMARY KEY,
  city NVARCHAR(100),
  name NVARCHAR(200),
  type NVARCHAR(200),
  address NVARCHAR(300),
  longitude DECIMAL(18,6),
  latitude DECIMAL(18,6),
  brand NVARCHAR(100),
  keyword NVARCHAR(100),
  source NVARCHAR(50) DEFAULT('amap'),
  fetched_at DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO
