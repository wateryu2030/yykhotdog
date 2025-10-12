#!/usr/bin/env python3
"""
修正收入计算逻辑 - 最终版本
根据实际数据分析，修正不同支付方式的收入计算逻辑
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s]: %(message)s')
logger = logging.getLogger(__name__)

# 数据库连接配置
DB_CONFIG = {
    'server': 'localhost',
    'port': 1433,
    'database': 'hotdog2030',
    'username': 'sa',
    'password': 'YourStrong@Passw0rd',
    'driver': 'ODBC Driver 18 for SQL Server',
    'TrustServerCertificate': 'yes'
}

def get_connection():
    """获取数据库连接"""
    connection_string = (
        f"DRIVER={{{DB_CONFIG['driver']}}};"
        f"SERVER={DB_CONFIG['server']},{DB_CONFIG['port']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        f"TrustServerCertificate={DB_CONFIG['TrustServerCertificate']};"
    )
    return pyodbc.connect(connection_string)

def analyze_payment_modes():
    """分析不同支付方式的数据分布"""
    logger.info("开始分析不同支付方式的数据分布...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # 分析各种支付方式的数据分布
        query = """
        SELECT 
            payMode,
            COUNT(*) as total_orders,
            SUM(CASE WHEN cash > 0 THEN 1 ELSE 0 END) as cash_orders,
            SUM(CASE WHEN vipAmount > 0 THEN 1 ELSE 0 END) as vip_orders,
            SUM(CASE WHEN cardAmount > 0 THEN 1 ELSE 0 END) as card_orders,
            SUM(CASE WHEN orderValue > 0 THEN 1 ELSE 0 END) as orderValue_orders,
            AVG(cash) as avg_cash,
            AVG(vipAmount) as avg_vipAmount,
            AVG(cardAmount) as avg_cardAmount,
            AVG(orderValue) as avg_orderValue,
            AVG(total) as avg_total
        FROM cyrg2025.dbo.Orders 
        WHERE delflag = 0 AND payState = 2
        GROUP BY payMode
        ORDER BY total_orders DESC;
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        logger.info("支付方式数据分析结果:")
        logger.info("=" * 100)
        
        for row in results:
            pay_mode = row[0]
            total_orders = row[1]
            cash_orders = row[2]
            vip_orders = row[3]
            card_orders = row[4]
            order_value_orders = row[5]
            avg_cash = row[6]
            avg_vip = row[7]
            avg_card = row[8]
            avg_order_value = row[9]
            avg_total = row[10]
            
            logger.info(f"支付方式: {pay_mode}")
            logger.info(f"  总订单数: {total_orders}")
            logger.info(f"  有现金数据的订单: {cash_orders} ({cash_orders/total_orders*100:.1f}%)")
            logger.info(f"  有会员充值数据的订单: {vip_orders} ({vip_orders/total_orders*100:.1f}%)")
            logger.info(f"  有卡充值数据的订单: {card_orders} ({card_orders/total_orders*100:.1f}%)")
            logger.info(f"  有orderValue数据的订单: {order_value_orders} ({order_value_orders/total_orders*100:.1f}%)")
            logger.info(f"  平均现金: {avg_cash:.2f}")
            logger.info(f"  平均会员充值: {avg_vip:.2f}")
            logger.info(f"  平均卡充值: {avg_card:.2f}")
            logger.info(f"  平均orderValue: {avg_order_value:.2f}")
            logger.info(f"  平均total: {avg_total:.2f}")
            logger.info("-" * 80)
            
    finally:
        cursor.close()
        conn.close()

