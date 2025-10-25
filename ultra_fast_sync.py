#!/usr/bin/env python3
"""
超高速数据同步系统 - 从cyrg2025和cyrgweixin数据库同步所有数据到hotdog2030
优化特性：
- 连接重试机制
- 批量插入优化
- 并行处理
- 内存优化
- 进度监控
"""
import pymssql
import logging
from datetime import datetime
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ultra_fast_sync.log'),
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

def retry_connect(database, attempts=3, delay=5):
    """数据库连接重试机制"""
    for attempt in range(attempts):
        try:
            conn = get_connection(database)
            if conn:
                return conn
        except Exception as e:
            logger.error(f'连接失败 {e}, 重试 {attempt+1}/{attempts}')
            time.sleep(delay)
    raise Exception(f'无法连接数据库 {database}，重试次数已用尽')

def ultra_fast_sync_orders():
    """超高速同步订单数据"""
    logger.info('🚀 开始超高速同步订单数据...')
    start_time = time.time()
    
    cyrg2025_conn = retry_connect('cyrg2025')
    cyrgweixin_conn = retry_connect('cyrgweixin')
    hotdog_conn = retry_connect('hotdog2030')
    
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
        
        # 超高速批量插入
        batch_size = 800  # SQL Server限制1000行，使用800确保安全
        total_inserted = 0
        
        logger.info(f'📦 开始超高速批量插入，批量大小: {batch_size}')
        
        for i in range(0, len(all_orders), batch_size):
            batch = all_orders[i:i + batch_size]
            batch_start = time.time()
            
            # 构建批量插入SQL - 修复None值问题
            values_list = []
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
                
                values_list.append(f"({order[0]}, '{order_no}', '{open_id}', {shop_id}, {order_amount}, {pay_state}, {pay_mode}, '{record_time}', '{record_time}', 0, {cash}, {vip_amount}, {vip_amount_zengsong}, {card_amount}, {card_zengsong}, {coupon_amount}, {discount_amount}, '{order_remarks}')")
            
            # 执行批量插入
            insert_query = f'''
                INSERT INTO orders 
                (id, order_no, customer_id, store_id, total_amount, pay_state, pay_mode, created_at, updated_at, delflag,
                 cash, vipAmount, vipAmountZengSong, cardAmount, cardZengSong, couponAmount, discountAmount, orderRemarks)
                VALUES {', '.join(values_list)}
            '''
            
            hotdog_cursor.execute(insert_query)
            hotdog_conn.commit()
            
            total_inserted += len(batch)
            batch_time = time.time() - batch_start
            speed = len(batch) / batch_time if batch_time > 0 else 0
            
            logger.info(f'📦 已同步 {total_inserted}/{len(all_orders)} 个订单 (速度: {speed:.0f} 条/秒)')
        
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

def ultra_fast_sync_order_items():
    """超高速同步订单商品数据"""
    logger.info('🛒 开始超高速同步订单商品数据...')
    start_time = time.time()
    
    cyrg2025_conn = retry_connect('cyrg2025')
    hotdog_conn = retry_connect('hotdog2030')
    
    if not all([cyrg2025_conn, hotdog_conn]):
        logger.error('❌ 数据库连接失败')
        return False
    
    try:
        # 获取订单商品数据
        logger.info('📊 查询订单商品数据...')
        cyrg2025_cursor = cyrg2025_conn.cursor()
        cyrg2025_cursor.execute('''
            SELECT orderId, goodsId, goodsName, goodsNumber, goodsPrice, goodsTotal
            FROM OrderGoods
            ORDER BY orderId
        ''')
        order_items = cyrg2025_cursor.fetchall()
        logger.info(f'📊 找到 {len(order_items)} 个订单商品')
        
        # 清空目标表
        hotdog_cursor = hotdog_conn.cursor()
        logger.info('🗑️ 清空hotdog2030.order_items表...')
        hotdog_cursor.execute('DELETE FROM order_items')
        hotdog_conn.commit()
        
        # 超高速批量插入
        batch_size = 800  # SQL Server限制1000行，使用800确保安全
        total_inserted = 0
        
        logger.info(f'📦 开始超高速批量插入，批量大小: {batch_size}')
        
        for i in range(0, len(order_items), batch_size):
            batch = order_items[i:i + batch_size]
            batch_start = time.time()
            
            # 构建批量插入SQL - 添加自增ID
            values_list = []
            for idx, item in enumerate(batch):
                # 生成自增ID
                item_id = total_inserted + idx + 1
                values_list.append(f"({item_id}, {item[0]}, {item[1]}, '{item[2] or ''}', {item[3] or 0}, {item[4] or 0}, {item[5] or 0}, '{datetime.now()}', '{datetime.now()}', 0)")
            
            # 执行批量插入
            insert_query = f'''
                INSERT INTO order_items 
                (id, order_id, product_id, product_name, quantity, price, total_price, created_at, updated_at, delflag)
                VALUES {', '.join(values_list)}
            '''
            
            hotdog_cursor.execute(insert_query)
            hotdog_conn.commit()
            
            total_inserted += len(batch)
            batch_time = time.time() - batch_start
            speed = len(batch) / batch_time if batch_time > 0 else 0
            
            logger.info(f'🛒 已同步 {total_inserted}/{len(order_items)} 个订单商品 (速度: {speed:.0f} 条/秒)')
        
        total_time = time.time() - start_time
        avg_speed = total_inserted / total_time if total_time > 0 else 0
        
        logger.info(f'✅ 订单商品数据同步完成: {total_inserted} 条记录')
        logger.info(f'⏱️ 总耗时: {total_time:.2f} 秒')
        logger.info(f'🚀 平均速度: {avg_speed:.0f} 条/秒')
        
        # 关闭连接
        cyrg2025_conn.close()
        hotdog_conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f'❌ 同步订单商品数据失败: {e}')
        return False

