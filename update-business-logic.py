#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
更新业务逻辑 - 考虑支付状态和退款因素
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'update_business_logic_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def get_connection():
    """获取数据库连接"""
    try:
        conn = pyodbc.connect(
            'DRIVER={ODBC Driver 18 for SQL Server};'
            'SERVER=localhost,1433;'
            'DATABASE=hotdog2030;'
            'UID=sa;'
            'PWD=YourStrong@Passw0rd;'
            'TrustServerCertificate=yes;'
        )
        logger.info("✅ 数据库连接成功")
        return conn
    except Exception as e:
        logger.error(f"❌ 数据库连接失败: {e}")
        return None

def update_business_logic(conn):
    """更新业务逻辑 - 考虑支付状态和退款"""
    logger.info("🔄 开始更新业务逻辑...")
    
    try:
        cursor = conn.cursor()
        
        # 1. 更新订单数据，使用正确的业务逻辑
        logger.info("📊 更新订单数据，考虑支付状态和退款...")
        
        # 从原始数据库获取正确的业务数据
        cursor.execute("USE [cyrg2025]")
        cursor.execute("""
            SELECT 
                o.id,
                o.shopId,
                CASE 
                    WHEN o.payState = 2 THEN ISNULL(o.orderValue, o.total) - ISNULL(o.refundMoney, 0)
                    ELSE 0
                END as net_revenue,
                CASE 
                    WHEN o.payState = 2 THEN 1
                    ELSE 0
                END as is_paid
            FROM Orders o
            WHERE (o.delflag = 0 OR o.delflag IS NULL)
        """)
        
        business_data = cursor.fetchall()
        logger.info(f"📊 获取到 {len(business_data)} 个订单的业务数据")
        
        # 更新hotdog2030数据库
        cursor.execute("USE [hotdog2030]")
        
        update_count = 0
        for order_id, shop_id, net_revenue, is_paid in business_data:
            cursor.execute("""
                UPDATE orders 
                SET 
                    total_amount = ?,
                    pay_state = ?
                WHERE id = ?
            """, (net_revenue, is_paid, order_id))
            update_count += 1
        
        logger.info(f"✅ 更新了 {update_count} 个订单的业务数据")
        
        # 2. 验证更新结果
        logger.info("🔍 验证更新结果...")
        
        cursor.execute("""
            SELECT TOP 5
                s.id,
                s.store_name,
                COUNT(o.id) as total_orders,
                SUM(CASE WHEN o.pay_state = 1 THEN 1 ELSE 0 END) as paid_orders,
                SUM(o.total_amount) as net_revenue,
                AVG(CASE WHEN o.pay_state = 1 THEN o.total_amount ELSE 0 END) as avg_order_value
            FROM stores s
            LEFT JOIN orders o ON s.store_code = CAST(o.store_id AS VARCHAR) AND o.delflag = 0
            WHERE s.delflag = 0
            GROUP BY s.id, s.store_name
            HAVING COUNT(o.id) > 0
            ORDER BY net_revenue DESC
        """)
        
        results = cursor.fetchall()
        logger.info(f"✅ 验证完成，前5个门店数据：")
        
        for row in results:
            logger.info(f"  门店 {row[0]} ({row[1]}): {row[3]} 个已支付订单, ¥{row[4]:,.2f}")
        
        return True
        
    except Exception as e:
        logger.error(f"更新业务逻辑失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("🚀 开始更新业务逻辑")
    
    conn = get_connection()
    if not conn:
        return
    
    try:
        success = update_business_logic(conn)
        if success:
            logger.info("🎉 业务逻辑更新完成！")
        else:
            logger.error("❌ 业务逻辑更新失败！")
    finally:
        conn.close()
        logger.info("数据库连接已关闭")

if __name__ == "__main__":
    main()
