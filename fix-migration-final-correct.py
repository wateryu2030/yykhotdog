#!/usr/bin/env python3
"""
最终修复数据迁移 - 解决数据类型问题
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fix_migration_final_correct.log'),
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

def fix_migration_final_correct(conn):
    """最终修复数据迁移"""
    logger.info("🔄 开始最终修复数据迁移...")
    
    try:
        cursor = conn.cursor()
        
        # 1. 重新迁移门店数据
        logger.info("1️⃣ 重新迁移门店数据...")
        cursor.execute("USE [cyrg2025]")
        
        shop_query = """
        SELECT 
            Id, ShopName, ShopAddress, Director, DirectorPhone,
            province, city, district, state, isUse, location,
            blurb, morningTime, nightTime, passengerFlow, interval,
            isClose, establishTime, openingTime, rent
        FROM Shop
        ORDER BY Id
        """
        
        cursor.execute(shop_query)
        shops = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(shops)} 个门店记录")
        
        # 插入门店到hotdog2030
        cursor.execute("USE [hotdog2030]")
        cursor.execute("SET IDENTITY_INSERT stores ON")
        
        store_insert = """
        INSERT INTO stores (id, store_code, store_name, store_type, status, province, city, district, 
                           address, latitude, longitude, director, director_phone, 
                           morning_time, night_time, passenger_flow, establish_time, opening_time, 
                           rent_amount, is_close, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        store_success = 0
        current_time = datetime.now()
        
        for shop in shops:
            try:
                # 处理状态映射
                status_map = {0: '暂停营业', 1: '正常营业', 2: '已关闭'}
                status = status_map.get(shop[8], '未知状态')
                
                # 处理使用状态
                is_close = shop[16] == 1 if shop[16] is not None else False
                
                # 处理位置信息
                location = shop[10] if shop[10] else ''
                latitude = None
                longitude = None
                if location and ',' in location:
                    try:
                        lat_str, lng_str = location.split(',')
                        latitude = float(lat_str.strip())
                        longitude = float(lng_str.strip())
                    except:
                        pass
                
                # 处理时间信息
                morning_time = shop[12] if shop[12] else ''
                evening_time = shop[13] if shop[13] else ''
                establish_time = shop[17] if shop[17] else None
                opening_time = shop[18] if shop[18] else None
                rent_amount = shop[19] if shop[19] else None
                
                store_data = (
                    shop[0],  # id
                    str(shop[0]),  # store_code
                    shop[1] or f'门店{shop[0]}',  # store_name
                    '直营店',  # store_type
                    status,  # status
                    shop[5] or '',  # province
                    shop[6] or '',  # city
                    shop[7] or '',  # district
                    shop[2] or '',  # address
                    latitude,  # latitude
                    longitude,  # longitude
                    shop[3] or '',  # director
                    shop[4] or '',  # director_phone
                    morning_time,  # morning_time
                    evening_time,  # night_time
                    shop[14] if shop[14] else None,  # passenger_flow
                    establish_time,  # establish_time
                    opening_time,  # opening_time
                    rent_amount,  # rent_amount
                    is_close,  # is_close
                    current_time,  # created_at
                    current_time,  # updated_at
                    False  # delflag
                )
                
                cursor.execute(store_insert, store_data)
                store_success += 1
                
            except Exception as e:
                logger.warning(f"插入门店 {shop[0]} 失败: {e}")
                continue
        
        cursor.execute("SET IDENTITY_INSERT stores OFF")
        logger.info(f"✅ 成功迁移 {store_success} 个门店")
        
        # 2. 重新迁移订单数据
        logger.info("2️⃣ 重新迁移订单数据...")
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
            o.delState as order_state,
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
        
        # 3. 迁移订单商品明细
        logger.info("3️⃣ 迁移订单商品明细...")
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
        logger.error(f"最终修复数据迁移失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("🚀 最终修复数据迁移")
    logger.info("=" * 60)
    
    # 连接数据库
    logger.info("1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    logger.info("✅ 数据库连接成功")
    
    # 最终修复数据迁移
    success = fix_migration_final_correct(conn)
    
    # 关闭连接
    conn.close()
    
    if success:
        logger.info("🎉 数据迁移最终修复完成！")
    else:
        logger.error("❌ 数据迁移修复失败")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
