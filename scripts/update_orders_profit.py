#!/usr/bin/env python3
"""Aggregate profitPrice directly on the SQL Server and update hotdog2030.orders.total_profit."""
import logging
import sys
import time
import threading

import pymssql

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

CONFIG = {
    'server': 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    'port': 1433,
    'user': 'hotdog',
    'password': 'Zhkj@62102218',
    'timeout': 600,  # 10分钟超时
}

STAGING_TABLE = 'order_profit_staging'

# 全局变量用于跟踪进度
start_time = time.time()
timeout_occurred = False


def timeout_handler():
    global timeout_occurred
    elapsed = time.time() - start_time
    timeout_occurred = True
    logging.error(f'操作超时 (已运行 {elapsed:.1f} 秒)')
    sys.exit(1)


def get_conn(db: str) -> pymssql.Connection:
    conn = pymssql.connect(
        server=CONFIG['server'],
        port=CONFIG['port'],
        user=CONFIG['user'],
        password=CONFIG['password'],
        database=db,
        timeout=CONFIG['timeout'],
    )
    return conn


def ensure_staging(conn: pymssql.Connection):
    cursor = conn.cursor()
    cursor.execute(
        f"""
        IF OBJECT_ID('{STAGING_TABLE}', 'U') IS NULL
        BEGIN
            CREATE TABLE {STAGING_TABLE} (
                order_id INT NOT NULL,
                total_profit DECIMAL(18,2) NOT NULL
            );
        END
        ELSE
        BEGIN
            TRUNCATE TABLE {STAGING_TABLE};
        END
        """
    )
    conn.commit()


def insert_all_sources(conn: pymssql.Connection):
    cursor = conn.cursor()
    logging.info('Aggregating profits from all sources ...')
    
    # 使用批量插入，避免一次性处理所有数据
    # 先创建索引以提高性能
    try:
        cursor.execute(f"""
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_order_profit_staging_order_id' AND object_id = OBJECT_ID('{STAGING_TABLE}'))
            CREATE INDEX IX_order_profit_staging_order_id ON {STAGING_TABLE}(order_id);
        """)
        conn.commit()
    except Exception as e:
        logging.warning(f'创建索引时出错（可能已存在）: {e}')
    
    # 检查表是否存在，然后构建动态SQL
    cursor.execute("""
        SELECT COUNT(*) 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'dbo' 
        AND TABLE_NAME = 'OrderGoodsSpec' 
        AND TABLE_CATALOG = 'cyrgweixin'
    """)
    cyrgweixin_spec_exists = cursor.fetchone()[0] > 0
    
    # 构建SQL查询，根据表是否存在动态调整，使用ISNULL处理NULL值
    union_parts = [
        "SELECT orderId, ISNULL(profitPrice, 0) AS profit FROM cyrg2025.dbo.OrderGoods WITH (NOLOCK) WHERE delflag = 0 AND (isPackage IS NULL OR isPackage = 0)",
        "SELECT orderId, ISNULL(profitPrice, 0) AS profit FROM cyrg2025.dbo.OrderGoodsSpec WITH (NOLOCK) WHERE delflag = 0",
        "SELECT orderId, ISNULL(profitPrice, 0) AS profit FROM cyrgweixin.dbo.OrderGoods WITH (NOLOCK) WHERE delflag = 0 AND (isPackage IS NULL OR isPackage = 0)"
    ]
    
    if cyrgweixin_spec_exists:
        union_parts.append("SELECT orderId, ISNULL(profitPrice, 0) AS profit FROM cyrgweixin.dbo.OrderGoodsSpec WITH (NOLOCK) WHERE delflag = 0")
        logging.info('检测到 cyrgweixin.dbo.OrderGoodsSpec 表，将包含在查询中')
    else:
        logging.info('未检测到 cyrgweixin.dbo.OrderGoodsSpec 表，将跳过')
    
    sql = f"""
        SET NOCOUNT ON;
        INSERT INTO {STAGING_TABLE} (order_id, total_profit)
        SELECT orderId, ISNULL(SUM(profit), 0) AS total_profit
        FROM (
            {' UNION ALL '.join(union_parts)}
        ) t
        WHERE profit IS NOT NULL
        GROUP BY orderId
        HAVING ISNULL(SUM(profit), 0) > 0;
    """
    
    try:
        logging.info('执行利润聚合查询（这可能需要几分钟）...')
        cursor.execute(sql)
        rowcount = cursor.rowcount
        conn.commit()
        logging.info(f'成功插入 {rowcount} 行到临时表.')
    except Exception as e:
        logging.error(f'插入数据失败: {e}')
        conn.rollback()
        raise


def apply_profit_update(conn: pymssql.Connection):
    cursor = conn.cursor()
    logging.info('Updating orders.total_profit from staging ...')
    cursor.execute(
        f"""
        WITH agg AS (
          SELECT order_id, SUM(total_profit) AS total_profit
          FROM {STAGING_TABLE}
          GROUP BY order_id
        )
        UPDATE o
        SET o.total_profit = agg.total_profit
        FROM orders o
        INNER JOIN agg ON agg.order_id = o.id;
        """
    )
    cursor.execute('UPDATE orders SET total_profit = 0 WHERE total_profit IS NULL;')
    conn.commit()
    logging.info('Orders total_profit updated.')


def main():
    global start_time, timeout_occurred
    start_time = time.time()
    
    # 设置超时定时器（使用线程）
    timeout_timer = threading.Timer(CONFIG['timeout'], timeout_handler)
    timeout_timer.daemon = True
    timeout_timer.start()
    
    try:
        logging.info('开始利润同步...')
        conn = get_conn('hotdog2030')
        
        logging.info('准备临时表...')
        ensure_staging(conn)
        
        logging.info('聚合利润数据（这可能需要几分钟）...')
        insert_all_sources(conn)
        
        logging.info('更新订单利润字段...')
        apply_profit_update(conn)
        
        conn.close()
        timeout_timer.cancel()  # 取消超时
        elapsed = time.time() - start_time
        logging.info(f'✅ 利润同步完成! (耗时 {elapsed:.1f} 秒)')
        
    except KeyboardInterrupt:
        timeout_timer.cancel()
        logging.warning('用户中断操作')
        sys.exit(1)
    except Exception as e:
        timeout_timer.cancel()
        elapsed = time.time() - start_time
        logging.error(f'❌ 利润同步失败 (耗时 {elapsed:.1f} 秒): {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()
