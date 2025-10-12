#!/usr/bin/env python3
"""
根据store_code中的数字来正确映射订单数据
"""

import pyodbc
import logging
import re
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

def get_store_mapping():
    """获取门店映射关系"""
    try:
        conn = get_db_connection()
        if not conn:
            return None
            
        cursor = conn.cursor()
        
        # 获取hotdog2030中的门店映射关系
        mapping_query = """
        SELECT id, store_code, store_name, city
        FROM stores 
        WHERE delflag = 0
        ORDER BY id
        """
        cursor.execute(mapping_query)
        stores = cursor.fetchall()
        
        # 创建映射字典：{shopId: hotdog_store_id}
        mapping = {}
        for store in stores:
            store_id, store_code, store_name, city = store
            # 从store_code中提取数字作为shopId
            match = re.search(r'SHOP_(\d+)', store_code)
            if match:
                shop_id = int(match.group(1))
                mapping[shop_id] = store_id
                logger.info(f"映射: shopId={shop_id} -> store_id={store_id} ({store_name})")
        
        cursor.close()
        conn.close()
        return mapping
        
    except Exception as e:
        logger.error(f"获取门店映射失败: {e}")
        return None

def recreate_orders_with_correct_mapping():
    """使用正确的映射重新创建订单数据"""
    try:
        # 获取门店映射关系
        mapping = get_store_mapping()
        if not mapping:
            logger.error("无法获取门店映射关系")
            return False
            
        conn = get_db_connection()
        if not conn:
            return False
            
        cursor = conn.cursor()
        
        # 清空现有订单数据
        logger.info("清空现有订单数据...")
        cursor.execute("DELETE FROM orders")
        
        # 切换到cyrg2025数据库获取订单数据
        cursor.execute("USE cyrg2025")
        
        # 获取订单数据
        orders_query = """
        SELECT 
            o.id,
            ISNULL(o.orderNo, CONCAT('ORD_', o.id)) as order_no,
            o.shopId as shop_id,
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
          AND o.shopId IN ({})
        ORDER BY o.id
        """.format(','.join(map(str, mapping.keys())))
        
        cursor.execute(orders_query)
        orders_data = cursor.fetchall()
        
        logger.info(f"从cyrg2025获取到 {len(orders_data)} 个有效订单")
        
        # 切换回hotdog2030数据库
        cursor.execute("USE hotdog2030")
        
        # 插入订单数据
        logger.info("开始插入订单数据...")
        
        # 设置IDENTITY_INSERT为ON
        cursor.execute("SET IDENTITY_INSERT orders ON")
        
        batch_size = 1000
        success_count = 0
        skip_count = 0
        
        for i in range(0, len(orders_data), batch_size):
            batch = orders_data[i:i + batch_size]
            
            for order in batch:
                order_id, order_no, shop_id, created_at, total_amount, pay_state, pay_mode, updated_at, delflag = order
                
                # 使用正确的映射关系
                hotdog_store_id = mapping.get(shop_id)
                if not hotdog_store_id:
                    skip_count += 1
                    continue
                
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
                    hotdog_store_id,        # store_id - 使用正确的hotdog2030 store_id
                    created_at,             # created_at
                    total_amount,           # total_amount
                    pay_state,              # pay_state
                    pay_mode,               # pay_mode
                    updated_at,             # updated_at
                    delflag                 # delflag
                ))
                success_count += 1
            
            if i % 5000 == 0:
                logger.info(f"已处理 {i} 个订单...")
        
        # 设置IDENTITY_INSERT为OFF
        cursor.execute("SET IDENTITY_INSERT orders OFF")
        
        conn.commit()
        logger.info(f"成功插入 {success_count} 个订单，跳过 {skip_count} 个订单")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"重新创建订单数据失败: {e}")
        return False

def verify_corrected_data():
    """验证修正后的数据"""
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
        ORDER BY order_count DESC
        """
        
        cursor.execute(verify_query)
        results = cursor.fetchall()
        
        logger.info("修正后的数据验证结果:")
        logger.info("门店ID | 门店代码 | 门店名称 | 城市 | 订单数 | 营收")
        logger.info("-" * 80)
        
        for row in results:
            store_id, store_code, store_name, city, order_count, total_revenue = row
            logger.info(f"{store_id:6d} | {store_code:8s} | {store_name:12s} | {city:6s} | {order_count:6d} | {total_revenue or 0:10.2f}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"验证数据失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("开始修正订单数据映射...")
    
    # 重新创建订单数据，使用正确的映射关系
    if not recreate_orders_with_correct_mapping():
        logger.error("重新创建订单数据失败")
        return
    
    # 验证修正后的数据
    if not verify_corrected_data():
        logger.error("验证数据失败")
        return
    
    logger.info("订单数据映射修正完成！")

if __name__ == "__main__":
    main()
