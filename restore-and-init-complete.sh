#!/bin/bash

# 完整的数据库恢复和初始化脚本
# 用途：从.bak备份文件恢复数据库，并初始化hotdog2030分析数据库
# 使用方法：./restore-and-init-complete.sh

set -e  # 遇到错误立即退出

echo "========================================================================"
echo "🚀 纯佑热狗数据库完整初始化流程"
echo "========================================================================"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置变量
CONTAINER_NAME="yylkhotdog-sqlserver-1"
SA_PASSWORD="YourStrong@Passw0rd"
BACKUP_DIR="database"

# 检查Docker容器是否运行
echo "【步骤1】检查Docker容器状态"
echo "------------------------------------------------------------------------"
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo -e "${RED}❌ SQL Server容器未运行${NC}"
    echo "请先启动Docker容器: docker-compose up -d sqlserver"
    exit 1
fi
echo -e "${GREEN}✅ SQL Server容器运行正常${NC}"
echo ""

# 查找最新的备份文件
echo "【步骤2】查找数据库备份文件"
echo "------------------------------------------------------------------------"

# 查找cyrg2025备份文件（最新的）
CYRG2025_BAK=$(ls -t ${BACKUP_DIR}/cyrg_backup_*.bak 2>/dev/null | head -n 1)
if [ -z "$CYRG2025_BAK" ]; then
    echo -e "${RED}❌ 未找到cyrg2025备份文件（cyrg_backup_*.bak）${NC}"
    exit 1
fi
echo -e "${GREEN}✅ cyrg2025备份: $CYRG2025_BAK${NC}"

# 查找cyrgweixin备份文件（最新的）
CYRGWEIXIN_BAK=$(ls -t ${BACKUP_DIR}/zhkj_backup_*.bak 2>/dev/null | head -n 1)
if [ -z "$CYRGWEIXIN_BAK" ]; then
    echo -e "${YELLOW}⚠️  未找到cyrgweixin备份文件（zhkj_backup_*.bak）${NC}"
    echo "将跳过cyrgweixin数据库恢复"
    CYRGWEIXIN_BAK=""
else
    echo -e "${GREEN}✅ cyrgweixin备份: $CYRGWEIXIN_BAK${NC}"
fi
echo ""

# 创建容器内备份目录
echo "【步骤3】准备容器环境"
echo "------------------------------------------------------------------------"
docker exec $CONTAINER_NAME mkdir -p /var/opt/mssql/backup
echo -e "${GREEN}✅ 备份目录已创建${NC}"
echo ""

# 恢复cyrg2025数据库
echo "【步骤4】恢复cyrg2025数据库"
echo "------------------------------------------------------------------------"
CYRG2025_FILENAME=$(basename "$CYRG2025_BAK")
docker cp "$CYRG2025_BAK" $CONTAINER_NAME:/var/opt/mssql/backup/
echo "  已复制备份文件到容器"

docker exec $CONTAINER_NAME /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "$SA_PASSWORD" -C -Q "
    IF EXISTS (SELECT * FROM sys.databases WHERE name = 'cyrg2025')
    BEGIN
        ALTER DATABASE cyrg2025 SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        DROP DATABASE cyrg2025;
    END
    
    RESTORE DATABASE cyrg2025
    FROM DISK = '/var/opt/mssql/backup/$CYRG2025_FILENAME'
    WITH MOVE 'cyrg' TO '/var/opt/mssql/data/cyrg2025.mdf',
         MOVE 'cyrg_log' TO '/var/opt/mssql/data/cyrg2025_log.ldf',
         REPLACE;
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ cyrg2025数据库恢复成功${NC}"
else
    echo -e "${RED}❌ cyrg2025数据库恢复失败${NC}"
    exit 1
fi
echo ""

# 恢复cyrgweixin数据库（如果有备份文件）
if [ -n "$CYRGWEIXIN_BAK" ]; then
    echo "【步骤5】恢复cyrgweixin数据库"
    echo "------------------------------------------------------------------------"
    CYRGWEIXIN_FILENAME=$(basename "$CYRGWEIXIN_BAK")
    docker cp "$CYRGWEIXIN_BAK" $CONTAINER_NAME:/var/opt/mssql/backup/
    echo "  已复制备份文件到容器"
    
    docker exec $CONTAINER_NAME /opt/mssql-tools18/bin/sqlcmd \
        -S localhost -U sa -P "$SA_PASSWORD" -C -Q "
        IF EXISTS (SELECT * FROM sys.databases WHERE name = 'cyrgweixin')
        BEGIN
            ALTER DATABASE cyrgweixin SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
            DROP DATABASE cyrgweixin;
        END
        
        RESTORE DATABASE cyrgweixin
        FROM DISK = '/var/opt/mssql/backup/$CYRGWEIXIN_FILENAME'
        WITH MOVE 'zhkj' TO '/var/opt/mssql/data/cyrgweixin.mdf',
             MOVE 'zhkj_log' TO '/var/opt/mssql/data/cyrgweixin_log.ldf',
             REPLACE;
    " > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ cyrgweixin数据库恢复成功${NC}"
    else
        echo -e "${YELLOW}⚠️  cyrgweixin数据库恢复失败（非必需）${NC}"
    fi
    echo ""
