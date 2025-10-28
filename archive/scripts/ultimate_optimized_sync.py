#!/usr/bin/env python3
"""
终极优化数据同步 - 使用所有性能优化策略
优化策略：
1. 增加并发连接数
2. 优化批量大小
3. 事务提交优化
4. 并行查询与插入
5. 异步索引管理
6. 性能监控
"""
import pymssql
import logging
from datetime import datetime
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import csv
import os

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ultimate_optimized_sync.log'),
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

def fetch_orders_parallel(database, query):
    """并行获取订单数据"""
    try:
        conn = get_connection(database)
        if not conn:
            return []
        
        cursor = conn.cursor()
        cursor.execute(query)
        orders = cursor.fetchall()
        conn.close()
        
        logger.info(f'📊 {database} 找到 {len(orders)} 个订单')
        return orders
    except Exception as e:
        logger.error(f'❌ 查询 {database} 数据失败: {e}')
        return []

def disable_indexes_async(conn, table_name):
    """异步禁用索引 - 只禁用非主键索引"""
    def disable_indexes():
        try:
            cursor = conn.cursor()
            logger.info(f'🔧 异步禁用 {table_name} 表非主键索引...')
            # 只禁用非聚集索引，保留主键索引
            cursor.execute(f'''
                DECLARE @sql NVARCHAR(MAX) = ''
                SELECT @sql = @sql + 'ALTER INDEX ' + i.name + ' ON ' + t.name + ' DISABLE;' + CHAR(13)
                FROM sys.indexes i
                INNER JOIN sys.tables t ON i.object_id = t.object_id
                WHERE t.name = '{table_name}' AND i.type_desc = 'NONCLUSTERED'
                
                IF @sql != ''
                    EXEC sp_executesql @sql
            ''')
            conn.commit()
            logger.info(f'✅ {table_name} 表非主键索引已禁用')
        except Exception as e:
            logger.warning(f'⚠️ 禁用索引失败: {e}')
    
    thread = threading.Thread(target=disable_indexes)
    thread.start()
    return thread

def enable_indexes_async(conn, table_name):
    """异步重建索引"""
    def enable_indexes():
        try:
            cursor = conn.cursor()
            logger.info(f'🔧 异步重建 {table_name} 表索引...')
            cursor.execute(f'ALTER INDEX ALL ON {table_name} REBUILD')
            conn.commit()
            logger.info(f'✅ {table_name} 表索引已重建')
        except Exception as e:
            logger.warning(f'⚠️ 重建索引失败: {e}')
    
    thread = threading.Thread(target=enable_indexes)
    thread.start()
    return thread

def export_orders_to_csv(orders, filename):
    """导出订单数据到CSV文件"""
    logger.info(f'📁 导出订单数据到 {filename}...')
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        
        # 写入表头
        writer.writerow([
            'id', 'order_no', 'customer_id', 'store_id', 'total_amount', 'pay_state', 'pay_mode',
            'created_at', 'updated_at', 'delflag', 'cash', 'vipAmount', 'vipAmountZengSong',
            'cardAmount', 'cardZengSong', 'couponAmount', 'discountAmount', 'orderRemarks'
        ])
        
        # 写入数据
        for order in orders:
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
            
            writer.writerow([
                order[0], order_no, open_id, shop_id, order_amount, pay_state, pay_mode,
                record_time, record_time, 0, cash, vip_amount, vip_amount_zengsong,
                card_amount, card_zengsong, coupon_amount, discount_amount, order_remarks
            ])
    
    logger.info(f'✅ 订单数据导出完成: {len(orders)} 条记录')

def process_batch_ultimate(batch, batch_id, total_batches):
    """终极优化的批量处理函数"""
    try:
        conn = get_connection('hotdog2030')
        if not conn:
            return False, 0
        
        cursor = conn.cursor()
        batch_start = time.time()
        
        # 准备合并的INSERT语句
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
        
        # 执行合并的INSERT语句
        try:
            insert_query = f'''
                INSERT INTO orders 
                (id, order_no, customer_id, store_id, total_amount, pay_state, pay_mode, created_at, updated_at, delflag,
                 cash, vipAmount, vipAmountZengSong, cardAmount, cardZengSong, couponAmount, discountAmount, orderRemarks)
                VALUES {', '.join(values_list)}
            '''
            
            cursor.execute(insert_query)
            conn.commit()
            
            batch_time = time.time() - batch_start
            speed = len(batch) / batch_time if batch_time > 0 else 0
            
            logger.info(f'✅ 批次 {batch_id}/{total_batches} 完成: {len(batch)} 条记录 (速度: {speed:.0f} 条/秒)')
            return True, len(batch)
            
        except Exception as e:
            logger.error(f'❌ 批次 {batch_id} 插入失败: {e}')
            return False, 0
            
    except Exception as e:
        logger.error(f'❌ 批次 {batch_id} 处理失败: {e}')
        return False, 0
    finally:
        if conn:
            conn.close()

