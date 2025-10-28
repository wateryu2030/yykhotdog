#!/usr/bin/env python3
"""
测试RDS数据库连接
"""
import pymssql

def test_rds_connection():
    """测试RDS连接"""
    try:
        # RDS连接配置
        conn = pymssql.connect(
            server='rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
            port=1433,
            user='hotdog',
            password='Zhkj@62102218',
            database='hotdog2030'
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT @@VERSION")
        version = cursor.fetchone()[0]
        print(f"✅ RDS连接成功!")
        print(f"数据库版本: {version[:100]}...")
        
        # 检查数据库列表
        cursor.execute("SELECT name FROM sys.databases WHERE name IN ('hotdog2030', 'cyrg2025')")
        databases = cursor.fetchall()
        print(f"可用数据库: {[db[0] for db in databases]}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ RDS连接失败: {e}")
        return False

if __name__ == "__main__":
    test_rds_connection()
