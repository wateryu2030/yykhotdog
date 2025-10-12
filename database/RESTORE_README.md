# 数据库恢复说明

本目录包含用于恢复 `cyrg2025` 和 `cyrgweixin` 数据库的脚本和备份文件。

## 备份文件说明

- `cyrg_backup_2025_09_09_000004_9004235.bak` - 用于恢复 `cyrg2025` 数据库
- `zhkj_backup_2025_09_09_000002_6761311.bak` - 用于恢复 `cyrgweixin` 数据库

## 恢复方法

### 方法1：使用SQL Server Management Studio（推荐）

1. 打开 SQL Server Management Studio
2. 连接到 RDS 实例：`rm-2ze8w8j3h8x8k8h5o.mssql.rds.aliyuncs.com,1433`
3. 使用用户名：`cyrg2025`，密码：`Cyrg2025!@#`
4. 打开 `restore_databases_simple.sql` 文件
5. 根据实际情况修改备份文件路径
6. 执行脚本

### 方法2：使用PowerShell脚本

1. 以管理员身份打开 PowerShell
2. 导航到数据库目录：`cd C:\Users\weijunyu\zhhotdog\database`
3. 执行脚本：`.\restore_databases.ps1`

### 方法3：使用Python脚本

1. 确保已安装 `pyodbc`：`pip install pyodbc`
2. 执行脚本：`python restore_databases.py`

## 注意事项

1. **备份文件路径**：请根据实际环境修改脚本中的备份文件路径
2. **数据文件路径**：请根据SQL Server安装路径修改数据文件存储路径
3. **权限要求**：执行恢复操作需要足够的数据库权限
4. **备份验证**：恢复前建议先验证备份文件的完整性

## 恢复后的验证

执行以下SQL查询来验证数据库恢复是否成功：

```sql
SELECT 
    name as '数据库名称',
    database_id as '数据库ID',
    create_date as '创建日期'
FROM sys.databases 
WHERE name IN ('cyrg2025', 'cyrgweixin')
ORDER BY name;
```

## 故障排除

如果恢复过程中遇到问题：

1. 检查备份文件是否存在且可访问
2. 确认数据库服务正在运行
3. 验证用户权限是否足够
4. 检查磁盘空间是否充足
5. 查看SQL Server错误日志

## 联系支持

如果遇到问题，请提供以下信息：
- 错误消息
- 执行的操作步骤
- 系统环境信息
