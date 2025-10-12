#!/usr/bin/env python3
"""
简化的数据迁移测试脚本
"""

import pyodbc
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 数据库连接配置
SERVER = "localhost,1433"
USERNAME = "sa"
PASSWORD = "YourStrong@Passw0rd"
DRIVER = "ODBC Driver 18 for SQL Server"

def test_migration():
    try:
        # 连接数据库
        connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        cursor = conn.cursor()
        
        logger.info("✅ 数据库连接成功")
        
        # 测试门店数据迁移
        logger.info("🔄 测试门店数据迁移...")
        cursor.execute("USE cyrg2025")
        cursor.execute("SELECT TOP 1 * FROM Shop")
        shop_data = cursor.fetchone()
        logger.info(f"门店数据示例: {shop_data}")
        
        # 切换到hotdog2030
        cursor.execute("USE hotdog2030")
        
        # 清空stores表
        cursor.execute("DELETE FROM stores")
        logger.info("✅ 已清空stores表")
        
        # 插入一条测试数据
        cursor.execute("""
            INSERT INTO stores (store_code, store_name, store_type, status, province, city, district, address, longitude, latitude, director_phone, created_at, updated_at, delflag)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ('TEST001', '测试门店', '直营店', '营业中', '辽宁省', '沈阳市', '和平区', '测试地址', 123.456, 41.789, '123456789', '2025-01-01', '2025-01-01', 0))
        
        logger.info("✅ 门店数据插入成功")
        
        # 检查插入结果
        cursor.execute("SELECT COUNT(*) FROM stores")
        count = cursor.fetchone()[0]
        logger.info(f"stores表记录数: {count}")
        
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"测试失败: {e}")
        return False

if __name__ == "__main__":
    test_migration()
