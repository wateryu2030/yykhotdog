#!/usr/bin/env python3
"""
创建缺失的数据库表以修复API错误
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

def create_region_hierarchy_table(conn):
    """创建region_hierarchy表"""
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    create_table_sql = """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='region_hierarchy' AND xtype='U')
    CREATE TABLE region_hierarchy (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        level TINYINT NOT NULL,
        parent_id BIGINT,
        code NVARCHAR(50),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    """
    
    try:
        cursor.execute(create_table_sql)
        conn.commit()
        logger.info("✅ region_hierarchy表创建成功")
        
        # 插入基础数据
        cursor.execute("""
        INSERT INTO region_hierarchy (name, level, parent_id, code) VALUES
        ('辽宁省', 1, NULL, 'LN'),
        ('湖北省', 1, NULL, 'HB'),
        ('山东省', 1, NULL, 'SD'),
        ('沈阳市', 2, 1, 'SY'),
        ('辽阳市', 2, 1, 'LY'),
        ('仙桃市', 2, 2, 'XT'),
        ('滨州市', 2, 3, 'BZ')
        """)
        conn.commit()
        logger.info("✅ region_hierarchy基础数据插入成功")
        
        return True
    except Exception as e:
        logger.error(f"❌ 创建region_hierarchy表失败: {e}")
        return False

def create_orders_table(conn):
    """创建orders表"""
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    create_table_sql = """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='orders' AND xtype='U')
    CREATE TABLE orders (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        order_no NVARCHAR(100) NOT NULL,
        store_id BIGINT NOT NULL,
        customer_id BIGINT,
        total_amount DECIMAL(18, 2) DEFAULT 0,
        pay_state TINYINT DEFAULT 0,
        pay_mode NVARCHAR(50),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    """
    
    try:
        cursor.execute(create_table_sql)
        conn.commit()
        logger.info("✅ orders表创建成功")
        return True
    except Exception as e:
        logger.error(f"❌ 创建orders表失败: {e}")
        return False

def create_customers_table(conn):
    """创建customers表"""
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    create_table_sql = """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='customers' AND xtype='U')
    CREATE TABLE customers (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        customer_name NVARCHAR(200),
        phone NVARCHAR(50),
        city NVARCHAR(100),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        delflag BIT DEFAULT 0
    );
    """
    
    try:
        cursor.execute(create_table_sql)
        conn.commit()
        logger.info("✅ customers表创建成功")
        return True
    except Exception as e:
        logger.error(f"❌ 创建customers表失败: {e}")
        return False

def populate_sample_data(conn):
    """填充示例数据"""
    cursor = conn.cursor()
    cursor.execute("USE hotdog2030")
    
    try:
        # 插入一些示例订单数据
        cursor.execute("""
        INSERT INTO orders (order_no, store_id, customer_id, total_amount, pay_state, pay_mode) VALUES
        ('ORD_20251012_001', 1, 1, 25.50, 2, '微信支付'),
        ('ORD_20251012_002', 1, 2, 18.00, 2, '支付宝'),
        ('ORD_20251012_003', 2, 3, 32.00, 2, '现金'),
        ('ORD_20251012_004', 2, 4, 15.50, 2, '微信支付'),
        ('ORD_20251012_005', 3, 5, 28.00, 2, '支付宝')
        """)
        
        # 插入一些示例客户数据
        cursor.execute("""
        INSERT INTO customers (customer_name, phone, city) VALUES
        ('张三', '13800138001', '沈阳市'),
        ('李四', '13800138002', '沈阳市'),
        ('王五', '13800138003', '辽阳市'),
        ('赵六', '13800138004', '仙桃市'),
        ('钱七', '13800138005', '滨州市')
        """)
        
        conn.commit()
        logger.info("✅ 示例数据插入成功")
        return True
    except Exception as e:
        logger.error(f"❌ 插入示例数据失败: {e}")
        return False

def main():
    """主函数"""
    logger.info("🚀 开始创建缺失的数据库表")
    logger.info("=" * 80)
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        # 步骤1: 创建region_hierarchy表
        if not create_region_hierarchy_table(conn):
            return False
        
        # 步骤2: 创建orders表
        if not create_orders_table(conn):
            return False
        
        # 步骤3: 创建customers表
        if not create_customers_table(conn):
            return False
        
        # 步骤4: 填充示例数据
        if not populate_sample_data(conn):
            return False
        
        logger.info("🎉 缺失表创建完成！")
        return True
        
    except Exception as e:
        logger.error(f"❌ 创建过程出错: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
