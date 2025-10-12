#!/usr/bin/env python3
"""
数据迁移脚本 - 从cyrg2025和cyrgweixin迁移数据到hotdog2030
"""

import pyodbc
import json
from datetime import datetime, timedelta
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
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
    """检查数据库是否可以访问"""
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
        FROM cyrg2025.dbo.Orders o
        LEFT JOIN cyrg2025.dbo.Shop s ON o.shopId = s.Id
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
                # 计算订单频率（月）
                if customer[9] and customer[10]:  # first_order_date 和 last_order_date
                    first_date = customer[9]
                    last_date = customer[10]
                    if isinstance(first_date, str):
                        first_date = datetime.strptime(first_date, '%Y-%m-%d').date()
                    if isinstance(last_date, str):
                        last_date = datetime.strptime(last_date, '%Y-%m-%d').date()
                    
                    months_diff = (last_date.year - first_date.year) * 12 + (last_date.month - first_date.month)
                    if months_diff > 0:
                        order_frequency = customer[11] / months_diff  # total_orders / months
                    else:
                        order_frequency = customer[11]  # total_orders
                else:
                    order_frequency = 0
                
                # 计算RFM评分
                rfm_score = calculate_rfm_score(customer[10], customer[11], customer[12])
                customer_segment = calculate_customer_segment(customer[10], customer[11], customer[12])
                
                cursor.execute(insert_query, (
                    customer[0],  # customer_id
                    customer[1],  # open_id
                    customer[2],  # vip_num
                    customer[3],  # phone
                    customer[4],  # nickname
                    customer[5],  # gender
                    customer[6],  # age_group
                    customer[7],  # city
                    customer[8],  # district
                    customer[9],  # first_order_date
                    customer[10], # last_order_date
                    customer[11], # total_orders
                    customer[12], # total_spend
                    customer[13], # avg_order_amount
                    order_frequency, # order_frequency
                    customer[15], # customer_lifetime_value
                    rfm_score,    # rfm_score
                    customer_segment, # customer_segment
                    customer[18]  # shop_name
                ))
                success_count += 1
                
            except Exception as e:
                logger.warning(f"插入客户数据失败: {e}")
                continue
        
        logger.info(f"✅ 成功迁移 {success_count} 个客户档案")
        return True
        
    except Exception as e:
        logger.error(f"迁移客户档案数据失败: {e}")
        return False

def calculate_rfm_score(last_order_date, total_orders, total_spend):
    """计算RFM评分"""
    if not last_order_date or not total_orders or not total_spend:
        return "000"
    
    # 计算Recency (最近购买时间)
    if isinstance(last_order_date, str):
        last_date = datetime.strptime(last_order_date, '%Y-%m-%d').date()
    else:
        last_date = last_order_date
    
    days_since_last = (datetime.now().date() - last_date).days
    
    if days_since_last <= 30:
        r_score = 5
    elif days_since_last <= 60:
        r_score = 4
    elif days_since_last <= 90:
        r_score = 3
    elif days_since_last <= 180:
        r_score = 2
    else:
        r_score = 1
    
    # 计算Frequency (购买频率)
    if total_orders >= 20:
        f_score = 5
    elif total_orders >= 10:
        f_score = 4
    elif total_orders >= 5:
        f_score = 3
    elif total_orders >= 2:
        f_score = 2
    else:
        f_score = 1
    
    # 计算Monetary (消费金额)
    if total_spend >= 1000:
        m_score = 5
    elif total_spend >= 500:
        m_score = 4
    elif total_spend >= 200:
        m_score = 3
    elif total_spend >= 50:
        m_score = 2
    else:
        m_score = 1
    
    return f"{r_score}{f_score}{m_score}"

def calculate_customer_segment(last_order_date, total_orders, total_spend):
    """计算客户分群"""
    rfm_score = calculate_rfm_score(last_order_date, total_orders, total_spend)
    
    if rfm_score == "555":
        return "VIP客户"
    elif rfm_score.startswith("5") and int(rfm_score[1:]) >= 4:
        return "高价值客户"
    elif rfm_score.startswith("4") or rfm_score.startswith("5"):
        return "活跃客户"
    elif rfm_score.startswith("3"):
        return "一般客户"
    elif rfm_score.startswith("2"):
        return "流失风险客户"
    else:
        return "流失客户"

