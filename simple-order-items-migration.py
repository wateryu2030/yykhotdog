#!/usr/bin/env python3
"""
简单完成订单商品明细迁移
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('simple_order_items_migration.log'),
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

def simple_order_items_migration(conn):
    """简单完成订单商品明细迁移"""
    logger.info("🔄 开始简单完成订单商品明细迁移...")
    
    try:
        cursor = conn.cursor()
        
        # 1. 获取已存在的订单ID
        logger.info("1️⃣ 获取已存在的订单ID...")
        cursor.execute("USE [hotdog2030]")
        cursor.execute("SELECT id FROM orders")
        existing_order_ids = {row[0] for row in cursor.fetchall()}
        logger.info(f"已存在 {len(existing_order_ids)} 个订单")
        
        # 2. 查询订单商品明细
        logger.info("2️⃣ 查询订单商品明细...")
        cursor.execute("USE [cyrg2025]")
        
        # 使用完整的表名查询
        order_item_query = """
        SELECT 
            og.orderId as order_id,
            og.goodsId as product_id,
            og.goodsNumber as quantity,
            og.goodsPrice as price,
            og.goodsTotal as total_price
        FROM [cyrg2025].[dbo].[OrderGoods] og
        INNER JOIN [cyrg2025].[dbo].[Orders] o ON og.orderId = o.id
        WHERE (o.delflag = 0 OR o.delflag IS NULL OR o.delflag = 1)
          AND (og.delflag = 0 OR og.delflag IS NULL)
          AND o.shopId IS NOT NULL
          AND o.shopId > 0
        ORDER BY og.orderId, og.goodsId
        """
        
        cursor.execute(order_item_query)
        order_items = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(order_items)} 个订单商品记录")
        
        # 过滤掉不存在的订单的商品
        valid_order_items = [item for item in order_items if item[0] in existing_order_ids]
        logger.info(f"有效订单商品 {len(valid_order_items)} 个")
        
        if len(valid_order_items) == 0:
            logger.info("✅ 没有有效的订单商品需要迁移")
            return True
        
        # 3. 插入订单商品到hotdog2030
        logger.info("3️⃣ 插入订单商品到hotdog2030...")
        cursor.execute("USE [hotdog2030]")
        
        order_item_insert = """
        INSERT INTO order_items (order_id, product_id, quantity, price, total_price)
        VALUES (?, ?, ?, ?, ?)
        """
        
        item_success = 0
        batch_size = 1000
        
        for i in range(0, len(valid_order_items), batch_size):
            batch = valid_order_items[i:i+batch_size]
            try:
                cursor.executemany(order_item_insert, batch)
                item_success += len(batch)
                logger.info(f"✅ 已迁移 {item_success}/{len(valid_order_items)} 个订单商品")
            except Exception as e:
                logger.warning(f"批量插入订单商品失败: {e}")
                # 尝试逐条插入
                for item in batch:
                    try:
                        cursor.execute(order_item_insert, item)
                        item_success += 1
                    except Exception as item_error:
                        logger.warning(f"插入订单商品失败: {item_error}")
                        continue
        
        logger.info(f"✅ 成功迁移 {item_success} 个订单商品")
        
        # 4. 验证迁移结果
        logger.info("4️⃣ 验证迁移结果...")
        cursor.execute("SELECT COUNT(*) FROM stores")
        final_stores = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM orders")
        final_orders = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM order_items")
        final_items = cursor.fetchone()[0]
        
        logger.info(f"📊 最终结果:")
        logger.info(f"  门店数量: {final_stores}")
        logger.info(f"  订单数量: {final_orders}")
        logger.info(f"  订单商品数量: {final_items}")
        
        return True
        
    except Exception as e:
        logger.error(f"简单完成订单商品明细迁移失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("🚀 简单完成订单商品明细迁移")
    logger.info("=" * 60)
    
    # 连接数据库
    logger.info("1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    logger.info("✅ 数据库连接成功")
    
    # 简单完成订单商品明细迁移
    success = simple_order_items_migration(conn)
    
    # 关闭连接
    conn.close()
    
    if success:
        logger.info("🎉 订单商品明细迁移完成！")
    else:
        logger.error("❌ 订单商品明细迁移失败")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
