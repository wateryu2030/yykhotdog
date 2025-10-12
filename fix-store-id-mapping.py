#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复门店ID映射问题
订单数据中的store_id需要与门店表中的正确ID对应
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'fix_store_mapping_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
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

def fix_store_id_mapping(conn):
    """修复门店ID映射"""
    logger.info("🔄 开始修复门店ID映射...")
    
    try:
        cursor = conn.cursor()
        
        # 1. 首先获取原始门店ID到新门店ID的映射关系
        logger.info("📊 获取门店ID映射关系...")
        
        # 查询原始门店数据（从cyrg2025.Shop）
        cursor.execute("USE [cyrg2025]")
        cursor.execute("""
            SELECT Id, ShopName 
            FROM Shop 
            WHERE (delflag = 0 OR delflag IS NULL)
            ORDER BY Id
        """)
        original_stores = cursor.fetchall()
        
        # 查询新门店数据（hotdog2030.stores）
        cursor.execute("USE [hotdog2030]")
        cursor.execute("""
            SELECT id, store_code, store_name 
            FROM stores 
            WHERE delflag = 0
            ORDER BY store_code
        """)
        new_stores = cursor.fetchall()
        
        # 创建映射关系
        store_mapping = {}
        for orig_id, orig_name in original_stores:
            # 根据store_code找到对应的新ID
            for new_id, store_code, new_name in new_stores:
                if str(orig_id) == str(store_code):
                    store_mapping[orig_id] = new_id
                    logger.info(f"映射: 原始ID {orig_id} ({orig_name}) -> 新ID {new_id} ({new_name})")
                    break
        
        logger.info(f"📊 创建了 {len(store_mapping)} 个门店映射关系")
        
        # 2. 更新订单数据中的store_id
        logger.info("🔄 更新订单数据中的store_id...")
        
        update_count = 0
        for orig_id, new_id in store_mapping.items():
            cursor.execute("""
                UPDATE orders 
                SET store_id = ?
                WHERE store_id = ? AND delflag = 0
            """, (new_id, orig_id))
            
            affected_rows = cursor.rowcount
            if affected_rows > 0:
                update_count += affected_rows
                logger.info(f"更新门店ID {orig_id} -> {new_id}: {affected_rows} 个订单")
        
        # 3. 更新订单商品数据中的store_id（如果有的话）
        logger.info("🔄 检查订单商品数据...")
        
        # 检查order_items表是否有store_id字段
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'order_items' AND COLUMN_NAME = 'store_id'
        """)
        
        if cursor.fetchone():
            logger.info("发现order_items表有store_id字段，正在更新...")
            for orig_id, new_id in store_mapping.items():
                cursor.execute("""
                    UPDATE oi 
                    SET oi.store_id = ?
                    FROM order_items oi
                    INNER JOIN orders o ON oi.order_id = o.id
                    WHERE o.store_id = ? AND o.delflag = 0
                """, (new_id, new_id))
        
        # 4. 验证修复结果
        logger.info("🔍 验证修复结果...")
        
        cursor.execute("""
            SELECT 
                s.id,
                s.store_name,
                s.status,
                COUNT(o.id) as order_count,
                SUM(o.total_amount) as total_revenue,
                AVG(o.total_amount) as avg_order_amount
            FROM stores s
            LEFT JOIN orders o ON s.id = o.store_id AND o.delflag = 0
            WHERE s.delflag = 0
            GROUP BY s.id, s.store_name, s.status
            HAVING COUNT(o.id) > 0
            ORDER BY order_count DESC
        """)
        
        results = cursor.fetchall()
        logger.info(f"✅ 修复后有 {len(results)} 个门店有订单数据")
        
        for row in results:
            logger.info(f"门店 {row[0]} ({row[1]}): {row[3]} 个订单, ¥{row[4]:,.2f}")
        
        # 5. 统计总订单数
        cursor.execute("SELECT COUNT(*) FROM orders WHERE delflag = 0")
        total_orders = cursor.fetchone()[0]
        
        cursor.execute("SELECT SUM(total_amount) FROM orders WHERE delflag = 0")
        total_revenue = cursor.fetchone()[0] or 0
        
        logger.info(f"📊 总计: {total_orders} 个订单, ¥{total_revenue:,.2f}")
        
        return True
        
    except Exception as e:
        logger.error(f"修复门店ID映射失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("🚀 开始修复门店ID映射问题")
    
    conn = get_connection()
    if not conn:
        return
    
    try:
        success = fix_store_id_mapping(conn)
        if success:
            logger.info("🎉 门店ID映射修复完成！")
        else:
            logger.error("❌ 门店ID映射修复失败！")
    finally:
        conn.close()
        logger.info("数据库连接已关闭")

if __name__ == "__main__":
    main()
