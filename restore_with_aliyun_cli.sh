#!/bin/bash
# 使用阿里云CLI从OSS恢复数据库到RDS

echo "🚀 开始从OSS恢复数据库..."
echo "============================================================"

# 检查阿里云CLI是否已安装
if ! command -v aliyun &> /dev/null; then
    echo "❌ 阿里云CLI未安装"
    echo "请先安装: ~/.homebrew/bin/brew install aliyun-cli"
    exit 1
fi

echo "✅ 阿里云CLI已安装"

# RDS实例ID
DB_INSTANCE_ID="rm-uf660d00xovkm30678o"

echo ""
echo "📋 备份文件位置："
echo "  - cyrg2025: oss://yykhotdog-backup-temp/backups/cyrg20251117.bak"
echo "  - cyrgweixin: oss://yykhotdog-backup-temp/backups/zhkj20251117.bak"
echo ""

# 由于阿里云RDS API限制，需要通过控制台恢复
echo "⚠️ 注意：阿里云RDS从OSS恢复需要在控制台手动操作"
echo ""
echo "📋 恢复步骤："
echo ""
echo "1. 访问阿里云RDS控制台：https://rds.console.aliyun.com"
echo ""
echo "2. 选择实例: ${DB_INSTANCE_ID}"
echo ""
echo "3. 进入 '备份恢复' -> '数据恢复'"
echo ""
echo "4. 恢复 cyrg2025 数据库："
echo "   - 选择 '从OSS恢复'"
echo "   - 选择备份: oss://yykhotdog-backup-temp/backups/cyrg20251117.bak"
echo "   - 恢复为数据库: cyrg2025"
echo ""
echo "5. 恢复 cyrgweixin 数据库："
echo "   - 选择 '从OSS恢复'"
echo "   - 选择备份: oss://yykhotdog-backup-temp/backups/zhkj20251117.bak"
echo "   - 恢复为数据库: cyrgweixin"
echo ""
echo "6. 等待恢复完成（通常5-10分钟）"
echo ""

# 验证脚本
echo "============================================================"
echo "🔍 恢复后验证命令："
echo ""
echo "python3 check_rds_data.py"
echo ""
echo "或者："
echo "aliyun rds DescribeDatabases --DBInstanceId ${DB_INSTANCE_ID} --DBName cyrg2025"
echo "aliyun rds DescribeDatabases --DBInstanceId ${DB_INSTANCE_ID} --DBName cyrgweixin"
