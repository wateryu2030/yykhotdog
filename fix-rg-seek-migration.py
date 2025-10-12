#!/usr/bin/env python3
"""
修复意向店铺数据迁移问题
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

def migrate_rg_seek_shop_data(conn):
    """迁移意向店铺数据"""
    cursor = conn.cursor()
    
    try:
        # 直接使用USE语句切换数据库
        cursor.execute("USE cyrgweixin")
        logger.info("✅ 切换到cyrgweixin数据库")
        
        # 查询源数据
        cursor.execute("""
        SELECT 
            shopName,
            shopAddress,
            location,
            blurb,
            recordId,
            approvalId,
            approvalTime,
            approvalState,
            approvalRemarks,
            amount,
            RecordTime
        FROM Rg_SeekShop 
        WHERE (delflag = 0 OR delflag IS NULL)
          AND shopName IS NOT NULL
          AND shopName != ''
        ORDER BY Id
        """)
        
        rg_shops = cursor.fetchall()
        logger.info(f"📊 从cyrgweixin查询到 {len(rg_shops)} 条意向店铺记录")
        
        if len(rg_shops) == 0:
            logger.warning("⚠️  没有找到意向店铺数据")
            return True
        
        # 切换到目标数据库
        cursor.execute("USE hotdog2030")
        logger.info("✅ 切换到hotdog2030数据库")
        
        # 插入数据
        insert_sql = """
        INSERT INTO rg_seek_shop 
        (shop_name, shop_address, location, blurb, record_id, approval_id, 
         approval_time, approval_state, approval_remarks, amount, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        
        for rg_shop in rg_shops:
            try:
                shop_name, shop_address, location, blurb, record_id, approval_id, \
                approval_time, approval_state, approval_remarks, amount, record_time = rg_shop
                
                # 处理NULL值
                safe_amount = amount if amount is not None else 0.0
                safe_approval_state = approval_state if approval_state is not None else 0
                
                # 解析记录时间
                created_at = datetime.now()
                if record_time:
                    try:
                        created_at = datetime.strptime(str(record_time), '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        try:
                            created_at = datetime.strptime(str(record_time), '%Y/%m/%d %H:%M:%S')
                        except ValueError:
                            created_at = datetime.now()
                
                cursor.execute(insert_sql, (
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
                
                if success_count % 50 == 0:
                    logger.info(f"   进度: {success_count}/{len(rg_shops)}")
                
            except Exception as e:
                logger.warning(f"插入失败 ({shop_name}): {e}")
        
        conn.commit()
        logger.info(f"✅ 成功迁移 {success_count}/{len(rg_shops)} 条意向店铺记录")
        
        # 验证数据
        cursor.execute("SELECT COUNT(*) FROM rg_seek_shop WHERE delflag = 0")
        final_count = cursor.fetchone()[0]
        logger.info(f"📊 最终数据量: {final_count} 条")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 迁移意向店铺数据失败: {e}")
        return False

def convert_to_stores(conn):
    """将意向店铺转换为门店数据"""
    cursor = conn.cursor()
    
    try:
        cursor.execute("USE hotdog2030")
        
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
                    created_at_time,          # created_at
                    created_at_time,          # updated_at
                    0                         # delflag
                ))
                success_count += 1
                
                if success_count % 50 == 0:
                    logger.info(f"   进度: {success_count}/{len(rg_shops)}")
                
            except Exception as e:
                logger.warning(f"转换意向店铺失败 ({shop_name}): {e}")
        
        conn.commit()
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
    logger.info("🚀 开始修复意向店铺数据迁移")
    logger.info("=" * 80)
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        # 步骤1: 迁移意向店铺数据
        if not migrate_rg_seek_shop_data(conn):
            return False
        
        # 步骤2: 转换为门店数据
        if not convert_to_stores(conn):
            return False
        
        logger.info("🎉 意向店铺数据迁移和转换完成！")
        return True
        
    except Exception as e:
        logger.error(f"❌ 迁移过程出错: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
