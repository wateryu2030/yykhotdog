#!/bin/bash
# 数据库恢复脚本 - 使用最新的备份文件

# 服务器配置
SERVER="rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com"
USERNAME="hotdog"
PASSWORD="Zhkj@62102218"

# 备份文件路径（更新为最新日期）
CYRG_BACKUP="/Users/apple/Ahope/yykhotdog/database/cyrg2025-10-27.bak"
ZHKJ_BACKUP="/Users/apple/Ahope/yykhotdog/database/zhkj2025-10-27.bak"

echo "🚀 开始数据库恢复操作..."
echo "============================================================"

# 检查备份文件
if [ ! -f "$CYRG_BACKUP" ]; then
    echo "❌ cyrg备份文件不存在: $CYRG_BACKUP"
    exit 1
fi

if [ ! -f "$ZHKJ_BACKUP" ]; then
    echo "❌ zhkj备份文件不存在: $ZHKJ_BACKUP"
    exit 1
fi

echo "✅ 备份文件检查通过"

# 注意：由于是远程RDS，需要使用阿里云控制台手动恢复
echo ""
echo "📋 由于本地无法直接恢复远程RDS，请按以下步骤操作："
echo ""
echo "方案1: 使用阿里云控制台"
echo "  1. 登录: https://rds.console.aliyun.com"
echo "  2. 选择实例: rm-uf660d00xovkm30678o"
echo "  3. 进入 备份恢复 > 数据恢复"
echo "  4. 上传备份文件:"
echo "     - $CYRG_BACKUP"
echo "     - $ZHKJ_BACKUP"
echo "  5. 恢复数据库 cyrg2025 和 cyrgweixin"
echo ""
echo "方案2: 使用Azure Data Studio或SSMS"
echo "  连接到服务器: $SERVER"
echo "  用户名: $USERNAME"
echo "  密码: $PASSWORD"
echo "  然后使用备份文件手动恢复"
echo ""
echo "备份文件位置:"
echo "  - cyrg2025: $CYRG_BACKUP"
echo "  - cyrgweixin: $ZHKJ_BACKUP"
echo "============================================================"