def update_revenue_calculation():
    """更新收入计算逻辑"""
    logger.info("开始更新收入计算逻辑...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # 获取所有订单数据
        cursor.execute("USE [hotdog2030]")
        cursor.execute("SELECT COUNT(*) FROM orders WHERE delflag = 0")
        total_orders = cursor.fetchone()[0]
        logger.info(f"需要处理的订单总数: {total_orders}")
        
        # 分批处理订单数据
        batch_size = 1000
        processed = 0
        
        while processed < total_orders:
            # 获取一批订单数据
            query = """
            SELECT o_hotdog.id, o_cyrg.payMode, o_cyrg.payState, o_cyrg.cash, o_cyrg.vipAmount, 
                   o_cyrg.vipAmountZengSong, o_cyrg.cardAmount, o_cyrg.cardZengSong, 
                   o_cyrg.orderValue, o_cyrg.total, o_cyrg.rollsRealIncomeAmount, o_cyrg.refundMoney
            FROM hotdog2030.dbo.orders o_hotdog
            INNER JOIN cyrg2025.dbo.Orders o_cyrg ON o_hotdog.id = o_cyrg.id
            WHERE o_hotdog.delflag = 0
            ORDER BY o_hotdog.id
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            """
            
            cursor.execute(query, processed, batch_size)
            orders = cursor.fetchall()
            
            if not orders:
                break
                
            logger.info(f"处理订单批次: {processed + 1} - {processed + len(orders)}")
            
            # 处理每个订单
            for order_data in orders:
                order_id = order_data[0]
                pay_mode = order_data[1] if order_data[1] is not None else ''
                pay_state = order_data[2]
                cash = order_data[3] if order_data[3] is not None else 0
                vip_amount = order_data[4] if order_data[4] is not None else 0
                vip_amount_zengsong = order_data[5] if order_data[5] is not None else 0
                card_amount = order_data[6] if order_data[6] is not None else 0
                card_zengsong = order_data[7] if order_data[7] is not None else 0
                order_value = order_data[8] if order_data[8] is not None else 0
                total = order_data[9] if order_data[9] is not None else 0
                rolls_real_income = order_data[10] if order_data[10] is not None else 0
                refund_money = order_data[11] if order_data[11] is not None else 0
                
                # 根据支付方式和数据可用性计算实际收入
                actual_revenue = 0
                if pay_state == 2:  # 只考虑已支付的订单
                    if '收银机' in pay_mode:
                        # 收银机：优先使用orderValue，如果orderValue为0则使用total
                        if order_value > 0:
                            actual_revenue = order_value
                        elif total > 0:
                            actual_revenue = total
                        else:
                            # 如果orderValue和total都为0，尝试使用现金+会员+卡的方式
                            actual_revenue = cash + vip_amount + vip_amount_zengsong + card_amount + card_zengsong
                    elif '外卖' in pay_mode:
                        # 外卖：使用cash字段
                        actual_revenue = cash if cash > 0 else (order_value if order_value > 0 else total)
                    elif '小程序' in pay_mode or '团购' in pay_mode:
                        # 小程序/团购：使用orderValue或rollsRealIncomeAmount
                        if order_value > 0:
                            actual_revenue = order_value
                        elif rolls_real_income > 0:
                            actual_revenue = rolls_real_income
                        else:
                            actual_revenue = total
                    else:
                        # 其他支付方式：使用orderValue作为后备
                        actual_revenue = order_value if order_value > 0 else total
                    
                    # 扣除退款金额
                    actual_revenue -= refund_money
                    if actual_revenue < 0:
                        actual_revenue = 0  # 收入不能为负
                
                # 更新hotdog2030中的订单数据
                update_query = """
                UPDATE orders
                SET pay_mode = ?,
                    cash = ?,
                    vip_amount = ?,
                    vip_amount_zengsong = ?,
                    card_amount = ?,
                    card_zengsong = ?,
                    rolls_real_income_amount = ?,
                    refund_money = ?,
                    total_amount = ?
                WHERE id = ?
                """
                
                cursor.execute(update_query, 
                              pay_mode, cash, vip_amount, vip_amount_zengsong, 
                              card_amount, card_zengsong, rolls_real_income, 
                              refund_money, actual_revenue, order_id)
            
            processed += len(orders)
            logger.info(f"已处理订单: {processed}/{total_orders}")
            
        conn.commit()
        logger.info("收入计算逻辑更新完成！")
        
    except Exception as e:
        logger.error(f"更新收入计算逻辑失败: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

def verify_results():
    """验证修正结果"""
    logger.info("开始验证修正结果...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # 检查修正后的数据分布
        query = """
        SELECT 
            pay_mode,
            COUNT(*) as count,
            AVG(total_amount) as avg_amount,
            SUM(total_amount) as total_revenue
        FROM orders 
        WHERE delflag = 0 AND pay_state = 2
        GROUP BY pay_mode
        ORDER BY count DESC;
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        logger.info("修正后的收入数据分布:")
        logger.info("=" * 80)
        
        for row in results:
            pay_mode = row[0] or '未知'
            count = row[1]
            avg_amount = row[2] or 0
            total_revenue = row[3] or 0
            
            logger.info(f"{pay_mode}: {count}笔订单, 平均金额¥{avg_amount:.2f}, 总收入¥{total_revenue:.2f}")
            
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    try:
        # 1. 分析支付方式数据分布
        analyze_payment_modes()
        
        # 2. 更新收入计算逻辑
        update_revenue_calculation()
        
        # 3. 验证修正结果
        verify_results()
        
        logger.info("所有操作完成！")
        
    except Exception as e:
        logger.error(f"程序执行失败: {e}")
        raise
