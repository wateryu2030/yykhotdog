#!/usr/bin/env python3
"""
从意向店铺数据创建stores表并导入数据
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def connect_to_database():
    """连接到SQL Server数据库"""
    try:
        conn = pyodbc.connect(
            'DRIVER={ODBC Driver 18 for SQL Server};'
            'SERVER=localhost,1433;'
            'DATABASE=master;'
            'UID=sa;'
            'PWD=YourStrong@Passw0rd;'
            'TrustServerCertificate=yes;'
            'Encrypt=no;'
        )
        return conn
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        return None

def create_stores_table(conn):
    """创建stores表"""
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    create_table_sql = """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='stores' AND xtype='U')
    CREATE TABLE stores (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        store_code NVARCHAR(50),
        store_name NVARCHAR(200) NOT NULL,
        store_address NVARCHAR(500),
        province NVARCHAR(100),
        city NVARCHAR(100),
        district NVARCHAR(100),
        address NVARCHAR(500),
        status NVARCHAR(50) DEFAULT N'营业中',
        state TINYINT DEFAULT 0,
        blurb NVARCHAR(1000),
        location NVARCHAR(100),
        longitude DECIMAL(18, 6),
        latitude DECIMAL(18, 6),
        is_self BIT DEFAULT 0,
        is_use BIT DEFAULT 1,
        manager_name NVARCHAR(100),
        contact_phone NVARCHAR(50),
        morning_time1 NVARCHAR(20),
        night_time1 NVARCHAR(20),
        morning_time2 NVARCHAR(20),
        night_time2 NVARCHAR(20),
        interval_minutes INT DEFAULT 0,
        enter_priseld BIGINT,
        merchant_id BIGINT,
        meituan_id NVARCHAR(100),
        elemeld NVARCHAR(100),
        douyin_id NVARCHAR(100),
        meituantuangould NVARCHAR(100),
        is_settlement BIT DEFAULT 0,
        settlement_rate DECIMAL(5, 2) DEFAULT 0,
        rent DECIMAL(18, 2) DEFAULT 0,
        pos_img NVARCHAR(500),
        pos_img_name NVARCHAR(200),
        first_img NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    """
    
    try:
        cursor.execute(create_table_sql)
        conn.commit()
        logger.info("✅ stores表创建成功")
        return True
    except Exception as e:
        logger.error(f"❌ 创建stores表失败: {e}")
        return False

def create_city_table(conn):
    """创建city表"""
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    create_table_sql = """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='city' AND xtype='U')
    CREATE TABLE city (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        city_name NVARCHAR(100) NOT NULL,
        province_name NVARCHAR(100),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    """
    
    try:
        cursor.execute(create_table_sql)
        conn.commit()
        logger.info("✅ city表创建成功")
        return True
    except Exception as e:
        logger.error(f"❌ 创建city表失败: {e}")
        return False

def populate_city_table(conn):
    """填充city表数据"""
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    cities_data = [
        ('沈阳市', '辽宁省'),
        ('大连市', '辽宁省'),
        ('鞍山市', '辽宁省'),
        ('抚顺市', '辽宁省'),
        ('本溪市', '辽宁省'),
        ('丹东市', '辽宁省'),
        ('锦州市', '辽宁省'),
        ('营口市', '辽宁省'),
        ('阜新市', '辽宁省'),
        ('辽阳市', '辽宁省'),
        ('盘锦市', '辽宁省'),
        ('铁岭市', '辽宁省'),
        ('朝阳市', '辽宁省'),
        ('葫芦岛市', '辽宁省'),
        ('仙桃市', '湖北省'),
        ('武汉市', '湖北省'),
        ('黄石市', '湖北省'),
        ('十堰市', '湖北省'),
        ('宜昌市', '湖北省'),
        ('襄阳市', '湖北省'),
        ('鄂州市', '湖北省'),
        ('荆门市', '湖北省'),
        ('孝感市', '湖北省'),
        ('荆州市', '湖北省'),
        ('黄冈市', '湖北省'),
        ('咸宁市', '湖北省'),
        ('随州市', '湖北省'),
        ('恩施土家族苗族自治州', '湖北省'),
        ('滨州市', '山东省'),
        ('济南市', '山东省'),
        ('青岛市', '山东省'),
        ('淄博市', '山东省'),
        ('枣庄市', '山东省'),
        ('东营市', '山东省'),
        ('烟台市', '山东省'),
        ('潍坊市', '山东省'),
        ('济宁市', '山东省'),
        ('泰安市', '山东省'),
        ('威海市', '山东省'),
        ('日照市', '山东省'),
        ('临沂市', '山东省'),
        ('德州市', '山东省'),
        ('聊城市', '山东省'),
        ('菏泽市', '山东省'),
        ('莱芜市', '山东省')
    ]
    
    try:
        for city_name, province_name in cities_data:
            cursor.execute("""
                IF NOT EXISTS (SELECT 1 FROM city WHERE city_name = ?)
                INSERT INTO city (city_name, province_name) VALUES (?, ?)
            """, city_name, city_name, province_name)
        
        conn.commit()
        logger.info(f"✅ 成功填充 {len(cities_data)} 个城市数据")
        return True
    except Exception as e:
        logger.error(f"❌ 填充city表失败: {e}")
        return False

def convert_rg_shops_to_stores(conn):
    """将意向店铺转换为门店数据"""
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
        
        if len(rg_shops) == 0:
            logger.warning("⚠️  没有找到意向店铺数据")
            return True
        
        # 插入意向店铺作为门店数据
        insert_sql = """
        INSERT INTO stores 
        (store_code, store_name, store_address, status, state, blurb, location,
         longitude, latitude, is_self, is_use, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        
        for i, rg_shop in enumerate(rg_shops):
            try:
                shop_name, shop_address, location, blurb, approval_state, amount, created_at_time = rg_shop
                
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
                
                # 解析记录时间
                created_at = datetime.now()
                if created_at_time:
                    try:
                        created_at = datetime.strptime(str(created_at_time), '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        try:
                            created_at = datetime.strptime(str(created_at_time), '%Y/%m/%d %H:%M:%S')
                        except ValueError:
                            created_at = datetime.now()
                
                cursor.execute(insert_sql, (
                    f"RG_{i+1:04d}",          # store_code (意向店铺前缀)
                    shop_name,                # store_name
                    shop_address,             # store_address
                    status,                   # status (筹备中/拓展中)
                    state,                    # state (1招商中 2筹备中)
                    blurb,                    # blurb
                    location,                 # location
                    longitude,                # longitude
                    latitude,                 # latitude
                    0,                        # is_self (意向店铺默认为加盟)
                    1,                        # is_use (意向店铺默认为可用)
                    created_at,               # created_at
                    created_at,               # updated_at
                    0                         # delflag
                ))
                success_count += 1
                
                if success_count % 50 == 0:
                    logger.info(f"   进度: {success_count}/{len(rg_shops)}")
                
            except Exception as e:
                logger.warning(f"转换意向店铺失败 ({shop_name}): {e}")
        
        logger.info(f"✅ 成功转换 {success_count}/{len(rg_shops)} 个意向店铺为门店数据")
        
        # 验证转换结果
        cursor.execute("SELECT COUNT(*) FROM stores WHERE store_code LIKE 'RG_%' AND delflag = 0")
        converted_count = cursor.fetchone()[0]
        logger.info(f"📊 转换后的意向店铺数量: {converted_count}")
        
        # 统计不同状态的门店数量
        cursor.execute("""
        SELECT 
            status,
            COUNT(*) as count
        FROM stores 
        WHERE delflag = 0
        GROUP BY status
        """)
        
        status_counts = cursor.fetchall()
        logger.info("📊 门店状态统计:")
        for status, count in status_counts:
            logger.info(f"   {status}: {count} 个")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 转换意向店铺失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("🚀 开始创建stores表并导入意向店铺数据")
    logger.info("=" * 80)
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        # 步骤1: 创建stores表
        if not create_stores_table(conn):
            return False
        
        # 步骤2: 创建city表
        if not create_city_table(conn):
            return False
        
        # 步骤3: 填充city表
        if not populate_city_table(conn):
            return False
        
        # 步骤4: 转换意向店铺为门店数据
        if not convert_rg_shops_to_stores(conn):
            return False
        
        logger.info("🎉 意向店铺数据转换完成！")
        return True
        
    except Exception as e:
        logger.error(f"❌ 转换过程出错: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
