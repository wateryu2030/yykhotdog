#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复门店数据同步 - 从cyrg2025和cyrgweixin同步完整的门店信息到hotdog2030
"""

import pymssql
import logging
from datetime import datetime
import time

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fix_stores_sync.log'),
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
        logger.info(f"✅ 数据库连接成功: {database}")
        return conn
    except Exception as e:
        logger.error(f"❌ 数据库连接失败: {database} - {e}")
        return None

def sync_stores_complete():
    """完整同步门店数据"""
    logger.info('🚀 开始完整同步门店数据...')
    start_time = time.time()
    
    # 连接数据库
    cyrg2025_conn = get_connection('cyrg2025')
    cyrgweixin_conn = get_connection('cyrgweixin')
    hotdog_conn = get_connection('hotdog2030')
    
    if not all([cyrg2025_conn, cyrgweixin_conn, hotdog_conn]):
        logger.error('❌ 数据库连接失败，无法执行同步')
        return False
    
    try:
        # 1. 从cyrg2025获取门店数据
        cyrg2025_cursor = cyrg2025_conn.cursor()
        logger.info('📊 查询cyrg2025门店数据...')
        cyrg2025_cursor.execute('''
            SELECT Id, ShopName, ShopAddress, Director, DirectorPhone, 
                   province, city, district, morningTime, nightTime,
                   establishTime, IsSelf, state, Delflag, RecordTime,
                   location, passengerFlow, rent
            FROM Shop
            WHERE Delflag = 0
            ORDER BY Id
        ''')
        cyrg2025_shops = cyrg2025_cursor.fetchall()
        logger.info(f'📊 cyrg2025找到 {len(cyrg2025_shops)} 个门店')
        
        # 2. 从cyrgweixin获取门店数据
        cyrgweixin_cursor = cyrgweixin_conn.cursor()
        logger.info('📊 查询cyrgweixin门店数据...')
        cyrgweixin_cursor.execute('''
            SELECT Id, ShopName, ShopAddress, Director, DirectorPhone, 
                   province, city, district, morningTime, nightTime,
                   NULL as establishTime, 0 as IsSelf, state, Delflag, RecordTime,
                   location, passengerFlow, rent
            FROM Rg_Shop
            WHERE Delflag = 0
            ORDER BY Id
        ''')
        cyrgweixin_shops = cyrgweixin_cursor.fetchall()
        logger.info(f'📊 cyrgweixin找到 {len(cyrgweixin_shops)} 个门店')
        
        # 3. 合并所有门店数据
        all_shops = cyrg2025_shops + cyrgweixin_shops
        logger.info(f'📊 总计 {len(all_shops)} 个门店')
        
        # 4. 清空并重新插入hotdog2030.stores表
        hotdog_cursor = hotdog_conn.cursor()
        logger.info('🗑️ 清空hotdog2030.stores表...')
        hotdog_cursor.execute('DELETE FROM stores')
        hotdog_conn.commit()
        
        # 5. 批量插入完整的门店数据
        logger.info('📦 开始插入完整门店数据...')
        insert_count = 0
        
        for shop in all_shops:
            try:
                # 解析location字段获取经纬度
                longitude = None
                latitude = None
                if shop[15] and ',' in shop[15]:
                    try:
                        lat_str, lng_str = shop[15].split(',')
                        latitude = float(lat_str.strip())
                        longitude = float(lng_str.strip())
                    except:
                        pass
                
                # 处理状态映射
                status = 'active' if shop[12] == 0 else 'inactive'
                
                # 处理门店类型
                store_type = '自营店' if shop[11] == 1 else '加盟店'
                
                # 处理开业时间
                opening_date = None
                if shop[9]:  # establishTime
                    try:
                        opening_date = datetime.strptime(shop[9], '%Y-%m-%d')
                    except:
                        try:
                            opening_date = datetime.strptime(shop[9], '%Y年')
                        except:
                            pass
                
                # 处理营业时间
                morning_time = shop[8] if shop[8] else None
                night_time = shop[9] if shop[9] else None
                
                # 处理租金
                rent_amount = None
                if shop[17]:  # rent
                    try:
                        rent_amount = float(shop[17])
                    except:
                        pass
                
                # 处理客流量
                passenger_flow = None
                if shop[16]:  # passengerFlow
                    try:
                        passenger_flow = int(shop[16])
                    except:
                        pass
                
                # 插入数据
                insert_query = '''
                    INSERT INTO stores 
                    (id, store_code, store_name, store_type, status, province, city, district, 
                     address, longitude, latitude, director, director_phone, morning_time, 
                     night_time, passenger_flow, rent_amount, is_self, created_at, updated_at, delflag)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                '''
                
                hotdog_cursor.execute(insert_query, (
                    shop[0],  # id
                    f'ST{shop[0]:04d}',  # store_code (生成门店编号)
                    shop[1],  # store_name
                    store_type,  # store_type
                    status,  # status
                    shop[5],  # province
                    shop[6],  # city
                    shop[7],  # district
                    shop[2],  # address
                    longitude,  # longitude
                    latitude,  # latitude
                    shop[3],  # director
                    shop[4],  # director_phone
                    morning_time,  # morning_time
                    night_time,  # night_time
                    passenger_flow,  # passenger_flow
                    rent_amount,  # rent_amount
                    shop[11] == 1,  # is_self
                    datetime.now(),  # created_at
                    datetime.now(),  # updated_at
                    False  # delflag
                ))
                
                insert_count += 1
                
            except Exception as e:
                logger.warning(f'⚠️ 跳过门店 {shop[0]}: {e}')
                continue
        
        hotdog_conn.commit()
        
        total_time = time.time() - start_time
        logger.info(f'✅ 门店数据同步完成: {insert_count} 条记录')
        logger.info(f'⏱️ 总耗时: {total_time:.2f} 秒')
        logger.info(f'🚀 平均速度: {insert_count / total_time:.0f} 条/秒')
        
        return True
        
    except Exception as e:
        logger.error(f'❌ 同步门店数据失败: {e}')
        hotdog_conn.rollback()
        return False
    finally:
        if cyrg2025_conn:
            cyrg2025_conn.close()
        if cyrgweixin_conn:
            cyrgweixin_conn.close()
        if hotdog_conn:
            hotdog_conn.close()

if __name__ == '__main__':
    logger.info('🚀 开始修复门店数据同步')
    logger.info('=' * 60)
    success = sync_stores_complete()
    if success:
        logger.info('🎉 门店数据同步修复完成！')
    else:
        logger.error('❌ 门店数据同步修复失败！')
