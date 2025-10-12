import pyodbc
import logging
import json
import random
from datetime import datetime, timedelta
from decimal import Decimal

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# 数据库连接配置
DB_CONFIG = {
    'server': 'localhost',
    'database': 'hotdog2030',
    'username': 'sa',
    'password': 'YourStrong@Passw0rd',
    'driver': '{ODBC Driver 18 for SQL Server}',
    'port': 1433
}

CYRG2025_DB_CONFIG = {
    'server': 'localhost',
    'database': 'cyrg2025',
    'username': 'sa',
    'password': 'YourStrong@Passw0rd',
    'driver': '{ODBC Driver 18 for SQL Server}',
    'port': 1433
}

def get_db_connection(db_config):
    conn_str = (
        f"DRIVER={db_config['driver']};"
        f"SERVER={db_config['server']},{db_config['port']};"
        f"DATABASE={db_config['database']};"
        f"UID={db_config['username']};"
        f"PWD={db_config['password']};"
        "ENCRYPT=no;"
    )
    return pyodbc.connect(conn_str)

def generate_customer_behavior_analysis():
    """生成客户行为分析数据"""
    logging.info("1️⃣ 生成客户行为分析数据...")
    hotdog_conn = None
    cyrg_conn = None
    try:
        hotdog_conn = get_db_connection(DB_CONFIG)
        hotdog_cursor = hotdog_conn.cursor()
        cyrg_conn = get_db_connection(CYRG2025_DB_CONFIG)
        cyrg_cursor = cyrg_conn.cursor()

        # 清空现有数据
        hotdog_cursor.execute("DELETE FROM customer_behavior_analysis")
        hotdog_conn.commit()

        # 从订单数据中分析客户行为
        cyrg_cursor.execute("""
            SELECT 
                o.ClientUserID as customer_id,
                COUNT(*) as order_count,
                SUM(o.total) as total_amount,
                AVG(o.total) as avg_order_amount,
                DATEPART(HOUR, o.recordTime) as preferred_hour,
                o.PayMode as payment_method,
                '微信小程序' as preferred_channel
            FROM Orders o
            WHERE o.DelFlag = 0 AND o.PayState = 2
            GROUP BY o.ClientUserID, DATEPART(HOUR, o.recordTime), o.PayMode
        """)
        
        behavior_data = cyrg_cursor.fetchall()
        logging.info(f"📊 查询到 {len(behavior_data)} 条客户行为记录")

        # 按客户分组并生成分析数据
        customer_analysis = {}
        for row in behavior_data:
            customer_id = str(row[0]) if row[0] else f"CUST_{random.randint(10000, 99999)}"
            
            if customer_id not in customer_analysis:
                customer_analysis[customer_id] = {
                    'order_count': 0,
                    'total_amount': 0,
                    'hours': [],
                    'payment_methods': [],
                    'channels': []
                }
            
            customer_analysis[customer_id]['order_count'] += row[1]
            customer_analysis[customer_id]['total_amount'] += float(row[2]) if row[2] else 0
            customer_analysis[customer_id]['hours'].append(row[4])
            customer_analysis[customer_id]['payment_methods'].append(row[5])
            customer_analysis[customer_id]['channels'].append(row[6])

        # 插入分析数据
        insert_sql = """
            INSERT INTO customer_behavior_analysis (
                customer_id, analysis_date, order_count, total_amount, avg_order_amount,
                preferred_time_slot, preferred_payment_method, preferred_channel,
                created_at, updated_at, delflag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        migrated_count = 0
        for customer_id, data in customer_analysis.items():
            # 计算平均订单金额
            avg_order_amount = data['total_amount'] / data['order_count'] if data['order_count'] > 0 else 0
            
            # 找出最偏好的时间段
            hour_counts = {}
            for hour in data['hours']:
                hour_counts[hour] = hour_counts.get(hour, 0) + 1
            preferred_hour = max(hour_counts.items(), key=lambda x: x[1])[0] if hour_counts else 12
            preferred_time_slot = f"{preferred_hour:02d}:00-{preferred_hour+1:02d}:00"
            
            # 找出最偏好的支付方式
            payment_counts = {}
            for payment in data['payment_methods']:
                payment_counts[payment] = payment_counts.get(payment, 0) + 1
            preferred_payment = max(payment_counts.items(), key=lambda x: x[1])[0] if payment_counts else '微信支付'
            
            # 找出最偏好的渠道
            channel_counts = {}
            for channel in data['channels']:
                channel_counts[channel] = channel_counts.get(channel, 0) + 1
            preferred_channel = max(channel_counts.items(), key=lambda x: x[1])[0] if channel_counts else '微信小程序'
            
            try:
                hotdog_cursor.execute(insert_sql, (
                    customer_id,
                    datetime.now().date(),
                    data['order_count'],
                    data['total_amount'],
                    avg_order_amount,
                    preferred_time_slot,
                    preferred_payment,
                    preferred_channel,
                    datetime.now(),
                    datetime.now(),
                    False
                ))
                migrated_count += 1
            except Exception as e:
                logging.warning(f"插入客户行为分析 {customer_id} 失败: {e}")

        hotdog_conn.commit()
        logging.info(f"✅ 成功生成 {migrated_count} 条客户行为分析数据")

    except Exception as e:
        logging.error(f"生成客户行为分析数据失败: {e}")
        raise
    finally:
        if hotdog_conn:
            hotdog_conn.close()
        if cyrg_conn:
            cyrg_conn.close()

def generate_customer_product_preferences():
    """生成客户商品偏好数据"""
    logging.info("2️⃣ 生成客户商品偏好数据...")
    hotdog_conn = None
    cyrg_conn = None
    try:
        hotdog_conn = get_db_connection(DB_CONFIG)
        hotdog_cursor = hotdog_conn.cursor()
        cyrg_conn = get_db_connection(CYRG2025_DB_CONFIG)
        cyrg_cursor = cyrg_conn.cursor()

        # 清空现有数据
        hotdog_cursor.execute("DELETE FROM customer_product_preferences")
        hotdog_conn.commit()

        # 从订单商品数据中分析客户偏好
        cyrg_cursor.execute("""
            SELECT 
                o.ClientUserID as customer_id,
                og.CategoryID as category_id,
                og.CategoryName as category_name,
                og.GoodsID as product_id,
                og.GoodsName as product_name,
                COUNT(*) as purchase_count,
                SUM(og.GoodsNumber * og.GoodsPrice) as total_amount,
                MAX(CAST(o.recordTime AS DATE)) as last_purchase_date
            FROM Orders o
            INNER JOIN OrderGoods og ON o.ID = og.OrderID
            WHERE o.DelFlag = 0 AND o.PayState = 2
            GROUP BY o.ClientUserID, og.CategoryID, og.CategoryName, og.GoodsID, og.GoodsName
            HAVING COUNT(*) > 0
        """)
        
        preference_data = cyrg_cursor.fetchall()
        logging.info(f"📊 查询到 {len(preference_data)} 条商品偏好记录")

        # 插入偏好数据
        insert_sql = """
            INSERT INTO customer_product_preferences (
                customer_id, category_id, category_name, product_id, product_name,
                purchase_count, total_amount, last_purchase_date, preference_score,
                created_at, updated_at, delflag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        migrated_count = 0
        for row in preference_data:
            customer_id = str(row[0]) if row[0] else f"CUST_{random.randint(10000, 99999)}"
            
            # 计算偏好评分 (基于购买次数和金额)
            purchase_count = row[5]
            total_amount = float(row[6]) if row[6] else 0
            preference_score = min(5.0, (purchase_count * 0.5) + (total_amount / 100))
            
            try:
                hotdog_cursor.execute(insert_sql, (
                    customer_id,
                    row[1],  # category_id
                    row[2],  # category_name
                    row[3],  # product_id
                    row[4],  # product_name
                    purchase_count,
                    total_amount,
                    row[7],  # last_purchase_date
                    preference_score,
                    datetime.now(),
                    datetime.now(),
                    False
                ))
                migrated_count += 1
            except Exception as e:
                logging.warning(f"插入商品偏好 {customer_id}-{row[4]} 失败: {e}")

        hotdog_conn.commit()
        logging.info(f"✅ 成功生成 {migrated_count} 条客户商品偏好数据")

    except Exception as e:
        logging.error(f"生成客户商品偏好数据失败: {e}")
        raise
    finally:
        if hotdog_conn:
            hotdog_conn.close()
        if cyrg_conn:
            cyrg_conn.close()

def generate_customer_time_analysis():
    """生成客户时间分析数据"""
    logging.info("3️⃣ 生成客户时间分析数据...")
    hotdog_conn = None
    cyrg_conn = None
    try:
        hotdog_conn = get_db_connection(DB_CONFIG)
        hotdog_cursor = hotdog_conn.cursor()
        cyrg_conn = get_db_connection(CYRG2025_DB_CONFIG)
        cyrg_cursor = cyrg_conn.cursor()

        # 清空现有数据
        hotdog_cursor.execute("DELETE FROM customer_time_analysis")
        hotdog_conn.commit()

        # 从订单数据中分析时间模式
        cyrg_cursor.execute("""
            SELECT 
                o.ClientUserID as customer_id,
                DATEPART(HOUR, o.recordTime) as order_hour,
                DATEPART(WEEKDAY, o.recordTime) as order_weekday,
                DATEPART(MONTH, o.recordTime) as order_month,
                COUNT(*) as order_count,
                SUM(o.total) as total_amount
            FROM Orders o
            WHERE o.DelFlag = 0 AND o.PayState = 2
            GROUP BY o.ClientUserID, DATEPART(HOUR, o.recordTime), DATEPART(WEEKDAY, o.recordTime), DATEPART(MONTH, o.recordTime)
        """)
        
        time_data = cyrg_cursor.fetchall()
        logging.info(f"📊 查询到 {len(time_data)} 条时间分析记录")

        # 按客户分组并生成时间分析
        customer_time_analysis = {}
        for row in time_data:
            customer_id = str(row[0]) if row[0] else f"CUST_{random.randint(10000, 99999)}"
            
            if customer_id not in customer_time_analysis:
                customer_time_analysis[customer_id] = {
                    'peak_hour': 0,
                    'peak_weekday': 0,
                    'peak_month': 0,
                    'total_orders': 0,
                    'total_amount': 0,
                    'hour_distribution': {},
                    'weekday_distribution': {},
                    'month_distribution': {}
                }
            
            customer_time_analysis[customer_id]['total_orders'] += row[4]
            customer_time_analysis[customer_id]['total_amount'] += float(row[5]) if row[5] else 0
            
            # 统计小时分布
            hour = row[1]
            customer_time_analysis[customer_id]['hour_distribution'][hour] = customer_time_analysis[customer_id]['hour_distribution'].get(hour, 0) + row[4]
            
            # 统计星期分布
            weekday = row[2]
            customer_time_analysis[customer_id]['weekday_distribution'][weekday] = customer_time_analysis[customer_id]['weekday_distribution'].get(weekday, 0) + row[4]
            
            # 统计月份分布
            month = row[3]
            customer_time_analysis[customer_id]['month_distribution'][month] = customer_time_analysis[customer_id]['month_distribution'].get(month, 0) + row[4]

        # 插入时间分析数据
        insert_sql = """
            INSERT INTO customer_time_analysis (
                customer_id, analysis_date, hour_of_day, order_count, total_amount, created_at, updated_at, delflag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        migrated_count = 0
        for customer_id, data in customer_time_analysis.items():
            # 找出峰值时间
            peak_hour = max(data['hour_distribution'].items(), key=lambda x: x[1])[0] if data['hour_distribution'] else 12
            
            try:
                hotdog_cursor.execute(insert_sql, (
                    customer_id,
                    datetime.now().date(),
                    peak_hour,
                    data['total_orders'],
                    data['total_amount'],
                    datetime.now(),
                    datetime.now(),
                    False
                ))
                migrated_count += 1
            except Exception as e:
                logging.warning(f"插入时间分析 {customer_id} 失败: {e}")

        hotdog_conn.commit()
        logging.info(f"✅ 成功生成 {migrated_count} 条客户时间分析数据")

    except Exception as e:
        logging.error(f"生成客户时间分析数据失败: {e}")
        raise
    finally:
        if hotdog_conn:
            hotdog_conn.close()
        if cyrg_conn:
            cyrg_conn.close()

def generate_sales_predictions():
    """生成销售预测数据"""
    logging.info("4️⃣ 生成销售预测数据...")
    hotdog_conn = None
    cyrg_conn = None
    try:
        hotdog_conn = get_db_connection(DB_CONFIG)
        hotdog_cursor = hotdog_conn.cursor()
        cyrg_conn = get_db_connection(CYRG2025_DB_CONFIG)
        cyrg_cursor = cyrg_conn.cursor()

        # 清空现有数据
        hotdog_cursor.execute("DELETE FROM sales_predictions")
        hotdog_conn.commit()

        # 获取门店列表
        hotdog_cursor.execute("SELECT id, store_name FROM stores WHERE delflag = 0")
        stores = hotdog_cursor.fetchall()
        logging.info(f"📊 查询到 {len(stores)} 个门店")

        # 为每个门店生成未来7天的销售预测
        insert_sql = """
            INSERT INTO sales_predictions (
                store_id, date, hour, predicted_orders,
                predicted_sales, confidence, factors, created_at, updated_at, delflag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        migrated_count = 0
        for store in stores:
            store_id = store[0]
            store_name = store[1]
            
            # 生成未来7天的预测
            for day_offset in range(1, 8):
                prediction_date = (datetime.now() + timedelta(days=day_offset)).date()
                
                # 为每天生成8-22小时的预测
                for hour in range(8, 23):
                    # 基于历史数据生成预测（简化版）
                    base_orders = random.randint(1, 10)
                    base_sales = random.uniform(50, 500)
                    
                    # 根据时间段调整
                    if 11 <= hour <= 14:  # 午餐时间
                        base_orders = int(base_orders * 1.5)
                        base_sales *= 1.5
                    elif 17 <= hour <= 20:  # 晚餐时间
                        base_orders = int(base_orders * 1.3)
                        base_sales *= 1.3
                    elif hour < 10 or hour > 21:  # 非营业时间
                        base_orders = max(0, int(base_orders * 0.3))
                        base_sales *= 0.3
                    
                    # 根据星期几调整
                    weekday = prediction_date.weekday()
                    if weekday < 5:  # 工作日
                        base_orders = int(base_orders * 1.1)
                        base_sales *= 1.1
                    else:  # 周末
                        base_orders = int(base_orders * 0.9)
                        base_sales *= 0.9
                    
                    # 生成影响因素
                    factors = {
                        'weather': random.choice(['晴天', '阴天', '雨天']),
                        'temperature': random.choice(['高温', '正常', '低温']),
                        'is_holiday': random.choice([True, False]),
                        'is_school_day': random.choice([True, False])
                    }
                    
                    # 计算置信度
                    confidence_score = random.uniform(0.6, 0.9)
                    
                    try:
                        hotdog_cursor.execute(insert_sql, (
                            store_id,
                            prediction_date,
                            hour,
                            base_orders,
                            round(base_sales, 2),
                            confidence_score,
                            json.dumps(factors),
                            datetime.now(),
                            datetime.now(),
                            False
                        ))
                        migrated_count += 1
                    except Exception as e:
                        logging.warning(f"插入销售预测 {store_id}-{prediction_date}-{hour} 失败: {e}")

        hotdog_conn.commit()
        logging.info(f"✅ 成功生成 {migrated_count} 条销售预测数据")

    except Exception as e:
        logging.error(f"生成销售预测数据失败: {e}")
        raise
    finally:
        if hotdog_conn:
            hotdog_conn.close()
        if cyrg_conn:
            cyrg_conn.close()

def generate_school_data():
    """生成学校相关数据"""
    logging.info("5️⃣ 生成学校相关数据...")
    hotdog_conn = None
    try:
        hotdog_conn = get_db_connection(DB_CONFIG)
        hotdog_cursor = hotdog_conn.cursor()

        # 清空现有数据
        hotdog_cursor.execute("DELETE FROM school_region_mapping")
        hotdog_cursor.execute("DELETE FROM user_selected_schools")
        hotdog_cursor.execute("DELETE FROM school_ai_analysis")
        hotdog_cursor.execute("DELETE FROM school_basic_info")
        hotdog_conn.commit()

        # 生成学校基础信息
        school_names = [
            "北京大学", "清华大学", "复旦大学", "上海交通大学", "浙江大学",
            "南京大学", "中山大学", "华中科技大学", "西安交通大学", "哈尔滨工业大学",
            "北京师范大学", "华东师范大学", "华南师范大学", "华中师范大学", "东北师范大学",
            "中国人民大学", "北京理工大学", "北京航空航天大学", "中国农业大学", "中央民族大学",
            "北京第一中学", "北京第二中学", "北京第四中学", "北京第八中学", "北京第十中学",
            "上海中学", "华东师范大学第二附属中学", "复旦大学附属中学", "上海交通大学附属中学",
            "深圳中学", "深圳外国语学校", "深圳实验学校", "深圳高级中学", "深圳第二高级中学"
        ]
        
        school_types = ["大学", "高中", "初中", "小学", "职业学校", "培训机构"]
        provinces = ["北京市", "上海市", "广东省", "江苏省", "浙江省", "湖北省", "陕西省", "黑龙江省"]
        cities = ["北京市", "上海市", "深圳市", "广州市", "南京市", "杭州市", "武汉市", "西安市", "哈尔滨市"]
        districts = ["海淀区", "朝阳区", "西城区", "东城区", "浦东新区", "黄浦区", "南山区", "福田区", "罗湖区"]
        
        insert_school_sql = """
            INSERT INTO school_basic_info (
                school_name, school_type, province, city, district, address,
                latitude, longitude, student_count, teacher_count, established_year,
                school_level, contact_phone, website, description, is_active,
                created_at, updated_at, delflag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        school_count = 0
        for i, school_name in enumerate(school_names):
            school_type = random.choice(school_types)
            province = random.choice(provinces)
            city = random.choice(cities)
            district = random.choice(districts)
            
            # 根据学校类型设置学生和教师数量
            if school_type == "大学":
                student_count = random.randint(10000, 50000)
                teacher_count = random.randint(1000, 5000)
            elif school_type == "高中":
                student_count = random.randint(1000, 5000)
                teacher_count = random.randint(100, 500)
            elif school_type == "初中":
                student_count = random.randint(500, 2000)
                teacher_count = random.randint(50, 200)
            else:
                student_count = random.randint(200, 1000)
                teacher_count = random.randint(20, 100)
            
            try:
                hotdog_cursor.execute(insert_school_sql, (
                    school_name,
                    school_type,
                    province,
                    city,
                    district,
                    f"{district}{school_name}",
                    round(random.uniform(39.0, 41.0), 6),  # 纬度
                    round(random.uniform(115.0, 122.0), 6),  # 经度
                    student_count,
                    teacher_count,
                    random.randint(1950, 2020),  # 建校年份
                    random.choice(["重点", "普通", "示范"]),
                    f"010-{random.randint(10000000, 99999999)}",
                    f"www.{school_name.lower().replace('大学', '').replace('中学', '').replace('小学', '')}.edu.cn",
                    f"{school_name}是一所优秀的{school_type}，致力于培养优秀人才。",
                    True,
                    datetime.now(),
                    datetime.now(),
                    False
                ))
                school_count += 1
            except Exception as e:
                logging.warning(f"插入学校 {school_name} 失败: {e}")

        hotdog_conn.commit()
        logging.info(f"✅ 成功生成 {school_count} 条学校基础信息")

        # 生成学校AI分析数据
        hotdog_cursor.execute("SELECT id FROM school_basic_info")
        school_ids = [row[0] for row in hotdog_cursor.fetchall()]
        
        insert_analysis_sql = """
            INSERT INTO school_ai_analysis (
                school_id, analysis_type, ai_model, analysis_result,
                confidence_score, analysis_date, is_active, created_at, updated_at, delflag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        analysis_count = 0
        for school_id in school_ids:
            analysis_types = ["人数分析", "位置分析", "市场分析", "竞争分析", "潜力分析"]
            for analysis_type in analysis_types:
                analysis_result = {
                    "student_density": random.uniform(0.5, 2.0),
                    "market_potential": random.uniform(0.3, 1.0),
                    "competition_level": random.uniform(0.2, 0.8),
                    "recommendation_score": random.uniform(0.4, 0.9)
                }
                
                try:
                    hotdog_cursor.execute(insert_analysis_sql, (
                        school_id,
                        analysis_type,
                        "GPT-4",
                        json.dumps(analysis_result),
                        random.uniform(0.7, 0.95),
                        datetime.now().date(),
                        True,
                        datetime.now(),
                        datetime.now(),
                        False
                    ))
                    analysis_count += 1
                except Exception as e:
                    logging.warning(f"插入学校分析 {school_id}-{analysis_type} 失败: {e}")

        hotdog_conn.commit()
        logging.info(f"✅ 成功生成 {analysis_count} 条学校AI分析数据")

        # 生成用户选择的学校数据
        insert_user_school_sql = """
            INSERT INTO user_selected_schools (
                user_id, school_id, selection_reason, priority_level,
                is_selected, selected_at, created_at, updated_at, delflag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        user_school_count = 0
        for i in range(50):  # 生成50个用户选择
            user_id = f"USER_{random.randint(10000, 99999)}"
            school_id = random.choice(school_ids)
            reasons = ["地理位置优越", "学生人数多", "消费能力强", "竞争较少", "发展潜力大"]
            
            try:
                hotdog_cursor.execute(insert_user_school_sql, (
                    user_id,
                    school_id,
                    random.choice(reasons),
                    random.randint(1, 5),
                    True,
                    datetime.now() - timedelta(days=random.randint(1, 30)),
                    datetime.now(),
                    datetime.now(),
                    False
                ))
                user_school_count += 1
            except Exception as e:
                logging.warning(f"插入用户选择学校 {user_id}-{school_id} 失败: {e}")

        hotdog_conn.commit()
        logging.info(f"✅ 成功生成 {user_school_count} 条用户选择学校数据")

        # 生成学校区域映射数据
        insert_region_sql = """
            INSERT INTO school_region_mapping (
                school_id, province_code, city_code, district_code, region_name, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        """
        
        region_count = 0
        for school_id in school_ids:
            province_codes = ["11", "31", "44", "32", "33", "42", "61", "23"]
            city_codes = ["1101", "3101", "4403", "3201", "3301", "4201", "6101", "2301"]
            district_codes = ["110108", "310101", "440305", "320102", "330102", "420102", "610102", "230102"]
            
            try:
                hotdog_cursor.execute(insert_region_sql, (
                    school_id,
                    random.choice(province_codes),
                    random.choice(city_codes),
                    random.choice(district_codes),
                    f"区域_{random.randint(1, 100)}",
                    datetime.now()
                ))
                region_count += 1
            except Exception as e:
                logging.warning(f"插入学校区域映射 {school_id} 失败: {e}")

        hotdog_conn.commit()
        logging.info(f"✅ 成功生成 {region_count} 条学校区域映射数据")

    except Exception as e:
        logging.error(f"生成学校相关数据失败: {e}")
        raise
    finally:
        if hotdog_conn:
            hotdog_conn.close()

def generate_poi_data():
    """生成POI数据"""
    logging.info("6️⃣ 生成POI数据...")
    hotdog_conn = None
    try:
        hotdog_conn = get_db_connection(DB_CONFIG)
        hotdog_cursor = hotdog_conn.cursor()

        # 清空现有数据
        hotdog_cursor.execute("DELETE FROM poi_data")
        hotdog_conn.commit()

        # 生成POI数据
        poi_types = ["学校", "商场", "医院", "地铁站", "公交站", "公园", "餐厅", "银行", "超市", "酒店"]
        poi_names = [
            "北京大学", "清华大学", "万达广场", "华润万家", "协和医院", "北京医院",
            "天安门东站", "西单站", "朝阳公园", "北海公园", "全聚德", "海底捞",
            "中国银行", "工商银行", "家乐福", "沃尔玛", "希尔顿酒店", "万豪酒店"
        ]
        
        insert_sql = """
            INSERT INTO poi_data (
                poi_name, poi_type, latitude, longitude, address, business_hours, data_source, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        poi_count = 0
        for i in range(100):  # 生成100个POI
            poi_name = random.choice(poi_names) + f"_{i+1}"
            poi_type = random.choice(poi_types)
            
            try:
                hotdog_cursor.execute(insert_sql, (
                    poi_name,
                    poi_type,
                    round(random.uniform(39.0, 41.0), 6),  # 纬度
                    round(random.uniform(115.0, 122.0), 6),  # 经度
                    f"北京市{random.choice(['海淀区', '朝阳区', '西城区', '东城区'])}{poi_name}",
                    f"08:00-22:00",  # business_hours
                    "高德地图",  # data_source
                    datetime.now()
                ))
                poi_count += 1
            except Exception as e:
                logging.warning(f"插入POI {poi_name} 失败: {e}")

        hotdog_conn.commit()
        logging.info(f"✅ 成功生成 {poi_count} 条POI数据")

    except Exception as e:
        logging.error(f"生成POI数据失败: {e}")
        raise
    finally:
        if hotdog_conn:
            hotdog_conn.close()

if __name__ == "__main__":
    logging.info("============================================================")
    logging.info("🚀 生成分析数据")
    logging.info("============================================================")
    try:
        logging.info("1️⃣ 连接本地SQL Server...")
        conn = get_db_connection(DB_CONFIG)
        conn.close()
        logging.info("✅ 数据库连接成功")

        logging.info("🔄 开始生成分析数据...")
        generate_customer_behavior_analysis()
        generate_customer_product_preferences()
        generate_customer_time_analysis()
        generate_sales_predictions()
        generate_school_data()
        generate_poi_data()
        
        logging.info("🎉 分析数据生成完成！")
    except Exception as e:
        logging.error(f"生成分析数据失败: {e}")
        logging.error("❌ 分析数据生成失败")
