#!/usr/bin/env python3
"""
优化批量插入 - 使用多种性能优化策略
优化策略：
1. 禁用索引
2. 增加批量大小
3. 并行处理
4. 性能监控
"""
import pymssql
import logging
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('optimized_batch_insert.log'),
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

def disable_indexes(conn, table_name):
    """禁用表索引"""
    try:
        cursor = conn.cursor()
        logger.info(f'🔧 禁用 {table_name} 表索引...')
        
        # 禁用非聚集索引
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
        logger.info(f'✅ {table_name} 表索引已禁用')
        return True
    except Exception as e:
        logger.warning(f'⚠️ 禁用索引失败: {e}')
        return False

def enable_indexes(conn, table_name):
    """重建表索引"""
    try:
        cursor = conn.cursor()
        logger.info(f'🔧 重建 {table_name} 表索引...')
        
        # 重建所有索引
        cursor.execute(f'''
            DECLARE @sql NVARCHAR(MAX) = ''
            SELECT @sql = @sql + 'ALTER INDEX ' + i.name + ' ON ' + t.name + ' REBUILD;' + CHAR(13)
            FROM sys.indexes i
            INNER JOIN sys.tables t ON i.object_id = t.object_id
            WHERE t.name = '{table_name}' AND i.type_desc = 'NONCLUSTERED'
            
            IF @sql != ''
                EXEC sp_executesql @sql
        ''')
        conn.commit()
        logger.info(f'✅ {table_name} 表索引已重建')
        return True
    except Exception as e:
        logger.warning(f'⚠️ 重建索引失败: {e}')
        return False

def batch_insert_worker(orders_batch, batch_id, total_batches):
    """批量插入工作线程"""
    try:
        conn = get_connection('hotdog2030')
        if not conn:
            return False, 0
        
        cursor = conn.cursor()
        total_inserted = 0
        
        # 准备批量数据
        batch_data = []
        for order in orders_batch:
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
        
        cursor.executemany(insert_query, batch_data)
        conn.commit()
        total_inserted = len(batch_data)
        
        logger.info(f'📦 批次 {batch_id}/{total_batches} 完成: {total_inserted} 条记录')
        
        conn.close()
        return True, total_inserted
        
    except Exception as e:
        logger.error(f'❌ 批次 {batch_id} 插入失败: {e}')
        return False, 0

def optimized_sync_orders():
    """优化同步订单数据"""
    logger.info('🚀 开始优化同步订单数据...')
    start_time = time.time()
    
    cyrg2025_conn = get_connection('cyrg2025')
    cyrgweixin_conn = get_connection('cyrgweixin')
    hotdog_conn = get_connection('hotdog2030')
    
    if not all([cyrg2025_conn, cyrgweixin_conn, hotdog_conn]):
        logger.error('❌ 数据库连接失败')
        return False
    
    try:
        # 获取订单数据
        logger.info('📊 查询订单数据...')
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
        
        # 禁用索引
        disable_indexes(hotdog_conn, 'orders')
        
        # 分批处理数据
        batch_size = 5000  # 增大批量大小
        total_batches = (len(all_orders) + batch_size - 1) // batch_size
        logger.info(f'📦 开始分批插入，批量大小: {batch_size}，总批次数: {total_batches}')
        
        # 使用线程池并行处理
        total_inserted = 0
        successful_batches = 0
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            # 提交所有批次任务
            future_to_batch = {}
            for i in range(0, len(all_orders), batch_size):
                batch = all_orders[i:i + batch_size]
                batch_id = i // batch_size + 1
                future = executor.submit(batch_insert_worker, batch, batch_id, total_batches)
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
        
        # 重建索引
        enable_indexes(hotdog_conn, 'orders')
        
        total_time = time.time() - start_time
        avg_speed = total_inserted / total_time if total_time > 0 else 0
        
        logger.info(f'✅ 订单数据同步完成: {total_inserted} 条记录')
        logger.info(f'📊 成功批次: {successful_batches}/{total_batches}')
        logger.info(f'⏱️ 总耗时: {total_time:.2f} 秒')
        logger.info(f'🚀 平均速度: {avg_speed:.0f} 条/秒')
        
        return total_inserted > 0
        
    except Exception as e:
        logger.error(f'❌ 同步订单数据失败: {e}')
        return False
    finally:
        # 关闭连接
        if cyrg2025_conn:
            cyrg2025_conn.close()
        if cyrgweixin_conn:
            cyrgweixin_conn.close()
        if hotdog_conn:
            hotdog_conn.close()

def main():
    """主函数"""
    logger.info('🚀 开始优化批量插入系统')
    logger.info('=' * 80)
    
    if optimized_sync_orders():
        logger.info('🎉 优化订单数据同步成功！')
    else:
        logger.error('❌ 优化订单数据同步失败！')

if __name__ == "__main__":
    main()