def ultimate_optimized_sync_orders():
    """终极优化同步订单数据"""
    logger.info('🚀 开始终极优化同步订单数据...')
    start_time = time.time()
    
    try:
        # 并行查询订单数据
        logger.info('📊 并行查询订单数据...')
        query_cyrg2025 = '''
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
        '''
        
        query_cyrgweixin = '''
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
        '''
        
        # 使用线程池并行查询
        with ThreadPoolExecutor(max_workers=2) as executor:
            future_cyrg2025 = executor.submit(fetch_orders_parallel, 'cyrg2025', query_cyrg2025)
            future_cyrgweixin = executor.submit(fetch_orders_parallel, 'cyrgweixin', query_cyrgweixin)
            
            cyrg2025_orders = future_cyrg2025.result()
            cyrgweixin_orders = future_cyrgweixin.result()
        
        # 合并所有订单
        all_orders = cyrg2025_orders + cyrgweixin_orders
        logger.info(f'📊 总计 {len(all_orders)} 个订单')
        
        # 清空目标表
        hotdog_conn = get_connection('hotdog2030')
        if not hotdog_conn:
            logger.error('❌ 无法连接到hotdog2030数据库')
            return False
        
        hotdog_cursor = hotdog_conn.cursor()
        logger.info('🗑️ 清空hotdog2030.orders表...')
        hotdog_cursor.execute('DELETE FROM orders')
        hotdog_conn.commit()
        
        # 异步禁用索引
        disable_thread = disable_indexes_async(hotdog_conn, 'orders')
        
        # 分批处理数据 - 使用合适的批量大小
        batch_size = 800  # SQL Server限制1000行，使用800确保安全
        total_batches = (len(all_orders) + batch_size - 1) // batch_size
        logger.info(f'📦 开始分批插入，批量大小: {batch_size}，总批次数: {total_batches}')
        
        # 使用更大的线程池并行处理
        total_inserted = 0
        successful_batches = 0
        
        with ThreadPoolExecutor(max_workers=20) as executor:  # 增加线程池大小
            # 提交所有批次任务
            future_to_batch = {}
            for i in range(0, len(all_orders), batch_size):
                batch = all_orders[i:i + batch_size]
                batch_id = i // batch_size + 1
                future = executor.submit(process_batch_ultimate, batch, batch_id, total_batches)
                future_to_batch[future] = batch_id
            
            # 处理完成的任务
            for future in as_completed(future_to_batch):
                batch_id = future_to_batch[future]
                try:
                    success, inserted_count = future.result()
                    if success:
                        total_inserted += inserted_count
                        successful_batches += 1
                        logger.info(f'✅ 批次 {batch_id} 成功: {inserted_count} 条记录')
                    else:
                        logger.error(f'❌ 批次 {batch_id} 失败')
                except Exception as e:
                    logger.error(f'❌ 批次 {batch_id} 异常: {e}')
        
        # 等待索引禁用完成
        disable_thread.join()
        
        # 异步重建索引
        enable_thread = enable_indexes_async(hotdog_conn, 'orders')
        
        total_time = time.time() - start_time
        avg_speed = total_inserted / total_time if total_time > 0 else 0
        
        logger.info(f'✅ 订单数据同步完成: {total_inserted} 条记录')
        logger.info(f'📊 成功批次: {successful_batches}/{total_batches}')
        logger.info(f'⏱️ 总耗时: {total_time:.2f} 秒')
        logger.info(f'🚀 平均速度: {avg_speed:.0f} 条/秒')
        
        # 等待索引重建完成
        enable_thread.join()
        
        return total_inserted > 0
        
    except Exception as e:
        logger.error(f'❌ 同步订单数据失败: {e}')
        return False
    finally:
        if hotdog_conn:
            hotdog_conn.close()

def main():
    """主函数"""
    logger.info('🚀 开始终极优化数据同步系统')
    logger.info('=' * 80)
    
    if ultimate_optimized_sync_orders():
        logger.info('🎉 终极优化订单数据同步成功！')
    else:
        logger.error('❌ 终极优化订单数据同步失败！')

if __name__ == "__main__":
    main()