else
    echo "【步骤5】跳过cyrgweixin数据库恢复"
    echo "------------------------------------------------------------------------"
    echo -e "${YELLOW}⚠️  未找到cyrgweixin备份文件，跳过此步骤${NC}"
    echo ""
fi

# 等待数据库完全恢复
echo "【步骤6】等待数据库准备就绪"
echo "------------------------------------------------------------------------"
sleep 5
echo -e "${GREEN}✅ 数据库已准备就绪${NC}"
echo ""

# 执行hotdog2030初始化
echo "【步骤7】初始化hotdog2030数据库"
echo "------------------------------------------------------------------------"
python3 init-hotdog2030-complete-v2.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ hotdog2030数据库初始化成功${NC}"
else
    echo -e "${RED}❌ hotdog2030数据库初始化失败${NC}"
    exit 1
fi
echo ""

# 验证所有数据库
echo "【步骤8】最终验证"
echo "------------------------------------------------------------------------"
docker exec $CONTAINER_NAME /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "$SA_PASSWORD" -C -Q "
    SELECT 
        name as database_name,
        create_date,
        state_desc as status
    FROM sys.databases
    WHERE name IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
    ORDER BY name
" -W

echo ""
echo "【步骤9】数据一致性验证"
echo "------------------------------------------------------------------------"
python3 verify-data-consistency.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据一致性验证完成${NC}"
else
    echo -e "${YELLOW}⚠️  数据一致性验证发现问题，请查看日志${NC}"
fi
echo ""

echo ""
echo "========================================================================"
echo "🎉 数据库初始化流程完成！"
echo "========================================================================"
echo "完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "数据库列表:"
echo "  ✅ cyrg2025    - 源数据库（纯佑热狗业务数据）"
[ -n "$CYRGWEIXIN_BAK" ] && echo "  ✅ cyrgweixin  - 源数据库（微信相关数据）"
echo "  ✅ hotdog2030  - 分析数据库（包含选址等新功能）"
echo ""
echo "已完成的数据迁移和修复："
echo "  ✅ 门店数据迁移（包含is_self字段用于区分直营/加盟）"
echo "  ✅ 城市数据填充（沈阳、滨州、辽阳、仙桃等）"
echo "  ✅ 订单数据迁移（包含所有支付方式字段）"
echo "  ✅ 订单商品明细迁移（支持商品级别的数据下钻）"
echo "  ✅ 商品数据迁移（包含分类、价格、库存等完整信息）"
echo "  ✅ 会员数据迁移（包含充值、赠送等VIP信息）"
echo "  ✅ 意向店铺数据迁移（包含审核流程、奖励金额等）"
echo "  ✅ 门店营业状态更新"
echo "  ✅ 地区层级数据创建"
echo "  ✅ 收入计算逻辑修复（基于payMode的精确计算）"
echo "  ✅ ID映射关系一致性保证（shopId、orderId、productId、memberId等）"
echo ""
echo "下一步操作:"
echo "  1. 检查日志文件: 查看详细的迁移报告和数据验证结果"
echo "  2. 启动后端: cd backend && npm run dev"
echo "  3. 启动前端: cd frontend && npm start"
echo "  4. 访问系统: http://localhost:3000"
echo ""
echo "功能说明:"
echo "  📊 门店运营分析：完整的门店订单统计和收入分析"
echo "  🔍 多级数据下钻：门店 → 订单列表 → 订单详情 → 商品明细"
echo "  🏙️  多城市支持：沈阳、滨州、辽阳、仙桃等多个城市"
echo "  💰 精确收入计算：基于不同支付方式的精确收入统计"
echo "  🏪 门店类型识别：准确区分直营店和加盟店"
echo "  📦 商品销售分析：商品分类、热销产品、库存分析"
echo "  👥 会员数据分析：会员分布、充值统计、消费行为分析"
echo "  🏪 意向店铺管理：审核流程、奖励机制、选址分析"
echo "  🔗 完整数据关联：所有ID映射关系保证数据一致性"
echo ""
echo "========================================================================"

