#!/usr/bin/env python3
"""
只同步订单数据 - 简化版本
"""
import pymssql
import logging
from datetime import datetime
import time

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sync_orders.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 数据库连接配置
CONFIG = {
    'server': 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    'port': 1433,
    'user': 'hotdog',
    'password': 'Zhkj@62102218'
}

def get_connection(database):
    """获取数据库连接"""
    try:
        conn = pymssql.connect(
            server=CONFIG['server'],
            port=CONFIG['port'],
            user=CONFIG['user'],
            password=CONFIG['password'],
            database=database
        )
        return conn
    except Exception as e:
        logger.error(f'数据库连接失败: {database} - {e}')
        return None

def sync_orders_only():
    """只同步订单数据"""
    logger.info('🚀 开始同步订单数据...')
    start_time = time.time()
    
    cyrg2025_conn = get_connection('cyrg2025')
    cyrgweixin_conn = get_connection('cyrgweixin')
    hotdog_conn = get_connection('hotdog2030')
    
    if not all([cyrg2025_conn, cyrgweixin_conn, hotdog_conn]):
        logger.error('❌ 数据库连接失败')
        return False
    
    try:
        # 获取cyrg2025订单数据
        logger.info('📊 查询cyrg2025订单数据...')
        cyrg2025_cursor = cyrg2025_conn.cursor()
        cyrg2025_cursor.execute('''
            SELECT id, orderNo, openId, shopId, recordTime, total, payState, delState,
                   payMode, orderRemarks, cash, vipAmount, vipAmountZengSong, cardAmount,
                   cardZengSong, couponAmount, discountAmount, molingAmount, costPrice,
                   profitPrice, takeoutName, orderValue
            FROM Orders
            WHERE Delflag = 0 
                AND payState = 2 
                AND (delState IS NULL OR delState != '系统删除')
                AND (
                    (orderValue IS NOT NULL AND orderValue > 0 AND orderValue <= 1000)
                    OR 
                    (orderValue IS NULL AND cash > 0 AND cash <= 1000)
                )
            ORDER BY recordTime DESC
        ''')
        cyrg2025_orders = cyrg2025_cursor.fetchall()
        logger.info(f'📊 cyrg2025找到 {len(cyrg2025_orders)} 个订单')
        
        # 获取cyrgweixin订单数据
        logger.info('📊 查询cyrgweixin订单数据...')
        cyrgweixin_cursor = cyrgweixin_conn.cursor()
        cyrgweixin_cursor.execute('''
            SELECT id, orderNo, openId, shopId, recordTime, total, payState, delState,
                   payMode, orderRemarks, cash, vipAmount, vipAmountZengSong, cardAmount,
                   cardZengSong, couponAmount, discountAmount, molingAmount, costPrice,
                   profitPrice, takeoutName, orderValue
            FROM Orders
            WHERE Delflag = 0 
                AND payState = 2 
                AND (delState IS NULL OR delState != '系统删除')
                AND (
                    (orderValue IS NOT NULL AND orderValue > 0 AND orderValue <= 1000)
                    OR 
                    (orderValue IS NULL AND cash > 0 AND cash <= 1000)
                )
            ORDER BY recordTime DESC
        ''')
        cyrgweixin_orders = cyrgweixin_cursor.fetchall()
        logger.info(f'📊 cyrgweixin找到 {len(cyrgweixin_orders)} 个订单')
        
        # 合并所有订单
        all_orders = cyrg2025_orders + cyrgweixin_orders
        logger.info(f'📊 总计 {len(all_orders)} 个订单')
        
        # 清空目标表
        hotdog_cursor = hotdog_conn.cursor()
        logger.info('🗑️ 清空hotdog2030.orders表...')
        hotdog_cursor.execute('DELETE FROM orders')
        hotdog_conn.commit()
        
        # 批量插入订单 - 优化版本
        batch_size = 500  # 减小批量大小
        total_inserted = 0
        
        logger.info(f'📦 开始批量插入，批量大小: {batch_size}')
        
        for i in range(0, len(all_orders), batch_size):
            batch = all_orders[i:i + batch_size]
            batch_start = time.time()
            
            # 准备批量数据
            batch_data = []
            for order in batch:
                order_amount = order[21] if order[21] is not None and order[21] > 0 else (order[10] if order[10] is not None and order[10] > 0 else 0)
                
                # 安全处理None值
                order_no = order[1] if order[1] is not None else ''
                open_id = order[2] if order[2] is not None else ''
                shop_id = order[3] if order[3] is not None else 0
                pay_state = order[6] if order[6] is not None else 0
                pay_mode = order[7] if order[7] is not None else 0
                record_time = order[4] if order[4] is not None else datetime.now()
                cash = order[10] if order[10] is not None else 0
                vip_amount = order[11] if order[11] is not None else 0
                vip_amount_zengsong = order[12] if order[12] is not None else 0
                card_amount = order[13] if order[13] is not None else 0
                card_zengsong = order[14] if order[14] is not None else 0
                coupon_amount = order[15] if order[15] is not None else 0
                discount_amount = order[16] if order[16] is not None else 0
                order_remarks = order[9] if order[9] is not None else ''
                
                batch_data.append((
                    order[0], order_no, open_id, shop_id, order_amount, pay_state, pay_mode, 
                    record_time, record_time, 0, cash, vip_amount, vip_amount_zengsong, 
                    card_amount, card_zengsong, coupon_amount, discount_amount, order_remarks
                ))
            
            # 执行批量插入
            insert_query = '''
                INSERT INTO orders 
                (id, order_no, customer_id, store_id, total_amount, pay_state, pay_mode, created_at, updated_at, delflag,
                 cash, vipAmount, vipAmountZengSong, cardAmount, cardZengSong, couponAmount, discountAmount, orderRemarks)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            '''
            
            try:
                hotdog_cursor.executemany(insert_query, batch_data)
                hotdog_conn.commit()
                
                total_inserted += len(batch_data)
                batch_time = time.time() - batch_start
                speed = len(batch_data) / batch_time if batch_time > 0 else 0
                
                logger.info(f'📦 已同步 {total_inserted}/{len(all_orders)} 个订单 (速度: {speed:.0f} 条/秒)')
                
                # 每10000条记录显示一次进度
                if total_inserted % 10000 == 0:
                    progress = (total_inserted / len(all_orders)) * 100
                    logger.info(f'📊 进度: {progress:.1f}% ({total_inserted}/{len(all_orders)})')
                    
            except Exception as e:
                logger.error(f'❌ 批量插入失败: {e}')
                # 尝试单条插入
                for order_data in batch_data:
                    try:
                        hotdog_cursor.execute(insert_query, order_data)
                        hotdog_conn.commit()
                        total_inserted += 1
                    except Exception as single_e:
                        logger.warning(f'⚠️ 跳过订单 {order_data[0]}: {single_e}')
                        continue
        
        total_time = time.time() - start_time
        avg_speed = total_inserted / total_time if total_time > 0 else 0
        
        logger.info(f'✅ 订单数据同步完成: {total_inserted} 条记录')
        logger.info(f'⏱️ 总耗时: {total_time:.2f} 秒')
        logger.info(f'🚀 平均速度: {avg_speed:.0f} 条/秒')
        
        # 关闭连接
        cyrg2025_conn.close()
        cyrgweixin_conn.close()
        hotdog_conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f'❌ 同步订单数据失败: {e}')
        return False

def main():
    """主函数"""
    logger.info('🚀 开始订单数据同步')
    logger.info('=' * 60)
    
    if sync_orders_only():
        logger.info('🎉 订单数据同步成功！')
    else:
        logger.error('❌ 订单数据同步失败！')

if __name__ == "__main__":
    main()
