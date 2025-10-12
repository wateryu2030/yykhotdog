#!/usr/bin/env python3
"""
修复订单数据迁移脚本
"""

import pyodbc
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 数据库连接配置
SERVER = "localhost,1433"
USERNAME = "sa"
PASSWORD = "YourStrong@Passw0rd"
DRIVER = "ODBC Driver 18 for SQL Server"

def fix_orders_migration():
    try:
        # 连接数据库
        connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        cursor = conn.cursor()
        
        logger.info("✅ 数据库连接成功")
        
        # 清空现有的订单数据
        cursor.execute("USE [hotdog2030]")
        cursor.execute("DELETE FROM order_items")
        cursor.execute("DELETE FROM orders")
        logger.info("✅ 已清空现有订单数据")
        
        # 从cyrg2025迁移订单数据
        cursor.execute("USE [cyrg2025]")
        
        order_query = """
        SELECT 
            o.id,
            CONCAT('ORD_', o.id) as order_no,
            COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
            o.shopId as store_id,
            o.recordTime as order_date,
            ISNULL(o.total, 0) as total_amount,
            o.payState as pay_state,
            CASE 
                WHEN o.delState = '系统删除' THEN 3
                WHEN o.delState = '0' THEN 0
                WHEN o.delState = '1' THEN 1
                WHEN o.delState = '2' THEN 2
                ELSE 0
            END as order_state,
            NULL as payment_method,
            o.orderRemarks
        FROM cyrg2025.dbo.Orders o
        WHERE (o.delflag = 0 OR o.delflag IS NULL)
          AND o.recordTime IS NOT NULL
        """
        
        cursor.execute(order_query)
        orders = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(orders)} 个订单记录")
        
        # 插入订单到hotdog2030
        cursor.execute("USE [hotdog2030]")
        cursor.execute("SET IDENTITY_INSERT orders ON")
        
        order_insert = """
        INSERT INTO orders
        (id, order_no, customer_id, store_id, order_date, total_amount,
         pay_state, order_state, payment_method, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        for order in orders:
            try:
                cursor.execute(order_insert, order)
                success_count += 1
                if success_count % 1000 == 0:
                    logger.info(f"已处理 {success_count} 个订单...")
            except Exception as e:
                logger.warning(f"插入订单数据失败: {e}")
                continue
        
        cursor.execute("SET IDENTITY_INSERT orders OFF")
        logger.info(f"✅ 成功迁移 {success_count} 个订单")
        
        # 迁移订单商品数据
        cursor.execute("USE [cyrg2025]")
        
        order_item_query = """
        SELECT 
            og.orderId as order_id,
            og.goodsId as product_id,
            og.goodsNumber as quantity,
            og.goodsPrice as price,
            og.goodsNumber * og.goodsPrice as total_price
        FROM cyrg2025.dbo.OrderGoods og
        INNER JOIN cyrg2025.dbo.Orders o ON og.orderId = o.id
        WHERE (o.delflag = 0 OR o.delflag IS NULL)
          AND (og.delflag = 0 OR og.delflag IS NULL)
        """
        
        cursor.execute(order_item_query)
        order_items = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(order_items)} 个订单商品记录")
        
        # 插入订单商品到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        order_item_insert = """
        INSERT INTO order_items
        (order_id, product_id, quantity, price, total_price)
        VALUES (?, ?, ?, ?, ?)
        """
        
        item_success_count = 0
        for item in order_items:
            try:
                cursor.execute(order_item_insert, item)
                item_success_count += 1
                if item_success_count % 1000 == 0:
                    logger.info(f"已处理 {item_success_count} 个订单商品...")
            except Exception as e:
                logger.warning(f"插入订单商品数据失败: {e}")
                continue
        
        logger.info(f"✅ 成功迁移 {item_success_count} 个订单商品")
        
        # 检查最终结果
        cursor.execute("SELECT COUNT(*) FROM orders")
        order_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM order_items")
        item_count = cursor.fetchone()[0]
        
        logger.info(f"📊 最终结果:")
        logger.info(f"   订单数量: {order_count}")
        logger.info(f"   订单商品数量: {item_count}")
        
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"修复订单迁移失败: {e}")
        return False

if __name__ == "__main__":
    fix_orders_migration()
