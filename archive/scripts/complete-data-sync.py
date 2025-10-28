#!/usr/bin/env python3
"""
完整数据同步脚本 - 从cyrg2025和cyrgweixin数据库同步所有基础数据到hotdog2030
包括：门店、商品、订单、订单商品、客户数据
支持增量更新和全量同步
"""
import pymssql
import logging
from datetime import datetime
import sys

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_sync.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 数据库连接配置 - 使用RDS
CONFIG = {
    'server': 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    'port': 1433,
    'username': 'hotdog',
    'password': 'Zhkj@62102218',
    'driver': '{ODBC Driver 18 for SQL Server}',
    'timeout': 30
}

def get_connection(database='hotdog2030'):
    """获取数据库连接"""
    try:
        conn = pymssql.connect(
            server=CONFIG['server'],
            port=CONFIG['port'],
            user=CONFIG['username'],
            password=CONFIG['password'],
            database=database
        )
        logger.info(f"✅ 数据库连接成功: {database}")
        return conn
    except Exception as e:
        logger.error(f"❌ 数据库连接失败: {database} - {e}")
        return None

def sync_stores(conn, full_sync=True):
    """同步门店数据"""
    logger.info("🏪 开始同步门店数据...")
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025.Shop获取门店数据
        cursor.execute("USE [cyrg2025]")
        cursor.execute("""
            SELECT 
                Id, ShopName, state, province, city, district, ShopAddress, 
                Director, DirectorPhone, MorningTime, NightTime, 
                PassengerFlow, IsSelf, blurb, establishTime, openingTime, isUse, rent
            FROM Shop
            WHERE Delflag = 0
        """)
        stores = cursor.fetchall()
        
        logger.info(f"📊 找到 {len(stores)} 个门店")
        
        if not stores:
            logger.warning("⚠️ 没有找到门店数据")
            return 0
        
        # 切换到hotdog2030数据库
        cursor.execute("USE [hotdog2030]")
        
        if full_sync:
            # 全量同步：清空现有数据
            logger.info("🗑️ 清空现有门店数据...")
            cursor.execute("DELETE FROM stores")
            cursor.execute("SET IDENTITY_INSERT stores ON")
        
        # 批量插入门店数据
        store_data_list = []
        for store in stores:
            # 处理PassengerFlow字段，如果是文本则设为0
            try:
                passenger_flow = int(store.PassengerFlow) if store.PassengerFlow and str(store.PassengerFlow).isdigit() else 0
            except:
                passenger_flow = 0
            
            # 根据开业时间和是否有订单来判断营业状态
            # 如果门店有开业时间且开业时间早于当前时间，则认为是营业中
            # 如果isUse为1，也认为是营业中
            if store.isUse == 1:
                status = '营业中'
            elif store.openingTime:
                try:
                    # 将字符串转换为datetime进行比较
                    opening_date = datetime.strptime(str(store.openingTime), '%Y-%m-%d')
                    if opening_date < datetime.now():
                        status = '营业中'
                    else:
                        status = '计划中'
                except:
                    # 如果转换失败，根据isUse判断
                    status = '暂停营业' if store.isUse == 0 else '营业中'
            else:
                status = '暂停营业'
            
            # 根据IsSelf字段设置门店类型
            store_type = '直营店' if store.IsSelf == 1 else '加盟店'
            
            store_data = (
                store.Id,  # id (保持原始ID)
                str(store.Id),  # store_code
                store.ShopName,  # store_name
                store_type,  # store_type (直营店/加盟店)
                status,  # status (根据开业时间和isUse判断)
                store.province or '',  # province
                store.city or '',  # city
                store.district or '',  # district
                store.ShopAddress or '',  # address
                store.Director or '',  # director
                store.DirectorPhone or '',  # director_phone
                store.MorningTime,  # morning_time
                store.NightTime,  # night_time
                passenger_flow,  # passenger_flow (转换为整数)
                store.IsSelf == 1,  # is_self
                store.rent,  # rent_amount
                datetime.now(),  # created_at
                datetime.now(),  # updated_at
                0  # delflag
            )
            store_data_list.append(store_data)
        
        # 执行批量插入
        insert_query = """
        INSERT INTO stores 
        (id, store_code, store_name, store_type, status, province, city, district, address,
         director, director_phone, morning_time, night_time, passenger_flow, is_self,
         rent_amount, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        cursor.executemany(insert_query, store_data_list)
        conn.commit()
        
        if full_sync:
            cursor.execute("SET IDENTITY_INSERT stores OFF")
        
        logger.info(f"✅ 门店数据同步完成: {len(store_data_list)} 条记录")
        return len(store_data_list)
        
    except Exception as e:
        logger.error(f"❌ 门店数据同步失败: {e}")
        conn.rollback()
        return 0

def sync_products(conn, full_sync=True):
    """同步商品数据"""
    logger.info("🛍️ 开始同步商品数据...")
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025.Goods获取商品数据
        cursor.execute("USE [cyrg2025]")
        cursor.execute("""
            SELECT 
                id, categoryId, goodsName, salePrice, marktPrice, goodsStock,
                isSale, isHot, isRecom, shopId
            FROM Goods
            WHERE delflag = 0
        """)
        products = cursor.fetchall()
        
        logger.info(f"📊 找到 {len(products)} 个商品")
        
        if not products:
            logger.warning("⚠️ 没有找到商品数据")
            return 0
        
        # 切换到hotdog2030数据库
        cursor.execute("USE [hotdog2030]")
        
        if full_sync:
            # 全量同步：清空现有数据
            logger.info("🗑️ 清空现有商品数据...")
            cursor.execute("DELETE FROM products")
        
        # 批量插入商品数据
        product_data_list = []
        for product in products:
            product_data = (
                product.categoryId,  # category_id
                product.goodsName,  # product_name
                product.salePrice,  # sale_price
                product.marktPrice,  # market_price
                0,  # cost_price (默认值)
                product.goodsStock,  # goods_stock
                product.isSale == 1,  # is_sale
                product.isHot == 1,  # is_hot
                product.isRecom == 1,  # is_recommended
                product.shopId,  # shop_id
                '',  # shop_name (空字符串)
                datetime.now(),  # created_at
                datetime.now(),  # updated_at
                0  # delflag
            )
            product_data_list.append(product_data)
        
        # 执行批量插入
        insert_query = """
        INSERT INTO products 
        (category_id, product_name, sale_price, market_price, cost_price, goods_stock,
         is_sale, is_hot, is_recommended, shop_id, shop_name, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        cursor.executemany(insert_query, product_data_list)
        conn.commit()
        logger.info(f"✅ 商品数据同步完成: {len(product_data_list)} 条记录")
        return len(product_data_list)
        
    except Exception as e:
        logger.error(f"❌ 商品数据同步失败: {e}")
        conn.rollback()
        return 0

def sync_orders(conn, full_sync=True):
    """同步订单数据"""
    logger.info("📦 开始同步订单数据...")
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025.Orders获取订单数据 - 只获取有效的已支付订单
        cursor.execute("USE [cyrg2025]")
        cursor.execute("""
            SELECT 
                id, orderNo, openId, shopId, recordTime, total, payState, delState,
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
        """)
        orders = cursor.fetchall()
        
        logger.info(f"📊 找到 {len(orders)} 个订单")
        
        if not orders:
            logger.warning("⚠️ 没有找到订单数据")
            return 0
        
        # 切换到hotdog2030数据库
        cursor.execute("USE [hotdog2030]")
        
        if full_sync:
            # 全量同步：清空现有数据
            logger.info("🗑️ 清空现有订单数据...")
            cursor.execute("DELETE FROM orders")
            cursor.execute("SET IDENTITY_INSERT orders ON")
        
        # 批量插入订单数据
        batch_size = 1000
        total_inserted = 0
        
        for i in range(0, len(orders), batch_size):
            batch = orders[i:i+batch_size]
            order_data_list = []
            
            for order in batch:
                # 选择正确的订单金额：优先使用orderValue（小程序订单），如果为NULL则使用cash（外卖订单）
                order_amount = order.orderValue if order.orderValue is not None and order.orderValue > 0 else (order.cash if order.cash is not None and order.cash > 0 else 0)
                
                order_data = (
                    order.id,  # id
                    order.orderNo,  # order_no
                    order.openId,  # customer_id
                    order.shopId,  # store_id
                    order_amount,  # total_amount (使用orderValue或total作为订单金额)
                    order.payState,  # pay_state
                    order.payMode,  # pay_mode
                    order.recordTime,  # created_at (使用原始订单时间)
                    order.recordTime,  # updated_at (使用原始订单时间)
                    0,  # delflag
                    order.cash or 0,  # cash
                    order.vipAmount or 0,  # vipAmount
                    order.vipAmountZengSong or 0,  # vipAmountZengSong
                    order.cardAmount or 0,  # cardAmount
                    order.cardZengSong or 0,  # cardZengSong
                    order.couponAmount or 0,  # couponAmount
                    order.discountAmount or 0,  # discountAmount
                    order.orderRemarks or ''  # orderRemarks
                )
                order_data_list.append(order_data)
            
            # 执行批量插入
            insert_query = """
            INSERT INTO orders 
            (id, order_no, customer_id, store_id, total_amount, pay_state, pay_mode, created_at, updated_at, delflag,
             cash, vipAmount, vipAmountZengSong, cardAmount, cardZengSong, couponAmount, discountAmount, orderRemarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            cursor.executemany(insert_query, order_data_list)
            conn.commit()
            total_inserted += len(order_data_list)
            logger.info(f"📦 已同步 {total_inserted}/{len(orders)} 个订单")
        
        if full_sync:
            cursor.execute("SET IDENTITY_INSERT orders OFF")
        
        logger.info(f"✅ 订单数据同步完成: {total_inserted} 条记录")
        return total_inserted
        
    except Exception as e:
        logger.error(f"❌ 订单数据同步失败: {e}")
        conn.rollback()
        return 0

def sync_order_items(conn, full_sync=True):
    """同步订单商品数据"""
    logger.info("🛒 开始同步订单商品数据...")
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025.OrderGoods获取订单商品数据
        cursor.execute("USE [cyrg2025]")
        cursor.execute("""
            SELECT 
                orderId, goodsId, goodsName, goodsNumber, goodsPrice, goodsTotal
            FROM OrderGoods
            ORDER BY orderId
        """)
        order_items = cursor.fetchall()
        
        logger.info(f"📊 找到 {len(order_items)} 个订单商品")
        
        if not order_items:
            logger.warning("⚠️ 没有找到订单商品数据")
            return 0
        
        # 切换到hotdog2030数据库
        cursor.execute("USE [hotdog2030]")
        
        if full_sync:
            # 全量同步：清空现有数据
            logger.info("🗑️ 清空现有订单商品数据...")
            cursor.execute("DELETE FROM order_items")
        
        # 批量插入订单商品数据
        batch_size = 2000
        total_inserted = 0
        
        for i in range(0, len(order_items), batch_size):
            batch = order_items[i:i+batch_size]
            order_item_data_list = []
            
            for item in batch:
                order_item_data = (
                    item.orderId,  # order_id
                    item.goodsId,  # product_id
                    item.goodsName,  # product_name
                    item.goodsNumber,  # quantity
                    item.goodsPrice,  # price
                    item.goodsTotal,  # total_price
                    datetime.now(),  # created_at
                    datetime.now(),  # updated_at
                    0  # delflag
                )
                order_item_data_list.append(order_item_data)
            
            # 执行批量插入
            insert_query = """
            INSERT INTO order_items 
            (order_id, product_id, product_name, quantity, price, total_price,
             created_at, updated_at, delflag)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            cursor.executemany(insert_query, order_item_data_list)
            conn.commit()
            total_inserted += len(order_item_data_list)
            logger.info(f"🛒 已同步 {total_inserted}/{len(order_items)} 个订单商品")
        
        logger.info(f"✅ 订单商品数据同步完成: {total_inserted} 条记录")
        return total_inserted
        
    except Exception as e:
        logger.error(f"❌ 订单商品数据同步失败: {e}")
        conn.rollback()
        return 0

def sync_customers(conn, full_sync=True):
    """同步客户数据"""
    logger.info("👥 开始同步客户数据...")
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025.XcxUser获取客户数据
        cursor.execute("USE [cyrg2025]")
        cursor.execute("""
            SELECT 
                ID, OpenId, NickName, Headimgurl, Sex, city, Tel, RecordTime, State
            FROM XcxUser
            WHERE Delflag = 0
        """)
        customers = cursor.fetchall()
        
        logger.info(f"📊 找到 {len(customers)} 个客户")
        
        if not customers:
            logger.warning("⚠️ 没有找到客户数据")
            return 0
        
        # 切换到hotdog2030数据库
        cursor.execute("USE [hotdog2030]")
        
        if full_sync:
            # 全量同步：清空现有数据
            logger.info("🗑️ 清空现有客户数据...")
            cursor.execute("DELETE FROM customers")
        
        # 批量插入客户数据
        customer_data_list = []
        for customer in customers:
            customer_data = (
                customer.OpenId,  # customer_id
                customer.NickName or '',  # customer_name
                customer.Tel or '',  # phone
                customer.OpenId,  # openid
                customer.RecordTime,  # created_at
                customer.RecordTime,  # updated_at
                0  # delflag
            )
            customer_data_list.append(customer_data)
        
        # 执行批量插入
        insert_query = """
        INSERT INTO customers 
        (customer_id, customer_name, phone, openid, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        
        cursor.executemany(insert_query, customer_data_list)
        conn.commit()
        logger.info(f"✅ 客户数据同步完成: {len(customer_data_list)} 条记录")
        return len(customer_data_list)
        
    except Exception as e:
        logger.error(f"❌ 客户数据同步失败: {e}")
        conn.rollback()
        return 0

def get_data_statistics(conn):
    """获取数据统计信息"""
    logger.info("📊 获取数据统计信息...")
    try:
        cursor = conn.cursor()
        cursor.execute("USE [hotdog2030]")
        
        tables = ['stores', 'products', 'orders', 'order_items', 'customers']
        stats = {}
        
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                stats[table] = count
                logger.info(f"📊 {table}: {count} 条记录")
            except Exception as e:
                logger.warning(f"⚠️ 无法查询 {table} 表: {e}")
                stats[table] = 0
        
        return stats
        
    except Exception as e:
        logger.error(f"❌ 获取数据统计失败: {e}")
        return {}

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='完整数据同步脚本')
    parser.add_argument('--full', action='store_true', help='执行全量同步（清空现有数据）')
    parser.add_argument('--incremental', action='store_true', help='执行增量同步（保留现有数据）')
    parser.add_argument('--tables', nargs='+', choices=['stores', 'products', 'orders', 'order_items', 'customers'], 
                       help='指定要同步的表（默认同步所有表）')
    
    args = parser.parse_args()
    
    # 确定同步模式
    if args.full:
        sync_mode = 'full'
        logger.info("🔄 执行全量同步模式")
    elif args.incremental:
        sync_mode = 'incremental'
        logger.info("🔄 执行增量同步模式")
    else:
        sync_mode = 'full'  # 默认全量同步
        logger.info("🔄 执行全量同步模式（默认）")
    
    # 确定要同步的表
    if args.tables:
        tables_to_sync = args.tables
        logger.info(f"📋 指定同步表: {', '.join(tables_to_sync)}")
    else:
        tables_to_sync = ['stores', 'products', 'orders', 'order_items', 'customers']
        logger.info("📋 同步所有表")
    
    logger.info("🚀 开始完整数据同步...")
    logger.info("=" * 60)
    logger.info(f"开始时间: {datetime.now()}")
    logger.info(f"同步模式: {sync_mode}")
    logger.info(f"同步表: {', '.join(tables_to_sync)}")
    logger.info("")
    
    # 获取数据库连接
    conn = get_connection('hotdog2030')
    if not conn:
        logger.error("❌ 无法连接到hotdog2030数据库，退出")
        sys.exit(1)
    
    try:
        # 执行同步
        results = {}
        
        if 'stores' in tables_to_sync:
            results['stores'] = sync_stores(conn, sync_mode == 'full')
        
        if 'products' in tables_to_sync:
            results['products'] = sync_products(conn, sync_mode == 'full')
        
        if 'orders' in tables_to_sync:
            results['orders'] = sync_orders(conn, sync_mode == 'full')
        
        if 'order_items' in tables_to_sync:
            results['order_items'] = sync_order_items(conn, sync_mode == 'full')
        
        if 'customers' in tables_to_sync:
            results['customers'] = sync_customers(conn, sync_mode == 'full')
        
        # 获取最终统计
        logger.info("")
        logger.info("📈 最终数据统计")
        logger.info("-" * 30)
        final_stats = get_data_statistics(conn)
        
        # 输出同步结果
        logger.info("")
        logger.info("🎉 数据同步完成！")
        logger.info("=" * 60)
        logger.info(f"结束时间: {datetime.now()}")
        logger.info("")
        logger.info("📊 同步结果:")
        for table, count in results.items():
            logger.info(f"  {table}: {count} 条记录")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 同步过程中发生错误: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    main()
