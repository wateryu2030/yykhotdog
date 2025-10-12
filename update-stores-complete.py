#!/usr/bin/env python3
"""
更新hotdog2030的stores表，添加所有缺失的门店数据
"""

import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('update_stores_complete.log'),
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

def update_stores_complete(conn):
    """更新stores表，添加所有缺失的门店数据"""
    logger.info("🔄 开始更新stores表...")
    
    try:
        cursor = conn.cursor()
        
        # 1. 从cyrg2025获取所有门店数据
        logger.info("1️⃣ 从cyrg2025获取门店数据...")
        cursor.execute("USE [cyrg2025]")
        
        shop_query = """
        SELECT 
            Id,
            ShopName,
            ShopAddress,
            Director,
            DirectorPhone,
            province,
            city,
            district,
            state,
            isUse,
            location,
            blurb,
            morningTime,
            nightTime,
            passengerFlow,
            interval,
            isClose,
            establishTime,
            openingTime,
            rent
        FROM Shop
        ORDER BY Id
        """
        
        cursor.execute(shop_query)
        shops = cursor.fetchall()
        
        logger.info(f"📊 查询到 {len(shops)} 个门店记录")
        
        # 2. 更新hotdog2030的stores表
        logger.info("2️⃣ 更新hotdog2030的stores表...")
        cursor.execute("USE [hotdog2030]")
        
        # 先清空stores表
        cursor.execute("DELETE FROM stores")
        logger.info("✅ 清空现有stores数据")
        
        # 启用IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT stores ON")
        
        store_insert = """
        INSERT INTO stores (id, store_code, name, type, status, description, province, city, district, 
                           address, latitude, longitude, manager_name, manager_phone, 
                           morning_hours, evening_hours, passenger_flow, operating_interval, 
                           is_closed, established_date, opening_date, rent_cost, 
                           is_active, is_deleted, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        current_time = datetime.now()
        
        for shop in shops:
            try:
                # 处理状态映射
                status_map = {0: '暂停营业', 1: '正常营业', 2: '已关闭'}
                status = status_map.get(shop[8], '未知状态')
                
                # 处理使用状态
                is_active = shop[9] == 1
                is_closed = shop[16] == 1 if shop[16] is not None else False
                
                # 处理位置信息
                location = shop[10] if shop[10] else ''
                latitude = None
                longitude = None
                if location and ',' in location:
                    try:
                        lat_str, lng_str = location.split(',')
                        latitude = float(lat_str.strip())
                        longitude = float(lng_str.strip())
                    except:
                        pass
                
                # 处理时间信息
                morning_time = shop[12] if shop[12] else ''
                evening_time = shop[13] if shop[13] else ''
                establish_time = shop[17] if shop[17] else None
                opening_time = shop[18] if shop[18] else None
                rent_cost = shop[19] if shop[19] else None
                
                store_data = (
                    shop[0],  # id
                    str(shop[0]),  # store_code
                    shop[1] or f'门店{shop[0]}',  # name
                    '直营店',  # type
                    status,  # status
                    shop[11] or '',  # description
                    shop[5] or '',  # province
                    shop[6] or '',  # city
                    shop[7] or '',  # district
                    shop[2] or '',  # address
                    latitude,  # latitude
                    longitude,  # longitude
                    shop[3] or '',  # manager_name
                    shop[4] or '',  # manager_phone
                    morning_time,  # morning_hours
                    evening_time,  # evening_hours
                    shop[14] if shop[14] else None,  # passenger_flow
                    shop[15] if shop[15] else None,  # operating_interval
                    is_closed,  # is_closed
                    establish_time,  # established_date
                    opening_time,  # opening_date
                    rent_cost,  # rent_cost
                    is_active,  # is_active
                    False,  # is_deleted
                    current_time,  # created_at
                    current_time,  # updated_at
                    False  # delflag
                )
                
                cursor.execute(store_insert, store_data)
                success_count += 1
                
                if success_count % 5 == 0:
                    logger.info(f"✅ 已处理 {success_count}/{len(shops)} 个门店")
                
            except Exception as e:
                logger.warning(f"插入门店 {shop[0]} 失败: {e}")
                continue
        
        # 关闭IDENTITY_INSERT
        cursor.execute("SET IDENTITY_INSERT stores OFF")
        
        logger.info(f"✅ 成功更新 {success_count} 个门店")
        
        # 3. 验证更新结果
        logger.info("3️⃣ 验证更新结果...")
        cursor.execute("SELECT COUNT(*) FROM stores")
        final_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT id, name, status FROM stores ORDER BY id")
        final_stores = cursor.fetchall()
        
        logger.info(f"📊 最终结果:")
        logger.info(f"  门店总数: {final_count}")
        logger.info(f"  门店列表:")
        for store in final_stores:
            logger.info(f"    ID: {store[0]}, 名称: {store[1]}, 状态: {store[2]}")
        
        return True
        
    except Exception as e:
        logger.error(f"更新stores表失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("🚀 更新stores表 - 添加所有门店数据")
    logger.info("=" * 60)
    
    # 连接数据库
    logger.info("1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    logger.info("✅ 数据库连接成功")
    
    # 更新stores表
    success = update_stores_complete(conn)
    
    # 关闭连接
    conn.close()
    
    if success:
        logger.info("🎉 stores表更新完成！")
    else:
        logger.error("❌ stores表更新失败")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
