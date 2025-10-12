#!/usr/bin/env python3
"""
修复数据迁移 - 处理数据类型转换问题
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fix_migration_data_types.log'),
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

def fix_migration_data_types(conn):
    """修复数据迁移中的数据类型问题"""
    logger.info("🔄 开始修复数据迁移中的数据类型问题...")
    
    try:
        cursor = conn.cursor()
        
        # 1. 清理并重新迁移订单数据（使用正确的数据类型转换）
        logger.info("1️⃣ 重新迁移订单数据...")
        cursor.execute("USE [cyrg2025]")
        
        # 先获取已存在的订单ID
        cursor.execute("USE [hotdog2030]")
        cursor.execute("SELECT id FROM orders")
        existing_order_ids = {row[0] for row in cursor.fetchall()}
        logger.info(f"已存在 {len(existing_order_ids)} 个订单")
        
        # 查询需要迁移的订单（排除已存在的）
        cursor.execute("USE [cyrg2025]")
        
        order_query = """
        SELECT 
            o.id,
            ISNULL(o.orderNo, CONCAT('ORD_', o.id)) as order_no,
            COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
            o.shopId as store_id,
            o.recordTime as order_date,
            ISNULL(o.total, 0) as total_amount,
            o.payState as pay_state,
            CASE 
                WHEN o.delState = '系统删除' THEN 99
                WHEN o.delState IS NULL THEN 0
                ELSE ISNULL(CAST(o.delState AS INT), 0)
            END as order_state,
            o.payWay as payment_method,
            o.orderRemarks as remark,
            o.recordTime as created_at,
            o.recordTime as updated_at,
            CASE 
                WHEN o.delflag = 1 THEN 1
                WHEN o.delflag = 0 THEN 0
                ELSE 0
            END as delflag
        FROM Orders o
        WHERE (o.delflag = 0 OR o.delflag IS NULL OR o.delflag = 1)
          AND o.recordTime IS NOT NULL
          AND o.shopId IS NOT NULL
          AND o.shopId > 0
        ORDER BY o.id
        """
        
        cursor.execute(order_query)
        orders = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(orders)} 个订单记录")
        
        # 过滤掉已存在的订单
        new_orders = [order for order in orders if order[0] not in existing_order_ids]
        logger.info(f"需要迁移 {len(new_orders)} 个新订单")
        
        if len(new_orders) == 0:
            logger.info("✅ 没有新订单需要迁移")
            return True
        
        # 插入新订单到hotdog2030
        cursor.execute("USE [hotdog2030]")
        cursor.execute("SET IDENTITY_INSERT orders ON")
        
        order_insert = """
        INSERT INTO orders (id, order_no, customer_id, store_id, order_date, total_amount, 
                           pay_state, order_state, payment_method, remark, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        order_success = 0
        batch_size = 1000
        
        for i in range(0, len(new_orders), batch_size):
            batch = new_orders[i:i+batch_size]
            try:
                cursor.executemany(order_insert, batch)
                order_success += len(batch)
                logger.info(f"✅ 已迁移 {order_success}/{len(new_orders)} 个订单")
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
        
        cursor.execute("SET IDENTITY_INSERT orders OFF")
        logger.info(f"✅ 成功迁移 {order_success} 个新订单")
        
        # 2. 迁移订单商品明细
        logger.info("2️⃣ 迁移订单商品明细...")
        cursor.execute("USE [cyrg2025]")
        
        # 获取已存在的订单ID
        cursor.execute("USE [hotdog2030]")
        cursor.execute("SELECT id FROM orders")
        existing_order_ids = {row[0] for row in cursor.fetchall()}
        
        order_item_query = """
        SELECT 
            og.orderId as order_id,
            og.goodsId as product_id,
            og.goodsNumber as quantity,
            og.goodsPrice as price,
            og.goodsNumber * og.goodsPrice as total_price
        FROM OrderGoods og
        INNER JOIN Orders o ON og.orderId = o.id
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
        
        # 插入订单商品到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        order_item_insert = """
        INSERT INTO order_items (order_id, product_id, quantity, price, total_price)
        VALUES (?, ?, ?, ?, ?)
        """
        
        item_success = 0
        
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
        
        # 3. 验证迁移结果
        logger.info("3️⃣ 验证迁移结果...")
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
        logger.error(f"修复数据迁移失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("🚀 修复数据迁移中的数据类型问题")
    logger.info("=" * 60)
    
    # 连接数据库
    logger.info("1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    logger.info("✅ 数据库连接成功")
    
    # 修复数据迁移
    success = fix_migration_data_types(conn)
    
    # 关闭连接
    conn.close()
    
    if success:
        logger.info("🎉 数据迁移修复完成！")
    else:
        logger.error("❌ 数据迁移修复失败")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
