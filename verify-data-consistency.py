#!/usr/bin/env python3
"""
数据一致性验证脚本
检查各个表之间的ID映射关系是否正确
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'data_consistency_check_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 数据库配置
SERVER = "localhost,1433"
USERNAME = "sa"
PASSWORD = "YourStrong@Passw0rd"
DRIVER = "ODBC Driver 18 for SQL Server"

def get_connection():
    """获取数据库连接"""
    try:
        connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};DATABASE=hotdog2030;UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        return conn
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        return None

def check_store_order_consistency(conn):
    """检查门店-订单一致性"""
    logger.info("=" * 80)
    logger.info("检查门店-订单ID映射一致性")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    
    try:
        # 检查订单表中的store_id是否都能在stores表中找到
        cursor.execute("""
        SELECT COUNT(*) as total_orders,
               COUNT(DISTINCT o.store_id) as unique_store_ids,
               COUNT(DISTINCT s.id) as valid_store_ids
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id AND s.delflag = 0
        WHERE o.delflag = 0
        """)
        
        result = cursor.fetchone()
        total_orders, unique_store_ids, valid_store_ids = result
        
        logger.info(f"📊 订单统计:")
        logger.info(f"  总订单数: {total_orders}")
        logger.info(f"  唯一门店ID数: {unique_store_ids}")
        logger.info(f"  有效门店ID数: {valid_store_ids}")
        
        if unique_store_ids == valid_store_ids:
            logger.info("✅ 门店-订单ID映射完全一致")
        else:
            logger.warning(f"⚠️  门店-订单ID映射不一致: {unique_store_ids - valid_store_ids} 个无效门店ID")
            
            # 找出无效的门店ID
            cursor.execute("""
            SELECT DISTINCT o.store_id
            FROM orders o
            LEFT JOIN stores s ON o.store_id = s.id AND s.delflag = 0
            WHERE o.delflag = 0 AND s.id IS NULL
            ORDER BY o.store_id
            """)
            
            invalid_store_ids = [row[0] for row in cursor.fetchall()]
            logger.warning(f"   无效门店ID: {invalid_store_ids}")
        
        return unique_store_ids == valid_store_ids
        
    except Exception as e:
        logger.error(f"❌ 检查门店-订单一致性失败: {e}")
        return False

def check_order_item_consistency(conn):
    """检查订单-商品明细一致性"""
    logger.info("=" * 80)
    logger.info("检查订单-商品明细ID映射一致性")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    
    try:
        # 检查商品明细表中的order_id是否都能在orders表中找到
        cursor.execute("""
        SELECT COUNT(*) as total_items,
               COUNT(DISTINCT oi.order_id) as unique_order_ids,
               COUNT(DISTINCT o.id) as valid_order_ids
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id AND o.delflag = 0
        WHERE oi.delflag = 0
        """)
        
        result = cursor.fetchone()
        total_items, unique_order_ids, valid_order_ids = result
        
        logger.info(f"📊 商品明细统计:")
        logger.info(f"  总商品明细数: {total_items}")
        logger.info(f"  唯一订单ID数: {unique_order_ids}")
        logger.info(f"  有效订单ID数: {valid_order_ids}")
        
        if unique_order_ids == valid_order_ids:
            logger.info("✅ 订单-商品明细ID映射完全一致")
        else:
            logger.warning(f"⚠️  订单-商品明细ID映射不一致: {unique_order_ids - valid_order_ids} 个无效订单ID")
        
        # 检查商品明细表中的product_id是否都能在products表中找到
        cursor.execute("""
        SELECT COUNT(*) as total_items,
               COUNT(DISTINCT oi.product_id) as unique_product_ids,
               COUNT(DISTINCT p.id) as valid_product_ids
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id AND p.delflag = 0
        WHERE oi.delflag = 0 AND oi.product_id IS NOT NULL
        """)
        
        result = cursor.fetchone()
        total_items, unique_product_ids, valid_product_ids = result
        
        logger.info(f"📊 商品映射统计:")
        logger.info(f"  有商品ID的明细数: {total_items}")
        logger.info(f"  唯一商品ID数: {unique_product_ids}")
        logger.info(f"  有效商品ID数: {valid_product_ids}")
        
        if unique_product_ids == valid_product_ids:
            logger.info("✅ 商品明细-商品ID映射完全一致")
        else:
            logger.warning(f"⚠️  商品明细-商品ID映射不一致: {unique_product_ids - valid_product_ids} 个无效商品ID")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 检查订单-商品明细一致性失败: {e}")
        return False

def check_product_store_consistency(conn):
    """检查商品-门店一致性"""
    logger.info("=" * 80)
    logger.info("检查商品-门店ID映射一致性")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    
    try:
        # 检查商品表中的shop_id是否都能在stores表中找到
        cursor.execute("""
        SELECT COUNT(*) as total_products,
               COUNT(DISTINCT p.shop_id) as unique_shop_ids,
               COUNT(DISTINCT s.id) as valid_shop_ids
        FROM products p
        LEFT JOIN stores s ON p.shop_id = s.id AND s.delflag = 0
        WHERE p.delflag = 0
        """)
        
        result = cursor.fetchone()
        total_products, unique_shop_ids, valid_shop_ids = result
        
        logger.info(f"📊 商品统计:")
        logger.info(f"  总商品数: {total_products}")
        logger.info(f"  唯一门店ID数: {unique_shop_ids}")
        logger.info(f"  有效门店ID数: {valid_shop_ids}")
        
        if unique_shop_ids == valid_shop_ids:
            logger.info("✅ 商品-门店ID映射完全一致")
        else:
            logger.warning(f"⚠️  商品-门店ID映射不一致: {unique_shop_ids - valid_shop_ids} 个无效门店ID")
        
        return unique_shop_ids == valid_shop_ids
        
    except Exception as e:
        logger.error(f"❌ 检查商品-门店一致性失败: {e}")
        return False

def check_customer_store_consistency(conn):
    """检查会员-门店一致性"""
    logger.info("=" * 80)
    logger.info("检查会员-门店ID映射一致性")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    
    try:
        # 检查会员表中的shop_id是否都能在stores表中找到
        cursor.execute("""
        SELECT COUNT(*) as total_customers,
               COUNT(DISTINCT c.shop_id) as unique_shop_ids,
               COUNT(DISTINCT s.id) as valid_shop_ids
        FROM customer_profiles c
        LEFT JOIN stores s ON c.shop_id = s.id AND s.delflag = 0
        WHERE c.delflag = 0
        """)
        
        result = cursor.fetchone()
        total_customers, unique_shop_ids, valid_shop_ids = result
        
        logger.info(f"📊 会员统计:")
        logger.info(f"  总会员数: {total_customers}")
        logger.info(f"  唯一门店ID数: {unique_shop_ids}")
        logger.info(f"  有效门店ID数: {valid_shop_ids}")
        
        if unique_shop_ids == valid_shop_ids:
            logger.info("✅ 会员-门店ID映射完全一致")
        else:
            logger.warning(f"⚠️  会员-门店ID映射不一致: {unique_shop_ids - valid_shop_ids} 个无效门店ID")
        
        return unique_shop_ids == valid_shop_ids
        
    except Exception as e:
        logger.error(f"❌ 检查会员-门店一致性失败: {e}")
        return False

def check_data_completeness(conn):
    """检查数据完整性"""
    logger.info("=" * 80)
    logger.info("检查数据完整性")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    
    try:
        # 检查各表的记录数
        tables = [
            ("stores", "门店"),
            ("orders", "订单"),
            ("order_items", "订单商品明细"),
            ("products", "商品"),
            ("customer_profiles", "会员"),
            ("rg_seek_shop", "意向店铺"),
            ("city", "城市"),
            ("region_hierarchy", "地区层级")
        ]
        
        logger.info("📊 各表数据量统计:")
        logger.info("-" * 60)
        logger.info(f"{'表名':<20} {'中文名':<15} {'记录数':<15}")
        logger.info("-" * 60)
        
        total_issues = 0
        for table_name, chinese_name in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE delflag = 0")
                count = cursor.fetchone()[0]
                logger.info(f"{table_name:<20} {chinese_name:<15} {count:<15}")
                
                if count == 0 and table_name in ["stores", "orders"]:
                    logger.warning(f"⚠️  {table_name} 表数据为空，这是关键表！")
                    total_issues += 1
                    
            except Exception as e:
                logger.error(f"❌ 查询 {table_name} 表失败: {e}")
                total_issues += 1
        
        logger.info("-" * 60)
        
        if total_issues == 0:
            logger.info("✅ 数据完整性检查通过")
        else:
            logger.warning(f"⚠️  发现 {total_issues} 个数据完整性问题")
        
        return total_issues == 0
        
    except Exception as e:
        logger.error(f"❌ 检查数据完整性失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("=" * 80)
    logger.info("🔍 开始数据一致性验证")
    logger.info("=" * 80)
    logger.info(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("")
    
    conn = get_connection()
    if not conn:
        logger.error("❌ 无法连接到数据库，验证终止")
        return
    
    try:
        # 执行各项检查
        checks = [
            ("数据完整性检查", check_data_completeness),
            ("门店-订单一致性", check_store_order_consistency),
            ("订单-商品明细一致性", check_order_item_consistency),
            ("商品-门店一致性", check_product_store_consistency),
            ("会员-门店一致性", check_customer_store_consistency),
        ]
        
        passed_checks = 0
        total_checks = len(checks)
        
        for check_name, check_func in checks:
            logger.info(f"\n⏳ 执行: {check_name}...")
            if check_func(conn):
                logger.info(f"✅ {check_name} 通过")
                passed_checks += 1
            else:
                logger.error(f"❌ {check_name} 失败")
        
        logger.info("")
        logger.info("=" * 80)
        logger.info("🎯 数据一致性验证结果")
        logger.info("=" * 80)
        logger.info(f"通过检查: {passed_checks}/{total_checks}")
        
        if passed_checks == total_checks:
            logger.info("🎉 所有数据一致性检查通过！")
            logger.info("✅ 数据库迁移成功，所有ID映射关系正确")
        else:
            logger.warning(f"⚠️  有 {total_checks - passed_checks} 项检查未通过")
            logger.warning("请检查日志文件了解详细问题")
        
        logger.info(f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 80)
        
    except Exception as e:
        logger.error(f"❌ 验证过程出错: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
