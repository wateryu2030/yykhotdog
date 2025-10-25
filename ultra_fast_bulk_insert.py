#!/usr/bin/env python3
"""
超高速批量插入 - 使用BULK INSERT和性能优化
优化策略：
1. 使用BULK INSERT
2. 禁用索引
3. 增加批量大小
4. 并行处理
5. 性能监控
"""
import pymssql
import logging
import csv
import os
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ultra_fast_bulk_insert.log'),
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

def bulk_insert_orders(conn, csv_file):
    """使用BULK INSERT插入订单数据"""
    try:
        cursor = conn.cursor()
        logger.info(f'🚀 开始BULK INSERT插入订单数据...')
        
        # 获取CSV文件的绝对路径
        csv_path = os.path.abspath(csv_file)
        
        # 执行BULK INSERT
        bulk_insert_sql = f'''
        BULK INSERT orders
        FROM '{csv_path}'
        WITH (
            FIELDTERMINATOR = ',',
            ROWTERMINATOR = '\\n',
            FIRSTROW = 2,
            TABLOCK,
            BATCHSIZE = 10000,
            MAXERRORS = 0
        )
        '''
        
        start_time = time.time()
        cursor.execute(bulk_insert_sql)
        conn.commit()
        
        insert_time = time.time() - start_time
        logger.info(f'✅ BULK INSERT完成，耗时: {insert_time:.2f} 秒')
        
        return True
        
    except Exception as e:
        logger.error(f'❌ BULK INSERT失败: {e}')
        return False

def ultra_fast_sync_orders():
    """超高速同步订单数据"""
    logger.info('🚀 开始超高速同步订单数据...')
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
        
        # 导出数据到CSV
        csv_file = 'orders_data.csv'
        export_orders_to_csv(all_orders, csv_file)
        
        # 使用BULK INSERT插入数据
        if bulk_insert_orders(hotdog_conn, csv_file):
            # 重建索引
            enable_indexes(hotdog_conn, 'orders')
            
            # 清理CSV文件
            if os.path.exists(csv_file):
                os.remove(csv_file)
                logger.info(f'🗑️ 清理临时文件: {csv_file}')
            
            total_time = time.time() - start_time
            avg_speed = len(all_orders) / total_time if total_time > 0 else 0
            
            logger.info(f'✅ 订单数据同步完成: {len(all_orders)} 条记录')
            logger.info(f'⏱️ 总耗时: {total_time:.2f} 秒')
            logger.info(f'🚀 平均速度: {avg_speed:.0f} 条/秒')
            
            return True
        else:
            logger.error('❌ BULK INSERT失败')
            return False
        
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
    logger.info('🚀 开始超高速批量插入系统')
    logger.info('=' * 80)
    
    if ultra_fast_sync_orders():
        logger.info('🎉 超高速订单数据同步成功！')
    else:
        logger.error('❌ 超高速订单数据同步失败！')

if __name__ == "__main__":
    main()
