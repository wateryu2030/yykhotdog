#!/usr/bin/env python3
"""
简化ETL数据同步脚本 - 使用pymssql从cyrg2025和cyrgweixin同步数据到hotdog2030
"""
import pymssql
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
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
        logger.info(f"✅ 数据库连接成功: {database}")
        return conn
    except Exception as e:
        logger.error(f"❌ 数据库连接失败: {database} - {e}")
        return None

def sync_orders():
    """同步订单数据"""
    logger.info("🛒 开始同步订单数据...")
    
    # 连接源数据库
    cyrg2025_conn = get_connection('cyrg2025')
    cyrgweixin_conn = get_connection('cyrgweixin')
    hotdog_conn = get_connection('hotdog2030')
    
    if not all([cyrg2025_conn, cyrgweixin_conn, hotdog_conn]):
        logger.error("❌ 数据库连接失败")
        return False
    
    try:
        # 从cyrg2025获取订单数据
        cyrg2025_cursor = cyrg2025_conn.cursor()
        cyrg2025_cursor.execute("""
            SELECT TOP 1000 id, openId, shopId, total, payState, recordTime, delflag
            FROM Orders 
            WHERE delflag = 0 AND payState = 2
            ORDER BY recordTime DESC
        """)
        cyrg2025_orders = cyrg2025_cursor.fetchall()
        logger.info(f"📊 从cyrg2025获取 {len(cyrg2025_orders)} 条订单")
        
        # 从cyrgweixin获取订单数据
        cyrgweixin_cursor = cyrgweixin_conn.cursor()
        cyrgweixin_cursor.execute("""
            SELECT TOP 1000 id, openId, shopId, total, payState, recordTime, delflag
            FROM Orders 
            WHERE delflag = 0 AND payState = 2
            ORDER BY recordTime DESC
        """)
        cyrgweixin_orders = cyrgweixin_cursor.fetchall()
        logger.info(f"📊 从cyrgweixin获取 {len(cyrgweixin_orders)} 条订单")
        
        # 清空hotdog2030.orders表
        hotdog_cursor = hotdog_conn.cursor()
        hotdog_cursor.execute("DELETE FROM orders")
        logger.info("🗑️ 清空hotdog2030.orders表")
        
        # 插入cyrg2025订单数据
        insert_count = 0
        for order in cyrg2025_orders:
            try:
                hotdog_cursor.execute("""
                    INSERT INTO orders (id, customer_id, store_id, total_amount, pay_state, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    order[0], order[1], order[2], order[3], order[4], 
                    datetime.now(), datetime.now()
                ))
                insert_count += 1
            except Exception as e:
                logger.warning(f"⚠️ 跳过订单 {order[0]}: {e}")
        
        # 插入cyrgweixin订单数据
        for order in cyrgweixin_orders:
            try:
                hotdog_cursor.execute("""
                    INSERT INTO orders (id, customer_id, store_id, total_amount, pay_state, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    order[0], order[1], order[2], order[3], order[4], 
                    datetime.now(), datetime.now()
                ))
                insert_count += 1
            except Exception as e:
                logger.warning(f"⚠️ 跳过订单 {order[0]}: {e}")
        
        hotdog_conn.commit()
        logger.info(f"✅ 成功同步 {insert_count} 条订单数据")
        
        # 关闭连接
        cyrg2025_conn.close()
        cyrgweixin_conn.close()
        hotdog_conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 同步订单数据失败: {e}")
        return False

