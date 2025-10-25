# 🎯 手动数据库恢复指南

## 问题说明
由于SQL Server的安全限制，无法通过Python脚本直接执行RESTORE操作。
需要手动执行恢复操作。

## 🚀 推荐恢复方案

### 方案1: 阿里云控制台 (最简单)
1. 登录阿里云RDS控制台: https://rds.console.aliyun.com
2. 找到实例: `rm-uf660d00xovkm30678o`
3. 进入"备份恢复" → "数据恢复"
4. 上传备份文件:
   - 上传 `cyrg2025-10-24.bak` → 恢复 `cyrg2025` 数据库
   - 上传 `zhkj2025-10-24.bak` → 恢复 `cyrgweixin` 数据库

### 方案2: Azure Data Studio (推荐)
1. 下载安装: https://docs.microsoft.com/en-us/sql/azure-data-studio/download-azure-data-studio
2. 连接到RDS:
   - 服务器: `rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com,1433`
   - 用户名: `hotdog`
   - 密码: `Zhkj@62102218`
3. 使用备份恢复功能

### 方案3: SQL Server Management Studio
1. 下载安装: https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms
2. 连接到RDS服务器
3. 右键数据库 → 任务 → 还原 → 数据库

## 📁 备份文件位置
```
/Users/apple/Ahope/yykhotdog/database/
├── cyrg2025-10-24.bak (317MB) → cyrg2025数据库
└── zhkj2025-10-24.bak (171MB) → cyrgweixin数据库
```

## 🔧 恢复步骤
1. **恢复cyrg2025数据库**
   - 使用 `cyrg2025-10-24.bak` 文件
   - 目标数据库: `cyrg2025`

2. **恢复cyrgweixin数据库**  
   - 使用 `zhkj2025-10-24.bak` 文件
   - 目标数据库: `cyrgweixin`

## ✅ 恢复后验证
恢复完成后，运行以下命令验证:
```bash
python3 check_all_databases.py
```

应该看到数据库中有大量数据记录。

## 🎉 完成后的效果
- ✅ 所有程序配置已更新为使用RDS
- ✅ 数据库连接正常
- ✅ 数据恢复完成
- ✅ 系统完全运行在RDS上

## 📞 技术支持
如有问题，请检查:
1. 网络连接是否稳定
2. 备份文件是否完整
3. RDS实例状态是否正常
4. 恢复权限是否足够
