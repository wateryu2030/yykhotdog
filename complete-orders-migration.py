#!/usr/bin/env python3
"""
完成订单数据迁移 - 解决外键约束问题
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('complete_orders_migration.log'),
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

def complete_orders_migration(conn):
    """完成订单数据迁移"""
    logger.info("🔄 开始完成订单数据迁移...")
    
    try:
        cursor = conn.cursor()
        
        # 1. 先清理现有的订单数据
        logger.info("1️⃣ 清理现有订单数据...")
        cursor.execute("USE [hotdog2030]")
        cursor.execute("DELETE FROM order_items")
        cursor.execute("DELETE FROM orders")
        logger.info("✅ 现有订单数据已清理")
        
        # 2. 从cyrg2025迁移订单数据
        logger.info("2️⃣ 迁移订单数据...")
        cursor.execute("USE [cyrg2025]")
        
        order_query = """
        SELECT 
            o.id,
            ISNULL(o.orderNo, CONCAT('ORD_', o.id)) as order_no,
            NULL as customer_id,  -- openId是VARCHAR，不能直接映射到BIGINT类型的customer_id
            o.shopId as store_id,
            o.recordTime as created_at,
            ISNULL(o.total, 0) as total_amount,
            o.payState as pay_state,
            o.payMode as pay_mode,
            o.recordTime as updated_at,
            ISNULL(o.delflag, 0) as delflag
        FROM Orders o
        WHERE (o.delflag = 0 OR o.delflag IS NULL)
          AND o.recordTime IS NOT NULL
        ORDER BY o.id
        """
        
        cursor.execute(order_query)
        orders = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(orders)} 个订单记录")
        
        # 插入订单到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        # 启用IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT orders ON")
        
        order_insert = """
        INSERT INTO orders (id, order_no, customer_id, store_id, created_at, total_amount, 
                           pay_state, pay_mode, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        order_success = 0
        batch_size = 1000
        
        for i in range(0, len(orders), batch_size):
            batch = orders[i:i+batch_size]
            try:
                cursor.executemany(order_insert, batch)
                order_success += len(batch)
                logger.info(f"✅ 已迁移 {order_success}/{len(orders)} 个订单")
            except Exception as e:
                logger.warning(f"批量插入订单失败: {e}")
                # 尝试逐条插入
                for order in batch:
                    try:
                        cursor.execute(order_insert, order)
                        order_success += 1
                    except Exception as order_error:
                        logger.warning(f"插入订单 {order[0]} 失败: {order_error}")
                        continue
        
        # 关闭IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT orders OFF")
        
        logger.info(f"✅ 成功迁移 {order_success} 个订单")
        
        # 3. 迁移订单商品明细
        logger.info("3️⃣ 迁移订单商品明细...")
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
        ORDER BY og.orderId, og.goodsId
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
        
        for i in range(0, len(order_items), batch_size):
            batch = order_items[i:i+batch_size]
            try:
                cursor.executemany(order_item_insert, batch)
                item_success += len(batch)
                logger.info(f"✅ 已迁移 {item_success}/{len(order_items)} 个订单商品")
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
        
        logger.info(f"✅ 成功迁移 {order_success} 个订单和 {item_success} 个订单商品")
        
        # 4. 验证迁移结果
        logger.info("4️⃣ 验证迁移结果...")
        cursor.execute("SELECT COUNT(*) FROM orders")
        final_orders = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM order_items")
        final_items = cursor.fetchone()[0]
        
        logger.info(f"📊 最终结果:")
        logger.info(f"  订单数量: {final_orders}")
        logger.info(f"  订单商品数量: {final_items}")
        
        return True
        
    except Exception as e:
        logger.error(f"完成订单数据迁移失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("🚀 完成订单数据迁移")
    logger.info("=" * 60)
    
    # 连接数据库
    logger.info("1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    logger.info("✅ 数据库连接成功")
    
    # 完成订单数据迁移
    success = complete_orders_migration(conn)
    
    # 关闭连接
    conn.close()
    
    if success:
        logger.info("🎉 订单数据迁移完成！")
    else:
        logger.error("❌ 订单数据迁移失败")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
