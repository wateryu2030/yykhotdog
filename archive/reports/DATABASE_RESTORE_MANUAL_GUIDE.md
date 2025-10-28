# 数据库恢复手动指南

## 问题说明
由于阿里云 access key 安全策略导致自动上传失败，需要手动恢复备份文件。

## 解决方案

### 方案1: 使用阿里云OSS控制台手动上传（推荐）

1. **登录阿里云控制台**
   - 访问: https://oss.console.aliyun.com
   - 找到存储桶: `yykhotdog-backup-temp`

2. **上传备份文件到OSS**
   - 点击"上传"
   - 上传文件:
     * `/Users/apple/Ahope/yykhotdog/database/cyrg2025-10-27.bak` → `backups/cyrg2025-10-27.bak`
     * `/Users/apple/Ahope/yykhotdog/database/zhkj2025-10-27.bak` → `backups/zhkj2025-10-27.bak`

3. **在RDS控制台恢复数据库**
   - 访问: https://rds.console.aliyun.com
   - 实例: `rm-uf660d00xovkm30678o`
   - 备份恢复 > 数据恢复
   - 从OSS选择备份文件恢复:
     * `backups/cyrg2025-10-27.bak` → 恢复为 `cyrg2025`
     * `backups/zhkj2025-10-27.bak` → 恢复为 `cyrgweixin`

### 方案2: 使用Azure Data Studio（简单）

1. **下载并安装Azure Data Studio**
   - https://docs.microsoft.com/en-us/sql/azure-data-studio/download-azure-data-studio

2. **连接到RDS**
   - 服务器: `rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com,1433`
   - 用户名: `hotdog`
   - 密码: `Zhkj@62102218`

3. **恢复备份文件**
   - 右键数据库 → 任务 → 还原数据库
   - 选择备份文件:
     * `/Users/apple/Ahope/yykhotdog/database/cyrg2025-10-27.bak` → 还原到 `cyrg2025`
     * `/Users/apple/Ahope/yykhotdog/database/zhkj2025-10-27.bak` → 还原到 `cyrgweixin`

### 方案3: 使用SQL Server Management Studio

1. **下载并安装SSMS**
   - https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms

2. **连接到RDS并恢复**

### 方案4: 直接使用complete-data-sync.py（如果cyrg2025和cyrgweixin已有数据）

如果您之前的cyrg2025和cyrgweixin数据库还有数据，可以直接执行同步：

```bash
cd /Users/apple/Ahope/yykhotdog
python3 complete-data-sync.py --full
```

## 恢复完成后执行

### 1. 验证数据恢复
```bash
cd /Users/apple/Ahope/yykhotdog
python3 check_all_databases.py
```

### 2. 同步数据到hotdog2030
```bash
cd /Users/apple/Ahope/yykhotdog
python3 complete-data-sync.py --full
```

### 3. 执行ETL生成分析数据
访问 http://localhost:3000/etl-management 执行所有ETL步骤

## 备份文件位置
- cyrg2025: `/Users/apple/Ahope/yykhotdog/database/cyrg2025-10-27.bak` (325MB)
- cyrgweixin: `/Users/apple/Ahope/yykhotdog/database/zhkj2025-10-27.bak` (175MB)

