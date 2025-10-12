#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整更新营收字段 - 基于Excel文档分析的正确逻辑
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'update_revenue_complete_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
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

def update_revenue_fields(conn):
    """更新所有营收相关字段"""
    logger.info("🔄 开始更新营收相关字段...")
    
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025获取所有订单的完整金额数据
        logger.info("📊 从cyrg2025获取订单金额数据...")
        
        cursor.execute("USE [cyrg2025]")
        cursor.execute("""
            SELECT 
                o.id,
                o.payMode,
                o.cash,
                o.vipAmount,
                o.vipAmountZengSong,
                o.cardAmount,
                o.cardZengSong,
                o.rollsRealIncomeAmount,
                o.refundMoney,
                o.orderValue,
                o.total,
                o.payState
            FROM Orders o
            WHERE (o.delflag = 0 OR o.delflag IS NULL)
        """)
        
        orders_data = cursor.fetchall()
        logger.info(f"📊 获取到 {len(orders_data)} 个订单的金额数据")
        
        # 切换到hotdog2030数据库
        cursor.execute("USE [hotdog2030]")
        
        # 批量更新
        update_count = 0
        for order in orders_data:
            order_id = order[0]
            pay_mode = order[1]
            cash = order[2] if order[2] is not None else 0
            vip_amount = order[3] if order[3] is not None else 0
            vip_amount_zengsong = order[4] if order[4] is not None else 0
            card_amount = order[5] if order[5] is not None else 0
            card_zengsong = order[6] if order[6] is not None else 0
            rolls_real_income = order[7] if order[7] is not None else 0
            refund_money = order[8] if order[8] is not None else 0
            order_value = order[9] if order[9] is not None else 0
            total = order[10] if order[10] is not None else 0
            pay_state = order[11]
            
            # 计算实际营收（按支付方式分类）
            if pay_mode == '收银机':
                actual_revenue = cash + vip_amount + vip_amount_zengsong + card_amount + card_zengsong
            elif pay_mode and ('外卖' in pay_mode):
                actual_revenue = cash
            elif pay_mode and ('团购' in pay_mode or '拼好饭' in pay_mode):
                actual_revenue = rolls_real_income if rolls_real_income > 0 else order_value
            elif pay_mode == '小程序':
                actual_revenue = order_value
            elif pay_mode == '赠送':
                actual_revenue = 0
            else:
                actual_revenue = order_value
            
            # 更新hotdog2030中的订单数据
            cursor.execute("""
                UPDATE orders 
                SET 
                    pay_mode = ?,
                    cash = ?,
                    vip_amount = ?,
                    vip_amount_zengsong = ?,
                    card_amount = ?,
                    card_zengsong = ?,
                    rolls_real_income_amount = ?,
                    refund_money = ?,
                    total_amount = ?
                WHERE id = ?
            """, (
                pay_mode,
                cash,
                vip_amount,
                vip_amount_zengsong,
                card_amount,
                card_zengsong,
                rolls_real_income,
                refund_money,
                actual_revenue,
                order_id
            ))
            
            update_count += 1
            if update_count % 1000 == 0:
                logger.info(f"  已更新 {update_count} 个订单...")
        
        conn.commit()
        logger.info(f"✅ 成功更新了 {update_count} 个订单的营收数据")
        
        # 验证更新结果
        logger.info("🔍 验证更新结果...")
        
        cursor.execute("""
            SELECT 
                s.id,
                s.store_name,
                COUNT(CASE WHEN o.pay_state = 2 THEN o.id END) as paid_orders,
                SUM(CASE WHEN o.pay_state = 2 THEN o.total_amount ELSE 0 END) as total_revenue
            FROM stores s
            LEFT JOIN orders o ON s.id = o.store_id AND o.delflag = 0
            WHERE s.delflag = 0 AND s.store_name IN ('沈阳一二O中学店', '沈阳一二六中学店', '沈阳第七中学店')
            GROUP BY s.id, s.store_name
            ORDER BY total_revenue DESC
        """)
        
        results = cursor.fetchall()
        logger.info(f"✅ 验证完成，测试门店数据：")
        
        for row in results:
            logger.info(f"  {row[1]}: {row[2]} 个已支付订单, ¥{row[3]:,.2f}")
        
        return True
        
    except Exception as e:
        logger.error(f"更新营收字段失败: {e}")
        conn.rollback()
        return False

def main():
    """主函数"""
    logger.info("🚀 开始完整更新营收字段")
    logger.info("=" * 60)
    
    conn = get_connection()
    if not conn:
        return
    
    try:
        success = update_revenue_fields(conn)
        if success:
            logger.info("=" * 60)
            logger.info("🎉 营收字段更新完成！")
        else:
            logger.error("=" * 60)
            logger.error("❌ 营收字段更新失败！")
    finally:
        conn.close()
        logger.info("数据库连接已关闭")

if __name__ == "__main__":
    main()

