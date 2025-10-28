#!/bin/bash
echo "🚀 阿里云CLI安装和数据恢复"
echo "============================================================"

# 1. 检查并安装阿里云CLI
if ! command -v aliyun &> /dev/null; then
    echo "📦 安装阿里云CLI..."
    if command -v brew &> /dev/null; then
        brew install aliyun-cli
    else
        echo "❌ 未安装Homebrew，请先安装Homebrew或手动安装阿里云CLI"
        exit 1
    fi
else
    echo "✅ 阿里云CLI已安装"
fi

# 2. 配置提示
echo ""
echo "📋 请配置阿里云访问密钥："
echo "aliyun configure"
echo ""
echo "需要填写："
echo "  - Access Key ID"
echo "  - Access Key Secret"
echo "  - Default Region: cn-hangzhou"
echo "  - Default Output Format: json"
echo ""
echo "配置完成后，执行以下命令进行数据库恢复："
echo ""
echo "# 1. 上传备份文件到OSS"
echo "aliyun oss cp /Users/apple/Ahope/yykhotdog/database/cyrg2025-10-27.bak \\"
echo "  oss://yykhotdog-backup/backups/cyrg2025-10-27.bak"
echo ""
echo "aliyun oss cp /Users/apple/Ahope/yykhotdog/database/zhkj2025-10-27.bak \\"
echo "  oss://yykhotdog-backup/backups/zhkj2025-10-27.bak"
echo ""
echo "# 2. 在阿里云控制台恢复数据库"
echo "3. 访问: https://rds.console.aliyun.com"
echo "4. 选择实例: rm-uf660d00xovkm30678o"
echo "5. 使用OSS备份恢复cyrg2025和cyrgweixin数据库"
