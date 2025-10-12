#!/usr/bin/env python3
"""
检查数据库状态
"""

import pyodbc
import time

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
        print(f"❌ 数据库连接失败: {e}")
        return None

def check_database_status():
    """检查数据库状态"""
    conn = get_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                name,
                state_desc,
                is_in_standby,
                is_cleanly_shutdown
            FROM sys.databases 
            WHERE name IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
            ORDER BY name
        """)
        
        databases = cursor.fetchall()
        print("📊 数据库状态:")
        print("-" * 50)
        for db in databases:
            name, state, standby, clean = db
            print(f"{name}: {state} (standby: {standby}, clean: {clean})")
        
        # 检查是否可以访问数据库
        for db_name in ['cyrg2025', 'cyrgweixin']:
            try:
                cursor.execute(f"USE [{db_name}]")
                cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES")
                table_count = cursor.fetchone()[0]
                print(f"✅ {db_name}: 可访问，包含 {table_count} 个表")
            except Exception as e:
                print(f"❌ {db_name}: 不可访问 - {e}")
        
    except Exception as e:
        print(f"❌ 检查数据库状态失败: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("🔍 检查数据库状态...")
    check_database_status()