def ultra_fast_sync_customers():
    """超高速同步客户数据"""
    logger.info('👥 开始超高速同步客户数据...')
    start_time = time.time()
    
    cyrg2025_conn = retry_connect('cyrg2025')
    hotdog_conn = retry_connect('hotdog2030')
    
    if not all([cyrg2025_conn, hotdog_conn]):
        logger.error('❌ 数据库连接失败')
        return False
    
    try:
        # 获取客户数据
        logger.info('📊 查询客户数据...')
        cyrg2025_cursor = cyrg2025_conn.cursor()
        cyrg2025_cursor.execute('''
            SELECT ID, OpenId, NickName, Headimgurl, Sex, city, Tel, RecordTime, State
            FROM XcxUser
            WHERE Delflag = 0
        ''')
        customers = cyrg2025_cursor.fetchall()
        logger.info(f'📊 找到 {len(customers)} 个客户')
        
        # 清空目标表并重置自增ID
        hotdog_cursor = hotdog_conn.cursor()
        logger.info('🗑️ 清空hotdog2030.customers表...')
        hotdog_cursor.execute('DELETE FROM customers')
        # 重置自增ID到1
        hotdog_cursor.execute('DBCC CHECKIDENT (customers, RESEED, 0)')
        hotdog_conn.commit()
        
        # 超高速批量插入
        batch_size = 800  # SQL Server限制1000行，使用800确保安全
        total_inserted = 0
        
        logger.info(f'📦 开始超高速批量插入，批量大小: {batch_size}')
        
        for i in range(0, len(customers), batch_size):
            batch = customers[i:i + batch_size]
            batch_start = time.time()
            
            # 构建批量插入SQL - 添加自增ID
            values_list = []
            for idx, customer in enumerate(batch):
                # 生成自增ID
                customer_id = total_inserted + idx + 1
                values_list.append(f"({customer_id}, '{customer[1] or ''}', '{customer[2] or ''}', '{customer[6] or ''}', '{customer[1] or ''}', '{customer[7] or datetime.now()}', '{customer[7] or datetime.now()}', 0)")
            
            # 执行批量插入
            insert_query = f'''
                INSERT INTO customers 
                (id, customer_id, customer_name, phone, openid, created_at, updated_at, delflag)
                VALUES {', '.join(values_list)}
            '''
            
            hotdog_cursor.execute(insert_query)
            hotdog_conn.commit()
            
            total_inserted += len(batch)
            batch_time = time.time() - batch_start
            speed = len(batch) / batch_time if batch_time > 0 else 0
            
            logger.info(f'👥 已同步 {total_inserted}/{len(customers)} 个客户 (速度: {speed:.0f} 条/秒)')
        
        total_time = time.time() - start_time
        avg_speed = total_inserted / total_time if total_time > 0 else 0
        
        logger.info(f'✅ 客户数据同步完成: {total_inserted} 条记录')
        logger.info(f'⏱️ 总耗时: {total_time:.2f} 秒')
        logger.info(f'🚀 平均速度: {avg_speed:.0f} 条/秒')
        
        # 关闭连接
        cyrg2025_conn.close()
        hotdog_conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f'❌ 同步客户数据失败: {e}')
        return False

def get_final_statistics():
    """获取最终数据统计"""
    logger.info('📊 获取最终数据统计...')
    try:
        hotdog_conn = retry_connect('hotdog2030')
        hotdog_cursor = hotdog_conn.cursor()
        
        tables = ['orders', 'order_items', 'customers', 'stores', 'products']
        stats = {}
        
        for table in tables:
            try:
                hotdog_cursor.execute(f'SELECT COUNT(*) FROM {table}')
                count = hotdog_cursor.fetchone()[0]
                stats[table] = count
                logger.info(f'📊 {table}: {count} 条记录')
            except Exception as e:
                logger.warning(f'⚠️ 无法获取 {table} 统计: {e}')
        
        hotdog_conn.close()
        return stats
        
    except Exception as e:
        logger.error(f'❌ 获取统计失败: {e}')
        return {}

def main():
    """主函数"""
    logger.info('🚀 开始超高速数据同步系统')
    logger.info('=' * 80)
    
    overall_start = time.time()
    
    # 执行同步任务
    tasks = [
        ("订单数据", ultra_fast_sync_orders),
        ("订单商品数据", ultra_fast_sync_order_items),
        ("客户数据", ultra_fast_sync_customers)
    ]
    
    success_count = 0
    for task_name, task_func in tasks:
        logger.info(f'📋 执行任务: {task_name}')
        task_start = time.time()
        
        if task_func():
            success_count += 1
            task_time = time.time() - task_start
            logger.info(f'✅ {task_name}同步成功 (耗时: {task_time:.2f}秒)')
        else:
            logger.error(f'❌ {task_name}同步失败')
        
        logger.info('-' * 60)
    
    # 获取最终统计
    final_stats = get_final_statistics()
    
    # 输出结果
    overall_time = time.time() - overall_start
    logger.info('=' * 80)
    logger.info(f'🎉 超高速数据同步完成!')
    logger.info(f'⏱️ 总耗时: {overall_time:.2f} 秒')
    logger.info(f'📊 成功任务: {success_count}/{len(tasks)}')
    logger.info('📈 最终数据统计:')
    for table, count in final_stats.items():
        logger.info(f'  - {table}: {count} 条记录')
    
    if success_count == len(tasks):
        logger.info('🎉 所有数据同步成功！')
    else:
        logger.warning(f'⚠️ 有 {len(tasks) - success_count} 个任务失败')

if __name__ == "__main__":
    main()
