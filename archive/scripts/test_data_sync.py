#!/usr/bin/env python3
"""
测试数据同步 - 验证cyrg2025和cyrgweixin数据库恢复是否成功
使用pymssql连接数据库
"""
import pymssql
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 数据库连接配置
CONFIG = {
    'server': 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    'port': 1433,
    'user': 'hotdog',
    'password': 'Zhkj@62102218'
}

def get_connection(database):
    """获取数据库连接"""
    try:
        conn = pymssql.connect(
            server=CONFIG['server'],
            port=CONFIG['port'],
            user=CONFIG['user'],
            password=CONFIG['password'],
            database=database
        )
        logger.info(f"✅ 数据库连接成功: {database}")
        return conn
    except Exception as e:
        logger.error(f"❌ 数据库连接失败: {database} - {e}")
        return None

def test_cyrg2025_data():
    """测试cyrg2025数据库数据"""
    logger.info("🔍 测试cyrg2025数据库数据...")
    
    conn = get_connection('cyrg2025')
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # 检查主要表的数据量
        tables_to_check = [
            'Orders', 'OrderItems', 'Shop', 'Goods', 'Users'
        ]
        
        logger.info("📊 cyrg2025数据库统计:")
        for table in tables_to_check:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                logger.info(f"  - {table}: {count} 条记录")
            except Exception as e:
                logger.warning(f"  - {table}: 表不存在或查询失败 - {e}")
        
        # 检查最近的数据
        try:
            cursor.execute("SELECT TOP 5 id, recordTime FROM Orders ORDER BY recordTime DESC")
            recent_orders = cursor.fetchall()
            logger.info(f"📅 最近的订单:")
            for order in recent_orders:
                logger.info(f"  - 订单ID: {order[0]}, 时间: {order[1]}")
        except Exception as e:
            logger.warning(f"⚠️ 无法获取最近订单: {e}")
        
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ 测试cyrg2025数据失败: {e}")
        return False

def test_cyrgweixin_data():
    """测试cyrgweixin数据库数据"""
    logger.info("🔍 测试cyrgweixin数据库数据...")
    
    conn = get_connection('cyrgweixin')
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # 检查主要表的数据量
        tables_to_check = [
            'Orders', 'OrderItems', 'Shop', 'Goods', 'Users'
        ]
        
        logger.info("📊 cyrgweixin数据库统计:")
        for table in tables_to_check:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                logger.info(f"  - {table}: {count} 条记录")
            except Exception as e:
                logger.warning(f"  - {table}: 表不存在或查询失败 - {e}")
        
        # 检查最近的数据
        try:
            cursor.execute("SELECT TOP 5 id, recordTime FROM Orders ORDER BY recordTime DESC")
            recent_orders = cursor.fetchall()
            logger.info(f"📅 最近的订单:")
            for order in recent_orders:
                logger.info(f"  - 订单ID: {order[0]}, 时间: {order[1]}")
        except Exception as e:
            logger.warning(f"⚠️ 无法获取最近订单: {e}")
        
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ 测试cyrgweixin数据失败: {e}")
        return False

def test_hotdog2030_data():
    """测试hotdog2030数据库数据"""
    logger.info("🔍 测试hotdog2030数据库数据...")
    
    conn = get_connection('hotdog2030')
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # 检查主要表的数据量
        tables_to_check = [
            'orders', 'order_items', 'stores', 'products', 'customers'
        ]
        
        logger.info("📊 hotdog2030数据库统计:")
        for table in tables_to_check:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                logger.info(f"  - {table}: {count} 条记录")
            except Exception as e:
                logger.warning(f"  - {table}: 表不存在或查询失败 - {e}")
        
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ 测试hotdog2030数据失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("🚀 开始测试数据库数据同步状态")
    logger.info("=" * 60)
    
    # 测试源数据库
    cyrg2025_ok = test_cyrg2025_data()
    cyrgweixin_ok = test_cyrgweixin_data()
    
    # 测试目标数据库
    hotdog2030_ok = test_hotdog2030_data()
    
    # 输出测试结果
    logger.info("=" * 60)
    logger.info("📊 数据库测试结果:")
    logger.info(f"  - cyrg2025: {'✅ 正常' if cyrg2025_ok else '❌ 异常'}")
    logger.info(f"  - cyrgweixin: {'✅ 正常' if cyrgweixin_ok else '❌ 异常'}")
    logger.info(f"  - hotdog2030: {'✅ 正常' if hotdog2030_ok else '❌ 异常'}")
    
    if cyrg2025_ok and cyrgweixin_ok:
        logger.info("🎉 源数据库恢复成功！数据可以用于ETL同步")
    else:
        logger.warning("⚠️ 源数据库存在问题，需要检查恢复状态")
    
    if hotdog2030_ok:
        logger.info("✅ hotdog2030数据库连接正常")
    else:
        logger.warning("⚠️ hotdog2030数据库连接异常")

if __name__ == "__main__":
    main()