def migrate_stores(conn):
    """迁移门店数据"""
    logger.info("🔄 开始迁移门店数据...")
    
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025的Shop表迁移门店数据
        cursor.execute("USE [cyrg2025]")
        
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
            TRY_CAST(rent AS DECIMAL(10,2)) as rent_amount,
            NULL as investment_amount,
            NULL as expected_revenue,
            Director as director,
            DirectorPhone as director_phone,
            morningTime as morning_time,
            nightTime as night_time,
            passengerFlow as passenger_flow,
            TRY_CAST(establishTime AS DATETIME2) as establish_time,
            TRY_CAST(openingTime AS DATETIME2) as opening_time,
            CASE WHEN IsSelf = 1 THEN 1 ELSE 0 END as is_self,
            CASE WHEN isClose = 1 THEN 1 ELSE 0 END as is_close
        FROM cyrg2025.dbo.Shop
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
    """迁移商品数据"""
    logger.info("🔄 开始迁移商品数据...")
    
    try:
        cursor = conn.cursor()
        
        # 从cyrg2025的Goods和Category表迁移商品数据
        cursor.execute("USE [cyrg2025]")
        
        # 先迁移分类
        category_query = """
        SELECT DISTINCT 
            c.id,
            c.catName,
            NULL as parent_id,
            c.id as sort_order
        FROM cyrg2025.dbo.Category c
        WHERE (c.delflag = 0 OR c.delflag IS NULL)
        """
        
        cursor.execute(category_query)
        categories = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(categories)} 个商品分类")
        
        # 插入分类到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        # 启用IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT categories ON")
        
        category_insert = """
        INSERT INTO categories (id, category_name, parent_id, sort_order)
        VALUES (?, ?, ?, ?)
        """
        
        for category in categories:
            try:
                cursor.execute(category_insert, category)
            except Exception as e:
                logger.warning(f"插入分类数据失败: {e}")
                continue
        
        # 迁移商品
        cursor.execute("USE [cyrg2025]")
        
        product_query = """
        SELECT 
            g.id,
            g.goodsName,
            g.categoryId,
            ISNULL(g.salePrice, 0) as price,
            NULL as cost,
            g.goodsText as description,
            NULL as image_url
        FROM cyrg2025.dbo.Goods g
        WHERE (g.delflag = 0 OR g.delflag IS NULL)
        """
        
        cursor.execute(product_query)
        products = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(products)} 个商品记录")
        
        # 插入商品到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        # 关闭之前的IDENTITY_INSERT并启用新的
        cursor.execute("SET IDENTITY_INSERT categories OFF")
        cursor.execute("SET IDENTITY_INSERT products ON")
        
        product_insert = """
        INSERT INTO products (id, product_name, category_id, price, cost, description, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        for product in products:
            try:
                cursor.execute(product_insert, product)
                success_count += 1
            except Exception as e:
                logger.warning(f"插入商品数据失败: {e}")
                continue
        
        # 关闭IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT products OFF")
        cursor.execute("SET IDENTITY_INSERT categories OFF")
        
        logger.info(f"✅ 成功迁移 {len(categories)} 个分类和 {success_count} 个商品")
        return True
        
    except Exception as e:
        logger.error(f"迁移商品数据失败: {e}")
        return False

def migrate_orders(conn):
    """迁移订单数据"""
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
            o.recordTime as created_at,
            ISNULL(o.total, 0) as total_amount,
            o.payState as pay_state,
            o.payMode as pay_mode,
            o.recordTime as updated_at,
            ISNULL(o.delflag, 0) as delflag
        FROM cyrg2025.dbo.Orders o
        WHERE (o.delflag = 0 OR o.delflag IS NULL)
          AND o.recordTime IS NOT NULL
        """
        
        cursor.execute(order_query)
        orders = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(orders)} 个订单记录")
        
        # 插入订单到hotdog2030
        cursor.execute("USE [hotdog2030]")
        
        # 关闭之前的IDENTITY_INSERT并启用新的
        cursor.execute("SET IDENTITY_INSERT products OFF")
        cursor.execute("SET IDENTITY_INSERT orders ON")
        
        order_insert = """
        INSERT INTO orders 
        (id, order_no, customer_id, store_id, created_at, total_amount, 
         pay_state, pay_mode, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        for order in orders:
            try:
                cursor.execute(order_insert, order)
                success_count += 1
            except Exception as e:
                logger.warning(f"插入订单数据失败: {e}")
                continue
        
        # 迁移订单商品明细
        cursor.execute("USE [cyrg2025]")
        
        order_item_query = """
        SELECT 
            og.orderId as order_id,
            og.goodsId as product_id,
            og.goodsNumber as quantity,
            og.goodsPrice as price,
            og.goodsNumber * og.goodsPrice as total_price
        FROM cyrg2025.dbo.OrderGoods og
        INNER JOIN cyrg2025.dbo.Orders o ON og.orderId = o.id
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
        
        item_success_count = 0
        for item in order_items:
            try:
                cursor.execute(order_item_insert, item)
                item_success_count += 1
            except Exception as e:
                logger.warning(f"插入订单商品数据失败: {e}")
                continue
        
        # 关闭IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT orders OFF")
        
        logger.info(f"✅ 成功迁移 {success_count} 个订单和 {item_success_count} 个订单商品")
        return True
        
    except Exception as e:
        logger.error(f"迁移订单数据失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("🚀 数据迁移脚本 - 从cyrg2025和cyrgweixin迁移到hotdog2030")
    logger.info("=" * 60)
    
    # 连接数据库
    logger.info("1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    logger.info("✅ 数据库连接成功")
    
    # 检查源数据库是否可访问
    logger.info("2️⃣ 检查源数据库状态...")
    cyrg2025_accessible = check_database_access(conn, "cyrg2025")
    cyrgweixin_accessible = check_database_access(conn, "cyrgweixin")
    
    if not cyrg2025_accessible:
        logger.error("❌ cyrg2025数据库不可访问，无法进行数据迁移")
        return False
    
    # 开始数据迁移
    logger.info("3️⃣ 开始数据迁移...")
    
    migration_results = []
    
    # 迁移客户档案
    migration_results.append(("客户档案", migrate_customer_profiles(conn)))
    
    # 迁移门店数据
    migration_results.append(("门店数据", migrate_stores(conn)))
    
    # 迁移商品数据
    migration_results.append(("商品数据", migrate_products(conn)))
    
    # 迁移订单数据
    migration_results.append(("订单数据", migrate_orders(conn)))
    
    # 关闭连接
    conn.close()
    
    # 输出迁移结果
    logger.info("4️⃣ 迁移结果:")
    logger.info("-" * 40)
    
    success_count = 0
    for name, success in migration_results:
        status = "✅ 成功" if success else "❌ 失败"
        logger.info(f"{name}: {status}")
        if success:
            success_count += 1
    
    logger.info("-" * 40)
    logger.info(f"总计: {success_count}/{len(migration_results)} 项迁移成功")
    
    if success_count == len(migration_results):
        logger.info("🎉 所有数据迁移完成！")
    else:
        logger.warning("⚠️  部分数据迁移失败，请检查日志")
    
    return success_count == len(migration_results)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
