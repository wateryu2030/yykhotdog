#!/usr/bin/env python3
"""
最终修复版数据迁移脚本 - 从cyrg2025和cyrgweixin迁移到hotdog2030
修复了所有列名映射问题
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration_final.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 本地SQL Server连接配置
SERVER = "localhost,1433"
USERNAME = "sa"
PASSWORD = "YourStrong@Passw0rd"
DRIVER = "ODBC Driver 18 for SQL Server"

def get_connection():
    """获取数据库连接"""
    try:
        connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        return conn
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        return None

def check_database_access(conn, database_name):
    """检查数据库访问权限"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"USE [{database_name}]")
        cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
        table_count = cursor.fetchone()[0]
        logger.info(f"✅ {database_name}: 可访问，包含 {table_count} 个表")
        return True
    except Exception as e:
        logger.warning(f"❌ {database_name}: 不可访问 - {e}")
        return False

def migrate_products(conn):
    """迁移商品数据 - 最终修复版"""
    logger.info("🔄 开始迁移商品数据...")
    
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025的Goods和Category表迁移商品数据
        cursor.execute("USE [cyrg2025]")
        
        # 先迁移分类 - 使用正确的列名
        category_query = """
        SELECT DISTINCT 
            c.id,
            c.catName,
            NULL as parent_id,
            NULL as sort_order,
            1 as is_active,
            GETDATE() as created_at,
            GETDATE() as updated_at,
            c.delflag
        FROM Category c
        WHERE (c.delflag = 0 OR c.delflag IS NULL)
        """
        
        cursor.execute(category_query)
        categories = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(categories)} 个分类记录")
        
        # 插入分类到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        # 启用IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT categories ON")
        
        category_insert = """
        INSERT INTO categories (id, category_name, parent_id, sort_order, is_active, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        category_success = 0
        for category in categories:
            try:
                cursor.execute(category_insert, category)
                category_success += 1
            except Exception as e:
                logger.warning(f"插入分类数据失败: {e}")
                continue
        
        # 关闭IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT categories OFF")
        
        logger.info(f"✅ 成功迁移 {category_success} 个分类")
        
        # 迁移商品
        cursor.execute("USE [cyrg2025]")
        
        goods_query = """
        SELECT 
            g.id,
            g.goodsName,
            g.categoryId,
            ISNULL(g.goodsPrice, 0) as price,
            NULL as cost,
            ISNULL(g.goodsDesc, '') as description,
            NULL as image_url,
            1 as is_active,
            GETDATE() as created_at,
            GETDATE() as updated_at,
            g.delflag
        FROM Goods g
        WHERE (g.delflag = 0 OR g.delflag IS NULL)
        """
        
        cursor.execute(goods_query)
        goods = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(goods)} 个商品记录")
        
        # 插入商品到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        # 启用IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT products ON")
        
        goods_insert = """
        INSERT INTO products (id, product_name, category_id, price, cost, description, image_url, is_active, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        goods_success = 0
        for good in goods:
            try:
                cursor.execute(goods_insert, good)
                goods_success += 1
            except Exception as e:
                logger.warning(f"插入商品数据失败: {e}")
                continue
        
        # 关闭IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT products OFF")
        
        logger.info(f"✅ 成功迁移 {category_success} 个分类和 {goods_success} 个商品")
        return True
        
    except Exception as e:
        logger.error(f"迁移商品数据失败: {e}")
        return False

def migrate_orders(conn):
    """迁移订单数据 - 最终修复版"""
    logger.info("🔄 开始迁移订单数据...")
    
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025的Orders和OrderGoods表迁移订单数据
        cursor.execute("USE [cyrg2025]")
        
        # 迁移订单主表 - 使用正确的列名
        order_query = """
        SELECT 
            o.id,
            CONCAT('ORD_', o.id) as order_no,
            COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
            o.shopId as store_id,
            o.recordTime as order_date,
            ISNULL(o.total, 0) as total_amount,
            o.payState as pay_state,
            o.state as order_state,
            NULL as payment_method,
            o.remark,
            o.recordTime as created_at,
            o.recordTime as updated_at,
            o.delflag
        FROM Orders o
        WHERE (o.delflag = 0 OR o.delflag IS NULL)
          AND o.recordTime IS NOT NULL
        """
        
        cursor.execute(order_query)
        orders = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(orders)} 个订单记录")
        
        # 插入订单到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        # 启用IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT orders ON")
        
        order_insert = """
        INSERT INTO orders (id, order_no, customer_id, store_id, order_date, total_amount, 
                           pay_state, order_state, payment_method, remark, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        order_success = 0
        for order in orders:
            try:
                cursor.execute(order_insert, order)
                order_success += 1
            except Exception as e:
                logger.warning(f"插入订单数据失败: {e}")
                continue
        
        # 关闭IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT orders OFF")
        
        # 迁移订单商品明细
        cursor.execute("USE [cyrg2025]")
        
        order_item_query = """
        SELECT 
            og.orderId as order_id,
            og.goodsId as product_id,
            og.goodsNumber as quantity,
            og.goodsPrice as price,
            og.goodsNumber * og.goodsPrice as total_price
        FROM OrderGoods og
        INNER JOIN Orders o ON og.orderId = o.id
        WHERE (o.delflag = 0 OR o.delflag IS NULL)
          AND (og.delflag = 0 OR og.delflag IS NULL)
        """
        
        cursor.execute(order_item_query)
        order_items = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(order_items)} 个订单商品记录")
        
        # 插入订单商品到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        order_item_insert = """
        INSERT INTO order_items (order_id, product_id, quantity, price, total_price)
        VALUES (?, ?, ?, ?, ?)
        """
        
        item_success = 0
        for item in order_items:
            try:
                cursor.execute(order_item_insert, item)
                item_success += 1
            except Exception as e:
                logger.warning(f"插入订单商品数据失败: {e}")
                continue
        
        logger.info(f"✅ 成功迁移 {order_success} 个订单和 {item_success} 个订单商品")
        return True
        
    except Exception as e:
        logger.error(f"迁移订单数据失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("🚀 最终修复版数据迁移脚本 - 从cyrg2025和cyrgweixin迁移到hotdog2030")
    logger.info("=" * 60)
    
    # 连接数据库
    logger.info("1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    logger.info("✅ 数据库连接成功")
    
    # 检查源数据库状态
    logger.info("2️⃣ 检查源数据库状态...")
    cyrg2025_ok = check_database_access(conn, "cyrg2025")
    cyrgweixin_ok = check_database_access(conn, "cyrgweixin")
    hotdog2030_ok = check_database_access(conn, "hotdog2030")
    
    if not (cyrg2025_ok and cyrgweixin_ok and hotdog2030_ok):
        logger.error("❌ 数据库访问检查失败")
        return False
    
    # 开始数据迁移
    logger.info("3️⃣ 开始数据迁移...")
    
    # 迁移结果统计
    migration_results = {}
    
    # 1. 迁移商品数据
    migration_results["商品数据"] = migrate_products(conn)
    
    # 2. 迁移订单数据
    migration_results["订单数据"] = migrate_orders(conn)
    
    # 输出迁移结果
    logger.info("4️⃣ 迁移结果:")
    logger.info("-" * 40)
    success_count = 0
    for item, success in migration_results.items():
        status = "✅ 成功" if success else "❌ 失败"
        logger.info(f"{item}: {status}")
        if success:
            success_count += 1
    
    logger.info("-" * 40)
    logger.info(f"总计: {success_count}/{len(migration_results)} 项迁移成功")
    
    if success_count < len(migration_results):
        logger.warning("⚠️  部分数据迁移失败，请检查日志")
    else:
        logger.info("🎉 所有数据迁移完成！")
    
    # 关闭连接
    conn.close()
    
    return success_count == len(migration_results)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