def sync_stores():
    """同步门店数据"""
    logger.info("🏪 开始同步门店数据...")
    
    cyrg2025_conn = get_connection('cyrg2025')
    hotdog_conn = get_connection('hotdog2030')
    
    if not all([cyrg2025_conn, hotdog_conn]):
        logger.error("❌ 数据库连接失败")
        return False
    
    try:
        # 从cyrg2025获取门店数据
        cyrg2025_cursor = cyrg2025_conn.cursor()
        cyrg2025_cursor.execute("""
            SELECT Id, ShopName, ShopAddress, DirectorPhone, location, state, Delflag
            FROM Shop 
            WHERE Delflag = 0
        """)
        stores = cyrg2025_cursor.fetchall()
        logger.info(f"📊 获取 {len(stores)} 个门店")
        
        # 清空hotdog2030.stores表
        hotdog_cursor = hotdog_conn.cursor()
        hotdog_cursor.execute("DELETE FROM stores")
        logger.info("🗑️ 清空hotdog2030.stores表")
        
        # 插入门店数据
        insert_count = 0
        for store in stores:
            try:
                hotdog_cursor.execute("""
                    INSERT INTO stores (id, store_name, address, director_phone, longitude, latitude, status, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, 'active', %s, %s)
                """, (
                    store[0], store[1], store[2], store[3], store[4], store[5], 
                    datetime.now(), datetime.now()
                ))
                insert_count += 1
            except Exception as e:
                logger.warning(f"⚠️ 跳出门店 {store[0]}: {e}")
        
        hotdog_conn.commit()
        logger.info(f"✅ 成功同步 {insert_count} 个门店")
        
        # 关闭连接
        cyrg2025_conn.close()
        hotdog_conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 同步门店数据失败: {e}")
        return False

def sync_products():
    """同步商品数据"""
    logger.info("🛍️ 开始同步商品数据...")
    
    cyrg2025_conn = get_connection('cyrg2025')
    hotdog_conn = get_connection('hotdog2030')
    
    if not all([cyrg2025_conn, hotdog_conn]):
        logger.error("❌ 数据库连接失败")
        return False
    
    try:
        # 从cyrg2025获取商品数据
        cyrg2025_cursor = cyrg2025_conn.cursor()
        cyrg2025_cursor.execute("""
            SELECT id, goodsName, salePrice, marktPrice, goodsStock, isSale, isHot, isRecom, shopId, delflag
            FROM Goods 
            WHERE delflag = 0
        """)
        products = cyrg2025_cursor.fetchall()
        logger.info(f"📊 获取 {len(products)} 个商品")
        
        # 清空hotdog2030.products表
        hotdog_cursor = hotdog_conn.cursor()
        hotdog_cursor.execute("DELETE FROM products")
        logger.info("🗑️ 清空hotdog2030.products表")
        
        # 插入商品数据
        insert_count = 0
        for product in products:
            try:
                hotdog_cursor.execute("""
                    INSERT INTO products (id, product_name, sale_price, market_price, goods_stock, is_sale, is_hot, is_recommended, shop_id, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    product[0], product[1], product[2], product[3], product[4], 
                    product[5], product[6], product[7], product[8], 
                    datetime.now(), datetime.now()
                ))
                insert_count += 1
            except Exception as e:
                logger.warning(f"⚠️ 跳过商品 {product[0]}: {e}")
        
        hotdog_conn.commit()
        logger.info(f"✅ 成功同步 {insert_count} 个商品")
        
        # 关闭连接
        cyrg2025_conn.close()
        hotdog_conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 同步商品数据失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("🚀 开始ETL数据同步")
    logger.info("=" * 60)
    
    # 执行同步任务
    tasks = [
        ("订单数据", sync_orders),
        ("门店数据", sync_stores),
        ("商品数据", sync_products)
    ]
    
    success_count = 0
    for task_name, task_func in tasks:
        logger.info(f"📋 执行任务: {task_name}")
        if task_func():
            success_count += 1
            logger.info(f"✅ {task_name}同步成功")
        else:
            logger.error(f"❌ {task_name}同步失败")
        logger.info("-" * 40)
    
    # 输出结果
    logger.info("=" * 60)
    logger.info(f"📊 ETL同步完成: {success_count}/{len(tasks)} 个任务成功")
    
    if success_count == len(tasks):
        logger.info("🎉 所有数据同步成功！")
    else:
        logger.warning(f"⚠️ 有 {len(tasks) - success_count} 个任务失败")

if __name__ == "__main__":
    main()
