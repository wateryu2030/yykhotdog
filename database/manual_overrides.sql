IF OBJECT_ID('dbo.manual_overrides','U') IS NULL
CREATE TABLE dbo.manual_overrides (
  id INT IDENTITY(1,1) PRIMARY KEY,
  module NVARCHAR(50),
  ref_id INT,
  operator NVARCHAR(100),
  note NVARCHAR(1000),
  score_manual DECIMAL(5,2) NULL,
  created_at DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO
