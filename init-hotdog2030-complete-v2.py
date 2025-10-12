#!/usr/bin/env python3
"""
完整的hotdog2030数据库初始化脚本
包含所有修复逻辑，避免反复调试

执行顺序：
1. 恢复cyrg2025和cyrgweixin数据库（从.bak文件）
2. 初始化hotdog2030数据库结构
3. 迁移数据并应用所有修复
4. 验证数据完整性
"""

import pyodbc
import logging
from datetime import datetime
import time

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'init_hotdog2030_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 数据库配置
SERVER = "localhost,1433"
USERNAME = "sa"
PASSWORD = "YourStrong@Passw0rd"
DRIVER = "ODBC Driver 18 for SQL Server"

def get_connection(database=None):
    """获取数据库连接"""
    try:
        if database:
            connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};DATABASE={database};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        else:
            connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        return conn
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        return None

def step1_verify_source_databases(conn):
    """步骤1: 验证源数据库是否存在且可访问"""
    logger.info("=" * 80)
    logger.info("步骤1: 验证源数据库")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    databases_to_check = ['cyrg2025', 'cyrgweixin']
    all_ok = True
    
    for db_name in databases_to_check:
        try:
            cursor.execute(f"USE [{db_name}]")
            cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
            table_count = cursor.fetchone()[0]
            logger.info(f"✅ {db_name}: 包含 {table_count} 个表")
        except Exception as e:
            logger.error(f"❌ {db_name}: 不可访问 - {e}")
            logger.error(f"   请先恢复数据库备份文件")
            all_ok = False
    
    return all_ok

def step2_init_hotdog2030_structure(conn):
    """步骤2: 初始化hotdog2030数据库结构"""
    logger.info("=" * 80)
    logger.info("步骤2: 初始化hotdog2030数据库结构")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    
    # 重新创建hotdog2030数据库
    try:
        cursor.execute("USE master")
        cursor.execute("IF EXISTS (SELECT * FROM sys.databases WHERE name = 'hotdog2030') DROP DATABASE hotdog2030")
        cursor.execute("CREATE DATABASE hotdog2030")
        logger.info("✅ hotdog2030数据库已创建")
    except Exception as e:
        logger.error(f"❌ 创建数据库失败: {e}")
        return False
    
    cursor.execute("USE hotdog2030")
    
    # 创建所有表（包含所有字段和修复）
    tables_sql = """
    -- 1. city表（城市信息）
    CREATE TABLE city (
        id INT IDENTITY(1,1) PRIMARY KEY,
        city_name NVARCHAR(100) NOT NULL,
        province NVARCHAR(100),
        region NVARCHAR(100),
        city_code NVARCHAR(50),
        province_code NVARCHAR(50),
        delflag BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    -- 2. region_hierarchy表（地区层级）
    CREATE TABLE region_hierarchy (
        id INT IDENTITY(1,1) PRIMARY KEY,
        code NVARCHAR(50) NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        level INT NOT NULL,
        parent_code NVARCHAR(50),
        sort_order INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    -- 3. stores表（门店信息 - 基于cyrg2025.Shop表）
    CREATE TABLE stores (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        store_code NVARCHAR(50) NOT NULL,
        store_name NVARCHAR(200) NOT NULL,
        store_address NVARCHAR(500),
        store_type NVARCHAR(50),
        status NVARCHAR(50) DEFAULT N'营业中',
        state TINYINT,  -- 0已开业 1招商中 2筹备中
        is_use BIT DEFAULT 1,  -- 0:可用 1:禁用
        blurb NVARCHAR(1000),  -- 简介
        province NVARCHAR(100),
        city NVARCHAR(100),
        district NVARCHAR(100),
        address NVARCHAR(500),
        location NVARCHAR(100),  -- 坐标
        longitude DECIMAL(10, 6),
        latitude DECIMAL(10, 6),
        area_size DECIMAL(10, 2),
        rent_amount DECIMAL(18, 2),
        investment_amount DECIMAL(18, 2),
        expected_revenue DECIMAL(18, 2),
        director NVARCHAR(100),
        director_phone NVARCHAR(50),
        morning_time NVARCHAR(50),
        night_time NVARCHAR(50),
        morning_time1 NVARCHAR(50),
        night_time1 NVARCHAR(50),
        morning_time2 NVARCHAR(50),
        night_time2 NVARCHAR(50),
        passenger_flow INT,  -- 客流量
        interval_minutes INT,  -- 营业时间间隔//分钟
        establish_time DATETIME2,
        opening_time DATETIME2,
        is_self BIT DEFAULT 0,  -- 是否是自营: 0不是 1是
        is_close BIT DEFAULT 0,  -- 明日预定: 0:是 1:否
        enter_priseld BIGINT,  -- 单位ID
        merchant_id NVARCHAR(100),  -- 联动惠商门店编号
        meituan_id NVARCHAR(100),
        elemeld NVARCHAR(100),
        douyin_id NVARCHAR(100),
        meituantuangould NVARCHAR(100),
        is_settlement BIT DEFAULT 0,
        settlement_rate DECIMAL(5, 4),
        rent DECIMAL(18, 2),
        pos_img NVARCHAR(500),  -- 菜牌url
        pos_img_name NVARCHAR(200),  -- 菜牌图片名称带扩展名
        first_img NVARCHAR(500),  -- 首图
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    
    -- 4. orders表（订单信息 - 基于cyrg2025.Orders表）
    CREATE TABLE orders (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        order_no NVARCHAR(100) NOT NULL,
        customer_id NVARCHAR(100),
        store_id BIGINT,
        order_date DATETIME2 NOT NULL,
        total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
        pay_state TINYINT DEFAULT 0,
        order_state TINYINT DEFAULT 0,
        payment_method NVARCHAR(50),
        remark NVARCHAR(500),
        created_at DATETIME2,  -- 不使用默认值，从order_date复制
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0,
        -- 详细支付字段
        pay_type NVARCHAR(50),  -- 支付类别
        pay_way NVARCHAR(50),   -- 支付方式
        pay_mode NVARCHAR(50),  -- 类别(小程序/收银机/赠送/外卖/团购)
        app_id NVARCHAR(100),   -- APPID
        open_id NVARCHAR(100),  -- openId
        prepay_id NVARCHAR(100), -- 微信签名
        time_stamp_str NVARCHAR(100),
        nonce_str NVARCHAR(100),
        transaction_id NVARCHAR(100), -- 微信订单ID
        success_time DATETIME2, -- 微信返回成功时间
        refund_money DECIMAL(18, 2) DEFAULT 0,
        refund_time DATETIME2,
        order_score INT DEFAULT 0,  -- 所得积分
        use_score INT DEFAULT 0,    -- 使用积分
        order_remarks NVARCHAR(500), -- 备注
        order_key NVARCHAR(100),    -- 订单Key
        order_value DECIMAL(18, 2), -- 订单总值
        complete_time DATETIME2,    -- 完成时间
        moling_amount DECIMAL(18, 2) DEFAULT 0, -- 抹零金额
        cash DECIMAL(18, 2) DEFAULT 0,
        vip_amount DECIMAL(18, 2) DEFAULT 0,
        vip_amount_zengsong DECIMAL(18, 2) DEFAULT 0,
        card_amount DECIMAL(18, 2) DEFAULT 0,
        card_zengsong DECIMAL(18, 2) DEFAULT 0,
        rolls_real_income_amount DECIMAL(18, 2) DEFAULT 0,
        -- 配送相关
        deliver_type TINYINT DEFAULT 0, -- 收货方式0自取,1配送
        deliver_name NVARCHAR(100),     -- 收货姓名
        deliver_tel NVARCHAR(50),       -- 收货电话
        deliver_address NVARCHAR(500),  -- 收货地址
        send_no NVARCHAR(100),          -- 发货订单
        send_express NVARCHAR(100),     -- 发货快递
        take_foods_time DATETIME2,      -- 取餐时间
        takeout_name NVARCHAR(100),
        -- 会员相关
        vip_id BIGINT,              -- 会员ID
        vip_tel NVARCHAR(50),       -- 会员手机号码
        card_id BIGINT,             -- 会员充值id
        -- 优惠相关
        coupon_user_id BIGINT,      -- 优惠卷ID
        coupon_amount DECIMAL(18, 2) DEFAULT 0, -- 优惠卷金额
        discount DECIMAL(5, 4) DEFAULT 1,       -- 折扣系数
        discount_amount DECIMAL(18, 2) DEFAULT 0, -- 折扣优惠金额
        -- 团购相关
        rolls_name NVARCHAR(200),   -- 团购优惠卷的名称(抖音,美团,饿了么)
        rolls_value DECIMAL(18, 2) DEFAULT 0, -- 团购使用优惠卷的金额
        group_purchase TINYINT DEFAULT 0,
        -- 操作相关
        del_state TINYINT DEFAULT 0,    -- 取消状态
        del_time DATETIME2,             -- 取消时间
        mess_info_state TINYINT DEFAULT 0, -- 信息提示状态
        client_user_id BIGINT,          -- 操作员ID
        day_number INT,
        is_print BIT DEFAULT 0,         -- 是打印
        print_time DATETIME2,           -- 打印时间
        cost_price DECIMAL(18, 2),      -- 成本价
        profit_price DECIMAL(18, 2),    -- 利润价
        import_data BIT DEFAULT 0,
        import_takeout BIT DEFAULT 0,
        import_user_amount DECIMAL(18, 2) DEFAULT 0
    );
    
    -- 5. order_items表（订单商品明细）
    CREATE TABLE order_items (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        order_id BIGINT NOT NULL,
        product_id BIGINT,
        product_name NVARCHAR(200) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        price DECIMAL(18, 2) NOT NULL DEFAULT 0,
        total_price DECIMAL(18, 2) NOT NULL DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    
    -- 6. products表（商品信息 - 基于cyrg2025.goods表）
    CREATE TABLE products (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        product_code NVARCHAR(50),
        product_name NVARCHAR(200) NOT NULL,
        category_id BIGINT,
        category_name NVARCHAR(100),
        market_price DECIMAL(18, 2),
        sale_price DECIMAL(18, 2),
        cost_price DECIMAL(18, 2),
        goods_stock INT DEFAULT 0,
        goods_img NVARCHAR(500),
        goods_text NVARCHAR(1000),
        is_sale BIT DEFAULT 1,
        is_hot BIT DEFAULT 0,
        is_recommended BIT DEFAULT 0,
        is_package BIT DEFAULT 0,
        is_sub_material BIT DEFAULT 0,
        is_mini_program BIT DEFAULT 0,
        group_purchase TINYINT DEFAULT 0,
        is_new_product BIT DEFAULT 0,
        goods_sort INT DEFAULT 0,
        shop_id BIGINT,
        shop_name NVARCHAR(200),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    
    -- 6.1 product_categories表（商品分类）
    CREATE TABLE product_categories (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        category_name NVARCHAR(100) NOT NULL,
        category_code NVARCHAR(50),
        parent_id BIGINT,
        sort_order INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    
    -- 7. customer_profiles表（客户档案 - 基于cyrgweixin.VIP表）
    CREATE TABLE customer_profiles (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        vip_num NVARCHAR(100),
        vip_name NVARCHAR(200),
        vip_tel NVARCHAR(50),
        vip_card NVARCHAR(100),
        vip_password NVARCHAR(100),
        recharge_amount DECIMAL(18, 2) DEFAULT 0,
        gift_amount DECIMAL(18, 2) DEFAULT 0,
        total_balance DECIMAL(18, 2) DEFAULT 0,
        shop_id BIGINT,
        shop_name NVARCHAR(200),
        remarks NVARCHAR(500),
        last_order_date DATETIME2,
        total_orders INT DEFAULT 0,
        total_spend DECIMAL(18, 2) DEFAULT 0,
        avg_order_value DECIMAL(18, 2) DEFAULT 0,
        rfm_score INT DEFAULT 0,
        customer_segment NVARCHAR(50),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    
    -- 8. rg_seek_shop表（意向店铺店址图记）
    CREATE TABLE rg_seek_shop (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        shop_name NVARCHAR(200),
        shop_address NVARCHAR(500),
        location NVARCHAR(100),  -- 坐标
        blurb NVARCHAR(1000),    -- 简介
        record_id BIGINT,        -- 记录ID
        approval_id BIGINT,      -- 审核人
        approval_time DATETIME2, -- 审核时间
        approval_state TINYINT,  -- 审核状态1同意 2 不同意
        approval_remarks NVARCHAR(500), -- 审核备注
        amount DECIMAL(18, 2) DEFAULT 0, -- 奖励金额
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    
    -- 9. site_selection_data表（选址数据）
    CREATE TABLE site_selection_data (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        location_name NVARCHAR(200),
        province NVARCHAR(100),
        city NVARCHAR(100),
        district NVARCHAR(100),
        address NVARCHAR(500),
        longitude DECIMAL(10, 6),
        latitude DECIMAL(10, 6),
        population_density INT,
        student_count INT,
        office_worker_count INT,
        traffic_flow INT,
        competition_count INT,
        rent_estimate DECIMAL(18, 2),
        score DECIMAL(5, 2),
        recommendation_level NVARCHAR(50),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    
    -- 创建索引
    CREATE INDEX idx_stores_city ON stores(city);
    CREATE INDEX idx_stores_status ON stores(status);
    CREATE INDEX idx_orders_store_id ON orders(store_id);
    CREATE INDEX idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX idx_orders_created_at ON orders(created_at);
    CREATE INDEX idx_orders_pay_state ON orders(pay_state);
    CREATE INDEX idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX idx_order_items_product_id ON order_items(product_id);
    CREATE INDEX idx_products_category_id ON products(category_id);
    CREATE INDEX idx_products_shop_id ON products(shop_id);
    CREATE INDEX idx_products_is_sale ON products(is_sale);
    CREATE INDEX idx_customer_profiles_vip_tel ON customer_profiles(vip_tel);
    CREATE INDEX idx_customer_profiles_shop_id ON customer_profiles(shop_id);
    CREATE INDEX idx_orders_pay_mode ON orders(pay_mode);
    CREATE INDEX idx_orders_deliver_type ON orders(deliver_type);
    CREATE INDEX idx_orders_vip_id ON orders(vip_id);
    CREATE INDEX idx_orders_transaction_id ON orders(transaction_id);
    CREATE INDEX idx_stores_state ON stores(state);
    CREATE INDEX idx_stores_merchant_id ON stores(merchant_id);
    CREATE INDEX idx_rg_seek_shop_approval_state ON rg_seek_shop(approval_state);
    """
    
    try:
        for statement in tables_sql.split(';'):
            statement = statement.strip()
            if statement and not statement.startswith('--'):
                cursor.execute(statement)
        logger.info("✅ 数据库表结构创建完成")
        return True
    except Exception as e:
        logger.error(f"❌ 创建表结构失败: {e}")
        return False

def step3_migrate_stores(conn):
    """步骤3: 迁移门店数据"""
    logger.info("=" * 80)
    logger.info("步骤3: 迁移门店数据")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    
    try:
        cursor.execute("USE cyrg2025")
        
        # 查询门店数据
        cursor.execute("""
        SELECT 
            Id,
            ShopName,
            ShopAddress,
            Director,
            DirectorPhone,
            FirstImg,
            location,
            blurb,
            LTRIM(RTRIM(ISNULL(city, ''))) as city,
            LTRIM(RTRIM(ISNULL(district, ''))) as district,
            CAST(longitude AS DECIMAL(10,6)) as longitude,
            CAST(latitude AS DECIMAL(10,6)) as latitude,
            morningTime,
            nightTime,
            morningTime1,
            nightTime1,
            morningTime2,
            nightTime2,
            passengerFlow,
            interval,
            establishTime,
            openingTime,
            IsSelf,
            isClose,
            enterPriseld,
            merchantId,
            meituanId,
            elemeld,
            douyinId,
            meituantuangould,
            isSettlement,
            settlementRate,
            rent,
            posImg,
            posImgName,
            state,
            isUse
        FROM Shop
        WHERE Delflag = 0
        """)
        
        shops = cursor.fetchall()
        logger.info(f"📊 查询到 {len(shops)} 个门店")
        
        cursor.execute("USE hotdog2030")
        cursor.execute("SET IDENTITY_INSERT stores ON")
        
        insert_sql = """
        INSERT INTO stores 
        (id, store_code, store_name, store_address, director, director_phone, first_img,
         location, blurb, city, district, longitude, latitude, morning_time, night_time,
         morning_time1, night_time1, morning_time2, night_time2, passenger_flow,
         interval_minutes, establish_time, opening_time, is_self, is_close, enter_priseld,
         merchant_id, meituan_id, elemeld, douyin_id, meituantuangould, is_settlement,
         settlement_rate, rent, pos_img, pos_img_name, state, is_use, status, province)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, N'营业中', 
                CASE 
                    WHEN ? = N'沈阳市' OR ? = N'辽阳市' THEN N'辽宁省'
                    WHEN ? = N'滨州市' THEN N'山东省'
                    WHEN ? = N'仙桃市' THEN N'湖北省'
                    ELSE N'未知省份'
                END)
        """
        
        success_count = 0
        for shop in shops:
            try:
                (shop_id, name, address, director, phone, first_img, location, blurb, city, district,
                 lng, lat, morning, night, morning1, night1, morning2, night2, flow, interval,
                 est_time, open_time, is_self, is_close, enter_priseld, merchant_id, meituan_id,
                 elemeld, douyin_id, meituantuangould, is_settlement, settlement_rate, rent,
                 pos_img, pos_img_name, state, is_use) = shop
                
                # store_code使用原始ID
                cursor.execute(insert_sql, (
                    shop_id, str(shop_id), name, address, director, phone, first_img, location, blurb,
                    city, district, lng, lat, morning, night, morning1, night1, morning2, night2,
                    flow, interval, est_time, open_time, is_self or 0, is_close or 0, enter_priseld,
                    merchant_id, meituan_id, elemeld, douyin_id, meituantuangould, is_settlement,
                    settlement_rate, rent, pos_img, pos_img_name, state, is_use,
                    city, city, city, city  # 用于CASE语句的province判断
                ))
                success_count += 1
            except Exception as e:
                logger.warning(f"插入门店失败 (ID:{shop_id}): {e}")
        
        cursor.execute("SET IDENTITY_INSERT stores OFF")
        logger.info(f"✅ 成功迁移 {success_count}/{len(shops)} 个门店")
        return True
        
    except Exception as e:
        logger.error(f"❌ 迁移门店数据失败: {e}")
        return False

def step4_populate_city_table(conn):
    """步骤4: 填充city表（从stores提取）"""
    logger.info("=" * 80)
    logger.info("步骤4: 填充city表")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    try:
        insert_sql = """
        INSERT INTO city (city_name, province, delflag, created_at, updated_at)
        SELECT DISTINCT 
            city as city_name,
            CASE 
                WHEN city = N'沈阳市' OR city = N'辽阳市' THEN N'辽宁省'
                WHEN city = N'滨州市' THEN N'山东省'
                WHEN city = N'仙桃市' THEN N'湖北省'
                ELSE N'未知省份'
            END as province,
            0 as delflag,
            GETDATE() as created_at,
            GETDATE() as updated_at
        FROM stores
        WHERE delflag = 0 AND city IS NOT NULL AND city != ''
        """
        
        cursor.execute(insert_sql)
        rows_inserted = cursor.rowcount
        logger.info(f"✅ 成功插入 {rows_inserted} 个城市记录")
        
        # 验证
        cursor.execute("SELECT city_name, province FROM city WHERE delflag = 0 ORDER BY city_name")
        cities = cursor.fetchall()
        logger.info("📍 城市列表:")
        for city_name, province in cities:
            logger.info(f"   - {city_name} ({province})")
        
        return True
    except Exception as e:
        logger.error(f"❌ 填充city表失败: {e}")
        return False

def step5_migrate_orders(conn):
    """步骤5: 迁移订单数据（包含所有支付字段）"""
    logger.info("=" * 80)
    logger.info("步骤5: 迁移订单数据")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    
    try:
        cursor.execute("USE cyrg2025")
        
        # 查询订单数据（包含所有字段）
        order_query = """
        SELECT 
            o.id,
            CONCAT('ORD_', o.id) as order_no,
            COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
            o.shopId as shop_id,
            o.recordTime as order_date,
            o.payState as pay_state,
            o.orderRemarks as remark,
            -- 支付相关字段
            o.payType, o.payWay, o.payMode,
            o.appId, o.openId, o.prepay_id, o.timeStampStr, o.nonceStr,
            o.transaction_id, o.success_time,
            ISNULL(o.cash, 0) as cash,
            ISNULL(o.vipAmount, 0) as vipAmount,
            ISNULL(o.vipAmountZengSong, 0) as vipAmountZengSong,
            ISNULL(o.cardAmount, 0) as cardAmount,
            ISNULL(o.cardZengSong, 0) as cardZengSong,
            ISNULL(o.rollsRealIncomeAmount, 0) as rollsRealIncomeAmount,
            ISNULL(o.refundMoney, 0) as refundMoney,
            ISNULL(o.orderValue, 0) as orderValue,
            ISNULL(o.total, 0) as total,
            -- 积分相关
            o.orderScore, o.useScore,
            -- 订单相关
            o.orderKey, o.completeTime, o.molingAmount,
            -- 配送相关
            o.deliverType, o.deliverName, o.deliverTel, o.deliverAddress,
            o.sendNo, o.sendExpress, o.takeFoodsTime, o.takeoutName,
            -- 会员相关
            o.vipId, o.vipTel, o.cardId,
            -- 优惠相关
            o.couponUserId, o.couponAmount, o.discount, o.discountAmount,
            -- 团购相关
            o.rollsName, o.rollsValue, o.groupPurchase,
            -- 操作相关
            o.delState, o.delTime, o.messInfoState, o.clientUserId,
            o.dayNumber, o.isPrint, o.printTime, o.costPrice, o.profitPrice,
            o.importData, o.importTakeout, o.importUserAmount
        FROM Orders o
        WHERE (o.delflag = 0 OR o.delflag IS NULL)
          AND o.recordTime IS NOT NULL
        ORDER BY o.id
        """
        
        cursor.execute(order_query)
        orders = cursor.fetchall()
        logger.info(f"📊 查询到 {len(orders)} 个订单记录")
        
        # 切换到hotdog2030
        cursor.execute("USE hotdog2030")
        
        # 创建门店ID映射（shopId -> store.id）
        cursor.execute("""
        SELECT id, CAST(store_code AS INT) as original_shop_id 
        FROM stores 
        WHERE delflag = 0
        """)
        shop_id_map = {row[1]: row[0] for row in cursor.fetchall()}
        logger.info(f"📋 创建了 {len(shop_id_map)} 个门店ID映射")
        
        cursor.execute("SET IDENTITY_INSERT orders ON")
        
        insert_sql = """
        INSERT INTO orders 
        (id, order_no, customer_id, store_id, order_date, total_amount,
         pay_state, order_state, payment_method, remark, created_at, updated_at,
         pay_type, pay_way, pay_mode, app_id, open_id, prepay_id, time_stamp_str, nonce_str,
         transaction_id, success_time, refund_money, refund_time, order_score, use_score,
         order_remarks, order_key, order_value, complete_time, moling_amount,
         cash, vip_amount, vip_amount_zengsong, card_amount, card_zengsong, rolls_real_income_amount,
         deliver_type, deliver_name, deliver_tel, deliver_address, send_no, send_express,
         take_foods_time, takeout_name, vip_id, vip_tel, card_id, coupon_user_id, coupon_amount,
         discount, discount_amount, rolls_name, rolls_value, group_purchase,
         del_state, del_time, mess_info_state, client_user_id, day_number, is_print, print_time,
         cost_price, profit_price, import_data, import_takeout, import_user_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        skipped_count = 0
        
        for order in orders:
            try:
                (order_id, order_no, customer_id, shop_id, order_date, pay_state, remark,
                 pay_type, pay_way, pay_mode, app_id, open_id, prepay_id, time_stamp_str, nonce_str,
                 transaction_id, success_time, cash, vip_amount, vip_amount_zengsong, card_amount, card_zengsong,
                 rolls_real_income_amount, refund_money, order_value, total, order_score, use_score,
                 order_key, complete_time, moling_amount, deliver_type, deliver_name, deliver_tel, deliver_address,
                 send_no, send_express, take_foods_time, takeout_name, vip_id, vip_tel, card_id,
                 coupon_user_id, coupon_amount, discount, discount_amount, rolls_name, rolls_value, group_purchase,
                 del_state, del_time, mess_info_state, client_user_id, day_number, is_print, print_time,
                 cost_price, profit_price, import_data, import_takeout, import_user_amount) = order
                
                # 映射store_id
                mapped_store_id = shop_id_map.get(shop_id)
                if not mapped_store_id:
                    skipped_count += 1
                    continue
                
                # 计算total_amount（根据payMode）
                total_amount = 0
                if pay_mode == '小程序' or pay_mode == '收银机':
                    if order_value and order_value > 0:
                        total_amount = order_value
                    elif cash > 0 or vip_amount > 0 or card_amount > 0:
                        total_amount = cash + vip_amount + card_amount
                    else:
                        total_amount = total if total else 0
                elif pay_mode == '会员充值':
                    total_amount = vip_amount
                elif pay_mode == '充值卡':
                    total_amount = card_amount
                else:
                    total_amount = order_value if order_value > 0 else total
                
                # created_at使用order_date（关键修复！）
                cursor.execute(insert_sql, (
                    order_id, order_no, customer_id, mapped_store_id, order_date, total_amount,
                    pay_state, remark, order_date, order_date,  # created_at和updated_at都使用order_date
                    pay_type, pay_way, pay_mode, app_id, open_id, prepay_id, time_stamp_str, nonce_str,
                    transaction_id, success_time, refund_money, None, order_score, use_score,
                    remark, order_key, order_value, complete_time, moling_amount,
                    cash, vip_amount, vip_amount_zengsong, card_amount, card_zengsong, rolls_real_income_amount,
                    deliver_type, deliver_name, deliver_tel, deliver_address, send_no, send_express,
                    take_foods_time, takeout_name, vip_id, vip_tel, card_id, coupon_user_id, coupon_amount,
                    discount, discount_amount, rolls_name, rolls_value, group_purchase,
                    del_state, del_time, mess_info_state, client_user_id, day_number, is_print, print_time,
                    cost_price, profit_price, import_data, import_takeout, import_user_amount
                ))
                success_count += 1
                
                if success_count % 10000 == 0:
                    logger.info(f"   进度: {success_count}/{len(orders)}")
                    
            except Exception as e:
                logger.warning(f"插入订单失败 (ID:{order_id}): {e}")
        
        cursor.execute("SET IDENTITY_INSERT orders OFF")
        logger.info(f"✅ 成功迁移 {success_count}/{len(orders)} 个订单")
        if skipped_count > 0:
            logger.warning(f"⚠️  跳过 {skipped_count} 个订单（门店ID未映射）")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 迁移订单数据失败: {e}")
        return False

def step5_5_migrate_order_items(conn):
    """步骤5.5: 迁移订单商品明细"""
    logger.info("=" * 80)
    logger.info("步骤5.5: 迁移订单商品明细")
    logger.info("=" * 80)
    
    cursor_hotdog = conn.cursor()
    cursor_cyrg = conn.cursor()
    
    try:
        cursor_hotdog.execute("USE hotdog2030")
        cursor_cyrg.execute("USE cyrg2025")
        
        # 查询订单商品数据（只包含有效订单的商品）
        logger.info("📊 查询源数据...")
        cursor_cyrg.execute("""
        SELECT 
            og.id,
            og.orderId,
            og.goodsId,
            og.goodsName,
            og.goodsNumber,
            og.goodsPrice,
            og.goodsTotal,
            og.categoryName,
            og.goodsText,
            og.recordTime,
            og.shopId,
            og.shopName
        FROM OrderGoods og
        INNER JOIN Orders o ON og.orderId = o.id
        WHERE (og.delflag = 0 OR og.delflag IS NULL)
          AND (o.delflag = 0 OR o.delflag IS NULL)
          AND og.goodsName IS NOT NULL
          AND og.goodsName != ''
        ORDER BY og.orderId, og.id
        """)
        
        order_goods = cursor_cyrg.fetchall()
        logger.info(f"📋 查询到 {len(order_goods)} 条订单商品记录")
        
        # 创建订单ID映射（直接使用相同的ID）
        logger.info("🔗 创建订单ID映射...")
        cursor_hotdog.execute("""
        SELECT id
        FROM orders 
        WHERE delflag = 0
        """)
        order_map = set()
        for (order_id,) in cursor_hotdog.fetchall():
            order_map.add(order_id)
        
        logger.info(f"✅ 创建了 {len(order_map)} 个有效订单ID集合")
        
        # 插入数据
        logger.info("💾 开始插入数据...")
        insert_sql = """
        INSERT INTO order_items 
        (order_id, product_id, product_name, quantity, price, total_price, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        skipped_count = 0
        
        for item in order_goods:
            try:
                item_id, order_id, goods_id, goods_name, goods_number, goods_price, goods_total, \
                category_name, goods_text, record_time, shop_id, shop_name = item
                
                # 检查订单ID是否存在
                if order_id not in order_map:
                    skipped_count += 1
                    continue
                
                # 解析记录时间
                created_at = None
                if record_time:
                    try:
                        created_at = datetime.strptime(record_time, '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        created_at = datetime.now()
                else:
                    created_at = datetime.now()
                
                # 确保字段不为NULL
                safe_goods_price = goods_price if goods_price is not None else 0.0
                safe_goods_total = goods_total if goods_total is not None else 0.0
                safe_goods_name = goods_name if goods_name is not None else '未知商品'
                
                cursor_hotdog.execute(insert_sql, (
                    order_id,          # order_id (直接使用相同的ID)
                    goods_id,          # product_id
                    safe_goods_name,   # product_name
                    goods_number,      # quantity
                    safe_goods_price,  # price
                    safe_goods_total,  # total_price
                    created_at,        # created_at
                    created_at,        # updated_at
                    0                  # delflag
                ))
                success_count += 1
                
                if success_count % 10000 == 0:
                    logger.info(f"   进度: {success_count}/{len(order_goods)}")
                    
            except Exception as e:
                logger.warning(f"插入失败 (ID:{item[0]}): {e}")
                skipped_count += 1
        
        logger.info(f"✅ 成功迁移 {success_count}/{len(order_goods)} 条记录")
        if skipped_count > 0:
            logger.warning(f"⚠️  跳过 {skipped_count} 条记录（订单ID未映射或数据异常）")
        
        # 验证数据
        cursor_hotdog.execute("SELECT COUNT(*) FROM order_items WHERE delflag = 0")
        final_count = cursor_hotdog.fetchone()[0]
        logger.info(f"📊 最终数据量: {final_count} 条")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 迁移订单商品明细失败: {e}")
        return False

def step5_6_migrate_products(conn):
    """步骤5.6: 迁移商品数据"""
    logger.info("=" * 80)
    logger.info("步骤5.6: 迁移商品数据")
    logger.info("=" * 80)
    
    cursor_hotdog = conn.cursor()
    cursor_cyrg = conn.cursor()
    
    try:
        cursor_hotdog.execute("USE hotdog2030")
        cursor_cyrg.execute("USE cyrg2025")
        
        # 查询商品数据
        logger.info("📊 查询商品数据...")
        cursor_cyrg.execute("""
        SELECT 
            g.id,
            g.categoryId,
            g.goodsName,
            g.goodsText,
            g.goodsImg,
            g.isSale,
            g.isHot,
            g.isRecom,
            g.goodsSort,
            g.shopId,
            g.shopName,
            g.marktPrice,
            g.salePrice,
            g.goodsStock,
            g.costPrice,
            g.mustSelectNum,
            g.isPackage,
            g.isSubMaterial,
            g.isXcx,
            g.groupPurchase,
            g.isNewProduct,
            g.imgName,
            g.recordTime
        FROM goods g
        WHERE (g.delflag = 0 OR g.delflag IS NULL)
          AND g.goodsName IS NOT NULL
          AND g.goodsName != ''
        ORDER BY g.id
        """)
        
        goods = cursor_cyrg.fetchall()
        logger.info(f"📋 查询到 {len(goods)} 条商品记录")
        
        # 创建门店ID映射
        logger.info("🔗 创建门店ID映射...")
        cursor_hotdog.execute("""
        SELECT store_code, id
        FROM stores 
        WHERE delflag = 0
        """)
        store_map = {}
        for store_code, store_id in cursor_hotdog.fetchall():
            store_map[store_code] = store_id
        
        logger.info(f"✅ 创建了 {len(store_map)} 个门店ID映射")
        
        # 插入商品数据
        logger.info("💾 开始插入商品数据...")
        insert_sql = """
        INSERT INTO products 
        (id, category_id, product_name, goods_text, goods_img, is_sale, is_hot, is_recommended,
         goods_sort, shop_id, shop_name, market_price, sale_price, goods_stock, cost_price,
         must_select_num, is_package, is_sub_material, is_mini_program, group_purchase,
         is_new_product, img_name, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        skipped_count = 0
        
        for good in goods:
            try:
                (good_id, category_id, goods_name, goods_text, goods_img, is_sale, is_hot, is_recom,
                 goods_sort, shop_id, shop_name, markt_price, sale_price, goods_stock, cost_price,
                 must_select_num, is_package, is_sub_material, is_xcx, group_purchase,
                 is_new_product, img_name, record_time) = good
                
                # 映射门店ID
                mapped_shop_id = store_map.get(shop_id)
                if not mapped_shop_id:
                    skipped_count += 1
                    continue
                
                # 解析记录时间
                created_at = None
                if record_time:
                    try:
                        created_at = datetime.strptime(record_time, '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        created_at = datetime.now()
                else:
                    created_at = datetime.now()
                
                # 确保字段不为NULL
                safe_market_price = markt_price if markt_price is not None else 0.0
                safe_sale_price = sale_price if sale_price is not None else 0.0
                safe_cost_price = cost_price if cost_price is not None else 0.0
                safe_stock = goods_stock if goods_stock is not None else 0
                
                cursor_hotdog.execute(insert_sql, (
                    good_id,                    # id (保持原始ID)
                    category_id,                # category_id
                    goods_name,                 # product_name
                    goods_text,                 # goods_text
                    goods_img,                  # goods_img
                    1 if is_sale == 1 else 0,  # is_sale
                    1 if is_hot == 1 else 0,   # is_hot
                    1 if is_recom == 1 else 0, # is_recommended
                    goods_sort or 0,           # goods_sort
                    mapped_shop_id,            # shop_id (映射后的ID)
                    shop_name,                 # shop_name
                    safe_market_price,         # market_price
                    safe_sale_price,           # sale_price
                    safe_stock,                # goods_stock
                    safe_cost_price,           # cost_price
                    must_select_num or 0,      # must_select_num
                    1 if is_package == 1 else 0, # is_package
                    1 if is_sub_material == 1 else 0, # is_sub_material
                    1 if is_xcx == 1 else 0,   # is_mini_program
                    group_purchase or 0,       # group_purchase
                    1 if is_new_product == 1 else 0, # is_new_product
                    img_name,                  # img_name
                    created_at,                # created_at
                    created_at,                # updated_at
                    0                          # delflag
                ))
                success_count += 1
                
                if success_count % 1000 == 0:
                    logger.info(f"   进度: {success_count}/{len(goods)}")
                    
            except Exception as e:
                logger.warning(f"插入失败 (ID:{good[0]}): {e}")
                skipped_count += 1
        
        logger.info(f"✅ 成功迁移 {success_count}/{len(goods)} 条商品记录")
        if skipped_count > 0:
            logger.warning(f"⚠️  跳过 {skipped_count} 条记录（门店ID未映射或数据异常）")
        
        # 验证数据
        cursor_hotdog.execute("SELECT COUNT(*) FROM products WHERE delflag = 0")
        final_count = cursor_hotdog.fetchone()[0]
        logger.info(f"📊 最终商品数据量: {final_count} 条")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 迁移商品数据失败: {e}")
        return False

def step5_7_migrate_customers(conn):
    """步骤5.7: 迁移会员数据"""
    logger.info("=" * 80)
    logger.info("步骤5.7: 迁移会员数据")
    logger.info("=" * 80)
    
    cursor_hotdog = conn.cursor()
    cursor_cyrgweixin = conn.cursor()
    
    try:
        cursor_hotdog.execute("USE hotdog2030")
        cursor_cyrgweixin.execute("USE cyrgweixin")
        
        # 查询会员数据
        logger.info("📊 查询会员数据...")
        cursor_cyrgweixin.execute("""
        SELECT 
            v.id,
            v.vipNum,
            v.vipName,
            v.vipTel,
            v.vipCard,
            v.vipPassword,
            v.shopId,
            v.shopName,
            v.chongzhi,
            v.zengsong,
            v.remarks,
            v.recordTime
        FROM VIP v
        WHERE (v.delflag = 0 OR v.delflag IS NULL)
          AND v.vipNum IS NOT NULL
          AND v.vipNum != ''
        ORDER BY v.id
        """)
        
        vips = cursor_cyrgweixin.fetchall()
        logger.info(f"📋 查询到 {len(vips)} 条会员记录")
        
        # 创建门店ID映射
        logger.info("🔗 创建门店ID映射...")
        cursor_hotdog.execute("""
        SELECT store_code, id
        FROM stores 
        WHERE delflag = 0
        """)
        store_map = {}
        for store_code, store_id in cursor_hotdog.fetchall():
            store_map[store_code] = store_id
        
        logger.info(f"✅ 创建了 {len(store_map)} 个门店ID映射")
        
        # 插入会员数据
        logger.info("💾 开始插入会员数据...")
        insert_sql = """
        INSERT INTO customer_profiles 
        (id, vip_num, vip_name, vip_tel, vip_card, vip_password, shop_id, shop_name,
         recharge_amount, gift_amount, total_balance, remarks, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        skipped_count = 0
        
        for vip in vips:
            try:
                (vip_id, vip_num, vip_name, vip_tel, vip_card, vip_password, shop_id, shop_name,
                 chongzhi, zengsong, remarks, record_time) = vip
                
                # 映射门店ID
                mapped_shop_id = store_map.get(shop_id)
                if not mapped_shop_id:
                    skipped_count += 1
                    continue
                
                # 解析记录时间
                created_at = None
                if record_time:
                    try:
                        created_at = datetime.strptime(record_time, '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        created_at = datetime.now()
                else:
                    created_at = datetime.now()
                
                # 计算总余额
                safe_chongzhi = chongzhi if chongzhi is not None else 0.0
                safe_zengsong = zengsong if zengsong is not None else 0.0
                total_balance = safe_chongzhi + safe_zengsong
                
                cursor_hotdog.execute(insert_sql, (
                    vip_id,                    # id (保持原始ID)
                    vip_num,                   # vip_num
                    vip_name,                  # vip_name
                    vip_tel,                   # vip_tel
                    vip_card,                  # vip_card
                    vip_password,              # vip_password
                    mapped_shop_id,            # shop_id (映射后的ID)
                    shop_name,                 # shop_name
                    safe_chongzhi,             # recharge_amount
                    safe_zengsong,             # gift_amount
                    total_balance,             # total_balance
                    remarks,                   # remarks
                    created_at,                # created_at
                    created_at,                # updated_at
                    0                          # delflag
                ))
                success_count += 1
                
                if success_count % 1000 == 0:
                    logger.info(f"   进度: {success_count}/{len(vips)}")
                    
            except Exception as e:
                logger.warning(f"插入失败 (ID:{vip[0]}): {e}")
                skipped_count += 1
        
        logger.info(f"✅ 成功迁移 {success_count}/{len(vips)} 条会员记录")
        if skipped_count > 0:
            logger.warning(f"⚠️  跳过 {skipped_count} 条记录（门店ID未映射或数据异常）")
        
        # 验证数据
        cursor_hotdog.execute("SELECT COUNT(*) FROM customer_profiles WHERE delflag = 0")
        final_count = cursor_hotdog.fetchone()[0]
        logger.info(f"📊 最终会员数据量: {final_count} 条")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 迁移会员数据失败: {e}")
        return False

def step5_8_migrate_rg_seek_shop(conn):
    """步骤5.8: 迁移意向店铺数据"""
    logger.info("=" * 80)
    logger.info("步骤5.8: 迁移意向店铺数据")
    logger.info("=" * 80)
    
    cursor_hotdog = conn.cursor()
    cursor_cyrg = conn.cursor()
    
    try:
        cursor_hotdog.execute("USE hotdog2030")
        cursor_cyrg.execute("USE cyrg2025")
        
        # 查询意向店铺数据
        logger.info("📊 查询意向店铺数据...")
        cursor_cyrg.execute("""
        SELECT 
            r.Id,
            r.ShopName,
            r.ShopAddress,
            r.location,
            r.blurb,
            r.RecordId,
            r.approvalId,
            r.approvalTime,
            r.approvalState,
            r.approvalRemarks,
            r.amount,
            r.RecordTime
        FROM Rg_SeekShop r
        WHERE (r.Delflag = 0 OR r.Delflag IS NULL)
          AND r.ShopName IS NOT NULL
          AND r.ShopName != ''
        ORDER BY r.Id
        """)
        
        rg_shops = cursor_cyrg.fetchall()
        logger.info(f"📋 查询到 {len(rg_shops)} 条意向店铺记录")
        
        # 插入意向店铺数据
        logger.info("💾 开始插入意向店铺数据...")
        insert_sql = """
        INSERT INTO rg_seek_shop 
        (id, shop_name, shop_address, location, blurb, record_id, approval_id, approval_time,
         approval_state, approval_remarks, amount, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        skipped_count = 0
        
        for rg_shop in rg_shops:
            try:
                (rg_id, shop_name, shop_address, location, blurb, record_id, approval_id, approval_time,
                 approval_state, approval_remarks, amount, record_time) = rg_shop
                
                # 解析记录时间
                created_at = None
                if record_time:
                    try:
                        created_at = datetime.strptime(record_time, '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        created_at = datetime.now()
                else:
                    created_at = datetime.now()
                
                # 确保字段不为NULL
                safe_amount = amount if amount is not None else 0.0
                safe_approval_state = approval_state if approval_state is not None else 0
                
                cursor_hotdog.execute(insert_sql, (
                    rg_id,                    # id (保持原始ID)
                    shop_name,                # shop_name
                    shop_address,             # shop_address
                    location,                 # location
                    blurb,                    # blurb
                    record_id,                # record_id
                    approval_id,              # approval_id
                    approval_time,            # approval_time
                    safe_approval_state,      # approval_state
                    approval_remarks,         # approval_remarks
                    safe_amount,              # amount
                    created_at,               # created_at
                    created_at,               # updated_at
                    0                         # delflag
                ))
                success_count += 1
                
                if success_count % 1000 == 0:
                    logger.info(f"   进度: {success_count}/{len(rg_shops)}")
                    
            except Exception as e:
                logger.warning(f"插入失败 (ID:{rg_shop[0]}): {e}")
                skipped_count += 1
        
        logger.info(f"✅ 成功迁移 {success_count}/{len(rg_shops)} 条意向店铺记录")
        if skipped_count > 0:
            logger.warning(f"⚠️  跳过 {skipped_count} 条记录（数据异常）")
        
        # 验证数据
        cursor_hotdog.execute("SELECT COUNT(*) FROM rg_seek_shop WHERE delflag = 0")
        final_count = cursor_hotdog.fetchone()[0]
        logger.info(f"📊 最终意向店铺数据量: {final_count} 条")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 迁移意向店铺数据失败: {e}")
        return False

def step5_9_convert_rg_shops_to_stores(conn):
    """步骤5.9: 将意向店铺转换为门店数据（筹备中/拓展中）"""
    logger.info("=" * 80)
    logger.info("步骤5.9: 将意向店铺转换为门店数据")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    try:
        # 查询意向店铺数据
        cursor.execute("""
        SELECT 
            shop_name,
            shop_address,
            location,
            blurb,
            approval_state,
            amount,
            created_at
        FROM rg_seek_shop 
        WHERE delflag = 0
        ORDER BY id
        """)
        
        rg_shops = cursor.fetchall()
        logger.info(f"📊 查询到 {len(rg_shops)} 个意向店铺")
        
        # 获取当前最大的store_id
        cursor.execute("SELECT MAX(id) FROM stores")
        max_store_id = cursor.fetchone()[0] or 0
        
        # 插入意向店铺作为门店数据
        insert_sql = """
        INSERT INTO stores 
        (store_code, store_name, store_address, status, state, blurb, location,
         longitude, latitude, is_self, is_use, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        
        for rg_shop in rg_shops:
            try:
                shop_name, shop_address, location, blurb, approval_state, amount, created_at = rg_shop
                
                max_store_id += 1
                
                # 根据审核状态确定门店状态
                if approval_state == 1:  # 审核同意
                    status = "筹备中"
                    state = 2  # 筹备中
                else:  # 审核不同意或未审核
                    status = "拓展中"
                    state = 1  # 招商中
                
                # 解析坐标（如果location包含经纬度）
                longitude = None
                latitude = None
                if location and ',' in location:
                    try:
                        coords = location.split(',')
                        if len(coords) >= 2:
                            longitude = float(coords[0].strip())
                            latitude = float(coords[1].strip())
                    except ValueError:
                        pass
                
                cursor.execute(insert_sql, (
                    f"RG_{max_store_id}",     # store_code (意向店铺前缀)
                    shop_name,                # store_name
                    shop_address,             # store_address
                    status,                   # status (筹备中/拓展中)
                    state,                    # state (1招商中 2筹备中)
                    blurb,                    # blurb
                    location,                 # location
                    longitude,                # longitude
                    latitude,                 # latitude
                    0,                        # is_self (意向店铺默认为加盟)
                    0,                        # is_use (意向店铺默认为可用)
                    created_at,               # created_at
                    created_at,               # updated_at
                    0                         # delflag
                ))
                success_count += 1
                
            except Exception as e:
                logger.warning(f"转换意向店铺失败 ({shop_name}): {e}")
        
        logger.info(f"✅ 成功转换 {success_count}/{len(rg_shops)} 个意向店铺为门店数据")
        
        # 验证转换结果
        cursor.execute("SELECT COUNT(*) FROM stores WHERE store_code LIKE 'RG_%' AND delflag = 0")
        converted_count = cursor.fetchone()[0]
        logger.info(f"📊 转换后的意向店铺数量: {converted_count}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 转换意向店铺失败: {e}")
        return False

def step6_update_store_status(conn):
    """步骤6: 更新门店营业状态"""
    logger.info("=" * 80)
    logger.info("步骤6: 更新门店营业状态")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    try:
        # 有订单的门店设置为营业中
        update_sql = """
        UPDATE stores
        SET status = N'营业中'
        WHERE id IN (
            SELECT DISTINCT store_id 
            FROM orders 
            WHERE delflag = 0
        )
        AND delflag = 0
        """
        
        cursor.execute(update_sql)
        updated_count = cursor.rowcount
        logger.info(f"✅ 更新了 {updated_count} 个门店的营业状态")
        
        return True
    except Exception as e:
        logger.error(f"❌ 更新门店状态失败: {e}")
        return False

def step7_verify_data(conn):
    """步骤7: 验证数据完整性"""
    logger.info("=" * 80)
    logger.info("步骤7: 数据验证")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    try:
        # 验证城市数据
        cursor.execute("SELECT COUNT(DISTINCT city_name) FROM city WHERE delflag = 0")
        city_count = cursor.fetchone()[0]
        logger.info(f"✅ 城市数量: {city_count}")
        
        # 验证门店数据
        cursor.execute("SELECT COUNT(*) FROM stores WHERE delflag = 0")
        store_count = cursor.fetchone()[0]
        logger.info(f"✅ 门店数量: {store_count}")
        
        # 验证订单数据
        cursor.execute("SELECT COUNT(*) FROM orders WHERE delflag = 0")
        order_count = cursor.fetchone()[0]
        logger.info(f"✅ 订单数量: {order_count}")
        
        # 验证订单商品明细数据
        cursor.execute("SELECT COUNT(*) FROM order_items WHERE delflag = 0")
        order_item_count = cursor.fetchone()[0]
        logger.info(f"✅ 订单商品明细数量: {order_item_count}")
        
        # 验证商品数据
        cursor.execute("SELECT COUNT(*) FROM products WHERE delflag = 0")
        product_count = cursor.fetchone()[0]
        logger.info(f"✅ 商品数量: {product_count}")
        
        # 验证会员数据
        cursor.execute("SELECT COUNT(*) FROM customer_profiles WHERE delflag = 0")
        customer_count = cursor.fetchone()[0]
        logger.info(f"✅ 会员数量: {customer_count}")
        
        # 验证意向店铺数据
        cursor.execute("SELECT COUNT(*) FROM rg_seek_shop WHERE delflag = 0")
        rg_shop_count = cursor.fetchone()[0]
        logger.info(f"✅ 意向店铺数量: {rg_shop_count}")
        
        # 验证各城市数据分布
        cursor.execute("""
        SELECT 
            s.city,
            COUNT(DISTINCT s.id) as store_count,
            COUNT(o.id) as order_count,
            SUM(CASE WHEN o.pay_state = 2 THEN o.total_amount ELSE 0 END) as total_sales
        FROM stores s
        LEFT JOIN orders o ON s.id = o.store_id AND o.delflag = 0
        WHERE s.delflag = 0
        GROUP BY s.city
        ORDER BY s.city
        """)
        
        logger.info("\n📊 各城市数据分布:")
        logger.info("-" * 70)
        logger.info(f"{'城市':<15} {'门店数':<10} {'订单数':<15} {'总销售额':<15}")
        logger.info("-" * 70)
        
        for city, stores, orders, sales in cursor.fetchall():
            logger.info(f"{city:<15} {stores:<10} {orders:<15} ¥{sales:>12,.2f}")
        
        # 验证日期分布
        cursor.execute("""
        SELECT TOP 5
            CAST(created_at AS DATE) as order_date,
            COUNT(*) as order_count,
            SUM(total_amount) as daily_sales
        FROM orders
        WHERE delflag = 0 AND pay_state = 2
        GROUP BY CAST(created_at AS DATE)
        ORDER BY order_count DESC
        """)
        
        logger.info("\n📅 订单日期分布（Top 5）:")
        logger.info("-" * 50)
        for date, count, sales in cursor.fetchall():
            logger.info(f"  {date}: {count:>5}笔订单, ¥{sales:>10,.2f}")
        
        # 验证商品分类分布
        cursor.execute("""
        SELECT 
            category_id,
            COUNT(*) as product_count,
            SUM(CASE WHEN is_sale = 1 THEN 1 ELSE 0 END) as sale_count
        FROM products
        WHERE delflag = 0
        GROUP BY category_id
        ORDER BY product_count DESC
        """)
        
        logger.info("\n📦 商品分类分布（Top 10）:")
        logger.info("-" * 50)
        logger.info(f"{'分类ID':<10} {'商品数':<10} {'上架数':<10}")
        logger.info("-" * 50)
        
        for category_id, total, sale in cursor.fetchall()[:10]:
            logger.info(f"{category_id or 'NULL':<10} {total:<10} {sale:<10}")
        
        # 验证会员分布
        cursor.execute("""
        SELECT 
            s.city,
            COUNT(c.id) as customer_count,
            SUM(c.recharge_amount) as total_recharge,
            SUM(c.gift_amount) as total_gift
        FROM customer_profiles c
        INNER JOIN stores s ON c.shop_id = s.id
        WHERE c.delflag = 0 AND s.delflag = 0
        GROUP BY s.city
        ORDER BY customer_count DESC
        """)
        
        logger.info("\n👥 会员分布:")
        logger.info("-" * 60)
        logger.info(f"{'城市':<15} {'会员数':<10} {'充值总额':<15} {'赠送总额':<15}")
        logger.info("-" * 60)
        
        for city, count, recharge, gift in cursor.fetchall():
            logger.info(f"{city:<15} {count:<10} ¥{recharge:>12,.2f} ¥{gift:>12,.2f}")
        
        return True
    except Exception as e:
        logger.error(f"❌ 数据验证失败: {e}")
        return False

def step8_create_region_hierarchy(conn):
    """步骤8: 创建地区层级数据"""
    logger.info("=" * 80)
    logger.info("步骤8: 创建地区层级数据")
    logger.info("=" * 80)
    
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    try:
        # 基于实际城市数据创建层级
        cursor.execute("""
        SELECT DISTINCT city, province 
        FROM stores 
        WHERE delflag = 0 AND city IS NOT NULL
        ORDER BY province, city
        """)
        cities = cursor.fetchall()
        
        regions_data = []
        
        # 省级
        provinces = {}
        for city, province in cities:
            if province and province not in provinces:
                provinces[province] = len(provinces) + 1
        
        for i, (province, _) in enumerate(provinces.items(), 1):
            regions_data.append((
                f"PROV_{i:03d}", province, 1, None, i
            ))
        
        # 市级
        for i, (city, province) in enumerate(cities, 1):
            parent_code = None
            for prov_name, prov_id in provinces.items():
                if prov_name == province:
                    parent_code = f"PROV_{prov_id:03d}"
                    break
            
            regions_data.append((
                f"CITY_{i:03d}", city, 2, parent_code, i
            ))
        
        # 插入数据
        insert_sql = """
        INSERT INTO region_hierarchy (code, name, level, parent_code, sort_order)
        VALUES (?, ?, ?, ?, ?)
        """
        
        for data in regions_data:
            cursor.execute(insert_sql, data)
        
        logger.info(f"✅ 成功创建 {len(regions_data)} 条地区层级记录")
        logger.info(f"   省级: {len(provinces)} 个")
        logger.info(f"   市级: {len(cities)} 个")
        
        return True
    except Exception as e:
        logger.error(f"❌ 创建地区层级失败: {e}")
        return False

def main():
    """主函数"""
    start_time = time.time()
    
    logger.info("=" * 80)
    logger.info("🚀 开始完整的hotdog2030数据库初始化流程")
    logger.info("=" * 80)
    logger.info(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("")
    
    conn = get_connection()
    if not conn:
        logger.error("❌ 无法连接到数据库，初始化终止")
        return
    
    try:
        # 执行各个步骤
        steps = [
            ("验证源数据库", step1_verify_source_databases),
            ("初始化数据库结构", step2_init_hotdog2030_structure),
            ("迁移门店数据", step3_migrate_stores),
            ("填充城市表", step4_populate_city_table),
            ("迁移订单数据", step5_migrate_orders),
            ("迁移订单商品明细", step5_5_migrate_order_items),
            ("迁移商品数据", step5_6_migrate_products),
            ("迁移会员数据", step5_7_migrate_customers),
            ("迁移意向店铺数据", step5_8_migrate_rg_seek_shop),
            ("转换意向店铺为门店", step5_9_convert_rg_shops_to_stores),
            ("更新门店状态", step6_update_store_status),
            ("创建地区层级", step8_create_region_hierarchy),
            ("验证数据完整性", step7_verify_data),
        ]
        
        for step_name, step_func in steps:
            logger.info(f"\n⏳ 执行: {step_name}...")
            if not step_func(conn):
                logger.error(f"❌ 步骤失败: {step_name}")
                logger.error("初始化流程终止")
                return
            time.sleep(0.5)  # 短暂延迟，确保事务完成
        
        elapsed_time = time.time() - start_time
        
        logger.info("\n" + "=" * 80)
        logger.info("🎉 hotdog2030数据库初始化完成！")
        logger.info("=" * 80)
        logger.info(f"总耗时: {elapsed_time:.2f} 秒")
        logger.info(f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("\n下一步:")
        logger.info("  1. 启动后端服务: cd backend && npm run dev")
        logger.info("  2. 启动前端服务: cd frontend && npm start")
        logger.info("  3. 访问系统: http://localhost:3000")
        logger.info("")
        
    except Exception as e:
        logger.error(f"❌ 初始化过程出错: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()

