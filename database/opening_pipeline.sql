IF OBJECT_ID('dbo.opening_pipeline','U') IS NULL
CREATE TABLE dbo.opening_pipeline (
  id INT IDENTITY(1,1) PRIMARY KEY,
  candidate_id INT NOT NULL,   -- 对应 fact_site_score.candidate_id
  city NVARCHAR(100) NULL,
  status NVARCHAR(30) NOT NULL DEFAULT('pending'), -- pending|approved|signed|opening|opened|dead
  expected_open_date DATE NULL,
  owner NVARCHAR(50) NULL,
  note NVARCHAR(500) NULL,
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('dbo.opening_task','U') IS NULL
CREATE TABLE dbo.opening_task (
  id INT IDENTITY(1,1) PRIMARY KEY,
  pipeline_id INT NOT NULL,
  task NVARCHAR(100) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT('todo'), -- todo|doing|done
  due_date DATE NULL,
  assignee NVARCHAR(50) NULL,
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  FOREIGN KEY (pipeline_id) REFERENCES dbo.opening_pipeline(id)
);
GO
