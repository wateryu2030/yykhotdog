#!/usr/bin/env python3
"""
修复订单商品明细，包含商品名称
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fix_order_items_with_names.log'),
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

def fix_order_items_with_names(conn):
    """修复订单商品明细，包含商品名称"""
    logger.info("🔄 开始修复订单商品明细...")
    
    try:
        cursor = conn.cursor()
        
        # 1. 清空现有数据
        logger.info("1️⃣ 清空现有order_items数据...")
        cursor.execute("USE [hotdog2030]")
        cursor.execute("DELETE FROM order_items")
        logger.info("✅ 已清空order_items表")
        
        # 2. 启用IDENTITY_INSERT
        logger.info("2️⃣ 启用IDENTITY_INSERT...")
        cursor.execute("SET IDENTITY_INSERT order_items ON")
        
        # 3. 获取已存在的订单ID
        logger.info("3️⃣ 获取已存在的订单ID...")
        cursor.execute("USE [hotdog2030]")
        cursor.execute("SELECT id FROM orders")
        existing_order_ids = {row[0] for row in cursor.fetchall()}
        logger.info(f"已存在 {len(existing_order_ids)} 个订单")
        
        # 4. 从cyrg2025获取订单商品数据
        logger.info("4️⃣ 从cyrg2025获取订单商品数据...")
        cursor.execute("USE [cyrg2025]")
        
        # 查询订单商品数据，包含商品名称
        order_item_query = """
        SELECT 
            og.id,
            og.orderId as order_id,
            og.goodsId as product_id,
            og.goodsName as product_name,
            og.goodsNumber as quantity,
            og.goodsPrice as price,
            og.goodsTotal as total_price,
            og.recordTime,
            og.delflag
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
        valid_order_items = [item for item in order_items if item[1] in existing_order_ids]
        logger.info(f"有效订单商品 {len(valid_order_items)} 个")
        
        # 5. 插入订单商品到hotdog2030
        logger.info("5️⃣ 插入订单商品到hotdog2030...")
        cursor.execute("USE [hotdog2030]")
        
        order_item_insert = """
        INSERT INTO order_items (id, order_id, product_id, product_name, quantity, price, total_price, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        item_success = 0
        batch_size = 1000
        
        for i in range(0, len(valid_order_items), batch_size):
            batch = valid_order_items[i:i+batch_size]
            try:
                # 处理时间字段
                processed_batch = []
                for item in batch:
                    # 处理recordTime
                    if item[7]:  # recordTime
                        try:
                            created_at = datetime.strptime(item[7], '%Y-%m-%d %H:%M:%S')
                        except:
                            created_at = datetime.now()
                    else:
                        created_at = datetime.now()
                    
                    processed_item = (
                        item[0],  # id
                        item[1],  # order_id
                        item[2],  # product_id
                        item[3],  # product_name
                        item[4],  # quantity
                        item[5],  # price
                        item[6],  # total_price
                        created_at,  # created_at
                        created_at,  # updated_at
                        0 if item[8] is None else item[8]  # delflag
                    )
                    processed_batch.append(processed_item)
                
                cursor.executemany(order_item_insert, processed_batch)
                item_success += len(processed_batch)
                logger.info(f"✅ 已迁移 {item_success}/{len(valid_order_items)} 个订单商品")
            except Exception as e:
                logger.warning(f"批量插入订单商品失败: {e}")
                # 尝试逐条插入
                for item in batch:
                    try:
                        # 处理时间字段
                        if item[7]:  # recordTime
                            try:
                                created_at = datetime.strptime(item[7], '%Y-%m-%d %H:%M:%S')
                            except:
                                created_at = datetime.now()
                        else:
                            created_at = datetime.now()
                        
                        processed_item = (
                            item[0],  # id
                            item[1],  # order_id
                            item[2],  # product_id
                            item[3],  # product_name
                            item[4],  # quantity
                            item[5],  # price
                            item[6],  # total_price
                            created_at,  # created_at
                            created_at,  # updated_at
                            0 if item[8] is None else item[8]  # delflag
                        )
                        cursor.execute(order_item_insert, processed_item)
                        item_success += 1
                    except Exception as item_error:
                        logger.warning(f"插入订单商品失败: {item_error}")
                        continue
        
        # 6. 关闭IDENTITY_INSERT
        logger.info("6️⃣ 关闭IDENTITY_INSERT...")
        cursor.execute("SET IDENTITY_INSERT order_items OFF")
        
        logger.info(f"✅ 成功迁移 {item_success} 个订单商品")
        
        # 7. 验证迁移结果
        logger.info("7️⃣ 验证迁移结果...")
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
        logger.error(f"修复订单商品明细失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("🚀 修复订单商品明细（包含商品名称）")
    logger.info("=" * 60)
    
    # 连接数据库
    logger.info("1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    logger.info("✅ 数据库连接成功")
    
    # 修复订单商品明细
    success = fix_order_items_with_names(conn)
    
    # 关闭连接
    conn.close()
    
    if success:
        logger.info("🎉 订单商品明细修复完成！")
    else:
        logger.error("❌ 订单商品明细修复失败")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
