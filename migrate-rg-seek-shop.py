#!/usr/bin/env python3
"""
迁移意向店铺数据脚本
从cyrgweixin.Rg_SeekShop迁移到hotdog2030.rg_seek_shop，并转换为stores数据
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

def create_rg_seek_shop_table(conn):
    """创建rg_seek_shop表"""
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    create_table_sql = """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='rg_seek_shop' AND xtype='U')
    CREATE TABLE rg_seek_shop (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        shop_name NVARCHAR(200),
        shop_address NVARCHAR(500),
        location NVARCHAR(100),
        blurb NVARCHAR(1000),
        record_id BIGINT,
        approval_id BIGINT,
        approval_time DATETIME2,
        approval_state TINYINT,
        approval_remarks NVARCHAR(500),
        amount DECIMAL(18, 2) DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    """
    
    try:
        cursor.execute(create_table_sql)
        conn.commit()
        logger.info("✅ rg_seek_shop表创建成功")
        return True
    except Exception as e:
        logger.error(f"❌ 创建rg_seek_shop表失败: {e}")
        return False

def migrate_rg_seek_shop_data(conn):
    """迁移意向店铺数据"""
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    try:
        # 查询源数据
        cursor.execute("USE cyrgweixin")
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
        logger.info(f"📊 查询到 {len(rg_shops)} 条意向店铺记录")
        
        if len(rg_shops) == 0:
            logger.warning("⚠️  没有找到意向店铺数据")
            return True
        
        # 切换到目标数据库
        cursor.execute("USE hotdog2030")
        
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
                approval_time, approval_state, approval_remarks, amount, created_at = rg_shop
                
                # 处理NULL值
                safe_amount = amount if amount is not None else 0.0
                safe_approval_state = approval_state if approval_state is not None else 0
                
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
                
            except Exception as e:
                logger.warning(f"插入失败 ({shop_name}): {e}")
        
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
        
        # 获取当前最大的store_id
        cursor.execute("SELECT ISNULL(MAX(id), 0) FROM stores")
        max_store_id = cursor.fetchone()[0]
        
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

def main():
    """主函数"""
    logger.info("🚀 开始迁移意向店铺数据")
    logger.info("=" * 80)
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        # 步骤1: 创建rg_seek_shop表
        if not create_rg_seek_shop_table(conn):
            return False
        
        # 步骤2: 迁移意向店铺数据
        if not migrate_rg_seek_shop_data(conn):
            return False
        
        # 步骤3: 转换为门店数据
        if not convert_to_stores(conn):
            return False
        
        logger.info("🎉 意向店铺数据迁移完成！")
        return True
        
    except Exception as e:
        logger.error(f"❌ 迁移过程出错: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
