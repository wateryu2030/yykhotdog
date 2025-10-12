#!/usr/bin/env python3
"""
修复门店和订单数据的映射关系
确保hotdog2030中的门店ID正确对应cyrg2025中的shopId
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 数据库连接配置
DB_CONFIG = {
    'server': 'localhost',
    'database': 'hotdog2030',
    'username': 'sa',
    'password': 'YourStrong@Passw0rd',
    'driver': 'ODBC Driver 18 for SQL Server',
    'trusted_connection': 'no',
    'encrypt': 'no'
}

def get_db_connection():
    """获取数据库连接"""
    try:
        connection_string = (
            f"DRIVER={{{DB_CONFIG['driver']}}};"
            f"SERVER={DB_CONFIG['server']};"
            f"DATABASE={DB_CONFIG['database']};"
            f"UID={DB_CONFIG['username']};"
            f"PWD={DB_CONFIG['password']};"
            f"TrustServerCertificate=yes;"
        )
        return pyodbc.connect(connection_string)
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        return None

def clear_all_orders():
    """清空所有订单数据"""
    try:
        conn = get_db_connection()
        if not conn:
            return False
            
        cursor = conn.cursor()
        
        # 清空订单数据
        cursor.execute("DELETE FROM orders")
        cursor.execute("DELETE FROM order_items")
        
        conn.commit()
        logger.info("所有订单数据已清空")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"清空订单数据失败: {e}")
        return False

def get_cyrg2025_data():
    """从cyrg2025获取门店和订单数据"""
    try:
        conn = get_db_connection()
        if not conn:
            return None, None
            
        cursor = conn.cursor()
        
        # 切换到cyrg2025数据库
        cursor.execute("USE cyrg2025")
        
        # 获取门店数据
        stores_query = """
        SELECT Id, ShopName, ShopAddress, City, Province, District, 
               DirectorPhone, Director, IsSelf, RecordTime
        FROM Shop
        ORDER BY Id
        """
        cursor.execute(stores_query)
        stores_data = cursor.fetchall()
        
        # 获取订单数据
        orders_query = """
        SELECT 
            o.id,
            ISNULL(o.orderNo, CONCAT('ORD_', o.id)) as order_no,
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
          AND o.shopId IS NOT NULL
        ORDER BY o.id
        """
        cursor.execute(orders_query)
        orders_data = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        logger.info(f"从cyrg2025获取到 {len(stores_data)} 个门店，{len(orders_data)} 个订单")
        return stores_data, orders_data
        
    except Exception as e:
        logger.error(f"获取cyrg2025数据失败: {e}")
        return None, None

def recreate_stores_and_orders():
    """重新创建门店和订单数据"""
    try:
        # 获取cyrg2025数据
        stores_data, orders_data = get_cyrg2025_data()
        if not stores_data or not orders_data:
            logger.error("无法获取cyrg2025数据")
            return False
            
        conn = get_db_connection()
        if not conn:
            return False
            
        cursor = conn.cursor()
        
        # 清空现有数据
        logger.info("清空现有门店和订单数据...")
        try:
            cursor.execute("DELETE FROM order_items")
        except:
            logger.warning("order_items表不存在或无法访问，跳过")
        cursor.execute("DELETE FROM orders")
        cursor.execute("DELETE FROM stores")
        
        # 重新创建门店数据，保持与cyrg2025的ID对应关系
        logger.info("重新创建门店数据...")
        for store in stores_data:
            shop_id, shop_name, shop_address, city, province, district, director_phone, director, is_self, record_time = store
            
            # 设置门店状态和类型
            store_status = "营业中"  # 所有cyrg2025中的门店都是营业中的
            store_type = "直营店" if is_self == 1 else "加盟店"
            
            insert_store_sql = """
            INSERT INTO stores 
            (id, store_code, store_name, store_type, status, province, city, district, address,
             longitude, latitude, director_phone, director, is_self, created_at, updated_at, delflag)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            cursor.execute(insert_store_sql, (
                shop_id,                    # id - 保持与cyrg2025一致
                f"SHOP_{shop_id}",          # store_code
                shop_name,                  # store_name
                store_type,                 # store_type
                store_status,               # status
                province,                   # province
                city,                       # city
                district,                   # district
                shop_address,               # address
                None,                       # longitude
                None,                       # latitude
                director_phone,             # director_phone
                director,                   # director
                is_self,                    # is_self
                record_time or datetime.now(),  # created_at
                datetime.now(),             # updated_at
                0                           # delflag
            ))
        
        logger.info(f"成功创建 {len(stores_data)} 个门店")
        
        # 重新创建订单数据，保持正确的store_id映射
        logger.info("重新创建订单数据...")
        batch_size = 1000
        for i in range(0, len(orders_data), batch_size):
            batch = orders_data[i:i + batch_size]
            
            for order in batch:
                order_id, order_no, shop_id, created_at, total_amount, pay_state, pay_mode, updated_at, delflag = order
                
                insert_order_sql = """
                INSERT INTO orders 
                (id, order_no, customer_id, store_id, created_at, total_amount, 
                 pay_state, pay_mode, updated_at, delflag)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                
                cursor.execute(insert_order_sql, (
                    order_id,               # id
                    order_no,               # order_no
                    None,                   # customer_id (暂时设为NULL)
                    shop_id,                # store_id - 直接使用cyrg2025的shopId
                    created_at,             # created_at
                    total_amount,           # total_amount
                    pay_state,              # pay_state
                    pay_mode,               # pay_mode
                    updated_at,             # updated_at
                    delflag                 # delflag
                ))
            
            if i % 5000 == 0:
                logger.info(f"已处理 {i} 个订单...")
        
        conn.commit()
        logger.info(f"成功创建 {len(orders_data)} 个订单")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"重新创建数据失败: {e}")
        return False

def verify_data_mapping():
    """验证数据映射是否正确"""
    try:
        conn = get_db_connection()
        if not conn:
            return False
            
        cursor = conn.cursor()
        
        # 验证门店和订单数据的对应关系
        verify_query = """
        SELECT 
            s.id as store_id,
            s.store_code,
            s.store_name,
            s.city,
            COUNT(o.id) as order_count,
            SUM(o.total_amount) as total_revenue
        FROM stores s
        LEFT JOIN orders o ON s.id = o.store_id AND o.delflag = 0
        WHERE s.delflag = 0
        GROUP BY s.id, s.store_code, s.store_name, s.city
        ORDER BY s.id
        """
        
        cursor.execute(verify_query)
        results = cursor.fetchall()
        
        logger.info("数据映射验证结果:")
        logger.info("门店ID | 门店代码 | 门店名称 | 城市 | 订单数 | 营收")
        logger.info("-" * 80)
        
        for row in results:
            store_id, store_code, store_name, city, order_count, total_revenue = row
            logger.info(f"{store_id:6d} | {store_code:8s} | {store_name:12s} | {city:6s} | {order_count:6d} | {total_revenue or 0:10.2f}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"验证数据映射失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("开始修复门店和订单数据映射...")
    
    # 清空所有订单数据
    if not clear_all_orders():
        logger.error("清空订单数据失败")
        return
    
    # 重新创建门店和订单数据
    if not recreate_stores_and_orders():
        logger.error("重新创建数据失败")
        return
    
    # 验证数据映射
    if not verify_data_mapping():
        logger.error("验证数据映射失败")
        return
    
    logger.info("门店和订单数据映射修复完成！")

if __name__ == "__main__":
    main()
