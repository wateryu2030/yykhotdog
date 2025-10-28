# 数据库迁移指南

## 当前状态
✅ **RDS数据库连接正常**  
✅ **所有程序配置已更新为使用RDS**  
✅ **数据库结构已创建**  
⏳ **等待数据恢复完成**

## 数据库信息
- **RDS服务器**: `rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com:1433`
- **用户名**: `hotdog`
- **密码**: `Zhkj@62102218`
- **数据库**: 
  - `hotdog2030` (16个表，目前为空)
  - `cyrg2025` (99个表，目前为空)

## 备份文件
- `cyrg2025-10-24.bak` (317MB) - cyrg2025数据库备份
- `zhkj2025-10-24.bak` (171MB) - zhkj2025数据库备份

## 数据恢复方案

### 方案1: 使用Azure Data Studio (推荐)
1. 下载并安装 [Azure Data Studio](https://docs.microsoft.com/en-us/sql/azure-data-studio/download-azure-data-studio)
2. 连接到RDS服务器
3. 使用备份恢复功能上传.bak文件
4. 执行恢复操作

### 方案2: 通过阿里云RDS控制台
1. 登录阿里云RDS控制台
2. 找到对应的RDS实例
3. 使用"数据恢复"功能上传备份文件
4. 选择目标数据库进行恢复

### 方案3: 使用SQL Server Management Studio (SSMS)
1. 下载并安装 [SSMS](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
2. 连接到RDS服务器
3. 右键数据库 → 任务 → 还原 → 数据库
4. 选择备份文件进行恢复

### 方案4: 命令行恢复 (需要sqlcmd)
```bash
# 恢复cyrg2025数据库
sqlcmd -S rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com,1433 -U hotdog -P Zhkj@62102218 -Q "
RESTORE DATABASE [cyrg2025] 
FROM DISK = '/path/to/cyrg2025-10-24.bak'
WITH REPLACE"

# 恢复hotdog2030数据库 (使用zhkj备份)
sqlcmd -S rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com,1433 -U hotdog -P Zhkj@62102218 -Q "
RESTORE DATABASE [hotdog2030] 
FROM DISK = '/path/to/zhkj2025-10-24.bak'
WITH REPLACE"
```

## 已完成的配置更新

### 1. 后端配置
- ✅ `backend/src/config/database.ts` - 更新为RDS配置
- ✅ `backend/src/index.ts` - 更新环境变量加载
- ✅ `.env` - 更新数据库连接信息

### 2. Python脚本配置
- ✅ `create_analysis_tables.py` - 更新连接字符串
- ✅ `setup_analysis_layer.py` - 更新环境变量
- ✅ `complete-data-sync.py` - 更新数据库配置
- ✅ `etl/lib/mssql.py` - 更新默认连接参数
- ✅ `copy-region-data-from-rds.py` - 更新本地配置
- ✅ `update_analysis_data.py` - 更新连接配置

### 3. Docker配置
- ✅ `docker-compose-rds.yml` - 新的RDS版本配置
- ✅ 环境变量已更新为RDS参数

## 验证步骤

### 1. 测试数据库连接
```python
import pymssql

conn = pymssql.connect(
    server='rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    port=1433,
    user='hotdog',
    password='Zhkj@62102218',
    database='hotdog2030'
)
print("✅ 连接成功")
```

### 2. 检查数据恢复结果
```sql
-- 检查cyrg2025数据库表数据
USE cyrg2025;
SELECT TABLE_NAME, 
       (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES t2 
        WHERE t2.TABLE_NAME = t.TABLE_NAME) as record_count
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY record_count DESC;

-- 检查hotdog2030数据库表数据
USE hotdog2030;
SELECT TABLE_NAME, 
       (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES t2 
        WHERE t2.TABLE_NAME = t.TABLE_NAME) as record_count
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY record_count DESC;
```

## 后续步骤

1. **完成数据恢复** - 使用上述任一方案恢复备份数据
2. **验证数据完整性** - 检查关键表的数据量
3. **测试应用程序** - 确保所有功能正常工作
4. **性能优化** - 根据需要调整RDS配置

## 注意事项

- 备份文件较大，恢复过程可能需要一些时间
- 确保RDS实例有足够的存储空间
- 恢复过程中可能会暂时影响数据库性能
- 建议在非业务高峰期进行数据恢复

## 联系信息

如有问题，请检查：
1. RDS连接是否正常
2. 备份文件是否完整
3. 恢复权限是否足够
4. 网络连接是否稳定
