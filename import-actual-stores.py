#!/usr/bin/env python3
"""
导入实际运营门店数据，与意向店铺数据分开管理
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

def import_actual_stores(conn):
    """导入实际运营门店数据"""
    cursor = conn.cursor()
    
    try:
        # 切换到cyrg2025数据库查询实际门店
        cursor.execute("USE cyrg2025")
        
        # 查询实际运营门店
        cursor.execute("""
        SELECT 
            Id,
            ShopName,
            ShopAddress,
            City,
            Province,
            District,
            DirectorPhone,
            Director,
            IsSelf,
            RecordTime
        FROM Shop 
        WHERE (delflag = 0 OR delflag IS NULL)
        ORDER BY Id
        """)
        
        shops = cursor.fetchall()
        logger.info(f"📊 从cyrg2025查询到 {len(shops)} 个实际运营门店")
        
        # 切换到hotdog2030数据库
        cursor.execute("USE hotdog2030")
        
        # 获取当前最大的ID
        cursor.execute("SELECT MAX(id) FROM stores")
        max_id = cursor.fetchone()[0] or 0
        
        # 插入实际运营门店
        insert_sql = """
        INSERT INTO stores 
        (store_code, store_name, store_type, status, province, city, district, address,
         longitude, latitude, director_phone, director, is_self, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        
        for shop in shops:
            try:
                shop_id, shop_name, shop_address, city, province, district, director_phone, director, is_self, created_time = shop
                
                max_id += 1
                
                # 使用原始ID作为store_code，避免与RG_冲突
                store_code = f"SHOP_{shop_id}"
                
                # 设置状态为营业中（实际运营门店）
                store_status = "营业中"
                
                # 处理is_self字段
                is_self_value = 1 if is_self == 1 else 0
                
                cursor.execute(insert_sql, (
                    store_code,           # store_code
                    shop_name,            # store_name
                    "直营店" if is_self_value == 1 else "加盟店",  # store_type
                    store_status,         # status
                    province,             # province
                    city,                 # city
                    district,             # district
                    shop_address,         # address
                    None,                 # longitude (cyrg2025.Shop没有坐标数据)
                    None,                 # latitude (cyrg2025.Shop没有坐标数据)
                    director_phone,       # director_phone
                    director,             # director
                    is_self_value,        # is_self
                    created_time or datetime.now(),  # created_at
                    datetime.now(),       # updated_at
                    0                     # delflag
                ))
                success_count += 1
                
                logger.info(f"✅ 导入门店: {shop_name} (ID: {shop_id})")
                
            except Exception as e:
                logger.warning(f"❌ 导入门店失败 ({shop_name}): {e}")
        
        conn.commit()
        logger.info(f"🎉 成功导入 {success_count}/{len(shops)} 个实际运营门店")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 导入实际门店失败: {e}")
        return False

def verify_data_separation(conn):
    """验证数据分离情况"""
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    try:
        # 统计实际运营门店
        cursor.execute("""
        SELECT COUNT(*) as actual_stores
        FROM stores 
        WHERE delflag = 0 AND store_code LIKE 'SHOP_%'
        """)
        actual_count = cursor.fetchone()[0]
        
        # 统计意向店铺
        cursor.execute("""
        SELECT COUNT(*) as potential_stores
        FROM stores 
        WHERE delflag = 0 AND store_code LIKE 'RG_%'
        """)
        potential_count = cursor.fetchone()[0]
        
        # 显示状态分布
        cursor.execute("""
        SELECT status, COUNT(*) as count
        FROM stores 
        WHERE delflag = 0
        GROUP BY status
        ORDER BY count DESC
        """)
        status_distribution = cursor.fetchall()
        
        logger.info("=" * 80)
        logger.info("📊 数据分离验证结果")
        logger.info("=" * 80)
        logger.info(f"🏪 实际运营门店: {actual_count} 个")
        logger.info(f"🔍 意向筹建店铺: {potential_count} 个")
        logger.info(f"📈 总门店数: {actual_count + potential_count} 个")
        logger.info("")
        logger.info("📊 状态分布:")
        for status, count in status_distribution:
            logger.info(f"   {status}: {count} 个")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 验证数据分离失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("🚀 开始导入实际运营门店数据")
    logger.info("=" * 80)
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        # 步骤1: 导入实际运营门店
        if not import_actual_stores(conn):
            return False
        
        # 步骤2: 验证数据分离
        if not verify_data_separation(conn):
            return False
        
        logger.info("🎉 实际运营门店导入完成！")
        return True
        
    except Exception as e:
        logger.error(f"❌ 导入过程出错: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
