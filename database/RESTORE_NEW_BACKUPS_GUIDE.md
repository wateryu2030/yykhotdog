# 数据库恢复指南 - 新备份文件版本

## 📋 备份文件信息

- **cyrg20251117.bak** (430MB) → 恢复 `cyrg2025` 数据库
- **zhkj20251117.bak** (183MB) → 恢复 `cyrgweixin` 数据库

## 🚀 恢复方法

### 方法1: 阿里云控制台（推荐）

1. 登录阿里云RDS控制台: https://rds.console.aliyun.com
2. 选择实例: `rm-uf660d00xovkm3067`
3. 进入 **备份恢复** → **数据恢复**
4. 上传备份文件并执行恢复:
   - 上传 `cyrg20251117.bak` → 恢复为 `cyrg2025` 数据库
   - 上传 `zhkj20251117.bak` → 恢复为 `cyrgweixin` 数据库

### 方法2: Azure Data Studio

1. 下载安装: https://docs.microsoft.com/en-us/sql/azure-data-studio/download-azure-data-studio
2. 连接到RDS:
   - 服务器: `rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com,1433`
   - 用户名: `hotdog`
   - 密码: `Zhkj@62102218`
3. 使用备份恢复功能恢复数据库

### 方法3: SQL Server Management Studio (SSMS)

1. 下载安装: https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms
2. 连接到RDS服务器
3. 右键数据库 → **任务** → **还原** → **数据库**
4. 选择备份文件并执行恢复

## 📝 SQL恢复脚本

如果使用SQL工具直接执行，可以使用以下脚本：

### 恢复 cyrg2025 数据库

```sql
-- 删除现有数据库
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrg2025];
END

-- 恢复数据库
-- 注意：需要先检查备份文件的逻辑名称
RESTORE FILELISTONLY FROM DISK = '/path/to/cyrg20251117.bak';

-- 根据上面的结果，使用正确的逻辑名称执行恢复
RESTORE DATABASE [cyrg2025] 
FROM DISK = '/path/to/cyrg20251117.bak'
WITH 
    MOVE 'cyrg' TO '/var/opt/mssql/data/cyrg2025.mdf',
    MOVE 'cyrg_log' TO '/var/opt/mssql/data/cyrg2025_log.ldf',
    REPLACE;
```

### 恢复 cyrgweixin 数据库

```sql
-- 删除现有数据库
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrgweixin')
BEGIN
    ALTER DATABASE [cyrgweixin] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrgweixin];
END

-- 恢复数据库
-- 注意：需要先检查备份文件的逻辑名称
RESTORE FILELISTONLY FROM DISK = '/path/to/zhkj20251117.bak';

-- 根据上面的结果，使用正确的逻辑名称执行恢复
RESTORE DATABASE [cyrgweixin] 
FROM DISK = '/path/to/zhkj20251117.bak'
WITH 
    MOVE 'zhkj' TO '/var/opt/mssql/data/cyrgweixin.mdf',
    MOVE 'zhkj_log' TO '/var/opt/mssql/data/cyrgweixin_log.ldf',
    REPLACE;
```

## ✅ 验证恢复结果

恢复完成后，执行以下SQL验证：

```sql
SELECT 
    name as '数据库名称',
    database_id as '数据库ID',
    create_date as '创建日期'
FROM sys.databases 
WHERE name IN ('cyrg2025', 'cyrgweixin')
ORDER BY name;
```

## 📍 备份文件位置

```
/Users/apple/Ahope/yykhotdog/database/
├── cyrg20251117.bak (430MB)
└── zhkj20251117.bak (183MB)
```

## 🔄 下一步：同步到hotdog2030

恢复完成后，需要将数据同步到 `hotdog2030` 数据库。可以使用项目中的同步脚本：
- `ultra_fast_sync.py` - 同步订单数据
- `complete-data-sync.py` - 完整数据同步

