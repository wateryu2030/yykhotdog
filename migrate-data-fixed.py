#!/usr/bin/env python3
"""
修复版数据迁移脚本 - 从cyrg2025和cyrgweixin迁移到hotdog2030
修复了列名映射、IDENTITY列插入等问题
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 本地SQL Server连接配置
SERVER = "localhost,1433"
USERNAME = "sa"
PASSWORD = "YourStrong@Passw0rd"
DRIVER = "ODBC Driver 18 for SQL Server"

def get_connection():
    """获取数据库连接"""
    try:
        connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        return conn
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        return None

def check_database_access(conn, database_name):
    """检查数据库访问权限"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"USE [{database_name}]")
        cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
        table_count = cursor.fetchone()[0]
        logger.info(f"✅ {database_name}: 可访问，包含 {table_count} 个表")
        return True
    except Exception as e:
        logger.warning(f"❌ {database_name}: 不可访问 - {e}")
        return False

def migrate_customer_profiles(conn):
    """迁移客户档案数据"""
    logger.info("🔄 开始迁移客户档案数据...")
    
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025的Orders表分析客户数据
        cursor.execute("USE [cyrg2025]")
        
        # 查询客户基础信息
        customer_query = """
        SELECT 
            COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
            o.openId as open_id,
            NULL as vip_num,
            NULL as phone,
            NULL as nickname,
            NULL as gender,
            NULL as age_group,
            NULL as city,
            NULL as district,
            MIN(CAST(o.recordTime AS DATE)) as first_order_date,
            MAX(CAST(o.recordTime AS DATE)) as last_order_date,
            COUNT(DISTINCT o.id) as total_orders,
            SUM(ISNULL(o.total, 0)) as total_spend,
            AVG(ISNULL(o.total, 0)) as avg_order_amount,
            NULL as order_frequency,
            SUM(ISNULL(o.total, 0)) as customer_lifetime_value,
            NULL as rfm_score,
            NULL as customer_segment,
            s.ShopName as shop_name
        FROM Orders o
        LEFT JOIN Shop s ON o.shopId = s.Id
        WHERE (o.delflag = 0 OR o.delflag IS NULL)
          AND o.recordTime IS NOT NULL
        GROUP BY o.openId, o.id, s.ShopName
        HAVING COUNT(DISTINCT o.id) > 0
        """
        
        cursor.execute(customer_query)
        customers = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(customers)} 个客户记录")
        
        # 插入到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        insert_query = """
        INSERT INTO customer_profiles 
        (customer_id, open_id, vip_num, phone, nickname, gender, age_group, city, district,
         first_order_date, last_order_date, total_orders, total_spend, avg_order_amount,
         order_frequency, customer_lifetime_value, rfm_score, customer_segment, shop_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        for customer in customers:
            try:
                # 计算客户分段
                customer_segment = calculate_customer_segment(
                    customer[9],  # last_order_date
                    customer[11], # total_orders
                    customer[12]  # total_spend
                )
                
                # 更新客户分段
                customer_data = list(customer)
                customer_data[17] = customer_segment  # customer_segment
                
                cursor.execute(insert_query, customer_data)
                success_count += 1
            except Exception as e:
                logger.warning(f"插入客户数据失败: {e}")
                continue
        
        logger.info(f"✅ 成功迁移 {success_count} 个客户档案")
        return True
        
    except Exception as e:
        logger.error(f"迁移客户档案数据失败: {e}")
        return False

def calculate_customer_segment(last_order_date, total_orders, total_spend):
    """计算客户分段"""
    if not last_order_date or not total_orders or not total_spend:
        return "新客户"
    
    # 简单的分段逻辑
    if total_spend >= 1000 and total_orders >= 10:
        return "VIP客户"
    elif total_spend >= 500 and total_orders >= 5:
        return "忠实客户"
    elif total_spend >= 100 and total_orders >= 2:
        return "活跃客户"
    else:
        return "流失客户"

def migrate_stores(conn):
    """迁移门店数据 - 修复版"""
    logger.info("🔄 开始迁移门店数据...")
    
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025的Shop表迁移门店数据
        cursor.execute("USE [cyrg2025]")
        
        # 先检查Shop表的结构
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Shop' 
            ORDER BY ORDINAL_POSITION
        """)
        columns = [row[0] for row in cursor.fetchall()]
        logger.info(f"📋 Shop表包含列: {', '.join(columns)}")
        
        # 修复的查询 - 移除不存在的列
        shop_query = """
        SELECT 
            Id as store_code,
            ShopName as store_name,
            '直营店' as store_type,
            CASE 
                WHEN isUse = 1 THEN '营业中'
                WHEN isClose = 1 THEN '已关闭'
                ELSE '暂停营业'
            END as status,
            ISNULL(province, '') as province,
            ISNULL(city, '') as city,
            ISNULL(district, '') as district,
            ISNULL(ShopAddress, '') as address,
            CASE 
                WHEN location IS NOT NULL AND location != '' 
                THEN TRY_CAST(SUBSTRING(location, 1, CHARINDEX(',', location) - 1) AS DECIMAL(10,7))
                ELSE 0
            END as longitude,
            CASE 
                WHEN location IS NOT NULL AND location != '' 
                THEN TRY_CAST(SUBSTRING(location, CHARINDEX(',', location) + 1, LEN(location)) AS DECIMAL(10,7))
                ELSE 0
            END as latitude,
            NULL as area_size,
            NULL as rent_amount,  -- 移除不存在的rent列
            NULL as investment_amount,
            NULL as expected_revenue,
            Director,
            DirectorPhone,
            NULL as morning_time,  -- 移除不存在的列
            NULL as night_time,
            NULL as passenger_flow,
            NULL as establish_time,
            NULL as opening_time,
            CASE WHEN IsSelf = 1 THEN 1 ELSE 0 END as is_self,
            CASE WHEN isClose = 1 THEN 1 ELSE 0 END as is_close
        FROM Shop
        WHERE (delflag = 0 OR delflag IS NULL)
        """
        
        cursor.execute(shop_query)
        shops = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(shops)} 个门店记录")
        
        # 插入到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        insert_query = """
        INSERT INTO stores 
        (store_code, store_name, store_type, status, province, city, district, address,
         longitude, latitude, area_size, rent_amount, investment_amount, expected_revenue,
         director, director_phone, morning_time, night_time, passenger_flow,
         establish_time, opening_time, is_self, is_close)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        for shop in shops:
            try:
                cursor.execute(insert_query, shop)
                success_count += 1
            except Exception as e:
                logger.warning(f"插入门店数据失败: {e}")
                continue
        
        logger.info(f"✅ 成功迁移 {success_count} 个门店")
        return True
        
    except Exception as e:
        logger.error(f"迁移门店数据失败: {e}")
        return False

def migrate_products(conn):
    """迁移商品数据 - 修复版"""
    logger.info("🔄 开始迁移商品数据...")
    
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025的Goods和Category表迁移商品数据
        cursor.execute("USE [cyrg2025]")
        
        # 先迁移分类 - 使用IDENTITY_INSERT
        category_query = """
        SELECT DISTINCT 
            c.id,
            c.catName,
            NULL as parent_id,
            NULL as description,
            NULL as sort_order
        FROM Category c
        WHERE (c.delflag = 0 OR c.delflag IS NULL)
        """
        
        cursor.execute(category_query)
        categories = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(categories)} 个分类记录")
        
        # 插入分类到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        # 启用IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT categories ON")
        
        category_insert = """
        INSERT INTO categories (id, name, parent_id, description, sort_order)
        VALUES (?, ?, ?, ?, ?)
        """
        
        category_success = 0
        for category in categories:
            try:
                cursor.execute(category_insert, category)
                category_success += 1
            except Exception as e:
                logger.warning(f"插入分类数据失败: {e}")
                continue
        
        # 关闭IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT categories OFF")
        
        logger.info(f"✅ 成功迁移 {category_success} 个分类")
        
        # 迁移商品
        cursor.execute("USE [cyrg2025]")
        
        goods_query = """
        SELECT 
            g.id,
            g.goodsName,
            g.categoryId,
            ISNULL(g.goodsPrice, 0) as price,
            ISNULL(g.goodsDesc, '') as description,
            NULL as sku,
            NULL as barcode,
            NULL as unit,
            NULL as weight,
            NULL as volume,
            NULL as image_url,
            NULL as status,
            NULL as sort_order
        FROM Goods g
        WHERE (g.delflag = 0 OR g.delflag IS NULL)
        """
        
        cursor.execute(goods_query)
        goods = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(goods)} 个商品记录")
        
        # 插入商品到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        # 启用IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT products ON")
        
        goods_insert = """
        INSERT INTO products (id, name, category_id, price, description, sku, barcode, unit, weight, volume, image_url, status, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        goods_success = 0
        for good in goods:
            try:
                cursor.execute(goods_insert, good)
                goods_success += 1
            except Exception as e:
                logger.warning(f"插入商品数据失败: {e}")
                continue
        
        # 关闭IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT products OFF")
        
        logger.info(f"✅ 成功迁移 {category_success} 个分类和 {goods_success} 个商品")
        return True
        
    except Exception as e:
        logger.error(f"迁移商品数据失败: {e}")
        return False

def migrate_orders(conn):
    """迁移订单数据 - 修复版"""
    logger.info("🔄 开始迁移订单数据...")
    
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025的Orders和OrderGoods表迁移订单数据
        cursor.execute("USE [cyrg2025]")
        
        # 迁移订单主表
        order_query = """
        SELECT 
            o.id,
            CONCAT('ORD_', o.id) as order_no,
            COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
            o.shopId as store_id,
            o.recordTime as order_date,
            ISNULL(o.total, 0) as total_amount,
            o.payState as pay_state,
            o.state as order_state,
            NULL as payment_method,
            o.remark
        FROM Orders o
        WHERE (o.delflag = 0 OR o.delflag IS NULL)
          AND o.recordTime IS NOT NULL
        """
        
        cursor.execute(order_query)
        orders = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(orders)} 个订单记录")
        
        # 插入订单到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        # 启用IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT orders ON")
        
        order_insert = """
        INSERT INTO orders (id, order_no, customer_id, store_id, order_date, total_amount, 
                           pay_state, order_state, payment_method, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        order_success = 0
        for order in orders:
            try:
                cursor.execute(order_insert, order)
                order_success += 1
            except Exception as e:
                logger.warning(f"插入订单数据失败: {e}")
                continue
        
        # 关闭IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT orders OFF")
        
        # 迁移订单商品明细
        cursor.execute("USE [cyrg2025]")
        
        order_item_query = """
        SELECT 
            og.orderId as order_id,
            og.goodsId as product_id,
            og.goodsNumber as quantity,
            og.goodsPrice as price,
            og.goodsNumber * og.goodsPrice as total_price
        FROM OrderGoods og
        INNER JOIN Orders o ON og.orderId = o.id
        WHERE (o.delflag = 0 OR o.delflag IS NULL)
          AND (og.delflag = 0 OR og.delflag IS NULL)
        """
        
        cursor.execute(order_item_query)
        order_items = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(order_items)} 个订单商品记录")
        
        # 插入订单商品到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        order_item_insert = """
        INSERT INTO order_items (order_id, product_id, quantity, price, total_price)
        VALUES (?, ?, ?, ?, ?)
        """
        
        item_success = 0
        for item in order_items:
            try:
                cursor.execute(order_item_insert, item)
                item_success += 1
            except Exception as e:
                logger.warning(f"插入订单商品数据失败: {e}")
                continue
        
        logger.info(f"✅ 成功迁移 {order_success} 个订单和 {item_success} 个订单商品")
        return True
        
    except Exception as e:
        logger.error(f"迁移订单数据失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("🚀 修复版数据迁移脚本 - 从cyrg2025和cyrgweixin迁移到hotdog2030")
    logger.info("=" * 60)
    
    # 连接数据库
    logger.info("1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    logger.info("✅ 数据库连接成功")
    
    # 检查源数据库状态
    logger.info("2️⃣ 检查源数据库状态...")
    cyrg2025_ok = check_database_access(conn, "cyrg2025")
    cyrgweixin_ok = check_database_access(conn, "cyrgweixin")
    hotdog2030_ok = check_database_access(conn, "hotdog2030")
    
    if not (cyrg2025_ok and cyrgweixin_ok and hotdog2030_ok):
        logger.error("❌ 数据库访问检查失败")
        return False
    
    # 开始数据迁移
    logger.info("3️⃣ 开始数据迁移...")
    
    # 迁移结果统计
    migration_results = {}
    
    # 1. 迁移客户档案数据
    migration_results["客户档案"] = migrate_customer_profiles(conn)
    
    # 2. 迁移门店数据
    migration_results["门店数据"] = migrate_stores(conn)
    
    # 3. 迁移商品数据
    migration_results["商品数据"] = migrate_products(conn)
    
    # 4. 迁移订单数据
    migration_results["订单数据"] = migrate_orders(conn)
    
    # 输出迁移结果
    logger.info("4️⃣ 迁移结果:")
    logger.info("-" * 40)
    success_count = 0
    for item, success in migration_results.items():
        status = "✅ 成功" if success else "❌ 失败"
        logger.info(f"{item}: {status}")
        if success:
            success_count += 1
    
    logger.info("-" * 40)
    logger.info(f"总计: {success_count}/{len(migration_results)} 项迁移成功")
    
    if success_count < len(migration_results):
        logger.warning("⚠️  部分数据迁移失败，请检查日志")
    else:
        logger.info("🎉 所有数据迁移完成！")
    
    # 关闭连接
    conn.close()
    
    return success_count == len(migration_results)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
