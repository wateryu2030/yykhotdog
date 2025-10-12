#!/bin/bash

# 阿里云服务连接测试脚本

echo "=========================================="
echo "阿里云服务连接测试"
echo "=========================================="

# 检查阿里云CLI是否安装
if ! command -v aliyun &> /dev/null; then
    echo "❌ 阿里云CLI未安装，请先安装:"
    echo "   curl -o aliyun-cli-linux-amd64.tgz https://aliyuncli.alicdn.com/aliyun-cli-linux-amd64-latest.tgz"
    echo "   tar xzvf aliyun-cli-linux-amd64.tgz"
    echo "   sudo mv aliyun /usr/local/bin/"
    echo "   然后运行: aliyun configure"
    exit 1
fi

echo "✅ 阿里云CLI已安装"

# 检查配置
echo "📋 检查阿里云配置..."
aliyun configure list

# 测试RDS连接
echo -e "\n🔍 测试RDS数据库连接..."
echo "获取RDS实例列表:"
aliyun rds DescribeDBInstances --RegionId cn-hangzhou --PageSize 5

# 测试MaxCompute连接
echo -e "\n🔍 测试MaxCompute连接..."
echo "获取MaxCompute项目列表:"
aliyun maxcompute ListProjects --RegionId cn-hangzhou

# 测试DataWorks连接
echo -e "\n🔍 测试DataWorks连接..."
echo "获取DataWorks工作空间列表:"
aliyun dataworks-public ListProjects --RegionId cn-hangzhou

# 测试OSS连接
echo -e "\n🔍 测试OSS连接..."
echo "获取OSS Bucket列表:"
aliyun oss ls

echo -e "\n=========================================="
echo "测试完成！"
echo "==========================================" 