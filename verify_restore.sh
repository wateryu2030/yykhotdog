#!/bin/bash
# 数据库恢复验证脚本

echo "🔍 验证数据库恢复结果..."

# 检查RDS实例状态
echo "1. 检查RDS实例状态..."
./aliyun rds DescribeDBInstances --DBInstanceId rm-uf660d00xovkm3067 --RegionId cn-shanghai

# 检查数据库
echo "2. 检查数据库..."
./aliyun rds DescribeDatabases --DBInstanceId rm-uf660d00xovkm3067 --DBName cyrg2025
./aliyun rds DescribeDatabases --DBInstanceId rm-uf660d00xovkm3067 --DBName cyrgweixin

echo "✅ 验证完成"
