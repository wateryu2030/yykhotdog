# 阿里云RDS数据恢复命令
# 请复制以下命令到您的终端执行

# 阿里云RDS数据恢复命令
# 请复制以下命令到您的终端执行

# 1. 设置环境变量
export ALIYUN_ACCESS_KEY_ID='your-access-key-id'
export ALIYUN_ACCESS_KEY_SECRET='your-access-key-secret'

# 2. 检查RDS实例状态
aliyun rds DescribeDBInstances --DBInstanceId rm-uf660d00xovkm3067

# 3. 上传备份文件到OSS (需要先创建OSS存储桶)
# 创建OSS存储桶:
aliyun oss mb oss://yykhotdog-backup-temp --region cn-hangzhou

# 上传备份文件:
aliyun oss cp /Users/apple/Ahope/yykhotdog/database/cyrg2025-10-24.bak oss://yykhotdog-backup-temp/backups/cyrg2025-10-24.bak
aliyun oss cp /Users/apple/Ahope/yykhotdog/database/zhkj2025-10-24.bak oss://yykhotdog-backup-temp/backups/zhkj2025-10-24.bak

# 4. 恢复数据库 (需要在阿里云控制台手动执行)
# 登录阿里云控制台 -> RDS -> 实例管理 -> 数据恢复

# 5. 验证恢复结果
aliyun rds DescribeDatabases --DBInstanceId rm-uf660d00xovkm3067